"""BHUC Risk Identification Agent (Agent 2) — screening + clinician confirmation.

Wiring model (DEC-1): backend writes the screening record via Table API, then invokes
Agent 2 over A2A (blocking) with the record's sys_id; the agent scores + routes to the
clinician confirmation subflow. ServiceNow triggers stay OFF (no double-fire). Open/
pre-governance for now (Cognito JWT + ACLs deferred).

Endpoints (mounted under /api/x_bhuc):
  POST /intake/screening  — patient submits an instrument → scored ScreeningResult
  GET  /worklist          — clinician queue of scored screenings awaiting confirmation
  GET  /risk/{id}         — one screening's risk detail
  POST /risk/confirm      — clinician confirm / adjust / reject
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .config import get_settings
from .servicenow import A2AError, get_a2a_client, get_table_client

logger = logging.getLogger("bhuc.risk")

router = APIRouter(prefix="/api/x_bhuc", tags=["Risk Identification Agent"])

TABLE = "u_bhuc_screening"
NEXT_INSTRUMENT = {"c_ssrs": "phq9", "phq9": "gad7", "gad7": None}


def _severity(instrument: str, score: Optional[int]) -> Optional[str]:
    if score is None:
        return "na"
    if instrument == "phq9":
        return ("severe" if score >= 20 else "moderately_severe" if score >= 15
                else "moderate" if score >= 10 else "mild" if score >= 5 else "minimal")
    if instrument == "gad7":
        return ("severe" if score >= 15 else "moderate" if score >= 10
                else "mild" if score >= 5 else "minimal")
    return "na"


class ScreeningSubmit(BaseModel):
    instrument: str
    answers: dict
    sessionId: Optional[str] = None
    # Which patient this screening is for (sys_id). Optional while pre-auth.
    patient: Optional[str] = None


@router.post("/intake/screening")
def submit_screening(req: ScreeningSubmit) -> dict:
    settings = get_settings()
    table = get_table_client()

    numeric = [v for v in req.answers.values() if isinstance(v, (int, float))]
    score = int(sum(numeric)) if req.instrument in ("phq9", "gad7") else None
    item9 = float(req.answers.get("q9", 0) or 0) > 0
    cssrs_positive = req.instrument == "c_ssrs" and any(
        str(v).lower() == "yes" for v in req.answers.values())
    flags = []
    if item9:
        flags.append("item9_positive")
    if cssrs_positive:
        flags.append("cssrs_positive")

    # 1) write the screening record (state=submitted) so the agent has a sys_id target.
    fields = {
        "u_instrument": req.instrument,
        "u_responses": json.dumps(req.answers),
        "u_state": "submitted",
        "u_clinician_action": "pending",
        "u_session_id": req.sessionId or "",
        "u_raw_score": "" if score is None else str(score),
        "u_flags": ", ".join(flags),
    }
    if req.patient:
        fields["u_patient"] = req.patient
    rec = table.create(TABLE, fields)
    sys_id = rec["sys_id"]

    # 2) invoke Agent 2 (blocking) — it scores and writes risk_band/confidence/rationale.
    answer_lines = "\n".join(f"  {k}: {v}" for k, v in req.answers.items())
    msg = (
        f"Score this behavioral-health screening and write the draft result back for "
        f"clinician confirmation.\n\nscreening_sys_id: {sys_id}\nInstrument: {req.instrument}\n"
        f"Responses:\n{answer_lines}\n\nUsing the instrument scoring rules, return a risk band "
        f"(low/moderate/high), a confidence (0-100), and a rationale citing the specific "
        f"responses. Then use the write tool with the screening_sys_id above, and run the "
        f"clinician confirmation subflow. Do not finalize."
    )
    try:
        get_a2a_client().execute_agent(settings.snow_agent_risk, msg)
    except A2AError as exc:
        logger.error("Agent 2 A2A failed: %s", exc)
        raise HTTPException(status_code=502, detail="Risk agent unavailable") from exc

    # 3) re-read the record for what the agent wrote.
    scored = table.get(TABLE, sys_id)
    risk_band = scored.get("u_risk_band") or ("high" if (item9 or cssrs_positive) else "moderate")
    try:
        confidence = int(scored.get("u_confidence") or 0)
    except (TypeError, ValueError):
        confidence = 0

    return {
        "instrument": req.instrument,
        "screeningId": scored.get("u_number") or sys_id,
        "score": score,
        "severity": _severity(req.instrument, score),
        "riskBand": risk_band,
        "confidence": confidence,
        "rationale": scored.get("u_rationale") or "",
        "flags": flags,
        "escalate": risk_band == "high",
        "nextInstrument": NEXT_INSTRUMENT.get(req.instrument),
    }


@router.get("/worklist")
def worklist() -> list:
    table = get_table_client()
    rows = table.list(
        TABLE, "u_state=scored^u_clinician_action=pending^ORDERBYDESCsys_updated_on",
        fields="sys_id,u_number,u_patient,u_instrument,u_risk_band,u_confidence",
        display_value="all", limit=50)

    def dv(v):
        return v["display_value"] if isinstance(v, dict) else v

    def raw(v):
        return v["value"] if isinstance(v, dict) else v

    out = []
    for r in rows:
        band = (raw(r.get("u_risk_band")) or "unknown").lower()   # 'high' not 'High'
        try:
            conf = int(raw(r.get("u_confidence")) or 0)
        except (TypeError, ValueError):
            conf = 0
        out.append({
            "screeningId": dv(r.get("u_number")) or dv(r.get("sys_id")),
            "sysId": raw(r.get("sys_id")),
            "patientId": raw(r.get("u_patient")) or "",
            "patientName": dv(r.get("u_patient")) or "Unknown",
            "riskBand": band,
            "confidence": conf,
            "waitMinutes": 0,
            "requiresConfirmation": band in ("moderate", "high"),
        })
    return out


@router.get("/risk/{screening_id}")
def risk_detail(screening_id: str) -> dict:
    table = get_table_client()
    # accept either sys_id or BHUC_SCREENING_00x number
    if len(screening_id) == 32:
        rec = table.get(TABLE, screening_id, display_value="all")
    else:
        found = table.list(TABLE, f"u_number={screening_id}", display_value="all", limit=1)
        if not found:
            raise HTTPException(status_code=404, detail="Screening not found")
        rec = found[0]

    def dv(v):
        return v["display_value"] if isinstance(v, dict) else v

    responses = {}
    try:
        responses = json.loads((rec.get("u_responses") or {}).get("value") if isinstance(rec.get("u_responses"), dict) else rec.get("u_responses") or "{}")
    except (json.JSONDecodeError, TypeError):
        pass
    action = (dv(rec.get("u_clinician_action")) or "pending").lower()
    return {
        "screeningId": dv(rec.get("u_number")),
        "sysId": dv(rec.get("sys_id")),
        "patientName": dv(rec.get("u_patient")) or "Unknown",
        "instrument": (rec.get("u_instrument") or {}).get("value") if isinstance(rec.get("u_instrument"), dict) else rec.get("u_instrument"),
        "riskBand": (rec.get("u_risk_band") or {}).get("value") if isinstance(rec.get("u_risk_band"), dict) else (rec.get("u_risk_band") or "unknown"),
        "confidence": int((rec.get("u_confidence") or {}).get("value") or 0) if isinstance(rec.get("u_confidence"), dict) else int(rec.get("u_confidence") or 0),
        "rationale": dv(rec.get("u_rationale")) or "",
        "contributingInputs": [{"label": k, "answer": str(v)} for k, v in responses.items()],
        "status": action if action in ("pending", "confirmed", "adjusted", "rejected") else "pending",
    }


class RiskConfirm(BaseModel):
    id: str
    action: str = Field(..., pattern="^(confirmed|adjusted|rejected)$")
    rationale: str = ""


@router.post("/risk/confirm")
def confirm_risk(req: RiskConfirm) -> dict:
    table = get_table_client()
    sys_id = req.id
    if len(sys_id) != 32:
        found = table.list(TABLE, f"u_number={req.id}", fields="sys_id", limit=1)
        if not found:
            raise HTTPException(status_code=404, detail="Screening not found")
        sys_id = found[0]["sys_id"]
    table.update(TABLE, sys_id, {
        "u_clinician_action": req.action,
        "u_clinician_rationale": req.rationale,
        "u_state": "confirmed" if req.action != "rejected" else "scored",
    })
    return {"ok": True}
