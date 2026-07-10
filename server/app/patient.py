"""Patient profile, registration, and screening-status (patient portal).

Open/pre-auth for now: the signed-in patient is identified by email (AuthUser.username);
the backend maps email -> u_bhuc_patient. Cognito JWT + ACLs come with the governance pass.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from .access import clinician_email, has_part2_access
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


@router.get("/patients")
def list_patients() -> list:
    """Registered patients for pickers (e.g. the C8 Scheduling selector). No PII beyond
    name + number — enough to choose whom to schedule."""
    rows = get_table_client().list(
        PATIENT, "u_registration_status=verified^ORDERBYu_number",
        fields="u_number,u_first_name,u_last_name,u_gender,u_race,u_ethnicity", limit=100)
    return [{
        "number": r.get("u_number"),
        "name": f"{r.get('u_first_name','')} {r.get('u_last_name','')}".strip() or r.get("u_number"),
        "gender": r.get("u_gender") or "",
        "race": r.get("u_race") or "",
        "ethnicity": r.get("u_ethnicity") or "",
    } for r in rows]


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


def _raw(v):
    return v["value"] if isinstance(v, dict) else v


CONSENT_FIELD = {"hipaa": "u_hipaa_consent", "part2": "u_part2_consent", "tcpa": "u_tcpa_sms_consent"}


class ConsentToggle(BaseModel):
    consent: str          # 'hipaa' | 'part2' | 'tcpa'
    granted: bool
    email: Optional[str] = None
    patientId: Optional[str] = None


@router.patch("/patient/consent")
def toggle_consent(req: ConsentToggle) -> dict:
    """Patient revokes/grants a consent (updates the u_bhuc_patient snapshot flag)."""
    field = CONSENT_FIELD.get(req.consent)
    if not field:
        raise HTTPException(status_code=400, detail=f"Unknown consent '{req.consent}'")
    table = get_table_client()
    rec = _find_by_email(req.email) if req.email else None
    sys_id = req.patientId or (rec["sys_id"] if rec else "")
    if not sys_id:
        raise HTTPException(status_code=404, detail="Patient not found")
    updated = table.update(PATIENT, sys_id, {field: "true" if req.granted else "false"})
    return {"registered": True, "profile": _profile(updated)}


@router.get("/patient/{patient_id}/chart")
def patient_chart(patient_id: str, reveal: int = Query(0),
                  clinicianEmail: str = Query(""),
                  authorization: Optional[str] = Header(None)) -> dict:
    """Clinician chart for THIS patient. The 42 CFR Part 2 field is masked unless the
    clinician reveals, the patient has consented (u_part2_consent), AND the clinician
    holds the approved case-manager role (u_bhuc_part2_access).

    UC3 Part B: the app reads through one integration service account (which holds the
    role so it can fetch Part 2 data), so the backend re-checks the *specific* signed-in
    clinician's role here — the old build gated on consent alone. The platform ACLs are
    the authoritative gate for direct-SN access; this is the app-user gate."""
    table = get_table_client()
    rec = table.get(PATIENT, patient_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Patient not found")
    part2_consent = _b(rec.get("u_part2_consent"))
    part2_role = has_part2_access(clinician_email(authorization, clinicianEmail))
    can_see_part2 = bool(reveal) and part2_consent and part2_role

    name = f"{rec.get('u_first_name', '')} {rec.get('u_last_name', '')}".strip() or "Unknown patient"
    insurance = "Self-pay" if _b(rec.get("u_self_pay")) else (rec.get("u_insurance_provider") or "—")

    # latest screening → AI summary + risk
    scr = table.list(SCREENING, f"u_patient={patient_id}^u_state=scored^ORDERBYDESCsys_updated_on",
                     fields="u_number,u_instrument,u_risk_band,u_rationale", limit=1)
    if scr:
        s = scr[0]
        band = (s.get("u_risk_band") or "unknown")
        summary = f"Latest screening ({(s.get('u_instrument') or '').upper()}): risk band {band}. {s.get('u_rationale') or ''}"
        citations = [{"label": "Screening result", "source": s.get("u_number") or ""}]
    else:
        summary = "No scored screening on file for this patient yet."
        citations = []

    # history from screenings + notes. Care-plan notes carry the Consent & Data Protection
    # Agent's (Agent 4) label — u_contains_part2 / u_sensitivity — surfaced per row.
    hist = []
    for s in table.list(SCREENING, f"u_patient={patient_id}^ORDERBYDESCsys_created_on",
                        fields="u_instrument,u_state,sys_created_on", limit=5):
        hist.append({"date": s.get("sys_created_on") or "", "part2": False,
                     "note": f"{(s.get('u_instrument') or '').upper()} screening — {s.get('u_state')}"})

    # Scan ALL care-plan notes for the Part 2 label (Agent 4), not just the recent few, so no
    # flagged note is missed. Pull the actual SUD content (u_summary + u_draft_note) so an
    # approved case manager sees the real substance-use info on reveal — not just a count.
    care_notes = table.list(
        "u_bhuc_care_plan", f"u_patient={patient_id}^ORDERBYDESCsys_created_on",
        fields="u_number,u_signed,u_contains_part2,u_sensitivity,u_summary,u_draft_note,u_signed_at,sys_created_on",
        limit=50)
    part2_content = []        # every flagged note's actual SUD content (revealed to role+consent only)
    for i, c in enumerate(care_notes):
        note_part2 = _b(c.get("u_contains_part2")) or (c.get("u_sensitivity") == "part2")
        signed = _b(c.get("u_signed"))
        if note_part2:
            part2_content.append({
                "number": c.get("u_number") or "",
                "signed": signed,
                "signedAt": c.get("u_signed_at") or c.get("sys_created_on") or "",
                "summary": c.get("u_summary") or "",
                "note": c.get("u_draft_note") or "",
            })
        if i < 5:             # keep the History timeline to the 5 most recent notes
            hist.append({"date": c.get("sys_created_on") or "", "part2": note_part2,
                         "note": f"Clinical note {c.get('u_number')} — {'signed' if signed else 'draft'}"})

    # The SUD field reflects Agent 4's labels + the role+consent gate:
    #   no flagged note → nothing protected; flagged + gate open (reveal + consent + role) →
    #   reveal the ACTUAL note content in a dedicated panel; flagged + gate closed → locked chip.
    n_flagged = len(part2_content)
    if n_flagged == 0:
        part2_field = {"value": "No 42 CFR Part 2 content flagged", "masked": False}
        part2_content = []
    elif can_see_part2:
        part2_field = {"value": f"{n_flagged} flagged note(s) — SUD content unmasked below", "masked": False}
    else:
        part2_field = {"value": None, "masked": True}
        part2_content = []    # never send protected content when the gate is closed

    return {
        "patientId": patient_id,
        "number": rec.get("u_number") or "",
        "part2Consent": part2_consent,
        "part2Role": part2_role,
        "name": {"value": name, "masked": False},
        "dateOfBirth": {"value": rec.get("u_date_of_birth") or "—", "masked": False},
        "demographics": [
            {"label": "Insurance", "value": {"value": insurance, "masked": False}},
            {"label": "Phone", "value": {"value": rec.get("u_phone") or "—", "masked": False}},
            {"label": "SUD treatment history (42 CFR Part 2)", "value": part2_field},
        ],
        "aiSummary": {"text": summary, "citations": citations},
        "history": hist,
        "part2Content": part2_content,
    }


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

    names = {"c_ssrs": "C-SSRS", "phq9": "PHQ-9", "gad7": "GAD-7",
             "nida_qs": "NIDA Quick Screen", "audit": "AUDIT", "dast10": "DAST-10",
             "craving": "Craving & Triggers", "sows": "SOWS (Withdrawal)",
             "bam": "BAM", "socrates8": "SOCRATES (Readiness)"}
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
