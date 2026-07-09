"""App-side per-clinician role gate for 42 CFR Part 2 (UC3 Part B).

The FastAPI backend reads ServiceNow through ONE integration service account, which
holds ``u_bhuc_part2_access`` so it *can* fetch Part 2 data to serve authorized
clinicians. That means the backend must re-check the **specific** signed-in
clinician's role before it un-masks Part 2 / SUD content — otherwise any clinician
could reveal a consented patient's SUD data (the old consent-only gap).

We resolve the clinician's email (an explicit ``?clinicianEmail=`` param wins — as the
other patient endpoints already pass ``email`` — else decode the Cognito access
token's ``username`` claim from the ``Authorization`` header) and check whether their
``sys_user`` holds ``u_bhuc_part2_access``. Group-granted / inherited roles resolve
because ServiceNow materializes them into ``sys_user_has_role``.

The platform ACLs (``sud_usecase.md`` Part A) remain the authoritative gate for
direct-SN / Table-API access; this is the gate for **app users**.
"""

import base64
import binascii
import json
import logging
from typing import Optional

from .servicenow import get_table_client

logger = logging.getLogger("bhuc.access")

PART2_ROLE = "u_bhuc_part2_access"


def _decode_jwt_username(token: str) -> str:
    """Best-effort read of the ``username`` claim from a Cognito access token.

    No signature verification: the token was already validated at sign-in and the
    platform ACLs are the authoritative gate — this only identifies the caller so
    the app can gate its own un-masking. Returns "" for a non-JWT token (e.g. the
    ``demo.*`` fallback token), so callers fall back to deny-by-default.
    """
    parts = token.split(".")
    if len(parts) != 3:
        return ""
    try:
        payload = parts[1]
        payload += "=" * (-len(payload) % 4)  # restore base64url padding
        claims = json.loads(base64.urlsafe_b64decode(payload))
    except (ValueError, binascii.Error, json.JSONDecodeError):
        return ""
    if not isinstance(claims, dict):
        return ""
    # Cognito *access* tokens carry the pool username (the email in this setup) under
    # ``username``; id tokens use ``cognito:username`` / ``email``. Accept any.
    return (claims.get("username") or claims.get("cognito:username")
            or claims.get("email") or "")


def clinician_email(authorization: Optional[str], override: Optional[str]) -> str:
    """The signed-in clinician's email. An explicit ``override`` param wins (matches
    the other ``?email=`` endpoints and keeps the demo token working); otherwise
    decode the ``Authorization: Bearer <token>`` header."""
    if override and override.strip():
        return override.strip()
    if authorization and authorization.lower().startswith("bearer "):
        return _decode_jwt_username(authorization[7:].strip())
    return ""


def has_part2_access(email: str) -> bool:
    """True iff the clinician with this email holds ``u_bhuc_part2_access`` (an
    approved case manager). Group-granted / inherited roles resolve via
    ``sys_user_has_role``. Empty email → False (deny by default)."""
    if not email:
        return False
    try:
        table = get_table_client()
        users = table.list("sys_user", f"email={email}", fields="sys_id", limit=1)
        if not users:
            return False
        uid = users[0]["sys_id"]
        hit = table.list("sys_user_has_role",
                         f"user={uid}^role.name={PART2_ROLE}", fields="sys_id", limit=1)
        return bool(hit)
    except Exception as exc:  # noqa: BLE001 — a lookup failure must never un-mask
        logger.warning("has_part2_access lookup failed for %s: %s", email, exc)
        return False


def patient_has_part2_consent(patient_sys_id) -> bool:
    """True iff the patient has 42 CFR Part 2 consent on file
    (``u_bhuc_patient.u_part2_consent``). Accepts a sys_id string or a Table-API
    reference object (``{"link":..., "value": sys_id}``). Empty / lookup failure → False."""
    if isinstance(patient_sys_id, dict):        # Table-API reference field shape
        patient_sys_id = patient_sys_id.get("value", "")
    if not patient_sys_id:
        return False
    try:
        rec = get_table_client().get("u_bhuc_patient", patient_sys_id)
        return str((rec or {}).get("u_part2_consent")).lower() in ("true", "1")
    except Exception as exc:  # noqa: BLE001 — a lookup failure must never un-mask
        logger.warning("part2 consent lookup failed for %s: %s", patient_sys_id, exc)
        return False


def part2_gate(email: str, patient_sys_id: str) -> tuple[bool, bool]:
    """The consistent UC3 gate: returns ``(has_role, has_consent)`` for this
    clinician + patient. Callers un-mask only when BOTH are true, and surface each
    flag so the UI can tell "role required" from "consent required"."""
    return has_part2_access(email), patient_has_part2_consent(patient_sys_id)
