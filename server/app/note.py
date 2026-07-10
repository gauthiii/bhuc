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

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from .access import clinician_email, has_part2_access, patient_has_part2_consent
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


def _contains_part2(rec: dict) -> bool:
    return str(_raw(rec.get("u_contains_part2"))).lower() in ("true", "1") \
        or _raw(rec.get("u_sensitivity")) == "part2"


def _part2_masked(rec: dict, email: str) -> bool:
    """UC3 (C5) — a SIGNED note that Agent 4 flagged 42 CFR Part 2 is masked on view
    unless the viewer holds the case-manager role AND the patient has consented.
    Drafts / non-Part2 notes stay open so the author can write and sign."""
    signed = str(_raw(rec.get("u_signed"))).lower() in ("true", "1")
    if not (signed and _contains_part2(rec)):
        return False
    patient_sys = _raw(rec.get("u_patient")) or ""
    return not (has_part2_access(email) and patient_has_part2_consent(patient_sys))


def _to_draft(rec: dict, masked: bool = False) -> dict:
    """Map a u_bhuc_care_plan record → DocumentationDraft the C5 screen expects. When
    ``masked`` (a gated Part 2 note viewed without role+consent) the note body / codes are
    withheld — only the shell + part2Masked flag are returned."""
    base = {
        "id": _dv(rec.get("u_number")) or _dv(rec.get("sys_id")),
        "sysId": _dv(rec.get("sys_id")),
        "patientName": _dv(rec.get("u_patient")) or "Unknown",
        "screeningId": _dv(rec.get("u_screening")) or "",
        "signed": str(_raw(rec.get("u_signed"))).lower() in ("true", "1"),
        "containsPart2": _contains_part2(rec),
        "part2Masked": masked,
    }
    if masked:
        base["lines"] = []
        base["suggestedCodes"] = []
        return base

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

    base["lines"] = lines
    base["suggestedCodes"] = codes
    return base


class NoteDraft(BaseModel):
    patient: str                      # patient sys_id
    encounter: str                    # the recorded source text to ground against
    encounterId: Optional[str] = None
    sourceScreenings: Optional[list] = None   # screening numbers the summary was built from
    fromScreenings: bool = False              # True when `encounter` is a screening summary


@router.post("/note/draft")
def draft_note(req: NoteDraft) -> dict:
    settings = get_settings()
    table = get_table_client()
    if req.fromScreenings:
        source_intro = (
            "Source — the patient's latest screening results (one per instrument). Synthesize "
            "ACROSS instruments into one coherent note; map each score/band to interpretation and "
            "candidate ICD-10 codes using the scoring/coding knowledge base; treat any SUD-battery "
            "instrument (NIDA, AUDIT, DAST-10, Craving, SOWS, BAM, SOCRATES) as 42 CFR Part 2. "
            "Ground every line against these results:")
    else:
        source_intro = "Encounter data (source — ground every line against this):"
    msg = (
        "Draft the clinical note for this behavioral-health encounter, then write it as a "
        "DRAFT to the documentation record. Do not sign or finalize.\n\n"
        f"patient: {req.patient}\nencounter_id: {req.encounterId or 'ENC-0001'}\n\n"
        f"{source_intro}\n{req.encounter}\n\n"
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
    # Traceability: record which screenings this draft was synthesized from.
    if req.sourceScreenings:
        try:
            table.update(TABLE, _raw(found[0].get("sys_id")),
                         {"u_source_screenings": json.dumps(req.sourceScreenings)})
            found[0]["u_source_screenings"] = json.dumps(req.sourceScreenings)
        except Exception as exc:  # non-fatal — draft still returned
            logger.warning("Could not set u_source_screenings: %s", exc)
    return _to_draft(found[0])


# Fallback used only when a patient has NO scored screenings yet (so a clinician can still
# open a draft). The real source is the screening summary built by _screening_summary().
_CANNED_ENCOUNTER = (
    "Follow-up behavioral-health visit. Patient reports depressed mood most days for "
    "about three weeks, low energy, poor concentration, and initial insomnia. Endorses "
    "passive thoughts of being better off dead; screening positive for ideation without "
    "plan or intent; safety plan reviewed and agreed. On sertraline 50 mg daily, tolerating "
    "well. Discussed outpatient therapy referral."
)

_INSTRUMENT_LABEL = {"c_ssrs": "C-SSRS", "phq9": "PHQ-9", "gad7": "GAD-7",
                     "nida_qs": "NIDA Quick Screen", "audit": "AUDIT", "dast10": "DAST-10",
                     "craving": "Craving & Triggers", "sows": "SOWS", "bam": "BAM",
                     "socrates8": "SOCRATES"}
# Clinical order for the summary (safety spine first, then SUD battery).
_INSTRUMENT_ORDER = ["c_ssrs", "phq9", "gad7", "nida_qs", "audit", "dast10",
                     "craving", "sows", "bam", "socrates8"]


def _screening_summary(table, patient_sys_id: str) -> tuple:
    """Build the structured screening summary Agent 3 documents from: the latest scored
    screening per instrument (preferring the clinician-confirmed one, else the latest scored).
    Returns (summary_text, [screening_numbers]) — ("", []) if the patient has no scored screenings."""
    rows = table.list(
        SCREENING, f"u_patient={patient_sys_id}^u_scored_by_agent=true^ORDERBYDESCsys_created_on",
        fields=("u_number,u_instrument,u_raw_score,u_risk_band,u_confidence,u_flags,"
                "u_subscores,u_rationale,u_clinician_action"),
        display_value="false", limit=100)
    latest_scored: dict = {}
    latest_confirmed: dict = {}
    for r in rows:
        inst = r.get("u_instrument") or ""
        if not inst:
            continue
        latest_scored.setdefault(inst, r)
        if (r.get("u_clinician_action") or "").lower() in ("confirmed", "adjusted"):
            latest_confirmed.setdefault(inst, r)
    chosen = {inst: latest_confirmed.get(inst, row) for inst, row in latest_scored.items()}
    if not chosen:
        return "", []

    lines, numbers = [], []
    for inst in _INSTRUMENT_ORDER:
        r = chosen.get(inst)
        if not r:
            continue
        numbers.append(r.get("u_number") or "")
        label = _INSTRUMENT_LABEL.get(inst, inst)
        score = r.get("u_raw_score") or "n/a"
        band = r.get("u_risk_band") or "n/a"
        flags = r.get("u_flags") or "none"
        subs = r.get("u_subscores") or ""
        action = (r.get("u_clinician_action") or "pending").lower()
        rationale = (r.get("u_rationale") or "").strip()
        parts = [f"score={score}", f"risk band={band}", f"flags=[{flags}]"]
        if subs:
            parts.append(f"subscores={subs}")
        parts.append(f"clinician action={action}")
        line = f"- {label} ({r.get('u_number')}): " + ", ".join(parts) + "."
        if rationale:
            line += f" Rationale: {rationale}"
        lines.append(line)
    header = ("STRUCTURED SCREENING SUMMARY — latest result per instrument "
              "(one per instrument; no duplicate instruments):")
    return header + "\n" + "\n".join(lines), [n for n in numbers if n]


def _draft_from_screenings(table, patient_id: str, encounter_id: str = "ENC-APP") -> dict:
    """Draft a note from the patient's screening summary, falling back to the canned
    encounter only if the patient has no scored screenings."""
    summary, numbers = _screening_summary(table, patient_id)
    if summary:
        return draft_note(NoteDraft(patient=patient_id, encounter=summary,
                                    encounterId=encounter_id, sourceScreenings=numbers,
                                    fromScreenings=True))
    return draft_note(NoteDraft(patient=patient_id, encounter=_CANNED_ENCOUNTER,
                                encounterId=encounter_id))


@router.get("/note/for-patient/{patient_id}")
def note_for_patient(patient_id: str) -> dict:
    """Latest unsigned draft for a patient; if none, draft one from their screenings (Agent 3)."""
    table = get_table_client()
    existing = table.list(TABLE, f"u_patient={patient_id}^u_signed=false^ORDERBYDESCsys_created_on",
                          display_value="all", limit=1)
    if existing:
        return _to_draft(existing[0])
    return _draft_from_screenings(table, patient_id)


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
    draft = _draft_from_screenings(table, patient_id)
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
def latest_note(patient_id: str, clinicianEmail: str = Query(""),
                authorization: Optional[str] = Header(None)):
    """Most recent note for a patient (signed or draft), or null if none. View-only —
    does NOT run the agent (use POST /note/draft to create a new one). A signed Part 2
    note is masked unless the viewer holds role + the patient consented."""
    table = get_table_client()
    found = table.list(TABLE, f"u_patient={patient_id}^ORDERBYDESCsys_created_on",
                       display_value="all", limit=1)
    if not found:
        return None
    masked = _part2_masked(found[0], clinician_email(authorization, clinicianEmail))
    return _to_draft(found[0], masked)


@router.get("/notes/summary/{patient_id}")
def notes_summary(patient_id: str) -> dict:
    """Counts + signed status for a patient's notes (drives the Chart panel + button label)."""
    table = get_table_client()
    rows = table.list(TABLE, f"u_patient={patient_id}^ORDERBYDESCsys_created_on",
                      fields="u_number,u_signed,u_state,u_signed_at,u_contains_part2,u_sensitivity,sys_created_on", limit=100)
    notes = [{
        "id": r.get("u_number"),
        "signed": str(r.get("u_signed")).lower() in ("true", "1"),
        "state": r.get("u_state"),
        "signedAt": r.get("u_signed_at") or "",
        "createdAt": r.get("sys_created_on") or "",
        "containsPart2": str(r.get("u_contains_part2")).lower() in ("true", "1") or r.get("u_sensitivity") == "part2",
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
def get_note(note_id: str, clinicianEmail: str = Query(""),
             authorization: Optional[str] = Header(None)) -> dict:
    table = get_table_client()
    if len(note_id) == 32:
        rec = table.get(TABLE, note_id, display_value="all")
    else:
        found = table.list(TABLE, f"u_number={note_id}", display_value="all", limit=1)
        if not found:
            raise HTTPException(status_code=404, detail="Note not found")
        rec = found[0]
    masked = _part2_masked(rec, clinician_email(authorization, clinicianEmail))
    return _to_draft(rec, masked)


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
