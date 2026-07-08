"""Governance — Output Integrity summary (UC2) for the Governance portal.

App-side view of the Output-Integrity control: computed from data the app already
owns (u_bhuc_screening scores + clinician decisions, u_bhuc_care_plan notes +
unverified lines + sign state). The native guardrail metrics (Data Integrity /
Output Screening) live in the AICT Health / Security & Privacy tabs (UI-only), so
the frontend deep-links to those.
"""

import json
import logging

from fastapi import APIRouter

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
