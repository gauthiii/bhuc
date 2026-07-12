"""Crisis escalations (u_bhuc_escalation) + a clinician notification feed.

Escalations are raised by the Front-Door Security Agent's 988 subflow (anonymous — no
patient) or by authenticated check-in/screening flows (patient-linked). This router lists
them for the clinician Escalations screen and lets a clinician acknowledge / resolve them.

The notification feed aggregates recent activity a clinician should see: new registrations,
new screenings, appointment changes, and new escalations — newest first.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header
from pydantic import BaseModel, Field

from .access import clinician_email
from .servicenow import get_table_client

logger = logging.getLogger("bhuc.escalations")
router = APIRouter(prefix="/api/x_bhuc", tags=["Escalations"])

ESC = "u_bhuc_escalation"
PATIENT = "u_bhuc_patient"
SCREEN = "u_bhuc_screening"
APPT = "u_bhuc_appointment"


def _dv(r, k):
    v = r.get(k)
    return v.get("display_value") if isinstance(v, dict) else v


def _val(r, k):
    v = r.get(k)
    return v.get("value") if isinstance(v, dict) else v


def _b(v) -> bool:
    return str(_val_of(v)).lower() in ("true", "1")


def _val_of(v):
    return v.get("value") if isinstance(v, dict) else v


def _patient_name(r, prefix="u_patient") -> Optional[str]:
    name = f"{_dv(r, prefix + '.u_first_name') or ''} {_dv(r, prefix + '.u_last_name') or ''}".strip()
    return name or None


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _resolve_sys_id(table, esc_id: str) -> Optional[str]:
    if len(esc_id) == 32:
        return esc_id
    found = table.list(ESC, f"u_number={esc_id}", fields="sys_id", limit=1)
    return _val(found[0], "sys_id") if found else None


@router.get("/escalations")
def list_escalations() -> list:
    """All crisis escalations, newest first. A row with no linked patient is an anonymous
    front-door escalation → surfaced as an unregistered patient."""
    table = get_table_client()
    rows = table.list(
        ESC, "ORDERBYDESCsys_created_on",
        fields=("u_number,u_source,u_channel,u_message,u_detected_by,u_status,u_oncall_notified,"
                "u_acknowledged_by,u_acknowledged_at,u_notes,u_patient,u_patient.u_first_name,"
                "u_patient.u_last_name,u_patient.u_number,sys_created_on"),
        display_value="all", limit=100)
    out = []
    for r in rows:
        pname = _patient_name(r)
        out.append({
            "id": _dv(r, "u_number") or _val(r, "sys_id"),
            "source": _dv(r, "u_source") or "—",
            "channel": _dv(r, "u_channel") or "—",
            "message": _dv(r, "u_message") or "",
            "detectedBy": _dv(r, "u_detected_by") or "—",
            "status": (_dv(r, "u_status") or "open").lower(),
            "onCallNotified": _b(r.get("u_oncall_notified")),
            "acknowledgedBy": _dv(r, "u_acknowledged_by") or "",
            "acknowledgedAt": _dv(r, "u_acknowledged_at") or "",
            "notes": _dv(r, "u_notes") or "",
            "patientName": pname,
            "patientNumber": _dv(r, "u_patient.u_number") or "",
            "registered": pname is not None,
            "createdAt": _val(r, "sys_created_on") or "",
        })
    return out


class EscActionReq(BaseModel):
    id: str = Field(..., min_length=1)
    clinicianEmail: Optional[str] = None


@router.post("/escalations/acknowledge")
def acknowledge_escalation(req: EscActionReq, authorization: Optional[str] = Header(None)) -> dict:
    """Clinician acknowledges an open escalation (open → acknowledged), stamping who + when.
    (u_acknowledged_by is a sys_user ref that app clinicians may not have, so we record the
    acknowledger in the notes + set the timestamp — the honest, reliable path.)"""
    table = get_table_client()
    sys_id = _resolve_sys_id(table, req.id)
    if not sys_id:
        return {"ok": False, "error": "Escalation not found"}
    email = clinician_email(authorization, req.clinicianEmail) or "clinician"
    existing = table.get(ESC, sys_id, display_value="false")
    note = (existing.get("u_notes") or "").strip()
    note = (note + "\n" if note else "") + f"Acknowledged by {email} at {_now()}."
    table.update(ESC, sys_id, {"u_status": "acknowledged", "u_acknowledged_at": _now(), "u_notes": note[:1000]})
    return {"ok": True, "status": "acknowledged"}


@router.post("/escalations/resolve")
def resolve_escalation(req: EscActionReq, authorization: Optional[str] = Header(None)) -> dict:
    """Clinician resolves an escalation (→ resolved)."""
    table = get_table_client()
    sys_id = _resolve_sys_id(table, req.id)
    if not sys_id:
        return {"ok": False, "error": "Escalation not found"}
    email = clinician_email(authorization, req.clinicianEmail) or "clinician"
    existing = table.get(ESC, sys_id, display_value="false")
    note = (existing.get("u_notes") or "").strip()
    note = (note + "\n" if note else "") + f"Resolved by {email} at {_now()}."
    table.update(ESC, sys_id, {"u_status": "resolved", "u_notes": note[:1000]})
    return {"ok": True, "status": "resolved"}


@router.get("/notifications")
def notifications() -> list:
    """A unified, newest-first activity feed for the clinician bell: new registrations,
    new screenings, appointment changes, and new escalations."""
    table = get_table_client()
    items = []

    for p in table.list(PATIENT, "ORDERBYDESCsys_created_on",
                        fields="sys_id,u_first_name,u_last_name,u_number,u_registration_status,sys_created_on",
                        display_value="all", limit=12):
        name = f"{_dv(p, 'u_first_name') or ''} {_dv(p, 'u_last_name') or ''}".strip() or _dv(p, "u_number")
        items.append({"id": f"reg:{_val(p, 'sys_id')}", "type": "registration",
                      "title": "New patient registered", "detail": name,
                      "at": _val(p, "sys_created_on") or "", "link": "/clinician/worklist"})

    for s in table.list(SCREEN, "ORDERBYDESCsys_created_on",
                       fields="sys_id,u_number,u_instrument,u_risk_band,u_patient.u_first_name,u_patient.u_last_name,sys_created_on",
                       display_value="all", limit=12):
        pname = _patient_name(s) or "Patient"
        inst = _dv(s, "u_instrument") or "screening"
        band = _dv(s, "u_risk_band")
        items.append({"id": f"scr:{_val(s, 'sys_id')}", "type": "screening",
                      "title": f"New screening · {inst}", "detail": f"{pname}" + (f" · {band}" if band else ""),
                      "at": _val(s, "sys_created_on") or "", "link": "/clinician/worklist"})

    for a in table.list(APPT, "ORDERBYDESCsys_created_on",
                       fields="sys_id,u_status,u_start,u_patient.u_first_name,u_patient.u_last_name,sys_created_on",
                       display_value="all", limit=12):
        pname = _patient_name(a) or "Patient"
        st = (_dv(a, "u_status") or "").lower()
        items.append({"id": f"appt:{_val(a, 'sys_id')}", "type": "appointment",
                      "title": f"Appointment {st or 'update'}", "detail": pname,
                      "at": _val(a, "sys_created_on") or "", "link": "/clinician/calendar"})

    for e in table.list(ESC, "ORDERBYDESCsys_created_on",
                       fields="sys_id,u_number,u_source,u_status,u_patient.u_first_name,u_patient.u_last_name,sys_created_on",
                       display_value="all", limit=12):
        pname = _patient_name(e) or "Unregistered patient"
        items.append({"id": f"esc:{_val(e, 'sys_id')}", "type": "escalation",
                      "title": "Crisis escalation", "detail": f"{pname} · {(_dv(e, 'u_source') or '').lower() or 'front door'}",
                      "at": _val(e, "sys_created_on") or "", "link": "/clinician/escalations", "urgent": True})

    items.sort(key=lambda x: x["at"], reverse=True)
    return items[:25]
