"""Patient profile, registration, and screening-status (patient portal).

Open/pre-auth for now: the signed-in patient is identified by email (AuthUser.username);
the backend maps email -> u_bhuc_patient. Cognito JWT + ACLs come with the governance pass.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from .servicenow import get_table_client

logger = logging.getLogger("bhuc.patient")

router = APIRouter(prefix="/api/x_bhuc", tags=["Patient"])

PATIENT = "u_bhuc_patient"
SCREENING = "u_bhuc_screening"


def _b(v) -> bool:
    return str(v).lower() in ("true", "1")


def _profile(rec: dict) -> dict:
    return {
        "patientId": rec.get("sys_id"),
        "number": rec.get("u_number"),
        "firstName": rec.get("u_first_name") or "",
        "lastName": rec.get("u_last_name") or "",
        "preferredName": rec.get("u_preferred_name") or "",
        "dateOfBirth": rec.get("u_date_of_birth") or "",
        "email": rec.get("u_email") or "",
        "phone": rec.get("u_phone") or "",
        "insuranceProvider": rec.get("u_insurance_provider") or "",
        "insuranceMemberId": rec.get("u_insurance_member_id") or "",
        "selfPay": _b(rec.get("u_self_pay")),
        "registrationStatus": rec.get("u_registration_status") or "draft",
        "profileComplete": _b(rec.get("u_profile_complete")),
        "hipaaConsent": _b(rec.get("u_hipaa_consent")),
        "part2Consent": _b(rec.get("u_part2_consent")),
        "tcpaSmsConsent": _b(rec.get("u_tcpa_sms_consent")),
        "riskBand": rec.get("u_risk_band") or "unknown",
    }


def _find_by_email(email: str) -> Optional[dict]:
    if not email:
        return None
    rows = get_table_client().list(PATIENT, f"u_email={email}", limit=1)
    return rows[0] if rows else None


@router.get("/patient/me")
def patient_me(email: str = Query("")) -> dict:
    """Registration/profile state for the signed-in patient (by email).

    registered = a patient record exists, profile complete, registration verified —
    the gate the Screening flow checks before running the agents.
    """
    rec = _find_by_email(email)
    if not rec:
        return {"registered": False, "profile": None}
    profile = _profile(rec)
    registered = profile["profileComplete"] and profile["registrationStatus"] == "verified"
    return {"registered": registered, "profile": profile}


class RegisterReq(BaseModel):
    email: str
    firstName: str
    lastName: str
    dateOfBirth: Optional[str] = None
    phone: Optional[str] = None
    preferredName: Optional[str] = None
    insuranceProvider: Optional[str] = None
    insuranceMemberId: Optional[str] = None
    selfPay: bool = False
    hipaaConsent: bool = False
    part2Consent: bool = False
    tcpaSmsConsent: bool = False


@router.post("/patient/register")
def patient_register(req: RegisterReq) -> dict:
    """Create or complete the patient's u_bhuc_patient record (marks them registered)."""
    table = get_table_client()
    fields = {
        "u_email": req.email,
        "u_first_name": req.firstName,
        "u_last_name": req.lastName,
        "u_preferred_name": req.preferredName or "",
        "u_date_of_birth": req.dateOfBirth or "",
        "u_phone": req.phone or "",
        "u_insurance_provider": req.insuranceProvider or "",
        "u_insurance_member_id": req.insuranceMemberId or "",
        "u_self_pay": "true" if req.selfPay else "false",
        "u_hipaa_consent": "true" if req.hipaaConsent else "false",
        "u_part2_consent": "true" if req.part2Consent else "false",
        "u_tcpa_sms_consent": "true" if req.tcpaSmsConsent else "false",
        "u_registration_status": "verified",
        "u_profile_complete": "true",
    }
    existing = _find_by_email(req.email)
    if existing:
        rec = table.update(PATIENT, existing["sys_id"], fields)
    else:
        fields["u_cognito_sub"] = req.email  # placeholder link until JWT wiring
        fields["u_account_status"] = "active"
        rec = table.create(PATIENT, fields)
    return {"registered": True, "profile": _profile(rec)}


_STAGE = {  # patient-facing stage — NO scores
    ("submitted", None): ("submitted", "Submitted"),
    ("scored", "pending"): ("under_review", "Under clinician review"),
}


@router.get("/screening/status")
def screening_status(email: str = Query(""), patient: str = Query("")) -> list:
    """Patient-facing screening tracker: stages only, no risk band/score."""
    table = get_table_client()
    patient_id = patient
    if not patient_id and email:
        rec = _find_by_email(email)
        patient_id = rec["sys_id"] if rec else ""
    if not patient_id:
        return []

    rows = table.list(
        SCREENING, f"u_patient={patient_id}^ORDERBYDESCsys_created_on",
        fields="u_number,u_instrument,u_state,u_clinician_action,sys_created_on", limit=50)

    names = {"c_ssrs": "C-SSRS", "phq9": "PHQ-9", "gad7": "GAD-7"}
    out = []
    for r in rows:
        state = r.get("u_state")
        action = (r.get("u_clinician_action") or "pending").lower()
        if action in ("confirmed", "adjusted", "rejected"):
            stage, label = "reviewed", "Reviewed by clinician"
        elif state == "scored":
            stage, label = "under_review", "Under clinician review"
        else:
            stage, label = "submitted", "Submitted"
        out.append({
            "screeningId": r.get("u_number"),
            "instrument": names.get(r.get("u_instrument"), r.get("u_instrument")),
            "stage": stage,
            "stageLabel": label,
            "submittedAt": r.get("sys_created_on"),
        })
    return out
