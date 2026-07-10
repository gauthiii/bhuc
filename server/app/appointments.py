"""Appointments (patient P6) + Scheduling (clinician C8, Agent 6) over u_bhuc_appointment.

GET  /appointments                 -> {upcoming, past} for the signed-in patient
GET  /appointments/availability    -> open slots (generated)
POST /appointments                 -> book (create a confirmed appointment)
GET  /scheduling?patient=          -> Scheduling Agent (6) fairness-checked matches
POST /scheduling/confirm           -> confirm a proposed match
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from .common import find_patient_by_email, patient_sys_id, raw
from .config import get_settings
from .servicenow import get_a2a_client, get_table_client

logger = logging.getLogger("bhuc.appointments")
router = APIRouter(prefix="/api/x_bhuc", tags=["Appointments"])

APPT = "u_bhuc_appointment"
PATIENT = "u_bhuc_patient"
_FIELDS = ("u_number,u_start,u_end,u_visit_type,u_modality,u_status,u_location,"
           "u_telehealth_url,u_clinician.name,sys_id")

# The fairness script (Agent 6, bhuc_scheduling_fairness) deterministically strips these
# protected attributes from matching. Surfaced to the C8 fairness banner.
_FAIRNESS_EXCLUDED = ["race", "ethnicity", "gender", "zip", "insurance_type"]


def _iso(sn_dt: str) -> str:
    """'YYYY-MM-DD HH:MM:SS' -> ISO 'YYYY-MM-DDTHH:MM:SSZ' for the frontend."""
    s = (sn_dt or "").strip()
    return s.replace(" ", "T") + "Z" if s else ""


def _shape(rec: dict) -> dict:
    return {
        "id": rec.get("sys_id"),
        "number": rec.get("u_number") or "",
        "start": _iso(rec.get("u_start")),
        "end": _iso(rec.get("u_end")),
        "visitType": (rec.get("u_visit_type") or "").replace("_", " ").title() or "Visit",
        "modality": rec.get("u_modality") or "telehealth",
        "clinician": rec.get("u_clinician.name") or "",
        "status": rec.get("u_status") or "proposed",
        "location": rec.get("u_location") or "",
        "telehealthUrl": rec.get("u_telehealth_url") or "",
    }


@router.get("/appointments")
def get_appointments(email: str = Query(""), patient: str = Query("")) -> dict:
    pid = patient_sys_id(email, patient)
    if not pid:
        return {"upcoming": [], "past": []}
    rows = get_table_client().list(
        APPT, f"u_patient={pid}^ORDERBYDESCu_start", fields=_FIELDS, limit=50)
    upcoming, past = [], []
    for r in rows:
        shaped = _shape(r)
        (past if shaped["status"] in ("completed", "cancelled", "no_show") else upcoming).append(shaped)
    upcoming.reverse()  # soonest first
    return {"upcoming": upcoming, "past": past}


@router.get("/appointments/availability")
def get_availability() -> list:
    base = datetime.utcnow().replace(minute=0, second=0, microsecond=0) + timedelta(days=1)
    return [{"slotId": f"s{i}", "start": _iso((base + timedelta(hours=h)).strftime("%Y-%m-%d %H:%M:%S"))}
            for i, h in enumerate([9, 10, 13, 14])]


class BookReq(BaseModel):
    slotId: Optional[str] = None
    start: Optional[str] = None            # patient's requested ISO datetime
    email: Optional[str] = None
    patient: Optional[str] = None
    visitType: Optional[str] = None
    modality: Optional[str] = None
    reasonCategory: Optional[str] = None   # crisis|medication|therapy|intake|other
    reasonText: Optional[str] = None


@router.post("/appointments")
def book_appointment(req: BookReq) -> dict:
    """Patient books a request: date + time + reason. Saved as PENDING (u_start = requested);
    the Scheduling Agent later assigns a suggested slot (-> proposed) for clinician review."""
    table = get_table_client()
    pid = patient_sys_id(req.email or "", req.patient or "")
    slot_map = {s["slotId"]: s["start"] for s in get_availability()}
    start_iso = req.start or slot_map.get(req.slotId or "", "")
    start_sn = start_iso.replace("T", " ").replace("Z", "") if start_iso else \
        (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
    fields = {
        "u_patient": pid,
        "u_start": start_sn,               # requested time (agent may move it)
        "u_requested_start": start_sn,     # preserved original request
        "u_visit_type": req.visitType or "urgent_behavioral",
        "u_modality": req.modality or "telehealth",
        "u_status": "pending",             # awaiting the Scheduling Agent
        "u_reason_category": req.reasonCategory or "other",
        "u_reason_text": (req.reasonText or "")[:1000],
    }
    rec = table.create(APPT, fields)
    full = table.list(APPT, f"sys_id={rec['sys_id']}", fields=_FIELDS, limit=1)
    return _shape(full[0] if full else rec)


# ---- Scheduling review queue (Agent 6 v2) --------------------------------
# Patient books -> pending. "Run scheduling agent" invokes Agent 6, which reads the pending
# queue, applies the fairness check, and writes suggested slots (-> proposed). The clinician
# reviews the proposed list and accepts (-> confirmed) or rejects (-> back to pending).

_Q_FIELDS = ("u_number,u_status,u_start,u_requested_start,u_reason_category,u_reason_text,"
             "u_triage_priority,u_visit_type,u_modality,u_patient.u_number,"
             "u_patient.u_first_name,u_patient.u_last_name,sys_id")

_REASON_LABEL = {"crisis": "Crisis", "medication": "Medication", "therapy": "Therapy",
                 "intake": "Intake", "other": "Other"}


def _queue_item(r: dict) -> dict:
    fn, ln = r.get("u_patient.u_first_name", ""), r.get("u_patient.u_last_name", "")
    return {
        "id": r.get("sys_id"),
        "number": r.get("u_number") or "",
        "patientName": f"{fn} {ln}".strip() or r.get("u_patient.u_number") or "Patient",
        "patientNumber": r.get("u_patient.u_number") or "",
        "status": r.get("u_status") or "",
        "reasonCategory": r.get("u_reason_category") or "other",
        "reasonLabel": _REASON_LABEL.get(r.get("u_reason_category") or "other", "Other"),
        "reasonText": r.get("u_reason_text") or "",
        "requestedStart": _iso(r.get("u_requested_start") or r.get("u_start")),
        "suggestedStart": _iso(r.get("u_start")),
        "urgency": r.get("u_triage_priority") or "",
        "visitType": (r.get("u_visit_type") or "").replace("_", " ").title(),
        "modality": r.get("u_modality") or "telehealth",
    }


@router.get("/scheduling/queue")
def scheduling_queue() -> dict:
    """The clinician's scheduling board: pending requests + agent-proposed slots to review."""
    table = get_table_client()
    proposed = table.list(APPT, "u_status=proposed^ORDERBYu_start", fields=_Q_FIELDS, limit=100)
    pending = table.list(APPT, "u_status=pending^ORDERBYu_start", fields=_Q_FIELDS, limit=100)
    return {
        "pendingCount": len(pending),
        "proposed": [_queue_item(r) for r in proposed],
        "pending": [_queue_item(r) for r in pending],
    }


@router.post("/scheduling/run")
def scheduling_run() -> dict:
    """Invoke the Scheduling Agent (6) to process the pending queue: fairness check + assign
    suggested slots (-> proposed). Returns the refreshed board."""
    table = get_table_client()
    before = len(table.list(APPT, "u_status=proposed", fields="sys_id", limit=200))
    try:
        get_a2a_client().execute_agent(
            get_settings().snow_agent_scheduling,
            "Process the pending scheduling queue: read the pending appointment requests, run "
            "the fairness check, and assign fair suggested slots based on availability. Write "
            "them back as proposed for clinician review.")
    except Exception as exc:  # noqa: BLE001 — surface a soft error; board still returns
        logger.warning("Agent 6 scheduling run failed: %s", exc)
        board = scheduling_queue()
        return {"ok": False, "error": "agent_unavailable", "newProposals": 0, **board}
    board = scheduling_queue()
    after = len(board["proposed"])
    return {"ok": True, "newProposals": max(0, after - before), **board}


# ---- Clinician calendar / dashboard ----
_CAL_FIELDS = ("u_number,u_status,u_start,u_reason_category,u_reason_text,u_visit_type,"
               "u_modality,u_patient,u_patient.u_number,u_patient.u_first_name,"
               "u_patient.u_last_name,sys_id")


@router.get("/clinician/calendar")
def clinician_calendar() -> dict:
    """All confirmed + completed appointments (clinic-wide) for the calendar/dashboard,
    plus the count of pending requests (drives the 'Pending' card -> Scheduling)."""
    table = get_table_client()
    rows = table.list(APPT, "u_statusINconfirmed,completed^ORDERBYu_start",
                      fields=_CAL_FIELDS, limit=500)
    appts = []
    for r in rows:
        fn, ln = r.get("u_patient.u_first_name", ""), r.get("u_patient.u_last_name", "")
        appts.append({
            "id": r.get("sys_id"),
            "number": r.get("u_number") or "",
            "patientId": raw(r.get("u_patient")) or "",   # reference -> sys_id (not the {link,value} object)
            "patientName": f"{fn} {ln}".strip() or r.get("u_patient.u_number") or "Patient",
            "patientNumber": r.get("u_patient.u_number") or "",
            "start": _iso(r.get("u_start")),
            "status": r.get("u_status") or "",
            "reasonCategory": r.get("u_reason_category") or "other",
            "reasonLabel": _REASON_LABEL.get(r.get("u_reason_category") or "other", "Other"),
            "visitType": (r.get("u_visit_type") or "").replace("_", " ").title(),
            "modality": r.get("u_modality") or "telehealth",
        })
    pending = len(table.list(APPT, "u_status=pending", fields="sys_id", limit=200))
    return {"pendingCount": pending, "appointments": appts}


class ApptActionReq(BaseModel):
    id: str


@router.post("/scheduling/accept")
def scheduling_accept(req: ApptActionReq) -> dict:
    """Clinician accepts a proposed slot -> confirmed."""
    get_table_client().update(APPT, req.id, {"u_status": "confirmed"})
    return {"ok": True, "status": "confirmed"}


@router.post("/scheduling/reject")
def scheduling_reject(req: ApptActionReq) -> dict:
    """Clinician rejects a proposed slot -> back to pending (restores the requested time so the
    next agent run re-suggests). Per DEC 2026-07-09."""
    table = get_table_client()
    rec = table.get(APPT, req.id)
    restore = (rec or {}).get("u_requested_start") or (rec or {}).get("u_start") or ""
    fields = {"u_status": "pending", "u_proposed_by_agent": "false"}
    if restore:
        fields["u_start"] = restore
    table.update(APPT, req.id, fields)
    return {"ok": True, "status": "pending"}
