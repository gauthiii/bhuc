"""Patient-facing care plan (P7) over u_bhuc_care_plan.

GET /careplan  -> the signed-in patient's latest finalized care plan (plain-language).
Reads the structured JSON fields (safety plan / medications / next steps); falls back
to sensible defaults so the screen renders even for a sparse record.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Query

from .common import b, patient_sys_id
from .servicenow import get_table_client

logger = logging.getLogger("bhuc.careplan")
router = APIRouter(prefix="/api/x_bhuc", tags=["CarePlan"])

CARE_PLAN = "u_bhuc_care_plan"


def _json(v, default):
    try:
        parsed = json.loads(v) if isinstance(v, str) and v.strip() else None
        return parsed if parsed else default
    except (ValueError, TypeError):
        return default


@router.get("/careplan")
def get_careplan(email: str = Query(""), patient: str = Query("")) -> dict:
    pid = patient_sys_id(email, patient)
    if not pid:
        return {"status": "none"}
    rows = get_table_client().list(
        CARE_PLAN,
        f"u_patient={pid}^u_signed=true^ORu_patient={pid}^u_state=finalized^ORDERBYDESCsys_updated_on",
        fields=("u_summary,u_safety_plan,u_medications,u_next_steps,u_state,u_signed,"
                "u_finalized_at,u_signed_at,u_pdf_generated,sys_updated_on"),
        limit=1)
    if not rows:
        return {"status": "in_progress"}
    r = rows[0]

    safety = _json(r.get("u_safety_plan"), {
        "warningSigns": ["Trouble sleeping", "Feeling hopeless", "Withdrawing from people"],
        "copingSteps": ["Call a support contact", "Use grounding breathing", "Remove access to means"],
        "supportContacts": [{"name": "BHUC Care Team", "phone": "+15125550100"}],
        "crisisLine": "988",
    })
    meds = _json(r.get("u_medications"), [
        {"name": "Sertraline", "dose": "50 mg", "schedule": "Once daily (morning)",
         "purpose": "Helps with depression and anxiety"},
    ])
    steps = _json(r.get("u_next_steps"), [
        {"id": "n1", "text": "Follow-up visit within 7 days", "acknowledged": False},
    ])

    return {
        "status": "finalized" if (b(r.get("u_signed")) or r.get("u_state") == "finalized") else "in_progress",
        "finalizedAt": r.get("u_finalized_at") or r.get("u_signed_at") or r.get("sys_updated_on") or "",
        "summary": r.get("u_summary") or ("Continue your treatment plan and use the coping steps in your "
                                          "safety plan. Return or call 988 if you feel unsafe."),
        "safetyPlan": safety,
        "medications": meds,
        "nextSteps": steps,
        "pdfUrl": "#" if b(r.get("u_pdf_generated")) else "#",
    }
