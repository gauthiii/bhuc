"""BHUC Front-Door Security Agent router (Agent 1, over A2A).

Exposes ``POST /api/x_bhuc/frontdoor/chat`` — the conversational front-door the
patient-portal Home screen calls (frontend ``api.frontDoorChat``). It brokers to
the native ServiceNow **BHUC Front Door Security Agent** over A2A (blocking mode):
facility/insurance questions answer with KB citations; a crisis phrase triggers
the 988 escalation subflow inside the agent.

This is a PUBLIC, unauthenticated path (the 988 crisis flow must work before
login, plan §2.9 / FE-Step 6), so it does not require a Cognito bearer.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from . import prompt_injection as pi
from .config import get_settings
from .servicenow import A2AError, get_a2a_client

logger = logging.getLogger("bhuc.frontdoor")

router = APIRouter(prefix="/api/x_bhuc/frontdoor", tags=["Front-Door Agent"])


class ChatRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    # Optional multi-turn continuation ids returned by a prior reply.
    contextId: Optional[str] = None
    taskId: Optional[str] = None


class ChatReply(BaseModel):
    reply: str
    # Maps to the agent's crisis-classifier output; drives the UI 988 crisis state.
    crisis: bool = False
    riskLevel: str = "none"
    matched: str = "none"
    contextId: Optional[str] = None
    taskId: Optional[str] = None
    state: Optional[str] = None
    # Prompt-injection output filter: true when the agent reply was blocked + replaced
    # with a safe refusal; injectionCategory names which control fired.
    filtered: bool = False
    injectionCategory: str = "none"


@router.post("/chat", response_model=ChatReply)
def frontdoor_chat(req: ChatRequest) -> ChatReply:
    settings = get_settings()
    client = get_a2a_client()

    # Detective: count suspicious INPUTs for the governance metric. This does NOT gate the
    # request — enforcement is output-side (below), so a benign message phrased oddly is
    # never blocked and a clever injection is still caught by the output filter.
    if pi.scan_input(req.text).get("suspicious"):
        pi.record_input_attempt()

    try:
        out = client.execute_agent(
            settings.snow_agent_frontdoor,
            req.text,
            context_id=req.contextId,
            task_id=req.taskId,
        )
    except A2AError as exc:
        logger.error("Front-Door A2A invocation failed: %s", exc)
        raise HTTPException(status_code=502, detail="Front-Door agent is unavailable") from exc

    if not out.get("reply"):
        # Agent completed but produced no user-facing text — surface a safe fallback.
        out["reply"] = (
            "I'm sorry, I couldn't process that just now. If this is an emergency, "
            "call or text 988 for the Suicide & Crisis Lifeline."
        )

    # ENFORCE — deterministic prompt-injection output filter. If the agent's reply shows a
    # sign an injection succeeded (leaked prompt/tools, clinical advice, jailbreak
    # compliance, exfiltration/unsafe markup), block it and return a safe refusal. The 988
    # crisis path skips the content-scope checks (see prompt_injection.scan_output).
    out["filtered"] = False
    out["injectionCategory"] = "none"
    verdict = pi.scan_output(out.get("reply") or "", crisis=bool(out.get("crisis")))
    if verdict["flagged"]:
        pi.record_block(verdict["category"], verdict["matched"], req.text)
        logger.warning("Front-Door output filtered: category=%s matched=%r",
                       verdict["category"], verdict["matched"])
        out["reply"] = verdict["safe_reply"]
        out["filtered"] = True
        out["injectionCategory"] = verdict["category"]

    out["riskLevel"] = "crisis" if out.get("crisis") else "none"
    return ChatReply(**out)
