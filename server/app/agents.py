"""Generic A2A agent chat relay for the Governance portal's Agents Inventory.

Lets a governance officer send a free-form message to any of the built agents and see
the reply — a thin relay to the same blocking A2A path used by the front-door chat.
"""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .config import get_settings
from .servicenow import A2AError, get_a2a_client

logger = logging.getLogger("bhuc.agents")

router = APIRouter(prefix="/api/x_bhuc/agent", tags=["Agents Inventory"])


def _agent_map() -> dict:
    s = get_settings()
    return {
        "frontdoor": ("BHUC Front-Door Security Agent", s.snow_agent_frontdoor),
        "risk": ("BHUC Risk Identification Agent", s.snow_agent_risk),
        "clinicaldoc": ("BHUC Clinical Documentation Agent", s.snow_agent_clinicaldoc),
        "consent": ("BHUC Consent & Data Protection Agent", s.snow_agent_consent),
        "priorauth": ("BHUC Prior-Auth Compliance Agent", s.snow_agent_priorauth),
        "scheduling": ("BHUC Scheduling Agent", s.snow_agent_scheduling),
    }


class AgentChatReq(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)


@router.post("/{key}/chat")
def agent_chat(key: str, req: AgentChatReq) -> dict:
    agents = _agent_map()
    if key not in agents:
        raise HTTPException(status_code=404, detail=f"Unknown agent '{key}'")
    name, sys_id = agents[key]
    try:
        out = get_a2a_client().execute_agent(sys_id, req.text)
    except A2AError as exc:
        logger.error("Agent %s A2A chat failed: %s", key, exc)
        raise HTTPException(status_code=502, detail=f"{name} is unavailable") from exc
    reply = out.get("reply") or "(the agent returned no text for that message)"
    return {"agent": name, "reply": reply, "state": out.get("state")}
