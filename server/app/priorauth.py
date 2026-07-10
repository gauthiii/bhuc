"""BHUC Prior-Auth Compliance Agent (Agent 5) — cited coverage answers + packet drafting.

The agent searches the payer policy library (with citations) and drafts a prior-auth packet
into ``u_bhuc_prior_auth`` (status ``draft``). The human submits; the agent never does.

Endpoints (mounted under /api/x_bhuc):
  GET  /priorauth?patient=<sys_id>   — latest draft packet for a patient (or null)
  POST /priorauth/draft              — run Agent 5 to draft a packet (returns it)
  POST /priorauth                    — ask a cited coverage question (Agent 5 search only)
  POST /priorauth/submit             — clinician submits (status=submitted)
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from .access import clinician_email, has_part2_access, patient_has_part2_consent
from .config import get_settings
from .servicenow import A2AError, get_a2a_client, get_table_client

logger = logging.getLogger("bhuc.priorauth")

router = APIRouter(prefix="/api/x_bhuc", tags=["Prior-Auth Compliance Agent"])

TABLE = "u_bhuc_prior_auth"
PATIENT = "u_bhuc_patient"
CARE = "u_bhuc_care_plan"
SCREEN = "u_bhuc_screening"
ELIG = "u_bhuc_eligibility"

_SUD_TERMS = ("sud", "opioid", "alcohol", "substance", "mat ", "buprenorphine", "methadone",
              "naltrexone", "suboxone", "detox", "f10", "f11", "f12", "f13", "f14", "f15", "f16", "f19")

# Field ids that reveal SUD → redacted (black bars) when the packet is Part 2-gated and the
# viewer lacks role+consent. Everything else (administrative/member/provider) stays visible.
_PART2_FIELDS = {
    "service", "primary_dx", "secondary_dx", "cpt_hcpcs", "coverage_determination", "citation",
    "sud_detail", "presenting_problem", "why_loc", "why_not_lower", "why_not_higher",
    "asam", "goals", "modalities", "discharge",
}

_INSTRUMENT_LABEL = {"c_ssrs": "C-SSRS", "phq9": "PHQ-9", "gad7": "GAD-7",
                     "nida_qs": "NIDA Quick Screen", "audit": "AUDIT", "dast10": "DAST-10",
                     "craving": "Craving & Triggers", "sows": "SOWS", "bam": "BAM",
                     "socrates8": "SOCRATES"}


def _b(v) -> bool:
    return str(v).lower() in ("true", "1")


def _looks_sud(text: str) -> bool:
    t = f" {text.lower()} "
    return any(term in t for term in _SUD_TERMS)


def _ctx(table, patient: str) -> dict:
    """Shared, patient-level context for building the packet document (fetched once per
    request, reused across the patient's packets)."""
    prec = table.get(PATIENT, patient, display_value="false") if patient and len(patient) == 32 else None
    if not prec:
        found = table.list(PATIENT, f"u_number={patient}", display_value="false", limit=1)
        prec = found[0] if found else {}
    elig = table.list(ELIG, f"u_patient={patient}^ORDERBYDESCsys_created_on",
                      fields="u_status,u_payer,u_plan", display_value="false", limit=1)
    screens = table.list(SCREEN, f"u_patient={patient}^u_scored_by_agent=true^ORDERBYDESCsys_created_on",
                         fields="u_number,u_instrument", display_value="false", limit=100)
    notes = table.list(CARE, f"u_patient={patient}^ORDERBYDESCsys_created_on",
                       fields="u_number,u_signed", display_value="false", limit=50)
    # latest screening per instrument (deduped), for supporting docs
    seen, screen_docs = set(), []
    for s in screens:
        inst = s.get("u_instrument") or ""
        if inst and inst not in seen:
            seen.add(inst)
            screen_docs.append(f"{_INSTRUMENT_LABEL.get(inst, inst)} screening ({s.get('u_number')})")
    note_docs = [f"Clinical note {n.get('u_number')} — {'signed' if _b(n.get('u_signed')) else 'draft'}"
                 for n in notes]
    return {"patient": prec, "elig": (elig[0] if elig else {}),
            "attachments": screen_docs + note_docs}


def _build_document(rec: dict, ctx: dict, redact: bool, clinician: str, saved: dict) -> dict:
    """Full sample-style packet document: sectioned fields. Agent-produced + selected values
    seed the editable fields; sections the agent doesn't produce start empty for the clinician.
    SUD-revealing fields are redacted (black bars) when the packet is Part 2-gated and the
    viewer lacks role+consent — enforced here, so redaction holds in edit AND preview."""
    p = ctx.get("patient") or {}
    elig = ctx.get("elig") or {}
    citation = " · ".join([x for x in [rec.get("u_citation_policy"), rec.get("u_citation_section")] if x])
    member_name = f"{p.get('u_first_name', '')} {p.get('u_last_name', '')}".strip() or (rec.get("u_patient") or "—")
    elig_verified = "Yes — active" if (elig.get("u_status") == "active") else (elig.get("u_status") or "Not verified")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def f(fid, label, value="", editable=True, multiline=False):
        sensitive = fid in _PART2_FIELDS
        if redact and sensitive:
            return {"id": fid, "label": label, "value": "", "editable": False, "redacted": True, "multiline": multiline}
        val = saved.get(fid, value if value is not None else "")
        return {"id": fid, "label": label, "value": val or "", "editable": editable, "redacted": False, "multiline": multiline}

    sections = [
        {"id": "request", "title": "Request Summary", "fields": [
            f("request_type", "Request Type", "Initial Authorization"),
            f("date_of_request", "Date of Request", today, editable=False),
            f("urgency", "Urgency", "Standard (non-expedited)"),
            f("service", "Service Requested", rec.get("u_service") or ""),
            f("cpt_hcpcs", "Requested CPT/HCPCS", ""),
            f("primary_dx", "Primary Diagnosis", rec.get("u_diagnosis") or ""),
            f("secondary_dx", "Secondary Diagnosis", ""),
            f("level_of_care", "Level of Care Requested", ""),
            f("units", "Units Requested", rec.get("u_requested_units") or ""),
            f("requested_start", "Requested Start Date", ""),
            f("auth_period", "Authorization Period", ""),
        ]},
        {"id": "member", "title": "Member Information", "fields": [
            f("member_name", "Member Name", member_name, editable=False),
            f("member_id", "Member ID", p.get("u_insurance_member_id") or "—", editable=False),
            f("member_dob", "DOB", p.get("u_date_of_birth") or "—", editable=False),
            f("member_mrn", "MRN", p.get("u_number") or "—", editable=False),
            f("member_phone", "Phone", p.get("u_phone") or "—", editable=False),
            f("member_payer", "Payer", rec.get("u_payer") or p.get("u_insurance_provider") or "—", editable=False),
            f("eligibility_verified", "Eligibility Verified", elig_verified, editable=False),
        ]},
        {"id": "provider", "title": "Referring / Ordering Provider", "fields": [
            f("provider_name", "Provider", clinician or "Attending clinician"),
            f("provider_contact", "Contact", "(see facility)", editable=False),
        ]},
        {"id": "justification", "title": "Clinical Justification (Medical Necessity)", "fields": [
            f("presenting_problem", "Presenting problem", "", multiline=True),
            f("why_loc", "Why this level of care", "", multiline=True),
            f("why_not_lower", "Why not a lower level of care", "", multiline=True),
            f("why_not_higher", "Why not a higher level of care", "", multiline=True),
            f("asam", "ASAM dimension summary (1–6)", "", multiline=True),
        ]},
        {"id": "coverage", "title": "Coverage Determination", "fields": [
            f("coverage_determination", "Coverage determination", rec.get("u_coverage_answer") or "", multiline=True),
            f("citation", "Policy citation", citation or ""),
        ]},
        {"id": "plan", "title": "Treatment Plan & Goals", "fields": [
            f("goals", "Measurable goals", "", multiline=True),
            f("modalities", "Modalities", "", multiline=True),
            f("discharge", "Discharge criteria", "", multiline=True),
        ]},
    ]
    if _b(rec.get("u_part2_gated")) or rec.get("u_sud_field"):
        sections.append({"id": "sud", "title": "SUD Detail (42 CFR Part 2)", "fields": [
            f("sud_detail", "SUD detail", rec.get("u_sud_field") or "", multiline=True),
        ]})
    sections.append({"id": "payer_use", "title": "Payer Use Only", "fields": [
        f("auth_number", "Auth #", "", editable=False),
        f("determination", "Determination", "", editable=False),
        f("units_approved", "Units Approved", "", editable=False),
        f("reviewer", "Reviewer", "", editable=False),
        f("decision_date", "Decision Date", "", editable=False),
    ]})
    return {"sections": sections, "attachments": ctx.get("attachments", [])}


def _packet(rec: dict, ctx: dict, part2_role: bool = False, part2_consent: bool = False,
            clinician: str = "") -> dict:
    """Map a u_bhuc_prior_auth record → the PriorAuthPacket the C6 screen expects, including
    the full editable `document`. On a Part 2-gated packet every SUD-revealing field is
    access-gated unless the clinician holds u_bhuc_part2_access AND the patient consented."""
    part2 = _b(rec.get("u_part2_gated"))
    redact = part2 and not (part2_role and part2_consent)
    try:
        saved = json.loads(rec.get("u_packet_json") or "{}")
        if not isinstance(saved, dict):
            saved = {}
    except (json.JSONDecodeError, TypeError):
        saved = {}
    service = rec.get("u_service") or "Prior authorization"
    return {
        "id": rec.get("u_number") or rec.get("sys_id"),
        "sysId": rec.get("sys_id"),
        "service": "Protected (42 CFR Part 2)" if redact else service,
        "serviceMasked": redact,
        "status": rec.get("u_status") or "draft",
        "part2Gated": part2,
        "part2Role": part2_role,
        "part2Consent": part2_consent,
        "draftedByAgent": _b(rec.get("u_drafted_by_agent")),
        "document": _build_document(rec, ctx, redact, clinician, saved),
    }


def _persist_edits(table, rec: dict, edits: dict, authorized_sensitive: bool) -> None:
    """Merge editable-field edits into u_packet_json. Never persists SUD-field edits from an
    unauthorized viewer (they never saw those fields, so redaction can't be defeated)."""
    if not isinstance(edits, dict):
        return
    try:
        saved = json.loads(rec.get("u_packet_json") or "{}")
        if not isinstance(saved, dict):
            saved = {}
    except (json.JSONDecodeError, TypeError):
        saved = {}
    for k, v in edits.items():
        if k in _PART2_FIELDS and not authorized_sensitive:
            continue
        saved[k] = v
    table.update(TABLE, rec["sys_id"], {"u_packet_json": json.dumps(saved)[:7900]})


@router.get("/priorauth/dx-options")
def dx_options(patient: str = Query(...)) -> list:
    """Distinct ICD-10 diagnosis codes suggested across ALL the patient's clinical notes
    (u_bhuc_care_plan.u_suggested_codes). Empty list → the C6 screen blocks new prior auths."""
    table = get_table_client()
    rows = table.list(CARE, f"u_patient={patient}^u_suggested_codesISNOTEMPTY",
                      fields="u_suggested_codes", display_value="false", limit=100)
    seen, out = set(), []
    for r in rows:
        try:
            for c in json.loads(r.get("u_suggested_codes") or "[]"):
                system = (c.get("system") or c.get("type") or "").upper()
                code = c.get("code") or ""
                if code and "ICD" in system and code not in seen:
                    seen.add(code)
                    out.append({"code": code, "label": c.get("label") or c.get("description") or ""})
        except (json.JSONDecodeError, TypeError):
            continue
    return out


@router.get("/priorauth")
def get_priorauth(patient: str = Query(...), clinicianEmail: str = Query(""),
                  authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Latest prior-auth packet for a patient, or null if none has been drafted yet."""
    table = get_table_client()
    found = table.list(TABLE, f"u_patient={patient}^ORDERBYDESCsys_created_on",
                       display_value="false", limit=1)
    if not found:
        return None
    rec = found[0]
    email = clinician_email(authorization, clinicianEmail)
    return _packet(rec, _ctx(table, patient), has_part2_access(email),
                   patient_has_part2_consent(rec.get("u_patient") or ""), email)


@router.get("/priorauth/all")
def list_priorauth(patient: str = Query(...), clinicianEmail: str = Query(""),
                   authorization: Optional[str] = Header(None)) -> list:
    """All prior-auth packets for a patient (newest first)."""
    table = get_table_client()
    rows = table.list(TABLE, f"u_patient={patient}^ORDERBYDESCsys_created_on",
                      display_value="false", limit=50)
    if not rows:
        return []
    email = clinician_email(authorization, clinicianEmail)
    ctx = _ctx(table, patient)
    part2_role = has_part2_access(email)
    part2_consent = patient_has_part2_consent(patient)
    return [_packet(r, ctx, part2_role, part2_consent, email) for r in rows]


class DraftReq(BaseModel):
    patient: str = Field(..., min_length=1)   # patient sys_id
    service: str = Field(..., min_length=1)
    diagnosis: str = ""                        # primary dx
    secondaryDiagnoses: list = []              # optional secondary dx codes
    requestedUnits: str = ""
    payer: str = Field(..., min_length=1)
    clinicianEmail: Optional[str] = None


@router.post("/priorauth/draft")
def draft_priorauth(req: DraftReq, authorization: Optional[str] = Header(None)) -> dict:
    """Run Agent 5 to answer the coverage question (cited) and draft the packet into
    u_bhuc_prior_auth (status=draft). Returns the drafted packet document."""
    settings = get_settings()
    table = get_table_client()
    before = {r["sys_id"] for r in table.list(TABLE, f"u_patient={req.patient}", fields="sys_id", limit=200)}
    secondaries = ", ".join([s for s in req.secondaryDiagnoses if s])
    dx_all = f"{req.diagnosis}" + (f" (secondary: {secondaries})" if secondaries else "")
    part2_hint = ("This IS 42 CFR Part 2 / SUD content, so part2_gated=true and put the SUD detail in sud_field."
                  if _looks_sud(f"{req.service} {req.diagnosis} {secondaries}") else "part2_gated=false.")
    msg = (
        f"Patient sys_id {req.patient}, payer {req.payer}. The clinician requests prior authorization "
        f"for {req.service}, {req.requestedUnits or 'as clinically indicated'}, "
        f"diagnosis {dx_all or 'see chart'}.\n\n"
        "1. Using ONLY the payer policy library, state whether prior authorization is required and the "
        "medical-necessity criteria — cite the exact policy id and section.\n"
        f"2. Then draft the prior-auth packet: patient={req.patient}, service={req.service}, "
        f"diagnosis={req.diagnosis}, requested_units={req.requestedUnits}, payer={req.payer}, "
        f"coverage_answer + citation from your lookup. {part2_hint}"
    )
    try:
        get_a2a_client().execute_agent(settings.snow_agent_priorauth, msg)
    except A2AError as exc:
        logger.error("Agent 5 A2A draft failed: %s", exc)
        raise HTTPException(status_code=502, detail="Prior-Auth agent unavailable") from exc

    found = table.list(TABLE, f"u_patient={req.patient}^ORDERBYDESCsys_created_on",
                       display_value="false", limit=1)
    if not found or found[0]["sys_id"] in before:
        raise HTTPException(status_code=502, detail="Prior-Auth agent produced no draft")
    rec = found[0]

    if _looks_sud(f"{req.service} {req.diagnosis} {secondaries}"):
        patch: dict = {}
        if not (rec.get("u_sud_field") or "").strip():
            patch["u_sud_field"] = (
                f"SUD treatment detail — {req.service}"
                + (f", diagnosis {req.diagnosis}" if req.diagnosis else "")
                + ". 42 CFR Part 2 protected; disclose only with patient consent."
            )
        if not _b(rec.get("u_part2_gated")):
            patch["u_part2_gated"] = "true"
        if patch:
            table.update(TABLE, rec["sys_id"], patch)
            rec = table.get(TABLE, rec["sys_id"], display_value="false")

    # Seed the secondary-diagnosis editable field from the clinician's selection.
    if secondaries:
        _persist_edits(table, rec, {"secondary_dx": secondaries}, authorized_sensitive=True)
        rec = table.get(TABLE, rec["sys_id"], display_value="false")

    email = clinician_email(authorization, req.clinicianEmail)
    return _packet(rec, _ctx(table, req.patient), has_part2_access(email),
                   patient_has_part2_consent(rec.get("u_patient") or req.patient), email)


class CoverageReq(BaseModel):
    question: str = Field(..., min_length=1)


@router.post("/priorauth")
def ask_coverage(req: CoverageReq) -> dict:
    """A cited coverage answer from Agent 5's payer-policy search — no record is written."""
    settings = get_settings()
    msg = ("Using ONLY the payer policy library, answer this coverage question WITH a citation "
           "(policy id + section). Do NOT draft, create, or write any record — just answer.\n\n"
           f"Question: {req.question}")
    try:
        out = get_a2a_client().execute_agent(settings.snow_agent_priorauth, msg)
    except A2AError as exc:
        logger.error("Agent 5 A2A coverage failed: %s", exc)
        raise HTTPException(status_code=502, detail="Prior-Auth agent unavailable") from exc
    answer = out.get("reply") or "No matching payer policy found for that question."
    return {"answer": answer, "citation": {"policy": "Payer policy library", "section": "cited inline"}}


@router.delete("/priorauth/{packet_id}")
def delete_priorauth(packet_id: str) -> dict:
    """Delete a DRAFT prior-auth packet (record removed from ServiceNow). Submitted
    packets are immutable for audit and cannot be deleted."""
    table = get_table_client()
    sys_id = packet_id
    if len(sys_id) != 32:
        found = table.list(TABLE, f"u_number={packet_id}", fields="sys_id,u_status", limit=1)
        if not found:
            raise HTTPException(status_code=404, detail="Prior-auth packet not found")
        sys_id, status = found[0]["sys_id"], found[0].get("u_status")
    else:
        rec = table.get(TABLE, sys_id)
        if not rec:
            raise HTTPException(status_code=404, detail="Prior-auth packet not found")
        status = rec.get("u_status")
    if str(status).lower() == "submitted":
        raise HTTPException(status_code=409, detail="Submitted prior authorizations cannot be deleted")
    table.delete(TABLE, sys_id)
    return {"ok": True, "deleted": sys_id}


def _resolve(table, packet_id: str) -> dict:
    if len(packet_id) == 32:
        rec = table.get(TABLE, packet_id, display_value="false")
        if not rec:
            raise HTTPException(status_code=404, detail="Prior-auth packet not found")
        return rec
    found = table.list(TABLE, f"u_number={packet_id}", display_value="false", limit=1)
    if not found:
        raise HTTPException(status_code=404, detail="Prior-auth packet not found")
    return found[0]


class SaveReq(BaseModel):
    id: str
    edits: dict = {}
    clinicianEmail: Optional[str] = None


@router.post("/priorauth/save")
def save_priorauth(req: SaveReq, authorization: Optional[str] = Header(None)) -> dict:
    """Persist the clinician's edits to a DRAFT packet's document (u_packet_json)."""
    table = get_table_client()
    rec = _resolve(table, req.id)
    if str(rec.get("u_status")).lower() == "submitted":
        raise HTTPException(status_code=409, detail="Submitted prior authorizations are read-only")
    email = clinician_email(authorization, req.clinicianEmail)
    authorized = has_part2_access(email) and patient_has_part2_consent(rec.get("u_patient") or "")
    _persist_edits(table, rec, req.edits, authorized_sensitive=authorized)
    rec = table.get(TABLE, rec["sys_id"], display_value="false")
    return _packet(rec, _ctx(table, rec.get("u_patient") or ""), has_part2_access(email),
                   patient_has_part2_consent(rec.get("u_patient") or ""), email)


class SubmitReq(BaseModel):
    id: str
    edits: dict = {}
    clinicianEmail: Optional[str] = None


@router.post("/priorauth/submit")
def submit_priorauth(req: SubmitReq, authorization: Optional[str] = Header(None)) -> dict:
    """Clinician submits the drafted packet (the agent never submits). Persists final edits
    first, then locks it read-only."""
    table = get_table_client()
    rec = _resolve(table, req.id)
    email = clinician_email(authorization, req.clinicianEmail)
    authorized = has_part2_access(email) and patient_has_part2_consent(rec.get("u_patient") or "")
    if req.edits:
        _persist_edits(table, rec, req.edits, authorized_sensitive=authorized)
    table.update(TABLE, rec["sys_id"], {
        "u_status": "submitted",
        "u_submitted_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    })
    return {"ok": True, "status": "submitted"}
