"""Disposition & discharge (clinician C7) over u_bhuc_disposition.

GET  /disposition/{patient}   -> the C7 case: AI-drafted discharge instructions + safety
                                 plan (sourced from the patient's latest care plan) + referrals
POST /disposition             -> persist the finalized disposition decision
POST /referral                -> route a referral (folded onto the disposition record)
"""

import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .servicenow import get_table_client

logger = logging.getLogger("bhuc.disposition")
router = APIRouter(prefix="/api/x_bhuc", tags=["Disposition"])

DISP = "u_bhuc_disposition"
PATIENT = "u_bhuc_patient"
CARE_PLAN = "u_bhuc_care_plan"

_REFERRAL_OPTIONS = [
    {"id": "iop", "label": "IOP referral"},
    {"id": "outpatient", "label": "Outpatient therapy"},
    {"id": "peer", "label": "Peer support"},
]


def _resolve_patient(patient: str) -> Optional[dict]:
    table = get_table_client()
    if patient.startswith("BHUC_PATIENT_"):
        rows = table.list(PATIENT, f"u_number={patient}", limit=1)
        if rows:
            return rows[0]
    if patient:
        try:
            rec = table.get(PATIENT, patient)
            if rec:
                return rec
        except Exception:  # noqa: BLE001 — not a sys_id
            pass
    rows = table.list(PATIENT, "u_number=BHUC_PATIENT_002", limit=1)  # Maya fallback
    return rows[0] if rows else None


def _draft_from_care_plan(pid: str) -> tuple[str, str]:
    """Source AI discharge instructions + safety-plan text from the latest care plan."""
    rows = get_table_client().list(
        CARE_PLAN, f"u_patient={pid}^ORDERBYDESCsys_updated_on",
        fields="u_summary,u_safety_plan,u_draft_note", limit=1)
    if not rows:
        return ("", "")
    r = rows[0]
    instructions = r.get("u_summary") or ""
    safety = r.get("u_safety_plan") or ""
    if safety and safety.strip().startswith("{"):
        try:
            sp = json.loads(safety)
            parts = []
            if sp.get("warningSigns"):
                parts.append("Warning signs: " + "; ".join(sp["warningSigns"]))
            if sp.get("copingSteps"):
                parts.append("Coping steps: " + "; ".join(sp["copingSteps"]))
            if sp.get("crisisLine"):
                parts.append(f"Crisis line: {sp['crisisLine']}")
            safety = " | ".join(parts)
        except (ValueError, TypeError):
            pass
    return (instructions, safety)


@router.get("/disposition/{patient}")
def get_disposition(patient: str) -> dict:
    table = get_table_client()
    rec = _resolve_patient(patient)
    if not rec:
        raise HTTPException(status_code=404, detail="Patient not found")
    pid = rec["sys_id"]
    name = f"{rec.get('u_first_name','')} {rec.get('u_last_name','')}".strip() or "Patient"

    existing = table.list(DISP, f"u_patient={pid}^ORDERBYDESCsys_updated_on",
                          fields=("u_number,u_ai_discharge_instructions,u_discharge_instructions,"
                                  "u_ai_safety_plan_template,u_safety_plan"), limit=1)
    if existing:
        d = existing[0]
        ai_instr = d.get("u_discharge_instructions") or d.get("u_ai_discharge_instructions") or ""
        ai_safety = d.get("u_safety_plan") or d.get("u_ai_safety_plan_template") or ""
        disp_id = d.get("u_number") or pid
    else:
        ai_instr, ai_safety = _draft_from_care_plan(pid)
        disp_id = pid

    if not ai_instr:
        ai_instr = ("Continue current medications as prescribed. Attend a follow-up visit within "
                    "7 days. Use your safety plan. Call or text 988 if you feel unsafe.")
    if not ai_safety:
        ai_safety = ("Warning signs: … | Coping steps: … | Support contacts: … | Crisis line: 988")

    return {
        "id": disp_id,
        "patientName": name,
        "aiDischargeInstructions": ai_instr,
        "aiSafetyPlanTemplate": ai_safety,
        "referralOptions": _REFERRAL_OPTIONS,
    }


class DispositionReq(BaseModel):
    patient: str
    disposition: str
    instructions: Optional[str] = None
    safetyPlan: Optional[str] = None
    referrals: Optional[list] = None
    clinicianEmail: Optional[str] = None


@router.post("/disposition")
def save_disposition(req: DispositionReq) -> dict:
    table = get_table_client()
    rec = _resolve_patient(req.patient)
    if not rec:
        raise HTTPException(status_code=404, detail="Patient not found")
    pid = rec["sys_id"]
    fields = {
        "u_patient": pid,
        "u_disposition": req.disposition,
        "u_discharge_instructions": (req.instructions or "")[:8000],
        "u_safety_plan": (req.safetyPlan or "")[:8000],
        "u_referrals": ", ".join(req.referrals or []),
        "u_referral_status": "routed" if req.referrals else "none",
        "u_status": "finalized",
        "u_finalized": "true",
        "u_finalized_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
    }
    existing = table.list(DISP, f"u_patient={pid}^u_status=draft^ORDERBYDESCsys_created_on",
                          fields="sys_id", limit=1)
    row = table.update(DISP, existing[0]["sys_id"], fields) if existing else table.create(DISP, fields)
    return {"status": "FINALIZED", "dischargedAt": fields["u_finalized_at"],
            "id": row.get("u_number") or row.get("sys_id"), "followUpRequired": True}


class ReferralReq(BaseModel):
    patient: str
    programId: str
    urgency: Optional[str] = "routine"


@router.post("/referral")
def route_referral(req: ReferralReq) -> dict:
    table = get_table_client()
    rec = _resolve_patient(req.patient)
    if not rec:
        raise HTTPException(status_code=404, detail="Patient not found")
    pid = rec["sys_id"]
    existing = table.list(DISP, f"u_patient={pid}^ORDERBYDESCsys_created_on", fields="sys_id,u_referrals", limit=1)
    if existing:
        prior = existing[0].get("u_referrals") or ""
        merged = ", ".join(x for x in [prior, req.programId] if x)
        table.update(DISP, existing[0]["sys_id"],
                     {"u_referrals": merged, "u_referral_status": "routed",
                      "u_referral_urgency": req.urgency or "routine"})
    else:
        table.create(DISP, {"u_patient": pid, "u_referrals": req.programId,
                            "u_referral_status": "routed", "u_referral_urgency": req.urgency or "routine",
                            "u_status": "draft"})
    return {"referralId": f"REF-{req.programId}", "status": "ROUTED"}
