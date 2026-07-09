"""Shared helpers for the patient/care-team CRUD routers.

Open/pre-auth for now: the signed-in patient is identified by email (Cognito
username); the backend maps email -> u_bhuc_patient. Cognito JWT + ACLs come with
the governance pass (BE-2). Mirrors patient.py conventions.
"""

from typing import Optional

from .servicenow import get_table_client

PATIENT = "u_bhuc_patient"


def b(v) -> bool:
    """ServiceNow boolean string -> bool."""
    return str(v).lower() in ("true", "1")


def raw(v):
    """Unwrap a Table-API value that may be a {value,display_value} dict."""
    return v["value"] if isinstance(v, dict) else v


def find_patient_by_email(email: str) -> Optional[dict]:
    if not email:
        return None
    rows = get_table_client().list(PATIENT, f"u_email={email}", limit=1)
    return rows[0] if rows else None


def patient_sys_id(email: str = "", patient: str = "") -> str:
    """Resolve a patient sys_id from an explicit id or an email. '' if unknown."""
    if patient:
        return patient
    rec = find_patient_by_email(email)
    return rec["sys_id"] if rec else ""
