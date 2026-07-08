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

| Phase | Workstream | Items | Done (☑) | Partial (◐) | Est. person-days | Est. person-days left |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Decisions (DEC) | 4 | 1 | 0 | ~2.5 | ~2 |
| 0 | Pre-flight verification (VER) | 4 | 2 | 0 | ~0.75 | ~0.35 |
| 1 | Data model & knowledge (DATA) | 4 | 2 | 1 | ~7 | ~1.5 |
| 1 | ServiceNow platform (SN) | 8 | 4 | 1 | ~7 | ~1.75 |
| 2 | Agents (AG) | 13 | 5 | 1 | ~14.75 | ~5.5 |
| 3 | Governance config (GOV) | 10 | 0 | 0 | ~4.75 | ~4.75 |
| 4 | Backend / FastAPI (BE) | 11 | 2 | 2 | ~10.75 | ~8.25 |
| 5 | Frontend / React (FE) | 23 | 21 | 0 | ~26.3 | ~2 |
| 6 | iframe portal wiring (PORT) | 3 | 1 | 0 | ~2 | ~1.5 |
| 7 | Demo (DEMO) | 5 | 0 | 0 | ~2.5 | ~2.5 |
| — | Doc cleanup (DOC) | 6 | 0 | 0 | ~1.8 | ~1.8 |
| | **Total** | **91** | **38** | **5** | **~80 person-days** | **~32 person-days** |

> Estimates are single-threaded; with an SN admin + backend dev + frontend dev working in parallel, calendar time compresses substantially (see "Suggested critical path" at the end).
> **Est. person-days left** counts every not-done (☐) item at full effort and each partially-complete (◐) item at half its estimate (est − done − ½·partial), summed from the per-item estimates in the phase tables below.

---

## Phase 0 — Decisions (🔴 blocking) — `plan.md` §9.1/§9.2

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-1 | 🔴 Decide agent invocation model: **ServiceNow trigger vs A2A call** per agent (avoid double-fire). **DECIDED 2026-07-07: backend blocking A2A, ServiceNow triggers OFF.** The FastAPI backend writes the record (Table API) then invokes the agent over A2A (`configuration.blocking=true`) and returns the reply inline; agent triggers stay inactive so nothing double-fires. Proven for Agents 1/2/3 (front-door, screening batch, note draft). | §9.1 OQ-1; §2.8; §4.4; §8.1 SN-Step 9; BE-4 | M | 0.5 | — | ☑ |
| DEC-2 | 🔴 Decide human-in-the-loop mechanism: **Supervised mode vs app draft-gate (C4/C5)** | §9.1 OQ-2; §2.8 step 7; §4.4; §8.3 FE-Step 7 | M | 0.5 | — | ☐ |
| DEC-3 | 🔴 Decide AI-Steward auth path: **Cognito SSO federation vs direct ServiceNow user+role** | §9.1 OQ-3; §2.5; §2.6 | S | 0.5 | — | ☐ |
| DEC-4 | 🔴 Decide in-frame Cognito auth approach (**hosted-UI redirect vs popup+PKCE**); spike-validate in an iframe | §9.2 OQ-6; §8.3 FE-Step 5 | M | 1 | — | ☐ |

## Phase 0 — Pre-flight verification (UI-only checks) — `plan.md` §0.1 / Appendix D

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| VER-1 | Confirm exact Zurich build (System Diagnostics → Stats). **DONE 2026-07-07:** build tag `glide-zurich-07-01-2025__patch10-hotfix3-07-01-2026` (Zurich, patch10-hotfix3, build 07-02-2026), enterprise, `ven04690` ONLINE. See §0.1 G-1. | §0.1 G-1; App D #1 | S | 0.1 | — | ☑ |
| VER-2 | Confirm AICT dashboard tabs render (open `Workspaces → AI Control Tower`). **DONE 2026-07-07:** 8 tabs render (Overview, AI asset inventory, Value, Evaluation, Risk & compliance, Security & privacy, AI cases, AI Gateway). Native agents auto-register: 32 AI systems (30 Agentic/2 Gen), inventory 35 assets, security score **Good** / 0 access issues, Guardrails present, risk classification populated. Now Assist Evaluation disabled by default → **out of scope for BHUC** (decision in §0.1 G-2). Validates §5.1 native governance. | §0.1 G-2; App D | S | 0.25 | — | ☑ |
| VER-3 | Enumerate existing authority documents in `sn_compliance_authority_document` | App D #5 | S | 0.25 | — | ☐ |
| VER-4 | Confirm current `kill_switch.mode` + model-provider Fallback values | App D #6 | S | 0.1 | — | ☐ |

## Phase 1 — Data model & knowledge — `plan.md` §9.2 / §8.1 / §4.4

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DATA-1 | 🔴 Define the **complete data model** — 8 `u_bhuc_*` tables fully specified in `tables.md` (`u_bhuc_*` global naming, `BHUC_<TABLE>_001` number keys, PII/Part2 flags). **Record-op field audit 2026-07-07:** verified every field value each agent's Record Operation maps exists live with correct type/choices — 5/6 agents fully covered; the one gap (Agent 4 note-table sensitivity) fixed by adding **`u_bhuc_care_plan.u_sensitivity`** (choice `standard/part2`, created live; care_plan now 19 fields, total 134). | §9.2 OQ-4; §8.1 SN-Step 1; §4.4 Agent 4; `tables.md` | L | 2 | — | ☑ |
| DATA-2 | Create the **undeclared tables**. **`u_bhuc_prior_auth` created via curl 2026-07-06** (19 fields, `BHUC_PRIOR_AUTH_001`) — the only *agent-blocking* one (Agent 5). Remaining (eligibility, check-in, disposition) are frontend-CRUD only and deferred; note→folded into `u_bhuc_care_plan`, threads→`u_bhuc_message.u_thread_id`. | §9.2 OQ-4; §4.4 Agents 3/5; §3 | M | 1 | DATA-1, SN-1 | ◐ |
| DATA-3 | Build & index the **RAG knowledge bases**. **Facility-info KB created 2026-07-06** — "BHUC Facility Information" (`kb_knowledge_base` 11c6b5a7…) 11 articles, all **Published**; App facts mirrored in `frontend/src/lib/facility.ts`. **Remaining 5 KBs created live 2026-07-07** (27 draft articles, content in `knowledge/` + runbook `knowledge/README.md`): **Screening Scoring Rules** (Agent 2) `532b483f3b71cf1076f13b64c3e45a68`; **Clinical Coding and Documentation** (Agent 3) `103b883f3b71cf1076f13b64c3e45afa`; **Payer Policy Library** (Agent 5) `c93bc83f3b71cf1076f13b64c3e45af7`; **Clinician Directory** (Agent 6) `c23b8c3f3b71cf1076f13b64c3e45adb`; **Consent & 42 CFR Part 2 Reference** (Agent 4 reference) `fa3b4cb33b3d4f105551369693e45ae1`. Real clinical standards (PHQ-9/GAD-7/C-SSRS, ICD-10/CPT, Part 2); payer+clinician are demo-consistent. **All 6 KBs Published (27+11 articles), and AI Search source + profile built & Published for all 6, verified 2026-07-07** (each profile → its own KB-filtered source; sys_ids in `knowledge/README.md`). All 6 mirrored in `knowledge/*.md`. **DATA-3 COMPLETE (2026-07-07).** Stray placeholder `KB0010011` excluded from Agent 1 retrieval by past-dating `valid_to`→2020-01-01 (fails the source's `Valid to > Today` filter; `workflow_state=retired` is a UI-only flag if ever wanted, but it's already out of the index). Downstream (tracked under AG-2/3/5/6, NOT DATA-3): wire each agent's Search Retrieval tool to its profile (§4.6.2 Step D). | §9.2 OQ-5; §4.4 Agents 1/2/3/5/6; §4.6.2; `knowledge/README.md` | L | 3 | DATA-1 | ☑ |
| DATA-4 | Seed demo data (patient "Maya", registration, screening, worklist, discharged record) | §6.1 | M | 1 | DATA-1, DATA-2 | ☐ |

## Phase 1 — ServiceNow platform foundations — `plan.md` §8.1

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SN-1 | Create the **6 core tables** (global scope, `u_bhuc_*`) + `BHUC_<TABLE>_001` number prefixes, per `tables.md`. **DONE via curl 2026-07-06** — all 6 tables created, 114 fields, auto-numbering verified (`BHUC_PATIENT_001`), 0 failures. | §8.1 SN-Step 1; `tables.md` | M | 1 | DATA-1 | ☑ |
| SN-2 | Register AWS Cognito as an OIDC identity provider | §8.1 SN-Step 2 | M | 0.5 | — | ☐ |
| SN-3 | Create app persona roles (`u_bhuc_patient`, `u_bhuc_clinician`). **DONE via API 2026-07-08** (see `roles_and_acls.md`). | §8.1 SN-Step 3 | S | 0.25 | SN-1 | ☑ |
| SN-4 | Build field-level ACLs for Part 2 / PII (deny-by-default). **DONE + verified 2026-07-08:** **33 ACLs** — 25 field-read (Part 2 → `u_bhuc_part2_access`, PII → `u_bhuc_patient_pii`) + 8 record-read (`u_bhuc_clinician` + `u_bhuc_patient_read`). Functionally verified over the Table API: Part 2/PII fields denied without the role, allowed with it, admin/`interface_gautham` bypasses (deny-by-default). See `sud_usecase.md` / `roles_and_acls.md`. | §8.1 SN-Step 4 + 13d | L | 2 | SN-1, SN-13 | ☑ |
| SN-5 | Confirm/select **Now LLM-LTS** provider for agents | §8.1 SN-Step 5 | S | 0.25 | — | ☐ |
| SN-13 | Create **6 service accounts + composable data roles**. **DONE via API 2026-07-08:** 9 roles (`u_bhuc_ai_agent`, `patient_read`, `patient_pii`, `part2_access`, `screening_write`, `doc_write`, `schedule_write`, `patient`, `clinician`) + 6 `svc-bhuc-*` accounts (passwords set; least-privilege sets — `risk`/`scheduling` hold **no PII**). `interface_gautham` granted the 3 read roles (keeps admin, bypasses ACLs — accepted). **Remaining (13c/§5, not roles/ACLs):** bind each agent to its `svc-bhuc-*` + switch write tools to `GlideRecordSecure`. See `roles_and_acls.md`. | §8.1 SN-Step 13 | L | 1.5 | SN-1 | ☑ |
| SN-14 | Create **A2A OAuth client** + enable per-agent third-party access + (optional) callback registration | §8.1 SN-Step 14 | M | 0.5 | SN-13, AG-11, DEC-1 | ☐ |
| SN-15 | Build the iframe SP portal. **DONE 2026-07-07 (single portal)** — widget `bhuc-frame` → `https://bhuc-ai.web.app/`, portal **BHUC AI Platform** (`/bhuc_ai_platform`), nav **BHUC AI Fusion Center → BHUC AI Platform**. (Two per-route pages = optional future refinement.) See §2.9.1. | §8.1 SN-Step 15; §2.9.1 | M | 1 | FE-4 | ◐ |

## Phase 2 — Agents (AI Agent Studio) — `plan.md` §4.3 / §4.4

| ID | Task | Plan Ref | Cx | Effort (d) | Depends On | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AG-0 | Agent build prerequisites (`sn_aia.admin`, model provider, guided-setup preamble) | §4.3; §4.4 preamble | S | 0.25 | SN-5 | ☐ |
| AG-1 | Build **Front-Door Security Agent** (UC1) — crisis-classifier Script + BHUC-scoped Search Retrieval + 988 escalation subflow. **DONE & verified over A2A 2026-07-06** (facility answers cite BHUC KB; crisis → escalation). As-built procedures captured in **§4.6**. Supporting objects: KB `BHUC Facility Information`, profile `BHUC Facility Search`, subflow `BHUC 988 Escalation`, table `u_bhuc_escalation`, group `BHUC On-Call`. | §4.4 Agent 1; §4.6 | L | 2 | AG-0, DATA-3, AG-12 | ☑ |
| AG-2 | Build **Risk Identification Agent** (UC2/P3). **DONE & verified 2026-07-07** — 3 tools all fire: Search Retrieval (`BHUC Screening Search`) → Script `Write risk score` (writes `u_risk_band/u_confidence/u_rationale`, `state→scored` on `u_bhuc_screening` by `screening_sys_id`) → Subflow `BHUC Risk Confirmation Latest` (routes to clinician: `clinician_action=pending`). Verified: `BHUC_SCREENING_002` (C-SSRS) + `_003` (PHQ-9) → band High/conf 95 with rationale, scored + routed. **Gotchas hit & fixed (see §4.4 Agent 2 / §4.6):** (1) write Script used `outputs` → hung; fixed to `return` (§4.6.1); (2) write tool needs the record **sys_id as an input** (agent has no record-lookup tool); (3) `GlideRecordSecure` blocked (no ACLs yet, SN-13) → temporarily `GlideRecord` for testing; (4) Tool C must be a **published SubFlow** (not a Flow) with **Run As = System User** (session-user run-as → "prohibited by security rules" for the public agent). | §4.4 Agent 2; §4.6 | M | 1.5 | AG-0, DATA-1/3 | ☑ |
| AG-3 | Build **Clinical Documentation Agent** (UC2/P4) — ambient scribe + grounding script. **DONE & verified 2026-07-07** — 3 tools fire: Search Retrieval (`BHUC Clinical Coding Search`) → Script `bhuc_note_grounding` (tags unverified lines) → **CRUD** `Draft a BHUC Clinical Note` (Create → new `u_bhuc_care_plan`, draft/unsigned). Verified: created `BHUC_CARE_PLAN_001` (Maya) with sectioned note, unverified lines `["L5","L7"]`, ICD-10 `F32.12` + CPT `99214`. **Notes:** Tool B is a framework **CRUD** (not the custom write-Script pattern of AG-2); its `gr.insert()` checks the create ACL → blocked with no ACLs, so **ran with an admin ACL for testing** (proper least-priv ACLs deferred to SN-13, per the build-first/govern-later plan). CRUD tool had **mapped the read-only `u_number` field to the literal `"number"`**, overriding auto-numbering; **fixed by removing that mapping** — the field default then auto-generates (verified `BHUC_CARE_PLAN_003` via A2A). Never map `u_number` in a write tool. (An interim autonumber BR was added then removed as unnecessary; `_001` backfilled.) | §4.4 Agent 3; §4.6.4 | L | 2 | AG-0, DATA-1/3 | ☑ |
| AG-4 | Build **Consent & Data Protection Agent** (UC3/P4) — Part 2 labeler. **DONE + verified over A2A 2026-07-08:** Tool A "Detect and Tag Part 2/SUD content" (script keyword classifier) works, **negation/word-boundary fix applied + verified** (`"no substance use"`, `"denies drug use"`, `"a method of coping"` → `standard`; genuine SUD → `part2`). Tool B was a CRUD **Create** on `u_bhuc_consent` (inserted junk rows, never touched the note table) — **replaced with a custom Script tool** that **updates** BOTH `u_bhuc_care_plan` (`u_sensitivity`+`u_contains_part2`) and the patient's `part2_sud` consent (`u_sensitivity`+`u_labeled_by_agent`); re-verified end-to-end (care_plan flagged part2, no junk inserts). Wired into the app (see BE-Consent). **Deferred (not blocking, tracked separately):** SN-4/SN-13 platform ACLs — deny-by-default is app-computed today, not ServiceNow-enforced (accepted for the demo, mirrors UC2's app-side-control precedent). | §4.4 Agent 4 | L | 2 | AG-0 | ☑ |
| BE-Consent | **Wire Agent 4 into the app (done 2026-07-08):** Chart route `/patient/{id}/chart` (`patient.py`) now derives Part 2 masking from **Agent 4's labels** on `u_bhuc_care_plan` (`u_contains_part2`/`u_sensitivity`) instead of a static sample string — per-note `part2` history flags + the "42 CFR Part 2" field (masked/locked unless reveal+consent; shows which notes are flagged when revealed; "No Part 2 content flagged" when none). Write side: `POST /note/sign` (`note.py`) now fires Agent 4 over A2A (`snow_agent_consent`) in a **daemon thread** (best-effort, non-blocking) to label the finalized note. Frontend unchanged (Chart already renders `history[].part2` + masked demographics). | §4.4 Agent 4; §3.3 C3 | M | 0.5 | AG-4 | ☑ |
| AG-5 | Build **Prior-Auth Compliance Agent** (UC3/P5). **DONE + verified over A2A 2026-07-08:** Tool A "Search retrieval (payer policy library)" — hybrid, profile `bhuc_payer_policy_search`, limit 8, threshold 0.4; returns cited answers (e.g. `BH-204`). Tool B "Draft the prior-auth packet" — CRUD **Create** into `u_bhuc_prior_auth` (single-table create, so CRUD is the right tool here), all packet fields mapped (patient/service/diagnosis/units/payer/coverage_answer/citation_policy/citation_section/packet/part2_gated/sud_field), statics `Status=draft` + `Drafted by agent=true`; submit fields left empty (human approves in C6). **Made Autonomous** (agent writes the draft directly; clinician advances state in the app). **Gotcha found:** the boolean static saved from the UI as `"t"` → `gr.setValue` needs `"true"`/`"1"` (fixed). Part 2 gating works (`part2_gated=true` + `sud_field` on SUD cases). **Deferred (not blocking):** SN-4/SN-13 platform ACLs. | §4.4 Agent 5 | M | 1.5 | AG-0, DATA-3 | ☑ |
| AG-6 | Build **Scheduling Agent** (UC4) — fairness-check script | §4.4 Agent 6 | M | 1.5 | AG-0, DATA-1 | ☐ |
| AG-12 | Build supporting **Flow Designer flows** (988 escalation, risk-confirmation gate) | §4.4 Agents 1/2 tools | M | 1 | SN-1 | ☐ |
| AG-7 | Configure **execution mode** on record-writing tools (per DEC-2 outcome) | §8.1 SN-Step 7; §4.3 Step 3 | S | 0.5 | DEC-2, AG-1…6 | ☐ |
| AG-8 | Configure **security controls** = AI-user bound to `svc-bhuc-*` per agent | §8.1 SN-Step 8; SN-Step 13c | M | 0.5 | SN-13, AG-1…6 | ☐ |
| AG-9 | Configure **triggers** (or leave off) per DEC-1 outcome | §8.1 SN-Step 9; §4.3 Step 5 | M | 0.5 | DEC-1, AG-1…6 | ☐ |
| AG-10 | **Test** each agent (manual test + Test-access/Access-Analyzer) | §8.1 SN-Step 10; §4.3 Step 7 | M | 1 | AG-7/8/9 | ☐ |
| AG-11 | Register agents in AICT/AIRC; **capture each `sn_aia_agent` sys_id** for the backend map. **Agent 1 captured 2026-07-07:** `BHUC Front Door Security Agent` = `903ca5a73b390f1076f13b64c3e45a90` (in `config.py` `snow_agent_frontdoor`). Agents 2–6 not yet built. | §8.1 SN-Step 11; SN-Step 14d | S | 0.5 | AG-10 | ◐ |

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
| BE-4 | A2A agent-invocation module (JSON-RPC `message/send`; endpoint→agent map). **Front-Door done & verified live 2026-07-07:** `servicenow.py` (OAuth client-credentials token cache + `execute_agent` + reply parse) + `frontdoor.py` (`POST /api/x_bhuc/frontdoor/chat`), mounted in `main.py`. Tested locally against Agent 1: facility Qs return KB-cited answers; crisis phrase → 988 reassurance (with safe fallback). **Agents 2 & 3 wired & tested 2026-07-07** (DEC-1 = backend blocking A2A, triggers OFF, open/pre-auth): `servicenow.py` `TableClient` (basic-auth CRUD) + `risk.py` (`POST /intake/screening` writes record→invokes Agent 2→returns scored `ScreeningResult`; `GET /worklist`, `GET /risk/{id}`, `POST /risk/confirm`) + `note.py` (`POST /note/draft`, idempotent `GET /note/for-patient/{id}`, `GET /note/{id}`, `POST /note/sign`). Frontend flipped per-method via `VITE_AGENTS_LIVE` (Screening/Worklist/RiskConfirm/Documentation now live in dev; prod build keeps them mock until Cognito auth). Agents 4–6 pending. | §8.2 BE-Step 4; §4.4 Agents 2/3 | L | 2 | BE-3, AG-11, SN-14 | ◐ |
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
| FE-9b | **Patient-portal agent flow (done 2026-07-07):** Screening rewritten as a **guided 3-questionnaire stepper** (C-SSRS→PHQ-9→GAD-7, no per-instrument agent) → **Submit all** runs the 3 Risk agents in **parallel** (`POST /intake/screening/batch`) with an **animated progress** component (color-shifting bar, rotating texts, per-agent cards) → "sent to clinicians for review". **Auth+registration gate** (`GET /patient/me` by email) blocks running unless registered. **Screening status tracker** (stages only, no scores) on Home + Screening. **Profile page** (`/patient/profile`, nav swapped from Registration) shows the `u_bhuc_patient` record when registered; Registration completion calls `POST /patient/register`. Backend: `patient.py` + batch in `risk.py`. Gated by `VITE_AGENTS_LIVE` (prod build off until auth). | §3.2 P4; §4.4 Agent 2 | L | 1.5 | BE-4, AG-2 | ☑ |
| FE-9c | **Clinician-portal agent flow (done 2026-07-07):** Worklist shows real patient **name + `BHUC_PATIENT_00x`** (dot-walk, not sys_id) + a **Screening column** (each row = one screening). **Risk Confirm** renders a **read-only "already reviewed"** panel (confirmed/adjusted/rejected + clinician rationale) instead of re-asking; pending still shows the form. **Chart** has a Documentation panel (Signed & verified / Draft) + "Start note / Start another note". **Note generation (Agent 3)** shows the same animated run UI as the screening batch (`AgentRunProgress`); Documentation supports draft/view/verified modes. **Notes linked to screenings** via new `u_bhuc_care_plan.u_screening` (set on create from Risk Confirm or defaulted to latest; existing 6 notes backfilled). Backend: worklist name/screening + note `summary`/`latest`/`new` endpoints. | §3.3 C2/C3/C4/C5; §4.4 Agents 2/3 | L | 1.5 | BE-4, AG-3 | ☑ |
| FE-9d | **Governance portal (done 2026-07-07):** new **`/governance`** portal — Cognito **third role** (`governance`) + demo-login button; entry via a role-picker card + the 988-banner quick-nav. Sidebar: **Agents Inventory** nav + a **Tables** group of 8 `u_bhuc_*` buttons that open each table's ServiceNow list view in a new tab. **Agents Inventory** page = 3 **live A2A test-chats** (Front-Door / Risk / Clinical Documentation), each with the agent name header + example-prompt chips, via generic backend relay `POST /api/x_bhuc/agent/{key}/chat`. Verified all 3 agents reply. Gated by `VITE_AGENTS_LIVE` (prod build mock). | §2.6; §5.1; §4.4 | L | 1 | BE-4, AG-1/2/3 | ☑ |
| FE-9e | **UC2 Output Integrity — app-side controls (done 2026-07-07):** (1) **Server-enforced gates** — `/note/sign` persists `unverifiedLines` + returns **422** if any remain; `/risk/confirm` returns **422** unless `u_scored_by_agent` (gates moved off the browser). (2) **Governance "Output Integrity" page** (`/governance/output-integrity`) — per-agent stat tiles from new `GET /governance/output-integrity` (Agent 2 confidence + clinician disagree rate; Agent 3 unverified/sign rate), an **"How are these derived?"** info modal (source field + formula per metric), and deep links to native AICT + AIRC. (3) **Hallucination check** — `POST /hallucination/check` deterministic **TF-IDF cosine extractive-grounding** (unigram+bigram) of Agent 2/3 output vs its KB doc (KBs copied into `server/app/knowledge/` to deploy on Render); `AgentChat` `groundable` prop → **"Check hallucination"** button + grounding meter + claim-by-claim evidence on the Agents Inventory page. Backend: `governance.py`, `hallucination.py`, hardened `note.py`/`risk.py`. See plan §2.9.2, `output_integrity.md`. | §2.9.2; `output_integrity.md`; §4.4 Agents 2/3; §5.4 | L | 1 | FE-9c, FE-9d, AG-2/3 | ☑ |
| FE-9f | **Agents Inventory — hallucination demo + UI trim (done 2026-07-07):** (1) On the Agents Inventory page, **commented out** the per-card **"Live · A2A"** badge (`AgentChat`) and the **Use Case 1 / Use Case 2** subtitles (`AgentsInventory`) — both kept in-comment for easy restore, not deleted. (2) Added a **3rd example chip** to the two groundable agents that plays a **scripted, deliberately-ungrounded reply** (Risk → **"Score MADRS"**; Clinical Doc → **"Code an ADHD eval"**) — both cite instruments/codes/policies that are **not in the agent's KB**. `AgentChat.send()` gained an optional `canned` path that bypasses the A2A relay and surfaces the reply after a **3–5s think-time** (typing indicator). (3) **Check hallucination** runs the **real** `hallucination.py` grounding on these replies (no faked result) — verified **Risk 28% / Clinical Doc 32%**, both under the **35%** threshold → "Possible hallucination". Purpose: a repeatable on-page demo of the hallucination detector firing. Frontend-only; `tsc -b` clean. | §2.9.2; `output_integrity.md`; §4.4 Agents 2/3 | S | 0.25 | FE-9d, FE-9e | ☑ |
| FE-9g | **Ambient doc — all lines unverified on draft (done 2026-07-07):** When Agent 3 drafts a **new** note (`?new=1`), the Documentation page now forces **every line Unverified** (previously the agent pre-verified all but its flagged lines, leaving only one/few Unverified). The clinician must review and mark **each** line verified before the sign gate opens. Frontend-only (`Documentation.tsx`, `wantNew` path); viewing existing/signed notes is unchanged; server sign-gate (FE-9e) unchanged. | §3.3 C5; §2.9.2; §4.4 Agent 3 | S | 0.1 | FE-9c, FE-9e | ☑ |
| FE-9i | **Fix: deployed sign-in "Unexpected token '<'" (done 2026-07-07):** Root cause — the Cognito auth client (`awsAuth.ts`) reads **`VITE_AWS_API_BASE`**, a *different* var than `VITE_API_BASE`; the deploy workflow set the latter but not the former, so on Firebase the login POST fell back to the relative `/api/aws/login`, which the SPA rewrite (`** → /index.html`) served as **HTML 200** → `postJson` skipped its `!res.ok` guard and `.json()` threw on `<!doctype`. Localhost worked via the Vite `/api` dev-proxy to `:8000`. Fix: add `VITE_AWS_API_BASE: "https://bhuc-backend.onrender.com/api"` to `deploy.yml` (verified Render serves `/api/aws/login` as JSON + CORS allows the site). | §2.9.1; §8.3 | S | 0.1 | FE-4 | ☑ |
| FE-9l | **Worklist + Risk Confirm fixes (done 2026-07-08):** (1) **Adjusted band now persists** — `RiskConfirm.submit()` sends the new band; `/risk/confirm` writes `u_risk_band` on `action=adjusted` (422 if no band). (2) **Worklist shows all scored screenings** (`u_scored_by_agent=true`, not pending-only) so rows stay after action; the "Needs my confirmation" toggle narrows to pending. (3) Columns: **Wait → Instrument** (`u_instrument`), new **Updated** (time-ago from `sys_updated_on`), **Status = clinical action** (Pending/Confirmed/Adjusted/Rejected). (4) Risk Confirm **updates in place** after submit (re-fetch, no navigation). Verified live (adjust high→low reflects in `risk_detail` + worklist). Backend `risk.py`, `Worklist.tsx`, `RiskConfirm.tsx`, `format.ts` (timeAgo). | §3.3 C2/C4; §4.4 Agent 2 | M | 0.5 | FE-9c | ☑ |
| FE-9k | **UC3 app polish (done 2026-07-08):** (1) **Persist note edits on Sign** — `/note/sign` now takes `noteText` and writes `u_draft_note` before signing, so Agent 4's Part 2 check scans what the clinician actually wrote (bug: edited text lived only in the browser, so "alcohol use" wasn't detected). (2) **Red flagged Part 2 modal** — `AgentRunProgress` gained an `alert` prop; the C5 sign modal renders **red/ShieldAlert** when Part 2 is detected (vs teal success). `Documentation.tsx`, `note.py`, `AgentRunProgress.tsx`. | §3.3 C5; §4.4 Agent 4 | S | 0.25 | FE-9j | ☑ |
| FE-9j | **Wire Agents 4 & 5 into the app + Inventory (done 2026-07-08):** (1) **Agent 4 on sign** — signing a note now runs the Consent & Data Protection Agent in a **modal** (`AgentRunProgress` overlay in `Documentation.tsx`) via new **`POST /note/part2-check`** (invokes Agent 4 synchronously, reads back `u_sensitivity`/`u_contains_part2`), then shows the real outcome ("42 CFR Part 2 detected → access-gated" or "standard"). Replaced the old fire-and-forget sign hook. (2) **Agent 5 on prior-auth (C6)** — `PriorAuth.tsx` reworked from mock to live: a **draft form** (service/diagnosis/units/payer) → "Draft with agent" → **modal** while new **`priorauth.py`** (`POST /priorauth/draft`) runs Agent 5 (payer search + drafts into `u_bhuc_prior_auth`), then shows the real cited packet; `GET /priorauth` (existing draft), `POST /priorauth` (cited coverage Q&A), `POST /priorauth/submit` (human submits). (3) **Governance Inventory** — added Agent 4 (classify, read-only) + Agent 5 (coverage Q&A) cards; `agents.py _agent_map` + `config` gained both sys_ids; `servicenow._parse_reply` now surfaces a structured tool result (Agent 4's sensitivity JSON) as reply when there's no prose. Verified end-to-end over A2A; build clean; no junk records. **Live on the deployed Render backend (verified 2026-07-08):** `/note/part2-check` + `/priorauth/*` present in the prod OpenAPI and `GET /priorauth` returns 200. | §3.3 C5/C6; §5.1; §4.4 Agents 4/5 | L | 1 | AG-4, AG-5, BE-Consent | ☑ |
| FE-9h | **Ambient doc "Verify all" + Worklist Confidence hidden (done 2026-07-07):** (1) Added a **"Verify all"** button to the session-note panel header (shown while the note is a Draft with ≥1 Unverified line) that marks every line verified in one click — companion to the per-line "Mark verified" now that FE-9g starts all lines Unverified. (2) **Worklist**: commented out the **Confidence** column (header + per-row cell) for now — kept in-comment for easy restore; the `confidence` sort tiebreaker is untouched. Frontend-only (`Documentation.tsx`, `Worklist.tsx`). | §3.3 C2/C5; §4.4 Agent 3 | S | 0.1 | FE-9g | ☑ |
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
