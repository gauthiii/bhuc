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
