"""Semantic grounding / hallucination analyzer for the Agents Inventory demo.

Verifies an agent's free-text output against that agent's knowledge-base document —
the same KB the ServiceNow agent is grounded on. The algorithm (extractive grounding):

  1. Load the KB doc, strip HTML/markdown, split it into candidate "evidence" sentences.
  2. Build a TF-IDF model over those KB sentences (shared IDF vocabulary).
  3. Split the agent output into claim sentences.
  4. For each claim, vectorize it in the same TF-IDF space and take its MAXIMUM cosine
     similarity to any single KB sentence — i.e. "is this claim supported somewhere in
     the KB?". That best-matching KB sentence is the claim's evidence.
  5. Overall grounding = token-weighted mean of per-claim scores (longer claims count
     more). Hallucination risk = 1 - grounding.
  6. A threshold splits the verdict; any claim below the per-claim floor is surfaced as
     unsupported with its best evidence, so a reviewer sees exactly which line is weak.

Deterministic and dependency-free (stdlib only) — no external embedding service, so it
runs identically on Render and offline.
"""

import html
import logging
import math
import re
from collections import Counter
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("bhuc.hallucination")

router = APIRouter(prefix="/api/x_bhuc/hallucination", tags=["Hallucination Check"])

KB_DIR = Path(__file__).parent / "knowledge"

# Which KB doc grounds which agent (the demo is Agent 2 + Agent 3 only).
AGENT_KB = {
    "risk": ("bhuc-screening-scoring-rules.md", "BHUC Screening Scoring Rules"),
    "clinicaldoc": ("bhuc-clinical-coding-and-documentation.md", "BHUC Clinical Coding and Documentation"),
}

# Tuning — reported to the UI so the thresholds are transparent, not hidden.
OVERALL_THRESHOLD = 0.35   # overall grounding below this ⇒ "possible hallucination"
CLAIM_FLOOR = 0.20         # a single claim below this is flagged unsupported

_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "of", "to", "in", "on", "for",
    "with", "as", "by", "at", "from", "is", "are", "was", "were", "be", "been", "being",
    "this", "that", "these", "those", "it", "its", "he", "she", "they", "them", "his",
    "her", "their", "which", "who", "whom", "each", "any", "all", "no", "not", "so",
    "can", "will", "may", "must", "should", "has", "have", "had", "do", "does", "did",
    "over", "under", "per", "than", "when", "there", "here", "also", "into", "out",
}

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_TAG_RE = re.compile(r"<[^>]+>")
_SENT_SPLIT_RE = re.compile(r"(?:[.;:!?]\s+|\n+)")


def _stem(tok: str) -> str:
    """Light suffix stripping so 'scoring'/'scored'/'scores' collapse. Numbers untouched."""
    if tok.isdigit() or len(tok) <= 4:
        return tok
    for suf in ("ations", "ation", "ing", "ies", "ers", "ed", "es", "s"):
        if tok.endswith(suf) and len(tok) - len(suf) >= 3:
            return tok[: -len(suf)]
    return tok


def _tokens(text: str) -> list[str]:
    """Unigrams + adjacent bigrams. Bigrams reward phrase-level grounding, so a claim
    that merely reuses on-topic words ('PHQ-9 above 40 = mild anxiety') scores far lower
    than one that reproduces an actual KB phrase ('positive self-harm screen')."""
    uni = [_stem(t) for t in _TOKEN_RE.findall(text.lower()) if t not in _STOPWORDS and len(t) > 1]
    bi = [f"{uni[i]}_{uni[i + 1]}" for i in range(len(uni) - 1)]
    return uni + bi


def _sentences(raw: str) -> list[str]:
    """Strip HTML tags + markdown chrome, then split into content sentences."""
    text = html.unescape(_TAG_RE.sub("\n", raw))
    text = re.sub(r"[#>*|`]+", " ", text)          # markdown chrome
    text = re.sub(r"^\s*[-\d]+\.\s*", " ", text, flags=re.M)  # list bullets/numbers
    out = []
    for chunk in _SENT_SPLIT_RE.split(text):
        s = re.sub(r"\s+", " ", chunk).strip(" -–—\t")
        if len(_TOKEN_RE.findall(s)) >= 3:          # keep only substantive sentences
            out.append(s)
    return out


class _TfIdf:
    """Tiny TF-IDF space fit on the KB sentences; used to vectorize claims + evidence."""

    def __init__(self, docs_tokens: list[list[str]]):
        self.n = len(docs_tokens)
        df: Counter = Counter()
        for toks in docs_tokens:
            df.update(set(toks))
        # smoothed idf
        self.idf = {t: math.log((1 + self.n) / (1 + c)) + 1.0 for t, c in df.items()}

    def vec(self, tokens: list[str]) -> dict[str, float]:
        if not tokens:
            return {}
        tf = Counter(tokens)
        v = {t: (c / len(tokens)) * self.idf.get(t, 0.0) for t, c in tf.items()}
        return {t: w for t, w in v.items() if w > 0}


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    common = set(a) & set(b)
    if not common:
        return 0.0
    dot = sum(a[t] * b[t] for t in common)
    na = math.sqrt(sum(w * w for w in a.values()))
    nb = math.sqrt(sum(w * w for w in b.values()))
    return dot / (na * nb) if na and nb else 0.0


@lru_cache(maxsize=8)
def _kb_model(filename: str):
    """(sentences, their token lists, fitted TF-IDF, evidence vectors) — cached per KB file."""
    path = KB_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=500, detail=f"KB doc missing on server: {filename}")
    sents = _sentences(path.read_text(encoding="utf-8"))
    toks = [_tokens(s) for s in sents]
    model = _TfIdf(toks)
    vecs = [model.vec(t) for t in toks]
    return sents, model, vecs


class CheckReq(BaseModel):
    agentKey: str = Field(..., description="risk | clinicaldoc")
    output: str = Field(..., min_length=1, max_length=20000)


@router.post("/check")
def check(req: CheckReq) -> dict:
    if req.agentKey not in AGENT_KB:
        raise HTTPException(status_code=400, detail="Hallucination check supports only 'risk' and 'clinicaldoc'.")
    filename, kb_label = AGENT_KB[req.agentKey]
    sents, model, evidence_vecs = _kb_model(filename)

    claims = _sentences(req.output)
    scored = []
    wsum = 0.0
    gsum = 0.0
    for claim in claims:
        toks = _tokens(claim)
        if not toks:
            continue
        cvec = model.vec(toks)
        best, best_i = 0.0, -1
        for i, ev in enumerate(evidence_vecs):
            c = _cosine(cvec, ev)
            if c > best:
                best, best_i = c, i
        weight = len(toks)
        wsum += weight
        gsum += best * weight
        scored.append({
            "text": claim,
            "score": round(best * 100),
            "grounded": best >= CLAIM_FLOOR,
            "evidence": sents[best_i] if best_i >= 0 and best >= CLAIM_FLOOR else "",
        })

    grounding = (gsum / wsum) if wsum else 0.0
    flagged = [c for c in scored if not c["grounded"]]
    possible = grounding < OVERALL_THRESHOLD or (scored and len(flagged) / len(scored) > 0.5)

    return {
        "agentKey": req.agentKey,
        "kbDoc": kb_label,
        "kbFile": filename,
        "algorithm": "TF-IDF cosine extractive grounding (claim → best KB sentence)",
        "groundingScore": round(grounding * 100),
        "hallucinationScore": round((1 - grounding) * 100),
        "threshold": round(OVERALL_THRESHOLD * 100),
        "claimFloor": round(CLAIM_FLOOR * 100),
        "verdict": "possible_hallucination" if possible else "grounded",
        "possibleHallucination": bool(possible),
        "claimCount": len(scored),
        "flaggedCount": len(flagged),
        "kbSentenceCount": len(sents),
        "claims": scored,
    }
