"""Eligibility & cost estimate (patient portal P5 Coverage) over u_bhuc_eligibility.

GET  /eligibility                     -> latest eligibility for the signed-in patient
POST /eligibility/verify              -> (re)run verification, upsert the row
POST /financial-counselor/request     -> flag a counselor request on the row
"""

import logging
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from .common import b, find_patient_by_email, patient_sys_id
from .servicenow import get_table_client

logger = logging.getLogger("bhuc.eligibility")
router = APIRouter(prefix="/api/x_bhuc", tags=["Eligibility"])

ELIG = "u_bhuc_eligibility"


def _shape(rec: dict, patient: Optional[dict]) -> dict:
    """u_bhuc_eligibility row (or derived-from-patient fallback) -> Eligibility."""
    if rec:
        status = rec.get("u_status") or "pending"
        est = None
        if rec.get("u_allowed_amount") not in (None, ""):
            est = {
                "visitType": rec.get("u_visit_type") or "urgent_behavioral",
                "allowedAmount": float(rec.get("u_allowed_amount") or 0),
                "patientResponsibility": float(rec.get("u_patient_responsibility") or 0),
                "currency": rec.get("u_currency") or "USD",
                "asOf": rec.get("u_estimate_as_of") or "",
            }
        return {
            "status": status,
            "payer": rec.get("u_payer") or "",
            "plan": rec.get("u_plan") or "",
            "effectiveDate": rec.get("u_effective_date") or "",
            "estimate": est,
        }
    # No eligibility row yet — derive a sensible status from the patient record.
    if patient and b(patient.get("u_self_pay")):
        return {"status": "self_pay", "payer": "", "plan": "", "estimate": None}
    if patient and patient.get("u_insurance_provider"):
        return {"status": "pending", "payer": patient.get("u_insurance_provider"),
                "plan": "", "estimate": None}
    return {"status": "none", "estimate": None}


def _latest(patient_id: str) -> Optional[dict]:
    if not patient_id:
        return None
    rows = get_table_client().list(
        ELIG, f"u_patient={patient_id}^ORDERBYDESCsys_updated_on", limit=1)
    return rows[0] if rows else None


@router.get("/eligibility")
def get_eligibility(email: str = Query(""), patient: str = Query("")) -> dict:
    rec = find_patient_by_email(email) if email else None
    pid = patient or (rec["sys_id"] if rec else "")
    return _shape(_latest(pid), rec)


class VerifyReq(BaseModel):
    email: Optional[str] = None
    patient: Optional[str] = None


@router.post("/eligibility/verify")
def verify_eligibility(req: VerifyReq) -> dict:
    """Re-check coverage. Demo: mark active with a standard estimate, upsert the row."""
    table = get_table_client()
    rec = find_patient_by_email(req.email) if req.email else None
    pid = req.patient or (rec["sys_id"] if rec else "")
    if not pid:
        return {"status": "none", "estimate": None}
    self_pay = bool(rec and b(rec.get("u_self_pay")))
    payer = (rec or {}).get("u_insurance_provider") or ""
    fields = {
        "u_patient": pid,
        "u_status": "self_pay" if self_pay else ("active" if payer else "none"),
        "u_payer": payer,
        "u_plan": "PPO",
        "u_visit_type": "urgent_behavioral",
        "u_allowed_amount": "220",
        "u_patient_responsibility": "40" if payer and not self_pay else "220",
        "u_currency": "USD",
        "u_estimate_as_of": "2026-07-09",
        "u_effective_date": "2026-01-01",
        "u_verified_at": "2026-07-09 12:00:00",
    }
    existing = _latest(pid)
    row = table.update(ELIG, existing["sys_id"], fields) if existing else table.create(ELIG, fields)
    return _shape(row, rec)


class CounselorReq(BaseModel):
    email: Optional[str] = None
    patient: Optional[str] = None
    note: Optional[str] = None


@router.post("/financial-counselor/request")
def request_counselor(req: CounselorReq) -> dict:
    """Flag a financial-counselor request on the patient's eligibility row."""
    table = get_table_client()
    pid = patient_sys_id(req.email or "", req.patient or "")
    if pid:
        fields = {"u_counselor_requested": "true",
                  "u_counselor_requested_at": "2026-07-09 12:00:00",
                  "u_counselor_note": (req.note or "")[:500]}
        existing = _latest(pid)
        if existing:
            table.update(ELIG, existing["sys_id"], fields)
        else:
            table.create(ELIG, {"u_patient": pid, **fields})
    return {"requestId": "fc-req", "sla": "1_business_day"}
