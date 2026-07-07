"""BHUC Clinical Documentation Agent (Agent 3) — ambient note draft + sign.

Wiring model (DEC-1): backend invokes Agent 3 over A2A (blocking) with the encounter
text; the agent drafts the note, tags unverified lines, suggests codes, and CREATEs a
u_bhuc_care_plan draft. Backend then returns that draft. Sign is a plain Table-API update.

Endpoints (mounted under /api/x_bhuc):
  POST /note/draft   — draft a note for an encounter (invokes Agent 3)
  GET  /note/{id}    — read a documentation draft
  POST /note/sign    — clinician signs (finalizes)
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .config import get_settings
from .servicenow import A2AError, get_a2a_client, get_table_client

logger = logging.getLogger("bhuc.note")

router = APIRouter(prefix="/api/x_bhuc", tags=["Clinical Documentation Agent"])

TABLE = "u_bhuc_care_plan"


def _dv(v):
    return v["display_value"] if isinstance(v, dict) else v


def _raw(v):
    return v["value"] if isinstance(v, dict) else v


def _to_draft(rec: dict) -> dict:
    """Map a u_bhuc_care_plan record → DocumentationDraft the C5 screen expects."""
    note = _raw(rec.get("u_draft_note")) or ""
    try:
        unverified = set(json.loads(_raw(rec.get("u_unverified_lines")) or "[]"))
    except (json.JSONDecodeError, TypeError):
        unverified = set()
    lines = []
    for i, text in enumerate([ln for ln in note.split("\n") if ln.strip()], start=1):
        lid = f"L{i}"
        lines.append({"id": lid, "text": text.strip(), "verified": lid not in unverified})

    codes = []
    try:
        for c in json.loads(_raw(rec.get("u_suggested_codes")) or "[]"):
            codes.append({
                "code": c.get("code", ""),
                "type": c.get("system", c.get("type", "ICD-10")),
                "description": c.get("label", c.get("description", "")),
                "accepted": False,
            })
    except (json.JSONDecodeError, TypeError):
        pass

    return {
        "id": _dv(rec.get("u_number")) or _dv(rec.get("sys_id")),
        "sysId": _dv(rec.get("sys_id")),
        "patientName": _dv(rec.get("u_patient")) or "Unknown",
        "lines": lines,
        "suggestedCodes": codes,
        "signed": str(_raw(rec.get("u_signed"))).lower() in ("true", "1"),
    }


class NoteDraft(BaseModel):
    patient: str                      # patient sys_id
    encounter: str                    # the recorded encounter text to ground against
    encounterId: Optional[str] = None


@router.post("/note/draft")
def draft_note(req: NoteDraft) -> dict:
    settings = get_settings()
    table = get_table_client()
    msg = (
        "Draft the clinical note for this behavioral-health encounter, then write it as a "
        "DRAFT to the documentation record. Do not sign or finalize.\n\n"
        f"patient: {req.patient}\nencounter_id: {req.encounterId or 'ENC-0001'}\n\n"
        f"Encounter data (source — ground every line against this):\n{req.encounter}\n\n"
        "Tasks: 1) Draft the note in sections Chief Complaint, HPI, MSE, Assessment, Plan. "
        "2) Use the grounding tool to tag each line grounded or unverified. 3) Suggest ICD-10/CPT "
        "codes with supporting text. 4) Write the draft (draft_note, unverified_lines, "
        "suggested_codes) to the documentation record for the patient above. Leave it a draft."
    )
    try:
        get_a2a_client().execute_agent(settings.snow_agent_clinicaldoc, msg)
    except A2AError as exc:
        logger.error("Agent 3 A2A failed: %s", exc)
        raise HTTPException(status_code=502, detail="Documentation agent unavailable") from exc

    # the agent CREATEs the record — fetch the newest care_plan for this patient.
    found = table.list(TABLE, f"u_patient={req.patient}^ORDERBYDESCsys_created_on",
                       display_value="all", limit=1)
    if not found:
        raise HTTPException(status_code=502, detail="Agent produced no documentation record")
    return _to_draft(found[0])


# A canned encounter used when the clinician opens a note for a patient but the app has
# no ambient-transcript source yet. Idempotent: returns an existing unsigned draft first.
_CANNED_ENCOUNTER = (
    "Follow-up behavioral-health visit. Patient reports depressed mood most days for "
    "about three weeks, low energy, poor concentration, and initial insomnia. Endorses "
    "passive thoughts of being better off dead; screening positive for ideation without "
    "plan or intent; safety plan reviewed and agreed. On sertraline 50 mg daily, tolerating "
    "well. Discussed outpatient therapy referral."
)


@router.get("/note/for-patient/{patient_id}")
def note_for_patient(patient_id: str) -> dict:
    """Latest unsigned draft for a patient; if none, draft one (Agent 3)."""
    table = get_table_client()
    existing = table.list(TABLE, f"u_patient={patient_id}^u_signed=false^ORDERBYDESCsys_created_on",
                          display_value="all", limit=1)
    if existing:
        return _to_draft(existing[0])
    return draft_note(NoteDraft(patient=patient_id, encounter=_CANNED_ENCOUNTER,
                                encounterId="ENC-APP"))


@router.get("/note/{note_id}")
def get_note(note_id: str) -> dict:
    table = get_table_client()
    if len(note_id) == 32:
        rec = table.get(TABLE, note_id, display_value="all")
    else:
        found = table.list(TABLE, f"u_number={note_id}", display_value="all", limit=1)
        if not found:
            raise HTTPException(status_code=404, detail="Note not found")
        rec = found[0]
    return _to_draft(rec)


class NoteSign(BaseModel):
    id: str


@router.post("/note/sign")
def sign_note(req: NoteSign) -> dict:
    from datetime import datetime, timezone
    table = get_table_client()
    sys_id = req.id
    if len(sys_id) != 32:
        found = table.list(TABLE, f"u_number={req.id}", fields="sys_id", limit=1)
        if not found:
            raise HTTPException(status_code=404, detail="Note not found")
        sys_id = found[0]["sys_id"]
    table.update(TABLE, sys_id, {
        "u_signed": "true",
        "u_state": "finalized",
        "u_signed_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    })
    return {"ok": True}
