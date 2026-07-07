# BHUC AI Platform — Actionable Item List

**Derived from:** `plan.md` v3.0 (six-agent architecture + iframe/A2A integration, careatlas-modeled).
**Purpose:** every discrete task that moves the build toward completion, with an ID, the task, the exact `plan.md` reference, complexity, effort, dependencies, and status.
**Granularity:** one row per runbook/spec step + supporting task. Scope includes build steps, the Section 9 blocking decisions, gap fill-ins, and doc cleanups.

---

## How to use this file

- **ID prefix = workstream:** `DEC` decisions · `VER` pre-flight verification · `DATA` data model & knowledge · `SN` ServiceNow platform · `AG` agents · `GOV` governance config · `BE` backend (FastAPI) · `FE` frontend (React/Vite/Firebase) · `PORT` iframe portal wiring · `DEMO` demo · `DOC` documentation cleanup.
- **Complexity (T-shirt):** `S` small · `M` medium · `L` large · `XL` extra-large.
- **Effort:** estimated **person-days** (1 person, focused). Not wall-clock.
- **Depends On:** prerequisite item IDs (must be done/decided first).
- **Status:** `☐ Not started` · `◐ In progress` · `☑ Done`. Update in place — this file doubles as the tracker.
- **🔴 = build-blocking.** Resolve all 🔴 before the dependent workstream starts.

---

## Effort summary by workstream (phase)

| Phase | Workstream | Items | Est. person-days |
| --- | --- | --- | --- |
| 0 | Decisions (DEC) | 4 | ~2.5 |
| 0 | Pre-flight verification (VER) | 4 | ~0.75 |
| 1 | Data model & knowledge (DATA) | 4 | ~7 |
| 1 | ServiceNow platform (SN) | 8 | ~7 |
| 2 | Agents (AG) | 12 | ~15 |
| 3 | Governance config (GOV) | 10 | ~5 |
| 4 | Backend / FastAPI (BE) | 10 | ~10.5 |
| 5 | Frontend / React (FE) | 12 | ~19 |
| 6 | iframe portal wiring (PORT) | 3 | ~2 |
| 7 | Demo (DEMO) | 5 | ~2.5 |
| — | Doc cleanup (DOC) | 6 | ~2 |
| | **Total** | **78** | **~73 person-days** |

> Estimates are single-threaded; with an SN admin + backend dev + frontend dev working in parallel, calendar time compresses substantially (see "Suggested critical path" at the end).

---

## Phase 0 — Decisions (🔴 blocking) — `plan.md` §9.1/§9.2

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-1 | 🔴 Decide agent invocation model: **ServiceNow trigger vs A2A call** per agent (avoid double-fire) | §9.1 OQ-1; §2.8; §4.4; §8.1 SN-Step 9 | M | 0.5 | — | ☐ |
| DEC-2 | 🔴 Decide human-in-the-loop mechanism: **Supervised mode vs app draft-gate (C4/C5)** | §9.1 OQ-2; §2.8 step 7; §4.4; §8.3 FE-Step 7 | M | 0.5 | — | ☐ |
| DEC-3 | 🔴 Decide AI-Steward auth path: **Cognito SSO federation vs direct ServiceNow user+role** | §9.1 OQ-3; §2.5; §2.6 | S | 0.5 | — | ☐ |
| DEC-4 | 🔴 Decide in-frame Cognito auth approach (**hosted-UI redirect vs popup+PKCE**); spike-validate in an iframe | §9.2 OQ-6; §8.3 FE-Step 5 | M | 1 | — | ☐ |

## Phase 0 — Pre-flight verification (UI-only checks) — `plan.md` §0.1 / Appendix D

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| VER-1 | Confirm exact Zurich build (System Diagnostics → Stats) | §0.1 G-1; App D #1 | S | 0.1 | — | ☐ |
| VER-2 | Confirm 9 AICT dashboard tabs render (open `Workspaces → AI Control Tower`) | §0.1 G-2; App D | S | 0.25 | — | ☐ |
| VER-3 | Enumerate existing authority documents in `sn_compliance_authority_document` | App D #5 | S | 0.25 | — | ☐ |
| VER-4 | Confirm current `kill_switch.mode` + model-provider Fallback values | App D #6 | S | 0.1 | — | ☐ |

## Phase 1 — Data model & knowledge — `plan.md` §9.2 / §8.1 / §4.4

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DATA-1 | 🔴 Define the **complete data model** — **6 core tables fully specified in `tables.md`** (114 business fields, `u_bhuc_*` global naming, `BHUC_<TABLE>_001` number keys, PII/Part2 flags). | §9.2 OQ-4; §8.1 SN-Step 1; `tables.md` | L | 2 | — | ☑ |
| DATA-2 | Create the **undeclared tables**. **`u_bhuc_prior_auth` created via curl 2026-07-06** (19 fields, `BHUC_PRIOR_AUTH_001`) — the only *agent-blocking* one (Agent 5). Remaining (eligibility, check-in, disposition) are frontend-CRUD only and deferred; note→folded into `u_bhuc_care_plan`, threads→`u_bhuc_message.u_thread_id`. | §9.2 OQ-4; §4.4 Agents 3/5; §3 | M | 1 | DATA-1, SN-1 | ◐ |
| DATA-3 | Build & index the **RAG knowledge bases**. **Facility-info KB created 2026-07-06** — "BHUC Facility Information" (`kb_knowledge_base` 11c6b5a7…) with 11 articles for Agent 1 Tool B; all 11 articles **Published** (verified 2026-07-06). App facts mirrored in `frontend/src/lib/facility.ts`. Remaining KBs (instrument-scoring, payer-policy, ICD-10/CPT) pending for Agents 2/3/5. | §9.2 OQ-5; §4.4 Agents 1/2/3/5 | L | 3 | DATA-1 | ◐ |
| DATA-4 | Seed demo data (patient "Maya", registration, screening, worklist, discharged record) | §6.1 | M | 1 | DATA-1, DATA-2 | ☐ |

## Phase 1 — ServiceNow platform foundations — `plan.md` §8.1

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SN-1 | Create the **6 core tables** (global scope, `u_bhuc_*`) + `BHUC_<TABLE>_001` number prefixes, per `tables.md`. **DONE via curl 2026-07-06** — all 6 tables created, 114 fields, auto-numbering verified (`BHUC_PATIENT_001`), 0 failures. | §8.1 SN-Step 1; `tables.md` | M | 1 | DATA-1 | ☑ |
| SN-2 | Register AWS Cognito as an OIDC identity provider | §8.1 SN-Step 2 | M | 0.5 | — | ☐ |
| SN-3 | Create app persona roles (`u_bhuc_patient`, `u_bhuc_clinician`) | §8.1 SN-Step 3 | S | 0.25 | SN-1 | ☐ |
| SN-4 | Build field-level ACLs for Part 2 / PII (deny-by-default) | §8.1 SN-Step 4 + 13d | L | 2 | SN-1, SN-13 | ☐ |
| SN-5 | Confirm/select **Now LLM-LTS** provider for agents | §8.1 SN-Step 5 | S | 0.25 | — | ☐ |
| SN-13 | Create **6 service accounts + composable data roles** (`svc-bhuc-*`, `u_bhuc_ai_agent`, `u_bhuc_patient_pii`, `u_bhuc_part2_access`, …) | §8.1 SN-Step 13 | L | 1.5 | SN-1 | ☐ |
| SN-14 | Create **A2A OAuth client** + enable per-agent third-party access + (optional) callback registration | §8.1 SN-Step 14 | M | 0.5 | SN-13, AG-11, DEC-1 | ☐ |
| SN-15 | Build the iframe SP portal. **DONE 2026-07-07 (single portal)** — widget `bhuc-frame` → `https://bhuc-ai.web.app/`, portal **BHUC AI Platform** (`/bhuc_ai_platform`), nav **BHUC AI Fusion Center → BHUC AI Platform**. (Two per-route pages = optional future refinement.) See §2.9.1. | §8.1 SN-Step 15; §2.9.1 | M | 1 | FE-4 | ◐ |

## Phase 2 — Agents (AI Agent Studio) — `plan.md` §4.3 / §4.4

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AG-0 | Agent build prerequisites (`sn_aia.admin`, model provider, guided-setup preamble) | §4.3; §4.4 preamble | S | 0.25 | SN-5 | ☐ |
| AG-1 | Build **Front-Door Security Agent** (UC1) — crisis-classifier Script + BHUC-scoped Search Retrieval + 988 escalation subflow. **DONE & verified over A2A 2026-07-06** (facility answers cite BHUC KB; crisis → escalation). As-built procedures captured in **§4.6**. Supporting objects: KB `BHUC Facility Information`, profile `BHUC Facility Search`, subflow `BHUC 988 Escalation`, table `u_bhuc_escalation`, group `BHUC On-Call`. | §4.4 Agent 1; §4.6 | L | 2 | AG-0, DATA-3, AG-12 | ☑ |
| AG-2 | Build **Risk Identification Agent** (UC2/P3) | §4.4 Agent 2 | M | 1.5 | AG-0, DATA-1/3 | ☐ |
| AG-3 | Build **Clinical Documentation Agent** (UC2/P4) — ambient scribe + grounding script | §4.4 Agent 3 | L | 2 | AG-0, DATA-1/3 | ☐ |
| AG-4 | Build **Consent & Data Protection Agent** (UC3/P4) — Part 2 labeler script | §4.4 Agent 4 | L | 2 | AG-0, SN-4 | ☐ |
| AG-5 | Build **Prior-Auth Compliance Agent** (UC3/P5) | §4.4 Agent 5 | M | 1.5 | AG-0, DATA-3 | ☐ |
| AG-6 | Build **Scheduling Agent** (UC4) — fairness-check script | §4.4 Agent 6 | M | 1.5 | AG-0, DATA-1 | ☐ |
| AG-12 | Build supporting **Flow Designer flows** (988 escalation, risk-confirmation gate) | §4.4 Agents 1/2 tools | M | 1 | SN-1 | ☐ |
| AG-7 | Configure **execution mode** on record-writing tools (per DEC-2 outcome) | §8.1 SN-Step 7; §4.3 Step 3 | S | 0.5 | DEC-2, AG-1…6 | ☐ |
| AG-8 | Configure **security controls** = AI-user bound to `svc-bhuc-*` per agent | §8.1 SN-Step 8; SN-Step 13c | M | 0.5 | SN-13, AG-1…6 | ☐ |
| AG-9 | Configure **triggers** (or leave off) per DEC-1 outcome | §8.1 SN-Step 9; §4.3 Step 5 | M | 0.5 | DEC-1, AG-1…6 | ☐ |
| AG-10 | **Test** each agent (manual test + Test-access/Access-Analyzer) | §8.1 SN-Step 10; §4.3 Step 7 | M | 1 | AG-7/8/9 | ☐ |
| AG-11 | Register agents in AICT/AIRC; **capture each `sn_aia_agent` sys_id** for the backend map | §8.1 SN-Step 11; SN-Step 14d | S | 0.5 | AG-10 | ☐ |

## Phase 3 — Governance configuration (AICT + AIRC) — `plan.md` §5 / §8.1 SN-Step 12 / §5.8

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| GOV-1 | Data-sharing decision (opt-out escalation to AE if required) | §5.8 GOV-Step 1 | S | 0.25 | — | ☐ |
| GOV-2 | Activate Security & Privacy guardrails (Output PII/Extended PII/Security-Vuln, Agent Goal Deviation, Data Integrity 100%, Sensitive-Data-Input) | §5.8 GOV-Step 2; §5.4; SN-Step 12 | M | 0.5 | AG-10 | ☐ |
| GOV-3 | Activate the 3 Approval controls (AI systems / MCP / AI models) | §5.8 GOV-Step 3 | S | 0.25 | — | ☐ |
| GOV-4 | Enable "Automatically trigger playbooks" | §5.8 GOV-Step 4 | S | 0.25 | — | ☐ |
| GOV-5 | Set model-provider **Fallback = Inactive** (use Preview impact first) | §5.8 GOV-Step 5; §5.6 | S | 0.25 | SN-5 | ☐ |
| GOV-6 | Customize Onboarding playbook (add HIPAA / 42 CFR Part 2 review step) | §5.8 GOV-Step 6 | M | 0.5 | — | ☐ |
| GOV-7 | Build **custom Authority Document** (HIPAA & 42 CFR Part 2) + run Advanced-Risk inherent/residual assessment | §5.8 GOV-Step 7; §5.7 | L | 2 | AG-11 | ☐ |
| GOV-8 | Confirm/activate the 2 scheduled data-collection jobs (run historical once) | §5.8 GOV-Step 8; §5.2 | S | 0.25 | — | ☐ |
| GOV-9 | Set `kill_switch.mode = enforce` | §5.8 GOV-Step 9; §4.3 Step 5 | S | 0.25 | — | ☐ |
| GOV-10 | Verify audit logging + schedule >90-day export | §5.8 GOV-Step 10; §5.4 | S | 0.25 | — | ☐ |

## Phase 4 — Backend (FastAPI) — `plan.md` §8.2

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| BE-1 | Scaffold FastAPI service (routers/services/config; deploy target) | §8.2 BE-Step 1 | M | 1 | — | ◐ |
| BE-2 | Cognito JWT validation at the boundary (JWKS, groups→roles) | §8.2 BE-Step 2 | M | 0.5 | BE-1 | ☐ |
| BE-3 | ServiceNow auth: OAuth A2A (agents) + basic auth (CRUD) split | §8.2 BE-Step 3 | M | 0.5 | BE-1, SN-14 | ☐ |
| BE-4 | A2A agent-invocation module (JSON-RPC `message/send`; endpoint→agent map) | §8.2 BE-Step 4 | L | 2 | BE-3, AG-11, SN-14 | ☐ |
| BE-5 | Implement blocking mode (+ optional push-notification callback route) | §8.2 BE-Step 5; DEC-1 | M | 0.5 | BE-4 | ☐ |
| BE-6 | Hybrid CRUD endpoints — implement **all ~35** `/api/x_bhuc/*` routes over `u_bhuc_*` tables | §8.2 BE-Step 6; §3.2/§3.3 | XL | 4 | SN-1, DATA-1/2 | ☐ |
| BE-7 | CORS + framing allowlist (Firebase + SN portal origins) | §8.2 BE-Step 7 | S | 0.25 | BE-1 | ☐ |
| BE-8 | Server-side prompt/Supervised enforcement (no client prompts; draft-gate per DEC-2) | §8.2 BE-Step 8; DEC-2 | M | 0.5 | BE-4, DEC-2 | ☐ |
| BE-9 | Secrets handling → secrets manager; **rotate exposed AWS keys** | §8.2 BE-Step 9 | M | 0.5 | — | ☐ |
| BE-10 | Health, tracing, deploy. **render.yaml Blueprint added 2026-07-07** → service `bhuc-backend` (free) → https://bhuc-backend.onrender.com, auto-deploy on push; `/api/health` present. **LIVE 2026-07-07** — Blueprint connected; /api/health returns 200, cognito_configured:true. See §2.9.1. | §8.2 BE-Step 10; §2.9.1 | M | 0.5 | BE-1 | ☑ |

## Phase 5 — Frontend (React + Vite → Firebase) — `plan.md` §3 / §8.3

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| FE-1 | Scaffold React+Vite app, routes (`/patient`,`/clinician`), design-system components/tokens | §8.3 FE-Step 1; §3.1 | L | 2 | — | ☑ |
| FE-2 | Cognito/Amplify auth + clinician MFA | §8.3 FE-Step 2; DEC-4 | M | 1 | DEC-4, FE-1 | ☑ |
| FE-3 | API client (bearer token to FastAPI; 401/403 handling) | §8.3 FE-Step 3 | S | 0.5 | FE-1, BE-2 | ☑ |
| FE-4 | Deploy to Firebase Hosting. **DONE 2026-07-07** — site `bhuc-ai` in project `task--mission` → https://bhuc-ai.web.app; auto-deploy via `.github/workflows/deploy.yml` on push to main (mock build). See §2.9.1. | §8.3 FE-Step 4; §2.9.1 | S | 0.5 | FE-1 | ☑ |
| FE-5 | iframe-safety / in-frame auth (per DEC-4) | §8.3 FE-Step 5; DEC-4 | M | 1 | DEC-4, FE-2 | ☐ |
| FE-6 | Unauthenticated crisis path (988 banner + front-door chat) | §8.3 FE-Step 6; §3.2 P1/P2 | M | 0.5 | FE-1, BE-4 | ☑ |
| FE-7 | Human-in-the-loop + Part 2 masking UI (C3/C4/C5/C6) | §8.3 FE-Step 7; DEC-2 | M | 1 | DEC-2, FE-1 | ☑ |
| FE-8 | Surface agent outputs w/ citations + fairness result | §8.3 FE-Step 8; §3.3 | M | 0.5 | FE-3, BE-4 | ☑ |
| FE-9 | Build **9 Patient screens** (P1–P9) | §3.2 | XL | 6 | FE-1, FE-3 | ☑ |
| FE-10 | Build **8 Clinician screens** (C1–C8) | §3.3 | XL | 5 | FE-1, FE-3 | ☑ |
| FE-11 | Do NOT build governance dashboard (guard against scope creep) | §8.3 FE-Step 9 | S | 0 | — | ☑ |
| FE-12 | WCAG 2.1 AA audit + accessibility pass across both portals | §3.1; per-screen a11y notes | M | 1 | FE-9, FE-10 | ☐ |

## Phase 6 — iframe portal wiring & integration — `plan.md` §2.9 / §8.1 SN-Step 15

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PORT-1 | Point the SP iframe widget at the deployed Firebase app. **DONE 2026-07-07** — `bhuc-frame` src = https://bhuc-ai.web.app/; portal reachable at /bhuc_ai_platform. See §2.9.1. | §8.1 SN-Step 15; §2.9.1 | M | 0.5 | SN-15, FE-4 | ☑ |
| PORT-2 | End-to-end wiring test: portal URL → iframe → Cognito → FastAPI → A2A agent → render | §2.8; §2.9 | L | 1 | PORT-1, BE-4, AG-10 | ☐ |
| PORT-3 | Reproduce the **PII-denial verification** (careatlas ACL-probe pattern) proving `svc-bhuc-risk` PII strip | §8.1 SN-Step 13d; careatlas `ACL_TEST_PROBES` | M | 0.5 | SN-4, SN-13, AG-8 | ☐ |

## Phase 7 — Demo — `plan.md` §6

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-1 | Stage demo env (AI on/off + guardrails on/off toggles; two-window setup) | §6.1 | M | 0.5 | PORT-2, DATA-4 | ☐ |
| DEMO-2 | Rehearse "Before" script | §6.2 | S | 0.5 | DEMO-1 | ☐ |
| DEMO-3 | Rehearse "After" script | §6.3 | S | 0.5 | DEMO-1 | ☐ |
| DEMO-4 | Rehearse native dashboard live-monitoring script | §6.4 | S | 0.5 | DEMO-1, GOV-2 | ☐ |
| DEMO-5 | Full run-of-show timing rehearsal | §6.5 | S | 0.5 | DEMO-2/3/4 | ☐ |

## Documentation cleanup (parallel, non-blocking) — `plan.md` §9.3

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DOC-1 | Reconcile citations — finish `pp.`→`[Doc:]` conversion or soften CORRECTION-1 | §9.3 OQ-7; §0.4 | M | 1 | — | ☐ |
| DOC-2 | Fix stale ToC step counts (SN 1→15, BE 1→10, FE 1→9) + appendix nesting | §9.3 OQ-8; ToC | S | 0.25 | — | ☐ |
| DOC-3 | Fix §3.1 "SPAs against Scripted REST" stale line | §9.3 OQ-9; §3.1 | S | 0.1 | — | ☐ |
| DOC-4 | Clarify service-account flag (integration-user vs `internal_integration_user=false`) | §9.3 OQ-10; §8.1 SN-Step 13b | S | 0.1 | — | ☐ |
| DOC-5 | Clarify one-vs-two OAuth clients for all 6 agents | §9.3 OQ-11; §2.9; SN-Step 14 | S | 0.25 | — | ☐ |
| DOC-6 | Fix "three pillars" framing (now includes Firebase + FastAPI) | §9.3 OQ-12; §1 | S | 0.1 | — | ☐ |

---

## Suggested critical path (dependency-ordered)

1. **Unblock (Phase 0):** DEC-1, DEC-2, DEC-3, DEC-4 + VER-1…4. *(Nothing downstream is safe to finalize until the three 🔴 decisions are made.)*
2. **Foundation:** DATA-1 → SN-1 → SN-13 → SN-4; in parallel DATA-3 (KBs), SN-2, SN-5, DATA-2.
3. **Agents:** AG-0 → AG-12 → AG-1…6 → AG-8/9/7 → AG-10 → AG-11.
4. **Backend:** BE-1 → BE-2/3/7/9/10 → BE-6 (CRUD) and BE-4 (A2A, needs AG-11) → BE-5/8.
5. **Frontend:** FE-1 → FE-2/3 → FE-9/FE-10 (screens) + FE-5/6/7/8 → FE-4 (deploy) → FE-12.
6. **Wire the portal:** SN-14 → SN-15 → PORT-1 → PORT-2 → PORT-3.
7. **Governance:** GOV-1…10 (after agents exist; GOV-7 after AG-11).
8. **Demo:** DEMO-1…5 (last).
9. **DOC-1…6:** anytime, in parallel.

**The three 🔴 decisions (DEC-1/2/3) and the two 🔴 gaps (DATA-1 schema, DEC-4 in-frame auth) are the true starting gate — every other estimate assumes they are resolved as recommended in plan.md §9.**
