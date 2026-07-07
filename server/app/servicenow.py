"""ServiceNow A2A (Agent2Agent) client for invoking BHUC AI agents.

Implements the exact contract verified from the careatlas ``execute_agent`` and
plan.md §8.2 BE-Step 3/4:

  1. OAuth client-credentials token from ``/oauth_token.do`` (scope ``a2aauthscope``),
     cached and refreshed on expiry (respecting ``SNOW_A2A_TOKEN_SKEW_SECONDS``).
  2. Invoke the agent at ``POST /api/sn_aia/a2a/v2/agent/id/{agent_sys_id}`` with a
     JSON-RPC 2.0 ``message/send`` body in synchronous blocking mode.
  3. Parse the reply text out of the several shapes the agent can return.

The OAuth A2A client is used for agent invocation ONLY; Table-API CRUD uses basic
auth separately (BE-Step 6) and is not implemented here.
"""

import json
import logging
import threading
import time
import uuid
from typing import Optional

import httpx

from .config import Settings, get_settings

logger = logging.getLogger("bhuc.servicenow")


class A2AError(RuntimeError):
    """Raised when the A2A token fetch or agent invocation fails."""


class ServiceNowA2AClient:
    """Thin, thread-safe broker to ServiceNow AI agents over A2A."""

    def __init__(self, settings: Settings) -> None:
        self._s = settings
        self._token: Optional[str] = None
        self._token_exp: float = 0.0
        self._lock = threading.Lock()

    # ---- OAuth (client-credentials) -------------------------------------
    def _get_token(self) -> str:
        with self._lock:
            now = time.time()
            skew = self._s.snow_a2a_token_skew_seconds
            if self._token and now < (self._token_exp - skew):
                return self._token

            if not (self._s.snow_a2a_client_id and self._s.snow_a2a_client_secret):
                raise A2AError("ServiceNow A2A OAuth client credentials are not configured")

            url = f"{self._s.snow_base_url}/oauth_token.do"
            try:
                resp = httpx.post(
                    url,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self._s.snow_a2a_client_id,
                        "client_secret": self._s.snow_a2a_client_secret,
                        "scope": self._s.snow_a2a_scope,
                    },
                    timeout=self._s.request_timeout,
                )
            except httpx.HTTPError as exc:  # network error
                raise A2AError(f"A2A token request failed: {exc}") from exc

            if resp.status_code != 200:
                raise A2AError(f"A2A token request returned {resp.status_code}: {resp.text[:200]}")

            payload = resp.json()
            token = payload.get("access_token")
            if not token:
                raise A2AError("A2A token response had no access_token")
            self._token = token
            self._token_exp = now + float(payload.get("expires_in", 1800))
            return token

    # ---- Agent invocation (blocking) ------------------------------------
    def execute_agent(
        self,
        agent_sys_id: str,
        text: str,
        *,
        context_id: Optional[str] = None,
        task_id: Optional[str] = None,
    ) -> dict:
        """Invoke an AI agent synchronously and return a normalized reply.

        Returns ``{"reply": str, "contextId": str|None, "taskId": str|None,
        "state": str|None}``. ``contextId``/``taskId`` can be threaded back in for
        multi-turn conversations.
        """
        token = self._get_token()
        rpc_id = str(uuid.uuid4())
        message: dict = {
            "kind": "message",
            "role": "user",
            "messageId": str(uuid.uuid4()),
            "parts": [{"kind": "text", "text": text}],
        }
        if context_id:
            message["contextId"] = context_id
        if task_id:
            message["taskId"] = task_id

        body = {
            "jsonrpc": "2.0",
            "id": rpc_id,
            "method": "message/send",
            "params": {
                "configuration": {"blocking": True},
                "message": message,
                "metadata": {},
            },
        }
        url = f"{self._s.snow_base_url}/api/sn_aia/a2a/v2/agent/id/{agent_sys_id}"
        try:
            resp = httpx.post(
                url,
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                timeout=self._s.snow_agent_execute_timeout,
            )
        except httpx.HTTPError as exc:
            raise A2AError(f"A2A agent request failed: {exc}") from exc

        if resp.status_code in (401, 403):
            raise A2AError(
                "A2A agent returned "
                f"{resp.status_code}: check OAuth scope/client credentials, AI Agent "
                "Studio third-party access/discoverability, and agent ACL/user access."
            )
        if resp.status_code != 200:
            raise A2AError(f"A2A agent returned {resp.status_code}: {resp.text[:300]}")

        payload = resp.json()
        if "error" in payload and payload["error"]:
            raise A2AError(f"A2A agent JSON-RPC error: {payload['error']}")

        return self._parse_reply(payload.get("result") or {})

    @staticmethod
    def _parse_reply(result: dict) -> dict:
        """Extract human-facing text + conversation ids from an A2A result.

        The agent can surface text under several shapes; the LAST substantive
        artifact/text part is the user-facing answer (earlier parts include the
        crisis-classifier JSON and internal resolution steps).
        """
        texts: list[str] = []

        def collect(parts) -> None:
            if not isinstance(parts, list):
                return
            for part in parts:
                if isinstance(part, dict) and (part.get("kind") == "text" or part.get("type") == "text"):
                    t = part.get("text")
                    if isinstance(t, str) and t.strip():
                        texts.append(t.strip())

        status = result.get("status") or {}
        status_msg = status.get("message") or {}
        collect(status_msg.get("parts"))
        collect((result.get("message") or {}).get("parts"))
        for artifact in result.get("artifacts") or []:
            collect((artifact or {}).get("parts"))
        for hist in result.get("history") or []:
            if isinstance(hist, dict) and hist.get("role") == "agent":
                collect(hist.get("parts"))

        # The user-facing answer is the LAST natural-language part. Exclude control
        # tokens ("completed", "Task has been completed") and the internal
        # JSON-object parts (the crisis-classifier ``{"crisis":...}`` and empty
        # ``{}`` placeholders) — never surface those to the patient. If nothing
        # natural-language remains, leave reply empty so the router applies its
        # safe 988 fallback.
        control = {"completed", "task has been completed"}
        candidates: list[str] = []
        crisis = False
        matched = "none"
        for t in texts:
            if t.lower() in control:
                continue
            if t.startswith("{") and t.endswith("}"):
                # Internal JSON part — the crisis classifier is ``{"crisis":bool,
                # "matched":str}``. Never surface it as reply text, but read its flag.
                try:
                    obj = json.loads(t)
                except json.JSONDecodeError:
                    continue
                if isinstance(obj, dict) and "crisis" in obj:
                    crisis = bool(obj.get("crisis"))
                    matched = obj.get("matched") or matched
                continue
            candidates.append(t)
        reply = candidates[-1] if candidates else ""

        context_id = status_msg.get("contextId") or result.get("contextId")
        task_id = status_msg.get("taskId") or result.get("id")
        state = status.get("state")
        return {
            "reply": reply,
            "crisis": crisis,
            "matched": matched,
            "contextId": context_id,
            "taskId": task_id,
            "state": state,
        }


class TableClient:
    """Thin ServiceNow Table API client (basic auth) for u_bhuc_* CRUD.

    Per plan §8.2 BE-Step 3/6: agent invocation uses the OAuth A2A client, but plain
    Table-API CRUD uses basic auth. Open/pre-governance for now (SN-Step 13 ACLs later).
    """

    def __init__(self, settings: Settings) -> None:
        self._s = settings
        self._auth = (settings.snow_username or "", settings.snow_password or "")

    def _url(self, table: str, sys_id: Optional[str] = None) -> str:
        u = f"{self._s.snow_base_url}/api/now/table/{table}"
        return f"{u}/{sys_id}" if sys_id else u

    def create(self, table: str, fields: dict) -> dict:
        r = httpx.post(self._url(table), json=fields, auth=self._auth,
                       headers={"Accept": "application/json"}, timeout=self._s.request_timeout)
        r.raise_for_status()
        return r.json()["result"]

    def get(self, table: str, sys_id: str, display_value: str = "false") -> dict:
        r = httpx.get(self._url(table, sys_id), auth=self._auth,
                      params={"sysparm_display_value": display_value},
                      headers={"Accept": "application/json"}, timeout=self._s.request_timeout)
        r.raise_for_status()
        return r.json()["result"]

    def update(self, table: str, sys_id: str, fields: dict) -> dict:
        r = httpx.patch(self._url(table, sys_id), json=fields, auth=self._auth,
                        headers={"Accept": "application/json"}, timeout=self._s.request_timeout)
        r.raise_for_status()
        return r.json()["result"]

    def list(self, table: str, query: str, *, fields: str = "", limit: int = 100,
             display_value: str = "false") -> list:
        params = {"sysparm_query": query, "sysparm_limit": str(limit),
                  "sysparm_display_value": display_value}
        if fields:
            params["sysparm_fields"] = fields
        r = httpx.get(self._url(table), auth=self._auth, params=params,
                      headers={"Accept": "application/json"}, timeout=self._s.request_timeout)
        r.raise_for_status()
        return r.json()["result"]


_table: Optional[TableClient] = None


def get_table_client() -> TableClient:
    global _table
    if _table is None:
        _table = TableClient(get_settings())
    return _table


_client: Optional[ServiceNowA2AClient] = None
_client_lock = threading.Lock()


def get_a2a_client() -> ServiceNowA2AClient:
    """Process-wide singleton A2A client (shares the cached OAuth token)."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                _client = ServiceNowA2AClient(get_settings())
    return _client
