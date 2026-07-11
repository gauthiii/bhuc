"""Governance — Output Integrity summary (UC2) for the Governance portal.

App-side view of the Output-Integrity control: computed from data the app already
owns (u_bhuc_screening scores + clinician decisions, u_bhuc_care_plan notes +
unverified lines + sign state). The native guardrail metrics (Data Integrity /
Output Screening) live in the AICT Health / Security & Privacy tabs (UI-only), so
the frontend deep-links to those.
"""

import json
import logging

from fastapi import APIRouter, HTTPException

from . import prompt_injection as pi
from .servicenow import get_table_client

logger = logging.getLogger("bhuc.governance")

router = APIRouter(prefix="/api/x_bhuc/governance", tags=["Governance"])

SCREENING = "u_bhuc_screening"
CARE_PLAN = "u_bhuc_care_plan"


def _pct(n: int, d: int) -> int:
    return round(100 * n / d) if d else 0


@router.get("/output-integrity")
def output_integrity() -> dict:
    table = get_table_client()

    # --- Agent 2 (Risk Identification): confidence + clinician disagreement ---
    scr = table.list(SCREENING, "u_scored_by_agent=true",
                     fields="u_confidence,u_clinician_action", limit=1000)
    total2 = len(scr)
    confs = []
    for s in scr:
        try:
            confs.append(int(s.get("u_confidence") or 0))
        except (TypeError, ValueError):
            pass
    avg_conf = round(sum(confs) / len(confs)) if confs else 0
    low_conf = sum(1 for c in confs if c < 70)
    actions = {"pending": 0, "confirmed": 0, "adjusted": 0, "rejected": 0}
    for s in scr:
        a = (s.get("u_clinician_action") or "pending").lower()
        if a in actions:
            actions[a] += 1
    reviewed = actions["confirmed"] + actions["adjusted"] + actions["rejected"]
    disagree = actions["adjusted"] + actions["rejected"]

    # --- Agent 3 (Clinical Documentation): grounding + sign gate ---
    notes = table.list(CARE_PLAN, "",
                       fields="u_unverified_lines,u_signed,u_draft_note", limit=1000)
    total3 = len(notes)
    with_unverified = 0
    unverified_total = 0
    signed = 0
    for n in notes:
        try:
            uv = json.loads(n.get("u_unverified_lines") or "[]")
        except (json.JSONDecodeError, TypeError):
            uv = []
        if uv:
            with_unverified += 1
            unverified_total += len(uv)
        if str(n.get("u_signed")).lower() in ("true", "1"):
            signed += 1

    return {
        "agent2": {
            "label": "BHUC Risk Identification Agent",
            "total": total2,
            "avgConfidence": avg_conf,
            "lowConfidence": low_conf,
            "reviewed": reviewed,
            "pending": actions["pending"],
            "confirmed": actions["confirmed"],
            "adjusted": actions["adjusted"],
            "rejected": actions["rejected"],
            # clinician disagreeing with the AI score is a direct output-integrity signal
            "disagreeRatePct": _pct(disagree, reviewed),
        },
        "agent3": {
            "label": "BHUC Clinical Documentation Agent",
            "total": total3,
            "withUnverified": with_unverified,
            "unverifiedRatePct": _pct(with_unverified, total3),
            "avgUnverifiedLines": round(unverified_total / with_unverified, 1) if with_unverified else 0,
            "signed": signed,
            "unsigned": total3 - signed,
        },
    }


# ---- Scheduling fairness monitoring (UC4 / Agent 6) ----------------------
# Monitors that scheduling OUTCOMES are equitable across demographics even though the
# agent's fairness check blinds the *decision* to them. Metric = wait-time parity:
# average wait (requested slot -> scheduled slot, in days) per group; parity = 1 - (max-min)/max.

APPT = "u_bhuc_appointment"


def _age_band(dob: str) -> str:
    try:
        y = int((dob or "")[:4])
    except (ValueError, TypeError):
        return "Unknown"
    age = 2026 - y
    if age < 30:
        return "18-29"
    if age < 45:
        return "30-44"
    if age < 60:
        return "45-59"
    return "60+"


_ETHN_LABEL = {"hispanic_or_latino": "Hispanic or Latino",
               "not_hispanic_or_latino": "Not Hispanic or Latino",
               "prefer_not_to_say": "Prefer not to say", "": "Unknown"}
_GENDER_LABEL = {"female": "Female", "male": "Male", "nonbinary": "Non-binary",
                 "other": "Other", "prefer_not_to_say": "Prefer not to say", "": "Unknown"}
_RACE_LABEL = {"white": "White", "black_or_african_american": "Black or African American",
               "asian": "Asian", "american_indian_or_alaska_native": "American Indian or Alaska Native",
               "native_hawaiian_or_pacific_islander": "Native Hawaiian or Pacific Islander",
               "two_or_more": "Two or more races", "other": "Other race",
               "prefer_not_to_say": "Prefer not to say", "": "Unknown"}


def _wait_days(scheduled: str, requested: str) -> float:
    from datetime import datetime as _dt
    fmt = "%Y-%m-%d %H:%M:%S"
    try:
        s = _dt.strptime((scheduled or "")[:19], fmt)
        r = _dt.strptime((requested or scheduled or "")[:19], fmt)
        return max(0.0, (s - r).total_seconds() / 86400.0)
    except (ValueError, TypeError):
        return 0.0


def _dimension(rows: list, keyfn, labelfn) -> tuple:
    """Return (list of {group,count,avgWaitDays}, fairnessRatePct) for one demographic axis."""
    groups: dict = {}
    for r in rows:
        g = keyfn(r)
        groups.setdefault(g, []).append(r["_wait"])
    out = []
    for g, waits in groups.items():
        out.append({"group": labelfn(g), "count": len(waits),
                    "avgWaitDays": round(sum(waits) / len(waits), 1) if waits else 0.0})
    out.sort(key=lambda x: x["group"])
    avgs = [o["avgWaitDays"] for o in out if o["count"] > 0]
    mx = max(avgs) if avgs else 0.0
    mn = min(avgs) if avgs else 0.0
    rate = 100 if mx <= 0 else round((1 - (mx - mn) / mx) * 100)
    return out, rate


@router.get("/fairness")
def scheduling_fairness() -> dict:
    """Distribution of confirmed/completed appointments + wait-time parity by
    age band, gender, race, and ethnicity."""
    table = get_table_client()
    # Only complete rows: a scheduled outcome with a preserved request time AND a patient with
    # demographics on file. Incomplete rows are data-quality gaps, not bias — excluding them keeps
    # the parity metric honest (no phantom "Unknown" group).
    rows = table.list(
        APPT, ("u_statusINconfirmed,completed^u_requested_startISNOTEMPTY"
               "^u_patient.u_genderISNOTEMPTY^u_patient.u_ethnicityISNOTEMPTY"
               "^u_patient.u_raceISNOTEMPTY"),
        fields=("u_start,u_requested_start,u_patient.u_gender,u_patient.u_race,"
                "u_patient.u_ethnicity,u_patient.u_date_of_birth"), limit=500)
    data = []
    for r in rows:
        dob = r.get("u_patient.u_date_of_birth") or ""
        data.append({
            "_wait": _wait_days(r.get("u_start"), r.get("u_requested_start")),
            "gender": r.get("u_patient.u_gender") or "",
            "race": r.get("u_patient.u_race") or "",
            "ethnicity": r.get("u_patient.u_ethnicity") or "",
            "ageBand": _age_band(dob),
        })
    by_gender, r_g = _dimension(data, lambda r: r["gender"], lambda g: _GENDER_LABEL.get(g, g or "Unknown"))
    by_race, r_r = _dimension(data, lambda r: r["race"], lambda g: _RACE_LABEL.get(g, g or "Unknown"))
    by_ethnicity, r_e = _dimension(data, lambda r: r["ethnicity"], lambda g: _ETHN_LABEL.get(g, g or "Unknown"))
    by_age, r_a = _dimension(data, lambda r: r["ageBand"], lambda g: g)
    overall = round((r_g + r_r + r_e + r_a) / 4) if data else 100
    return {
        "total": len(data),
        "byGender": by_gender,
        "byRace": by_race,
        "byEthnicity": by_ethnicity,
        "byAge": by_age,
        "fairnessRate": {"gender": r_g, "race": r_r, "ethnicity": r_e, "age": r_a, "overall": overall},
    }


# ---- Prompt-injection defense monitoring (Agent 1 / Front-Door) ----------------------
# App-side view of the deterministic output filter in prompt_injection.py: how many replies
# were blocked, by category, plus suspicious-input attempts and recent samples. Counters are
# in-process (reset on restart); native detection lives on the AICT Security & privacy tab.

@router.get("/prompt-injection")
def prompt_injection_summary() -> dict:
    return pi.summary()


# ---- AI Asset Management (mirrors AI Control Tower Managed / Unmanaged assets) ---------
# Live view of the AICT AI Asset Inventory for the BHUC agents, plus instance-wide totals.
# Data model (AICT docs, Zurich): each AI system/agent is a row in
# ``alm_ai_system_digital_asset``; its governance state (Managed/Unmanaged + lifecycle +
# risk classification) is in ``sn_ai_governance_asset_governance_details`` joined on the
# asset sys_id. Reference fields come back as {value, display_value} on this instance, so we
# read display values for labels and the raw value for join keys.

AI_SYSTEM = "alm_ai_system_digital_asset"
AI_GOV = "sn_ai_governance_asset_governance_details"


def _val(v):
    return v.get("value") if isinstance(v, dict) else v


def _disp(v):
    return v.get("display_value") if isinstance(v, dict) else v


def _managed(v) -> bool:
    return str(_val(v)).lower() in ("true", "1")


@router.get("/ai-assets")
def ai_assets() -> dict:
    """BHUC agents from the AI Asset Inventory, split Managed/Unmanaged with lifecycle +
    risk classification, plus instance-wide system totals — mirrors the AI Control Tower."""
    table = get_table_client()

    # BHUC AI systems (the 6 agents)
    systems = table.list(
        AI_SYSTEM, "display_nameLIKEBHUC^ORDERBYdisplay_name",
        fields="sys_id,display_name,model_category,sys_created_by,life_cycle_stage",
        display_value="all", limit=50)
    ids = [_val(s.get("sys_id")) for s in systems]

    # Governance record per BHUC system (joined on asset = system sys_id)
    gov_by_asset: dict = {}
    if ids:
        gov = table.list(
            AI_GOV, "assetIN" + ",".join(ids),
            fields="asset,governed,lifecycle_phase,risk_score",
            display_value="all", limit=200)
        for g in gov:
            gov_by_asset[_val(g.get("asset"))] = g

    managed, unmanaged = [], []
    for s in systems:
        g = gov_by_asset.get(_val(s.get("sys_id")))
        is_managed = _managed(g.get("governed")) if g else False
        lifecycle = (_disp(g.get("lifecycle_phase")) if g else "") or _disp(s.get("life_cycle_stage")) or "—"
        risk = (_disp(g.get("risk_score")) if g else "") or "—"
        row = {
            "id": _val(s.get("sys_id")),          # digital-asset sys_id → detail route key
            "name": _disp(s.get("display_name")) or "—",
            "builtBy": _disp(s.get("sys_created_by")) or "—",
            "type": _disp(s.get("model_category")) or "AI system",
            "lifecycle": lifecycle,
            "risk": risk,
            "managed": is_managed,
        }
        (managed if is_managed else unmanaged).append(row)

    # Instance-wide totals: count managed SYSTEMS (governance rows with governed=true whose
    # asset is an AI system), not sub-assets.
    all_ids = {_val(r.get("sys_id")) for r in
               table.list(AI_SYSTEM, "", fields="sys_id", display_value="all", limit=2000)}
    total = len(all_ids)
    managed_gov = table.list(AI_GOV, "governed=true", fields="asset", display_value="all", limit=2000)
    managed_instance = len({_val(g.get("asset")) for g in managed_gov} & all_ids)

    return {
        "bhuc": {"managed": managed, "unmanaged": unmanaged},
        "instance": {"totalSystems": total, "managed": managed_instance,
                     "unmanaged": max(0, total - managed_instance)},
    }


AGENT = "sn_aia_agent"
AGENT_TOOL_M2M = "sn_aia_agent_tool_m2m"
AGENT_TOOL = "sn_aia_tool"
AIRC_SYSTEM = "sn_grc_ai_gov_ai_system"          # AIRC AI-system record (risk ratings)
AIRC_TASK = "sn_grc_ai_gov_ai_system_task"       # AI assessments (impact/risk) on that record
RISK = "sn_risk_risk"                            # risks attached via the agent's GRC profile
CONTROL = "sn_compliance_control"                # controls attached via the agent's GRC profile


def _tool_retrieval(m2m_inputs: str) -> dict:
    """Pull the RAG/search config out of a Search Retriever tool's m2m inputs JSON."""
    try:
        items = json.loads(m2m_inputs or "[]")
    except (json.JSONDecodeError, TypeError):
        return {}
    by = {i.get("name"): i.get("value") for i in items if isinstance(i, dict)}
    keys = ("search_type", "search_profile", "sources", "search_results_limit",
            "document_match_threshold", "semantic_index_names", "chunking_mode",
            "chunk_size", "expanded_snippet_size")
    out = {k: by[k] for k in keys if by.get(k) not in (None, "")}
    return out


@router.get("/ai-assets/{asset_id}")
def ai_asset_detail(asset_id: str) -> dict:
    """Full detail for one BHUC agent: AICT governance (risk, assessments, approvals,
    attached risks/controls — live, empty where none exist) + the agent's config
    (description/role/instructions) and every tool with its full definition."""
    table = get_table_client()

    try:
        asset = table.get(AI_SYSTEM, asset_id, display_value="all")
    except Exception:  # ServiceNow 404 on an unknown sys_id raises via raise_for_status
        asset = None
    if not asset:
        raise HTTPException(status_code=404, detail="AI asset not found")
    name = _disp(asset.get("display_name")) or ""

    # governance details (managed / lifecycle / risk)
    gd = table.list(AI_GOV, f"asset={asset_id}", display_value="all", limit=1)
    gd = gd[0] if gd else None
    managed = _managed(gd.get("governed")) if gd else False

    # AIRC governance record (risk ratings) — present only for governed/managed agents
    airc = table.list(AIRC_SYSTEM, f"ai_system_digital_asset={asset_id}", display_value="all", limit=1)
    airc = airc[0] if airc else None
    airc_out = None
    airc_id = None
    if airc:
        airc_id = _val(airc.get("sys_id"))
        airc_out = {
            "number": _disp(airc.get("number")),
            "riskClassification": _disp(airc.get("risk_classification")) or "—",
            "inherentRating": _disp(airc.get("inherent_rating")) or "—",
            "residualRating": _disp(airc.get("residual_rating")) or "—",
            "controlEffectiveness": _disp(airc.get("control_effectiveness_rating")) or "—",
            "state": _disp(airc.get("state")) or "—",
            "owner": _disp(airc.get("business_owner")) or "—",
            "description": _disp(airc.get("description")) or "",
        }

    # Assessments (impact & risk) — AICT task records on the AIRC system, with status +
    # who it is assigned to / approved by.
    assessments = []
    if airc_id:
        atasks = table.list(AIRC_TASK, f"ai_system={airc_id}^ORDERBYnumber", display_value="all", limit=50)
        assessments = [{
            "number": _disp(a.get("number")),
            "type": _disp(a.get("assessment_template")) or "Assessment",
            "state": _disp(a.get("state")) or "—",
            "assignedTo": _disp(a.get("assigned_to")) or "—",
            "openedBy": _disp(a.get("opened_by")) or "—",
        } for a in atasks]

    # Risks & controls — attached via the agent's GRC profile (matched by name).
    risks, controls = [], []
    if name:
        for r in table.list(RISK, f"profile.name={name}", display_value="all", limit=50):
            risks.append({
                "name": _disp(r.get("statement")) or _disp(r.get("content")) or "—",
                "description": _disp(r.get("description")) or "",
                "state": _disp(r.get("state")) or "—",
                "owner": _disp(r.get("owner")) or "—",
                "inherent": _disp(r.get("inherent_score")) or _disp(r.get("inherent_risk")) or "—",
                "residual": _disp(r.get("residual_score")) or _disp(r.get("residual_risk")) or "—",
            })
        for c in table.list(CONTROL, f"profile.name={name}", display_value="all", limit=50):
            controls.append({
                "name": _disp(c.get("content")) or _disp(c.get("reference")) or "—",
                "description": _disp(c.get("description")) or "",
                "state": _disp(c.get("state")) or "—",
                "owner": _disp(c.get("owner")) or "—",
                "classification": _disp(c.get("classification")) or "—",
            })

    # agent config (sn_aia_agent) — match by name
    ag = table.list(AGENT, f"name={name}", display_value="all", limit=1) \
        or table.list(AGENT, f"nameLIKE{name}", display_value="all", limit=1)
    agent_out, tools_out = None, []
    if ag:
        a = ag[0]
        agent_id = _val(a.get("sys_id"))
        agent_out = {
            "name": _disp(a.get("name")), "description": _disp(a.get("description")) or "",
            "role": _disp(a.get("role")) or "", "instructions": _disp(a.get("instructions")) or "",
            "strategy": _disp(a.get("strategy")) or "—",
        }
        # tools + full definitions
        m2m = table.list(AGENT_TOOL_M2M, f"agent={agent_id}", display_value="all", limit=50)
        for m in m2m:
            tool_ref = _val(m.get("tool"))
            trec = table.get(AGENT_TOOL, tool_ref, display_value="all") if tool_ref else None
            ttype = _disp(trec.get("type")) if trec else ""
            tool = {
                "name": _disp(m.get("name")) or (_disp(trec.get("name")) if trec else "—"),
                "executionMode": _disp(m.get("execution_mode")) or "—",
                "type": ttype or "—",
                "description": (_disp(trec.get("description")) if trec else "") or "",
                "script": (_disp(trec.get("script")) if trec and ttype == "Script" else "") or "",
                "subflow": (_disp(trec.get("target_document")) if trec and ttype == "Subflow" else "") or "",
                "retrieval": _tool_retrieval(_disp(m.get("inputs"))) if ttype == "Search Retriever" else {},
            }
            tools_out.append(tool)

    return {
        "asset": {
            "name": name, "type": _disp(asset.get("model_category")) or "AI system",
            "builtBy": _disp(asset.get("sys_created_by")) or "—",
            "lifecycle": (_disp(gd.get("lifecycle_phase")) if gd else "") or _disp(asset.get("life_cycle_stage")) or "—",
            "managed": managed,
            "riskScore": (_disp(gd.get("risk_score")) if gd else "") or "—",
        },
        "airc": airc_out,
        "assessments": assessments,
        "risks": risks,
        "controls": controls,
        "agent": agent_out,
        "tools": tools_out,
    }
