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

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

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


def _packet(rec: dict) -> dict:
    """Map a u_bhuc_prior_auth record → the PriorAuthPacket the C6 screen expects. The SUD
    field is access-gated (part2:true) when the agent set u_part2_gated."""
    part2 = _b(rec.get("u_part2_gated"))
    citation = " · ".join([x for x in [rec.get("u_citation_policy"), rec.get("u_citation_section")] if x])
    fields = [
        {"label": "Diagnosis", "value": rec.get("u_diagnosis") or "—", "part2": False},
        {"label": "Requested units", "value": rec.get("u_requested_units") or "—", "part2": False},
        {"label": "Payer", "value": rec.get("u_payer") or "—", "part2": False},
        {"label": "Coverage determination", "value": rec.get("u_coverage_answer") or "—", "part2": False},
        {"label": "Citation", "value": citation or "—", "part2": False},
    ]
    sud = rec.get("u_sud_field")
    if part2 or sud:
        fields.append({"label": "SUD detail (42 CFR Part 2)", "value": sud or "—", "part2": part2})
    return {
        "id": rec.get("u_number") or rec.get("sys_id"),
        "sysId": rec.get("sys_id"),
        "service": rec.get("u_service") or "Prior authorization",
        "status": rec.get("u_status") or "draft",
        "part2Gated": part2,
        "draftedByAgent": _b(rec.get("u_drafted_by_agent")),
        "fields": fields,
    }


@router.get("/priorauth")
def get_priorauth(patient: str = Query(...)) -> Optional[dict]:
    """Latest prior-auth packet for a patient, or null if none has been drafted yet."""
    table = get_table_client()
    found = table.list(TABLE, f"u_patient={patient}^ORDERBYDESCsys_created_on",
                       display_value="false", limit=1)
    return _packet(found[0]) if found else None


class DraftReq(BaseModel):
    patient: str = Field(..., min_length=1)   # patient sys_id
    service: str = Field(..., min_length=1)
    diagnosis: str = ""
    requestedUnits: str = ""
    payer: str = Field(..., min_length=1)


@router.post("/priorauth/draft")
def draft_priorauth(req: DraftReq) -> dict:
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
    return _packet(found[0])


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
