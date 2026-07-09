"""Secure messaging (patient P8) over u_bhuc_message.

GET  /messages/threads         -> threads for the signed-in patient
GET  /messages/threads/{id}    -> messages in a thread
POST /message                  -> send a message (+ server-side distress classification)
"""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from .common import b, find_patient_by_email, patient_sys_id
from .servicenow import get_table_client

logger = logging.getLogger("bhuc.messages")
router = APIRouter(prefix="/api/x_bhuc", tags=["Messages"])

MSG = "u_bhuc_message"

# Lightweight server-side distress classifier (crisis > elevated > none). The Front-Door
# agent covers unauthenticated crisis; secure messages get this fast keyword gate so a
# distress flag is never client-only.
_CRISIS = ["kill myself", "suicide", "suicidal", "end my life", "want to die", "hurt myself",
           "harm myself", "overdose", "no reason to live", "better off dead"]
_ELEVATED = ["hopeless", "can't cope", "cant cope", "panic", "scared", "worthless",
             "give up", "can't go on", "cant go on"]


def _distress(text: str) -> str:
    t = (text or "").lower()
    if any(k in t for k in _CRISIS):
        return "crisis"
    if any(k in t for k in _ELEVATED):
        return "elevated"
    return "none"


def _iso(sn_dt: str) -> str:
    s = (sn_dt or "").strip()
    return s.replace(" ", "T") + "Z" if s else ""


@router.get("/messages/threads")
def get_threads(email: str = Query(""), patient: str = Query("")) -> list:
    pid = patient_sys_id(email, patient)
    if not pid:
        return []
    rows = get_table_client().list(
        MSG, f"u_patient={pid}^ORDERBYDESCsys_created_on",
        fields="u_thread_id,u_subject,u_body,u_status,sys_created_on", limit=200)
    threads: dict = {}
    for r in rows:  # rows are newest-first; first seen per thread = latest message
        tid = r.get("u_thread_id") or ""
        if not tid or tid in threads:
            continue
        threads[tid] = {
            "id": tid,
            "subject": r.get("u_subject") or "Conversation",
            "lastMessage": r.get("u_body") or "",
            "timestamp": _iso(r.get("sys_created_on")),
            "unread": r.get("u_status") == "sent",
        }
    return list(threads.values())


@router.get("/messages/threads/{thread_id}")
def get_thread(thread_id: str) -> list:
    rows = get_table_client().list(
        MSG, f"u_thread_id={thread_id}^ORDERBYsys_created_on",
        fields="u_body,u_sender_type,u_status,u_distress_level,sys_created_on", limit=100)
    return [{
        "id": f"m{i}",
        "threadId": thread_id,
        "body": r.get("u_body") or "",
        "senderType": r.get("u_sender_type") or "patient",
        "timestamp": _iso(r.get("sys_created_on")),
        "status": r.get("u_status") or "sent",
        "distressLevel": r.get("u_distress_level") or "none",
    } for i, r in enumerate(rows)]


class SendReq(BaseModel):
    threadId: Optional[str] = None
    body: str
    email: Optional[str] = None
    patient: Optional[str] = None
    subject: Optional[str] = None


@router.post("/message")
def send_message(req: SendReq) -> dict:
    table = get_table_client()
    rec = find_patient_by_email(req.email) if req.email else None
    pid = req.patient or (rec["sys_id"] if rec else "")
    thread_id = req.threadId or f"th-{uuid.uuid4().hex[:8]}"
    level = _distress(req.body)
    fields = {
        "u_thread_id": thread_id,
        "u_patient": pid,
        "u_body": req.body,
        "u_subject": req.subject or "Message to care team",
        "u_sender_type": "patient",
        "u_direction": "inbound",
        "u_status": "sent",
        "u_distress_level": level,
        "u_distress_flagged": "true" if level != "none" else "false",
    }
    rec2 = table.create(MSG, fields) if pid else {"sys_id": "unsaved"}
    return {"messageId": rec2.get("sys_id"), "threadId": thread_id,
            "status": "sent", "distress": {"level": level}}
