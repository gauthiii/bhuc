# BHUC Governance Portal — Use Case & Monitoring Reference

> **Status: BUILT (as of 2026-07-10).** This documents the in-app **Governance portal** (`/governance`) — every page, what it monitors, its backend endpoint, and the ServiceNow tables/fields it reads. Companion to the per-use-case docs: [prompt_injection_usecase.md](prompt_injection_usecase.md), [output_integrity.md](output_integrity.md), [fairness_usecase.md](fairness_usecase.md), [sud_usecase.md](sud_usecase.md).

---

## 0. What this is (and isn't)

The **Governance portal** is a third app persona (Cognito role `governance`, sign-in at `/governance/sign-in`) beside Patient and Clinician. It is an **app-embedded governance surface** that mirrors and complements the native **AI Control Tower (AICT)** and **AI Risk & Compliance (AIRC)** — it does **not** replace them (per action-item FE-11, we deliberately do NOT rebuild the native dashboard). Every metric is computed **live** by the FastAPI backend from ServiceNow data, and pages **deep-link** into native AICT/AIRC for the authoritative view.

**Auth:** all pages sit behind `GovernanceGuard` (redirect to `/governance/sign-in` if not authenticated); the `governance` role is informational/app-gating only (DEC-3 — native AICT/AIRC login is direct ServiceNow, not federated).

---

## 1. Pages at a glance

| # | Page | Route | What it monitors | Backend endpoint |
|---|---|---|---|---|
| 1 | **Agents Inventory** | `/governance/agents` | Live A2A test-chat with each agent + on-page hallucination-grounding demo | `POST /agent/{key}/chat`, `POST /hallucination/check` |
| 2 | **AI Asset Management** | `/governance/ai-assets` | AICT Managed/Unmanaged asset inventory (BHUC agents + instance totals) | `GET /governance/ai-assets` |
| 3 | **Agent detail** | `/governance/ai-assets/:id` | Per-agent governance (risk, assessments, risks, controls) + full config + tools | `GET /governance/ai-assets/{asset_id}` |
| 4 | **Output Integrity** | `/governance/output-integrity` | UC2 detective metrics for Agents 2 & 3 (confidence, disagreement, unverified lines, sign rate) | `GET /governance/output-integrity` |
| 5 | **Prompt Injection** | `/governance/prompt-injection` | UC1 Front-Door prompt-injection defense (output-filter counters — currently disabled) | `GET /governance/prompt-injection` |
| 6 | **Scheduling Fairness** | `/governance/fairness` | UC4 outcome fairness — appointment wait-time parity by demographic | `GET /governance/fairness` |
| — | **Tables** (nav group) | (external) | Quick links opening each `u_bhuc_*` table's list view in native ServiceNow | — |

All page code lives in `frontend/src/pages/governance/`; nav in `frontend/src/components/portals.tsx` (`GOVERNANCE_NAV` + `GOVERNANCE_TABLES`); backend in `server/app/governance.py` (+ `agents.py`, `hallucination.py`).

---

## 2. Each page in detail

### 2.1 Agents Inventory — `/governance/agents` (AgentsInventory.tsx)
- **Purpose:** a live console to talk to each of the 6 BHUC agents over A2A and prove they respond, plus an on-page hallucination-detector demo.
- **Monitors / shows:** one card per agent with a live test-chat (relayed via `POST /api/x_bhuc/agent/{key}/chat` → `agents.py` → A2A). Two groundable agents (Risk, Clinical Doc) have a **"Check hallucination"** button that runs the real deterministic grounding (`POST /hallucination/check`, `hallucination.py` — TF-IDF cosine of the agent output vs its KB), and a scripted "deliberately ungrounded" example chip that fires the detector (Risk→28%, Clinical Doc→32%, both under the 35% threshold).
- **Data source:** live A2A agents + `server/app/knowledge/` KB copies (grounding corpus).

### 2.2 AI Asset Management — `/governance/ai-assets` (AIAssetManagement.tsx)
- **Purpose:** mirror the **AICT Managed / Unmanaged asset inventory** for the BHUC agents, with instance-wide totals for context.
- **Monitors / shows:** inventory-summary tiles (**instance:** total AI systems / managed / unmanaged; **BHUC:** managed / unmanaged), then two tables — **Managed AI Assets** and **Unmanaged AI Assets** — each row = **Agent · Type (Agentic/Gen AI) · Built by · Lifecycle state · Risk classification** (color-coded). Rows are **clickable → the agent detail page**. "Open in AI Control Tower" deep link.
- **Live data (2026-07-10):** instance = **339 systems (35 managed / 304 unmanaged)**; BHUC = **2 managed** (Risk Identification · Build-and-test · Medium; Clinical Documentation · Assess) + **4 unmanaged** (Front Door / PriorAuth / Consent / Scheduling · New).
- **Data source / joins:** `alm_ai_system_digital_asset` (one row per AI system: `display_name`, `model_category`, `sys_created_by`, `life_cycle_stage`) **joined on the asset sys_id** to `sn_ai_governance_asset_governance_details` (`governed` = Managed/Unmanaged, `lifecycle_phase`, `risk_score`). Instance managed count = governance rows with `governed=true` whose asset is a system.

### 2.3 Agent detail — `/governance/ai-assets/:id` (AIAssetDetail.tsx)
- **Purpose:** everything about one agent — its AICT/AIRC governance posture **and** its full configuration + tools.
- **Monitors / shows:**
  - **Header** — name, Managed/Unmanaged badge, type, built by, lifecycle, risk classification.
  - **Governance (AI Control Tower):**
    - **Risk ratings** from the AIRC record (`sn_grc_ai_gov_ai_system`): governance number (AIS…), risk classification, inherent rating, residual rating, control effectiveness, state, business owner. *(Present only for managed agents; unmanaged shows an "Unmanaged — no AICT record" note.)*
    - **Assessments (impact & risk)** — number, type (assessment template), status (state), assigned-to (reviewer/approver), opened-by.
    - **Risks** — name, description, state, owner (+ inherent where set).
    - **Controls** — name, description, state, owner.
    - All render **honest empty states** where no record exists (unmanaged agents show none).
  - **Agent configuration** — description, role, instructions, strategy (ReAct).
  - **Tools** — one card per tool: type (Script / Search Retriever / Subflow / Record Operation), execution mode, description, and the **full definition** — Script body (collapsible code block), Subflow target flow, or Search-Retriever **retrieval config** (search profile, sources, results limit, match threshold, semantic indexes, chunking).
- **Live data (Risk Identification Agent):** 3 assessments (`AIA0001092` AI impact assessment · **Closed complete** · Gautham Vijayara; +2), 4 risks (PHI Re-identification, Inadequate Data Protection, Privacy Violations, UC2 Output Integrity/Hallucination), 3 controls (Output Integrity Controls, Encrypt Data at Rest & in Transit, Conduct Privacy Impact Assessments).
- **Data source / joins (the important part — these attach to the AIRC record + a GRC profile, NOT the digital asset):**
  - AIRC record: `sn_grc_ai_gov_ai_system` where `ai_system_digital_asset` = the digital-asset sys_id.
  - **Assessments:** `sn_grc_ai_gov_ai_system_task` where `ai_system` = the AIRC record sys_id (`number`, `assessment_template`, `state`, `assigned_to`, `opened_by`).
  - **Risks:** `sn_risk_risk` where `profile.name` = the agent name (a `sn_grc_profile` named after the agent).
  - **Controls:** `sn_compliance_control` where `profile.name` = the agent name.
  - Agent config: `sn_aia_agent` matched by `name` = display_name. Tools: `sn_aia_agent_tool_m2m` → `sn_aia_tool` (script/target_document; retrieval config from the m2m `inputs` JSON).

### 2.4 Output Integrity — `/governance/output-integrity` (OutputIntegrity.tsx) — UC2
- **Purpose:** detective monitoring of the two write-back agents against the human-in-the-loop controls.
- **Monitors / shows:**
  - **Agent 2 (Risk Identification):** scored count, avg confidence, low-confidence (<70) count, reviewed/pending, adjusted/rejected, **disagree rate** ((adjusted+rejected) ÷ reviewed) — clinician overriding the AI score is a direct output-integrity signal.
  - **Agent 3 (Clinical Documentation):** notes drafted, with-unverified count, unverified rate, avg flagged lines/note, signed/unsigned.
  - A **"How are these derived?"** modal (source field + formula per metric); deep links to AICT + AIRC.
- **Data source:** `u_bhuc_screening` (`u_confidence`, `u_clinician_action`) + `u_bhuc_care_plan` (`u_unverified_lines`, `u_signed`). Detective only; the **preventive gates** are server-enforced (a note can't sign with unverified lines; a risk can't confirm before it's scored).

### 2.5 Prompt Injection — `/governance/prompt-injection` (PromptInjection.tsx) — UC1
- **Purpose:** monitor the Front-Door (Agent 1) prompt-injection defense.
- **Monitors / shows:** replies blocked by the deterministic **output filter**, by category (system-prompt/tool leak · out-of-scope clinical advice · jailbreak compliance · exfiltration/unsafe markup), suspicious-input attempts, and a recent-blocks table; "How is this detected?" modal + AICT Security & privacy deep link.
- **⚠️ Current state:** the **output filter is DISABLED** (it over-blocked legitimate facility answers that mention MAT/buprenorphine/opioid). So live counters read **0**. The active defense is the **client-side INPUT policy** (300+ prompt blocklist + "Blocked by content filtering policy" modal on the patient Home chat, `promptInjectionPolicy.ts`). Module + endpoint stay in place (dormant) for easy re-enable. See prompt_injection_usecase.md §6/§11.
- **Data source:** in-process counters in `prompt_injection.py` (`summary()`), surfaced by `GET /governance/prompt-injection`.

### 2.6 Scheduling Fairness — `/governance/fairness` (Fairness.tsx) — UC4
- **Purpose:** monitor that scheduling **outcomes** are equitable even though the agent's fairness check blinds the **decision** to demographics.
- **Monitors / shows:** distribution of confirmed/completed appointments + **wait-time parity** (avg days from requested → scheduled slot) by **gender, race, ethnicity, age band**, each with a fairness-rate % (`1 − (max−min)/max`) and an overall score; colored bars per group.
- **Data source:** `u_bhuc_appointment` (`u_start`, `u_requested_start`, joined to `u_bhuc_patient` demographics), confirmed/completed rows only. See fairness_usecase.md.

### 2.7 Tables (nav group)
Quick-launch links that open each `u_bhuc_*` table's **native ServiceNow list view** in a new tab (Patients, Screenings, Consents, Appointments, Messages, Care Plans/Notes, Prior Authorizations, Escalations). Not a monitor — a jump-off to the raw records.

---

## 3. Backend endpoints (summary)

| Endpoint | Module | Returns |
|---|---|---|
| `GET /api/x_bhuc/governance/output-integrity` | governance.py | Agent 2 + Agent 3 UC2 detective metrics |
| `GET /api/x_bhuc/governance/fairness` | governance.py | wait-time parity by demographic (UC4) |
| `GET /api/x_bhuc/governance/prompt-injection` | governance.py | prompt-injection block counters (UC1) |
| `GET /api/x_bhuc/governance/ai-assets` | governance.py | Managed/Unmanaged BHUC assets + instance totals |
| `GET /api/x_bhuc/governance/ai-assets/{asset_id}` | governance.py | one agent: governance + config + tools |
| `POST /api/x_bhuc/agent/{key}/chat` | agents.py | live A2A relay for the Agents Inventory chats |
| `POST /api/x_bhuc/hallucination/check` | hallucination.py | deterministic grounding score of an agent output |

All read via the basic-auth `TableClient` (admin) — reference fields on this instance return `{value, display_value}`, so the code reads display values for labels and raw `.value` for join keys (`_val` / `_disp` helpers in governance.py).

---

## 4. AICT / AIRC data model reference (discovered + verified)

The key insight from building the asset pages — the AICT/AIRC governance data spans several tables and **attaches to different records than the digital asset**:

| Concept | Table | Link |
|---|---|---|
| AI system / agent (inventory row) | `alm_ai_system_digital_asset` | `display_name`, `model_category`, `sys_created_by`, `life_cycle_stage` |
| Managed flag + lifecycle + risk score | `sn_ai_governance_asset_governance_details` | `asset` = digital-asset sys_id; `governed`, `lifecycle_phase`, `risk_score` |
| AIRC AI-system (risk ratings) | `sn_grc_ai_gov_ai_system` | `ai_system_digital_asset` = digital-asset sys_id; `risk_classification`, `inherent_rating`, `residual_rating`, `control_effectiveness_rating`, `state`, `business_owner` |
| Assessments (impact/risk) | `sn_grc_ai_gov_ai_system_task` | `ai_system` = AIRC record sys_id; `assessment_template`, `state`, `assigned_to` |
| Risks | `sn_risk_risk` | `profile.name` = agent name (a `sn_grc_profile`) |
| Controls | `sn_compliance_control` | `profile.name` = agent name |
| Agent config | `sn_aia_agent` | `name` = display_name; description/role/instructions/strategy |
| Tools + definitions | `sn_aia_agent_tool_m2m` → `sn_aia_tool` | script / `target_document` (subflow) / retrieval config (m2m `inputs` JSON) |

*Model confirmed via the AI Control Tower docs MCP (Zurich "Tables Installed with AICT" + "Managed vs. Unmanaged") and live queries against `ven04690`.*

---

## 5. Live vs pending

- **Live now:** all 6 pages compute from real ServiceNow data; asset pages reflect the tower in real time. Agents Inventory chats hit the live agents.
- **Honest gaps (by design / data-state, not bugs):**
  - Prompt Injection live counters = 0 (output filter disabled; input policy is the active layer).
  - Only the **2 managed** agents have AIRC risk/assessment/risk/control data; unmanaged agents show empty governance sections (they have no AICT record until a steward marks them managed and runs the govern lifecycle).
- **Native-only (deep-linked, not rebuilt):** the full AICT dashboards, AIRC risk register, guardrail occurrence logs, and the govern/assess playbook UI.

---

## 6. How to demo / test

1. Sign in at `/governance` (governance demo login).
2. **AI Asset Management** → see the Managed/Unmanaged split + instance totals → **click Risk Identification Agent**.
3. On the **detail page**: risk classification (Medium), the impact assessment (`AIA0001092`, Closed complete, Gautham), 4 risks, 3 controls, the agent's description/role/instructions, and all 3 tools with their scripts/retrieval config.
4. **Output Integrity** → Agent 2/3 metrics + "How are these derived?" modal.
5. **Scheduling Fairness** → wait-time parity bars by demographic.
6. **Agents Inventory** → chat with an agent; run "Check hallucination" on a scripted ungrounded reply.
7. Each page's **AICT/AIRC deep link** opens the authoritative native view for cross-check.
