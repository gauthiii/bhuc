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

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from .config import get_settings
from .servicenow import A2AError, get_a2a_client, get_table_client

logger = logging.getLogger("bhuc.note")


def _label_note_part2(note_sys_id: str, patient_sys_id: str, note_text: str) -> None:
    """UC3 — invoke the Consent & Data Protection Agent (Agent 4) to classify the note's
    42 CFR Part 2 / SUD content and label the note + consent records over A2A.

    Best-effort and non-blocking: run in a daemon thread off the sign path so a slow/cold
    agent never delays signing. The Chart then reads the labels it writes
    (u_bhuc_care_plan.u_contains_part2 / u_sensitivity)."""
    settings = get_settings()
    if not (settings.snow_agent_consent and note_text.strip()):
        return
    msg = (
        "A clinician just finalized clinical documentation. Detect and tag any 42 CFR "
        "Part 2 / SUD content, then write the sensitivity label to the records.\n\n"
        f"patient: {patient_sys_id}\nencounter_id: {note_sys_id}\n\n"
        f"Documentation text (classify this):\n{note_text}"
    )
    try:
        get_a2a_client().execute_agent(settings.snow_agent_consent, msg)
        logger.info("Agent 4 labeled note %s", note_sys_id)
    except A2AError as exc:
        logger.warning("Agent 4 labeling failed for note %s (non-blocking): %s", note_sys_id, exc)

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
        "screeningId": _dv(rec.get("u_screening")) or "",
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


def _screening_sys_id(table, screening: str) -> str:
    """Resolve a screening sys_id from a sys_id or a BHUC_SCREENING_00x number."""
    if not screening:
        return ""
    if len(screening) == 32:
        return screening
    found = table.list(SCREENING, f"u_number={screening}", fields="sys_id", limit=1)
    return found[0]["sys_id"] if found else ""


SCREENING = "u_bhuc_screening"


@router.post("/note/new/{patient_id}")
def new_note(patient_id: str, screening: str = Query("")) -> dict:
    """Always draft a NEW note (runs Agent 3) — 'Start note' / 'Start another note'.

    Links the note to a screening (u_screening): the one passed from the UI (Risk
    Confirm), else the patient's most recent screening (same rule as the backfill)."""
    table = get_table_client()
    draft = draft_note(NoteDraft(patient=patient_id, encounter=_CANNED_ENCOUNTER,
                                 encounterId="ENC-APP"))
    sid = _screening_sys_id(table, screening)
    if not sid:
        latest = table.list(SCREENING, f"u_patient={patient_id}^ORDERBYDESCsys_created_on",
                            fields="sys_id", limit=1)
        sid = latest[0]["sys_id"] if latest else ""
    if sid and draft.get("sysId"):
        table.update(TABLE, draft["sysId"], {"u_screening": sid})
        draft = _to_draft(table.get(TABLE, draft["sysId"], display_value="all"))  # echo the link
    return draft


@router.get("/note/latest/{patient_id}")
def latest_note(patient_id: str):
    """Most recent note for a patient (signed or draft), or null if none. View-only —
    does NOT run the agent (use POST /note/draft to create a new one)."""
    table = get_table_client()
    found = table.list(TABLE, f"u_patient={patient_id}^ORDERBYDESCsys_created_on",
                       display_value="all", limit=1)
    return _to_draft(found[0]) if found else None


@router.get("/notes/summary/{patient_id}")
def notes_summary(patient_id: str) -> dict:
    """Counts + signed status for a patient's notes (drives the Chart panel + button label)."""
    table = get_table_client()
    rows = table.list(TABLE, f"u_patient={patient_id}^ORDERBYDESCsys_created_on",
                      fields="u_number,u_signed,u_state,u_signed_at,sys_created_on", limit=100)
    notes = [{
        "id": r.get("u_number"),
        "signed": str(r.get("u_signed")).lower() in ("true", "1"),
        "state": r.get("u_state"),
        "signedAt": r.get("u_signed_at") or "",
        "createdAt": r.get("sys_created_on") or "",
    } for r in rows]
    signed = [n for n in notes if n["signed"]]
    return {
        "count": len(notes),
        "signedCount": len(signed),
        "hasNotes": len(notes) > 0,
        "latestSigned": bool(notes and notes[0]["signed"]),
        "notes": notes,
    }


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
    # the lines the clinician has NOT yet verified (should be empty to sign). The
    # client sends its resolved state; the server persists it and enforces the gate.
    unverifiedLines: Optional[list] = None
    # the clinician's edited note text (reassembled from the line editors). Persisted so
    # the signed record — and the Agent 4 Part 2 check — reflect what the clinician wrote.
    noteText: Optional[str] = None


@router.post("/note/sign")
def sign_note(req: NoteSign) -> dict:
    """Output-Integrity gate (server-enforced): a note cannot be signed while any
    line is still flagged unverified (grounding/hallucination control, §UC2)."""
    from datetime import datetime, timezone
    table = get_table_client()
    sys_id = req.id
    if len(sys_id) != 32:
        found = table.list(TABLE, f"u_number={req.id}", fields="sys_id", limit=1)
        if not found:
            raise HTTPException(status_code=404, detail="Note not found")
        sys_id = found[0]["sys_id"]

    # persist the clinician's edits + resolution before signing
    updates: dict = {}
    if req.noteText is not None:
        updates["u_draft_note"] = req.noteText
    if req.unverifiedLines is not None:
        updates["u_unverified_lines"] = json.dumps(req.unverifiedLines)
    if updates:
        table.update(TABLE, sys_id, updates)

    rec = table.get(TABLE, sys_id)
    try:
        remaining = json.loads(rec.get("u_unverified_lines") or "[]")
    except (json.JSONDecodeError, TypeError):
        remaining = []
    if remaining:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot sign: {len(remaining)} unverified line(s) unresolved. "
                   "Resolve every AI-flagged line before signing (Output-Integrity gate).")

    table.update(TABLE, sys_id, {
        "u_signed": "true",
        "u_state": "finalized",
        "u_signed_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    })
    # The C5 sign flow calls POST /note/part2-check right after this so the UI can show
    # the Consent & Data Protection Agent (Agent 4) running and its result.
    return {"ok": True}


class Part2CheckReq(BaseModel):
    id: str   # note number or sys_id


@router.post("/note/part2-check")
def part2_check(req: Part2CheckReq) -> dict:
    """UC3 — run the Consent & Data Protection Agent (Agent 4) on a note and report
    whether it flagged 42 CFR Part 2 / SUD content. Called by the C5 sign flow so the UI
    can animate the check and show the outcome. Labels only — never gates the sign."""
    table = get_table_client()
    sys_id = req.id
    if len(sys_id) != 32:
        found = table.list(TABLE, f"u_number={req.id}", fields="sys_id", limit=1)
        if not found:
            raise HTTPException(status_code=404, detail="Note not found")
        sys_id = found[0]["sys_id"]
    rec = table.get(TABLE, sys_id)
    note_text = _raw(rec.get("u_draft_note")) or ""
    patient_sys = _raw(rec.get("u_patient")) or ""
    _label_note_part2(sys_id, patient_sys, note_text)   # invokes Agent 4 (blocking, best-effort)
    after = table.get(TABLE, sys_id)
    return {
        "note": after.get("u_number") or sys_id,
        "sensitivity": after.get("u_sensitivity") or "standard",
        "containsPart2": str(after.get("u_contains_part2")).lower() in ("true", "1"),
    }
