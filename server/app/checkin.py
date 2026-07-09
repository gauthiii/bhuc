"""Post-discharge follow-up check-in (patient P9) over u_bhuc_check_in.

GET  /checkin/{id}   -> the patient's active check-in (prompt + questions)
POST /checkin/{id}   -> record answers; escalate on self-harm / very-low wellbeing
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from .common import patient_sys_id
from .servicenow import get_table_client

logger = logging.getLogger("bhuc.checkin")
router = APIRouter(prefix="/api/x_bhuc", tags=["CheckIn"])

CHECKIN = "u_bhuc_check_in"

# Standard post-discharge check-in questions (static content, mirrors the screening stepper).
_QUESTIONS = [
    {"id": "wellbeing", "text": "Overall, how are you feeling today? (0 = worst, 10 = best)",
     "options": [{"value": i, "label": str(i)} for i in range(11)]},
    {"id": "medAdherence", "text": "Are you taking your medications as prescribed?",
     "options": [{"value": "yes", "label": "Yes"}, {"value": "mostly", "label": "Mostly"},
                 {"value": "no", "label": "No"}, {"value": "na", "label": "N/A"}]},
    {"id": "selfHarm", "text": "In the past few days, have you had thoughts of harming yourself?",
     "options": [{"value": "no", "label": "No"}, {"value": "yes", "label": "Yes"}]},
]


def _pending(pid: str) -> Optional[dict]:
    rows = get_table_client().list(
        CHECKIN, f"u_patient={pid}^u_status=pending^ORDERBYDESCsys_created_on",
        fields="sys_id,u_number,u_due_date", limit=1)
    return rows[0] if rows else None


@router.get("/checkin/{check_in_id}")
def get_checkin(check_in_id: str, email: str = Query(""), patient: str = Query("")) -> dict:
    """Return the patient's active check-in. Creates a pending row if none exists so the
    submission has something to update."""
    table = get_table_client()
    pid = patient_sys_id(email, patient)
    due = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
    row = _pending(pid) if pid else None
    if not row and pid:
        row = table.create(CHECKIN, {
            "u_patient": pid, "u_status": "pending", "u_due_date": due,
            "u_questions": json.dumps([q["id"] for q in _QUESTIONS])})
    cid = (row or {}).get("u_number") or check_in_id
    return {"id": cid, "dueDate": (row or {}).get("u_due_date") or due, "questions": _QUESTIONS}


class SubmitReq(BaseModel):
    # the page posts the answers object directly (Record<string, number|string>)
    wellbeing: Optional[object] = None
    medAdherence: Optional[str] = None
    selfHarm: Optional[str] = None
    email: Optional[str] = None
    patient: Optional[str] = None


@router.post("/checkin/{check_in_id}")
async def submit_checkin(check_in_id: str, req: dict) -> dict:
    """Record the check-in answers. Accepts the raw answers map."""
    table = get_table_client()
    email = req.get("email", "")
    patient = req.get("patient", "")
    pid = patient_sys_id(email, patient)

    wellbeing = req.get("wellbeing")
    med = req.get("medAdherence")
    self_harm = req.get("selfHarm")
    try:
        wb = int(wellbeing) if wellbeing is not None and str(wellbeing) != "" else None
    except (ValueError, TypeError):
        wb = None
    escalate = (self_harm == "yes") or (wb is not None and wb <= 2)
    level = "crisis" if self_harm == "yes" else ("elevated" if (wb is not None and wb <= 2) else "none")
    next_ci = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")

    if pid:
        fields = {
            "u_responses": json.dumps({k: v for k, v in req.items() if k not in ("email", "patient")}),
            "u_wellbeing_score": str(wb) if wb is not None else "",
            "u_med_adherence": med or "",
            "u_self_harm": self_harm or "",
            "u_escalate": "true" if escalate else "false",
            "u_distress_level": level,
            "u_status": "completed",
            "u_completed_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "u_next_check_in": next_ci,
        }
        row = _pending(pid)
        if row:
            table.update(CHECKIN, row["sys_id"], fields)
        else:
            table.create(CHECKIN, {"u_patient": pid, **fields})
    return {"recorded": True, "escalate": escalate, "nextCheckIn": next_ci}
