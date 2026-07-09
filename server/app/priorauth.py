"""BHUC Prior-Auth Compliance Agent (Agent 5) — cited coverage answers + packet drafting.

The agent searches the payer policy library (with citations) and drafts a prior-auth packet
into ``u_bhuc_prior_auth`` (status ``draft``). The human submits; the agent never does.

Endpoints (mounted under /api/x_bhuc):
  GET  /priorauth?patient=<sys_id>   — latest draft packet for a patient (or null)
  POST /priorauth/draft              — run Agent 5 to draft a packet (returns it)
  POST /priorauth                    — ask a cited coverage question (Agent 5 search only)
  POST /priorauth/submit             — clinician submits (status=submitted)
"""

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from .access import clinician_email, has_part2_access, patient_has_part2_consent
from .config import get_settings
from .servicenow import A2AError, get_a2a_client, get_table_client

logger = logging.getLogger("bhuc.priorauth")

router = APIRouter(prefix="/api/x_bhuc", tags=["Prior-Auth Compliance Agent"])

TABLE = "u_bhuc_prior_auth"

_SUD_TERMS = ("sud", "opioid", "alcohol", "substance", "mat ", "buprenorphine", "methadone",
              "naltrexone", "suboxone", "detox", "f10", "f11", "f12", "f13", "f14", "f15", "f16", "f19")


def _b(v) -> bool:
    return str(v).lower() in ("true", "1")


def _looks_sud(text: str) -> bool:
    t = f" {text.lower()} "
    return any(term in t for term in _SUD_TERMS)


def _packet(rec: dict, part2_role: bool = False, part2_consent: bool = False) -> dict:
    """Map a u_bhuc_prior_auth record → the PriorAuthPacket the C6 screen expects. On a
    Part 2-gated packet, EVERY SUD-revealing field is access-gated unless the signed-in
    clinician holds u_bhuc_part2_access AND the patient has Part 2 consent on file (the
    consistent UC3 role+consent gate): the SUD detail, the Diagnosis (e.g. F11.20), the
    Coverage determination, the Citation (its section can name the treatment), and the
    requested service/treatment (e.g. "MAT buprenorphine/naloxone") shown in the title +
    list. Masked values are NOT sent to the client. Generic fields (payer, requested
    units) stay visible."""
    part2 = _b(rec.get("u_part2_gated"))
    allowed = part2_role and part2_consent
    masked = part2 and not allowed
    citation = " · ".join([x for x in [rec.get("u_citation_policy"), rec.get("u_citation_section")] if x])
    fields = [
        {"label": "Diagnosis", "value": "" if masked else (rec.get("u_diagnosis") or "—"), "part2": masked},
        {"label": "Requested units", "value": rec.get("u_requested_units") or "—", "part2": False},
        {"label": "Payer", "value": rec.get("u_payer") or "—", "part2": False},
        {"label": "Coverage determination", "value": "" if masked else (rec.get("u_coverage_answer") or "—"), "part2": masked},
        {"label": "Citation", "value": "" if masked else (citation or "—"), "part2": masked},
    ]
    sud = rec.get("u_sud_field")
    if part2 or sud:
        fields.append({"label": "SUD detail (42 CFR Part 2)",
                       "value": "" if masked else (sud or "—"), "part2": masked})
    service = rec.get("u_service") or "Prior authorization"
    return {
        "id": rec.get("u_number") or rec.get("sys_id"),
        "sysId": rec.get("sys_id"),
        "service": "Protected (42 CFR Part 2)" if masked else service,
        "serviceMasked": masked,
        "status": rec.get("u_status") or "draft",
        "part2Gated": part2,
        "part2Role": part2_role,
        "part2Consent": part2_consent,
        "draftedByAgent": _b(rec.get("u_drafted_by_agent")),
        "fields": fields,
    }


@router.get("/priorauth")
def get_priorauth(patient: str = Query(...), clinicianEmail: str = Query(""),
                  authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Latest prior-auth packet for a patient, or null if none has been drafted yet.
    The SUD field un-masks only for a clinician holding u_bhuc_part2_access."""
    table = get_table_client()
    found = table.list(TABLE, f"u_patient={patient}^ORDERBYDESCsys_created_on",
                       display_value="false", limit=1)
    if not found:
        return None
    rec = found[0]
    part2_role = has_part2_access(clinician_email(authorization, clinicianEmail))
    part2_consent = patient_has_part2_consent(rec.get("u_patient") or "")
    return _packet(rec, part2_role, part2_consent)


@router.get("/priorauth/all")
def list_priorauth(patient: str = Query(...), clinicianEmail: str = Query(""),
                   authorization: Optional[str] = Header(None)) -> list:
    """All prior-auth packets for a patient (newest first). A patient can have many —
    each is drafted and submitted independently — so the C6 screen lists them and lets
    the clinician start another once the latest is submitted. Each packet's SUD field is
    Part 2-gated per the viewing clinician's role + the patient's consent."""
    table = get_table_client()
    rows = table.list(TABLE, f"u_patient={patient}^ORDERBYDESCsys_created_on",
                      display_value="false", limit=50)
    if not rows:
        return []
    part2_role = has_part2_access(clinician_email(authorization, clinicianEmail))
    part2_consent = patient_has_part2_consent(patient)
    return [_packet(r, part2_role, part2_consent) for r in rows]


class DraftReq(BaseModel):
    patient: str = Field(..., min_length=1)   # patient sys_id
    service: str = Field(..., min_length=1)
    diagnosis: str = ""
    requestedUnits: str = ""
    payer: str = Field(..., min_length=1)
    clinicianEmail: Optional[str] = None


@router.post("/priorauth/draft")
def draft_priorauth(req: DraftReq, authorization: Optional[str] = Header(None)) -> dict:
    """Run Agent 5 to answer the coverage question (cited) and draft the packet into
    u_bhuc_prior_auth (status=draft). Returns the drafted packet."""
    settings = get_settings()
    table = get_table_client()
    before = {r["sys_id"] for r in table.list(TABLE, f"u_patient={req.patient}", fields="sys_id", limit=200)}
    part2_hint = ("This IS 42 CFR Part 2 / SUD content, so part2_gated=true and put the SUD detail in sud_field."
                  if _looks_sud(f"{req.service} {req.diagnosis}") else "part2_gated=false.")
    msg = (
        f"Patient sys_id {req.patient}, payer {req.payer}. The clinician requests prior authorization "
        f"for {req.service}, {req.requestedUnits or 'as clinically indicated'}, "
        f"diagnosis {req.diagnosis or 'see chart'}.\n\n"
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

    # Safety-net: Agent 5's record-op maps u_sud_field ← {{sud_field}}, but the model does
    # not reliably fill that input. If this IS a SUD request and the agent left the SUD field
    # / gate empty, populate them here so the Part 2 gate always has content to protect.
    if _looks_sud(f"{req.service} {req.diagnosis}"):
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

    part2_role = has_part2_access(clinician_email(authorization, req.clinicianEmail))
    part2_consent = patient_has_part2_consent(rec.get("u_patient") or req.patient)
    return _packet(rec, part2_role, part2_consent)


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


class SubmitReq(BaseModel):
    id: str


@router.post("/priorauth/submit")
def submit_priorauth(req: SubmitReq) -> dict:
    """Clinician submits the drafted packet (the agent never submits)."""
    from datetime import datetime, timezone
    table = get_table_client()
    sys_id = req.id
    if len(sys_id) != 32:
        found = table.list(TABLE, f"u_number={req.id}", fields="sys_id", limit=1)
        if not found:
            raise HTTPException(status_code=404, detail="Prior-auth packet not found")
        sys_id = found[0]["sys_id"]
    table.update(TABLE, sys_id, {
        "u_status": "submitted",
        "u_submitted_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    })
    return {"ok": True, "status": "submitted"}
