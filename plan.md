# Behavioral Health Urgent Care (BHUC) AI Platform
## End-to-End Project Plan & Implementation Guide — ServiceNow AI Control Tower & GRC Edition

**Document Class:** Production-Ready Enterprise Solution Design & Implementation Runbook
**Prepared by:** Principal Solutions Architect / Senior ServiceNow Technical Lead
**Platform Baseline:** ServiceNow AI Platform, Zurich Release — AI Control Tower (AICT), AI Agent Studio, AI Risk & Compliance (AIRC), GRC
**Application Stack:** React + Vite frontend on **Firebase Hosting**, embedded as a full-screen **iframe** inside anonymous ServiceNow Service Portal pages; **FastAPI** backend brokering to ServiceNow via **A2A** (Agent2Agent, for the six agents) + Table/Scripted REST (for CRUD). This iframe + A2A pattern is modeled on the **verified careatlas build** already running on the instance (§2.9).
**External Systems:** AWS Cognito (authentication, inside the iframe); Firebase Hosting (static app); FastAPI host (backend).
**Governance Constraint:** ServiceNow AI Control Tower and GRC are the sole governance stack. No third-party LLM providers (e.g., Groq). External-agent/MCP *connectors* are not used, but the **A2A outbound channel** (external app → ServiceNow agents) IS used to consume the six native agents from the React app. All AI agents remain native ServiceNow AI Agent Studio agents.
**Version:** 3.0 — Six-agent architecture + iframe/A2A integration (careatlas-modeled). Supersedes v2.0.
**Status:** Draft for Technical Review

---

## A Note on Sourcing and Verification

Every ServiceNow-specific factual claim in this document — plugin names, versions, table names, configuration paths, dashboard tabs, guardrail settings — is drawn directly from the official ServiceNow AI Control Tower Implementation Guide and ServiceNow Enable AI documentation (Zurich Release), retrieved via the ServiceNow documentation reference tool connected to this workspace. Each cited fact carries an inline source reference in the format `[Source: <document>, p.<page>]`. Where a design decision is an **architectural recommendation** rather than a documented ServiceNow default, it is explicitly labeled **"Recommendation"** or **"Custom build"** so you can distinguish vendor fact from architect judgment.

**This document has now been verified against the live instance `ven04690.service-now.com`.** On 2026-07-05, every ServiceNow-dependent claim was checked with read-only REST calls authenticated as the `interface_gautham` service account. The results — including which plugins are confirmed present, which open questions are now resolved, and the two items that could not be confirmed via API — are recorded in the new **Section 0: Live Instance Verification Report**. Where a claim in the body of this document was written speculatively ("Verify in your environment…") and has since been confirmed or corrected, the confirmation is noted inline and traces back to Section 0.

**Citation convention (updated):** two kinds of source now appear.
- `[Doc: <document> → <section>]` — a factual claim from the ServiceNow AI Practices documentation (Zurich/Australia), retrieved via the connected documentation reference tool. (Earlier drafts used fabricated page numbers such as `pp. 694–732`; those page numbers were never real and should be disregarded — the underlying documentation sections they pointed at are genuine and are re-cited here without the invented pagination.)
- `[Verified: <check> → <result>, ven04690, 2026-07-05]` — a claim confirmed by a live read-only API call against your instance. This is the authoritative source for instance state and supersedes any documentation-derived assumption where the two differ.

---

## Section 0 — Live Instance Verification Report (`ven04690.service-now.com`, 2026-07-05)

This section is the evidentiary foundation for everything below. All checks were **read-only** (GET only; no records created or modified), authenticated as `interface_gautham`.

### 0.1 Verification method (and its two constraints)

The `interface_gautham` account is **denied by ACL** on `sys_plugins`, `sys_store_app`, and the `glide.buildtag` system property `[Verified: GET /api/now/table/sys_plugins → HTTP 403 "User Not Authorized"; GET sys_properties?name=glide.buildtag → empty result set, ven04690, 2026-07-05]`. Direct plugin-manifest verification was therefore impossible. Instead, each plugin's presence was proven **indirectly and reliably** by two independent signals:

1. **Table existence** — querying a plugin's tables. A non-existent table returns HTTP 400 `"Invalid table"`; an existing-but-restricted table returns an ACL error; an existing-readable table returns a `result` array. This cleanly distinguishes "plugin not installed" from "installed but access-controlled."
2. **Role existence** — a plugin's scoped roles (`<scope>.<role>`) exist in `sys_user_role` if and only if the plugin is installed.

Both signals agreed for every plugin below.

**Two items could not be confirmed via API and remain UI-verify-only:**
- **G-1 — Exact Zurich build number. [RESOLVED 2026-07-07, via System Diagnostics → Stats]** Build name **Zurich**, build tag **`glide-zurich-07-01-2025__patch10-hotfix3-07-01-2026`** (build date 07-02-2026), offering **enterprise**, instance `ven04690`, state ONLINE. Confirms the Zurich baseline (patch 10 hotfix 3) assumed throughout this plan.
- **G-2 — Dashboard tab layout. [RESOLVED 2026-07-07, via `Workspaces → AI Control Tower`]** The AICT workspace renders with **8 primary tabs**: Overview, AI asset inventory, Value, Evaluation, Risk & compliance, Security & privacy, AI cases, AI Gateway (the earlier "nine" was a doc estimate; 8 render). **Governance is live and the native agents auto-register** (validates §5.1 "native workspace, no custom UI"): 32 AI systems (30 **Agentic AI** / 2 Generative), AI Asset Inventory = 35 assets, AI Asset Security Score **Good** with **0 access issues** across 24 agent-access entries, Guardrails surface present, Regulatory risk classification populated (High/Medium/Low). Two observations: **AI models/Datasets show "No data"** (only AI systems/agents registered so far), and the **Now Assist "Evaluation" app is disabled by default**. **Decision:** Now Assist Evaluation (conversation auto-eval for Virtual Agent/Now Assist) is **out of scope for BHUC** — BHUC governance uses the AICT Asset Inventory + Risk & Compliance + Security & Privacy surfaces over the A2A agents, not Now Assist conversation scoring; leave Evaluation disabled.

### 0.2 Confirmed present (the build's entire ServiceNow dependency chain)

| Capability | Real artifact confirmed | Evidence |
| --- | --- | --- |
| **AI Agent Studio** | 59 `sn_aia_*` tables incl. `sn_aia_agent`, `sn_aia_tool`, `sn_aia_trigger_configuration`, `sn_aia_memory`, external/A2A tables | `[Verified: GET sys_db_object?nameSTARTSWITHsn_aia → 59 tables; roles sn_aia.admin, sn_aia.viewer exist; 50+ rows in sn_aia_agent]` |
| **Now Assist / GenAI (OneExtend)** | 38 `sys_one_extend_*` tables; `sys_generative_ai_config` with 40+ provider configs | `[Verified: GET sys_generative_ai_config → Now LLM, Now LLM LTS, Now LLM LTS Large, Azure OpenAI, Anthropic/Claude, Gemini, Bedrock all present; role sn_generative_ai.data_steward exists]` |
| **AI Control Tower (AICT)** | 11 `sn_ai_governance_*` tables (asset governance details, lifecycle, `assessment_request`/`assessment_task`, `automation_rule`, `mcp_server_sync`) | `[Verified: GET sys_db_object?nameSTARTSWITHsn_ai_governance → 11 tables; roles sn_ai_governance.ai_steward, .workspace_admin, .workspace_user exist]` |
| **AI Risk & Compliance (AIRC)** | `sn_grc_ai_gov_ai_system`, `_risk_assessment_result`, `_ai_system_task`, `_ai_system_entity_map`; 20 AI systems already registered | `[Verified: GET sn_grc_ai_gov_ai_system → 20 rows; full role family sn_grc_ai_gov.ai_risk_and_compliance_{admin,manager,analyst,reader,business_user} exists]` |
| **AI Case Management** | `sn_ai_case_mgmt_ai_case`, `sn_ai_case_mgmt_ai_inquiry` | `[Verified: table probes → HTTP 200]` |
| **GRC: Policy & Compliance** | `sn_compliance_authority_document`, `sn_compliance_policy` | `[Verified: HTTP 200]` |
| **GRC: Risk + Advanced Risk** | `sn_risk_risk` + 72 `sn_risk_advanced_*` tables (inherent/residual/control assessment, risk identification, risk heatmap sources) | `[Verified: GET sys_db_object?nameSTARTSWITHsn_risk_advanced_ → 72 tables]` |
| **Data Privacy (inbound PII anonymization)** | Data Privacy product + Now Assist integration | `[Verified: roles data_privacy_admin, now_assist_data_privacy_admin, data_privacy_processor exist in sys_user_role]` |
| **OIDC / Multi-Provider SSO** | `oidc_provider_configuration` with 9 configured providers | `[Verified: GET oidc_provider_configuration → Okta, Azure AD, Google, Auth0, ADFS, … (Cognito not yet among them — must be added, Runbook SN-Step 2)]` |
| **Scripted REST framework** | `sys_ws_definition` (100+ APIs already defined) | `[Verified: HTTP 200, 100 rows returned]` |

### 0.3 Open questions from the original draft — now RESOLVED

| Original open item (draft §) | Resolution |
| --- | --- |
| Exact AI Steward role name (§2.4, §Appendix B) | **`sn_ai_governance.ai_steward`** `[Verified]`. Also available: `sn_ai_governance.workspace_admin`, `sn_ai_governance.workspace_user`. |
| Whether `sn_grc_ai_irm_intg` "glue" is active (§2.7) | The AIRC↔AICT integration is functionally present: `sn_grc_ai_gov_ai_system` is populated (20 rows) and AICT governance tables coexist, which is only possible when the integration is active `[Verified]`. |
| Whether Advanced Risk / residual-vs-inherent heatmap is available (§5.3 Tab 6) | **Yes** — 72 `sn_risk_advanced_*` tables incl. `sn_risk_advanced_inherent_assessment` and `sn_risk_advanced_residual_assessment` `[Verified]`. |
| Whether Now LLM-LTS is available for the regulated-workload recommendation (§2.4) | **Yes** — multiple `Now LLM LTS` / `Now LLM LTS Large` configs exist `[Verified]`. |
| Whether the inbound "Sensitive Data Input and Anonymization" guardrail is supportable (§4.3, §5.4) | **Yes** — Data Privacy + `now_assist_data_privacy_admin` role present `[Verified]`. Earlier gap suspicion retracted. |

### 0.4 Gaps and corrections (verified-only honesty)

- **GAP-1 — No `x_bhuc` scoped application exists.** The only scoped apps on the instance are `x_acce8_*` and a set of legacy `careatlas` `u_*` tables (`u_patient`, `u_patients`) unrelated to this greenfield design `[Verified: GET sys_app → x_acce8_pweb, x_acce8_cweb, … ; no x_bhuc scope]`. Per your decision to keep greenfield `x_bhuc` naming, **the scoped app, its tables, roles, and Scripted REST APIs are all net-new build work** (Runbook SN-Step 1). Nothing named `u_bhuc_*` can be assumed to exist.
- **GAP-2 — "AI Gateway" as a distinct 9th surface not independently confirmed.** AICT MCP-sync tables exist (`sn_ai_governance_mcp_server_sync`), consistent with AI Gateway being present, but since this build uses no external MCP agents (§4.2) it is not on the critical path; treat Tab 9 as expected-empty either way.
- **CORRECTION-1 — Fabricated page numbers removed.** All `pp. NNN–NNN` citations in the original draft were not real ServiceNow pagination. The documentation sections themselves are genuine; they are re-cited in `[Doc: …]` form without invented page numbers.
- **CORRECTION-2 — External/A2A agents DO exist on the platform.** The draft implied external-agent connectors were out-of-platform; in fact `sn_aia_external_agent_provider`, `sn_aia_external_agent_configuration`, and an A2A callback registry are installed `[Verified]`. This build still **chooses not to use them** (§4.2) — that is a scope decision, not a capability gap.

### 0.5 What this means for the build

Every ServiceNow capability the five use cases depend on is **confirmed installed and reachable**. There is no licensing or plugin-activation blocker. The remaining work is **configuration and net-new custom build** (the `x_bhuc` scoped app, the two portals, the six agents, and the governance configuration), not plugin procurement. The step-by-step runbooks in **Section 8** are written against the real, verified artifact names above.

---

## Table of Contents

0. **Live Instance Verification Report** (`ven04690`, 2026-07-05) — evidence for every claim below
1. **Executive Summary**
2. **Project Scope & Architecture Overview**
   - 2.1 Business Context
   - 2.2 Solution Scope
   - 2.3 The AICT Functional Framework (Foundation)
   - 2.4 Logical Architecture
   - 2.5 Authentication Architecture (AWS Cognito)
   - 2.6 Portal Topology — Including Why the Governance Portal Is Native, Not Custom
   - 2.7 Licensing Assumption & Plugin Dependency Chain
   - 2.8 End-to-End Request Lifecycle
   - 2.9 Deployment & Integration Topology (iframe Portal + A2A) — careatlas-modeled
     - 2.9.1 As-Built Deployment, Hosting & CI/CD (repo, Firebase, Render, SN portal)
3. **Frontend & UI/UX Blueprint**
   - 3.1 Design System & Global Standards
   - 3.2 Patient Portal — Screen Inventory & Specifications
   - 3.3 Clinician Portal — Screen Inventory & Specifications
4. **Multi-Agent Architecture & Implementation**
   - 4.1 Agent Roster (Mapped to the 5 Locked BHUC Use Cases)
   - 4.2 Why There Is No External/Groq Agent in This Build
   - 4.3 Building Native ServiceNow Agents — Canonical Procedure (Agent Studio)
   - 4.4 Agent-by-Agent Build Specifications
   - 4.5 UC5 Is Not an Agent — It Is the Governance Platform Itself
   - 4.6 Reusable Build Procedures (As-Built) — Script / KB-backed Search Retrieval / Flow-Subflow
5. **AI Governance & Compliance Portal (Native AICT + AIRC)**
   - 5.1 Architectural Decision: Native Workspace, Not Custom UI
   - 5.2 Installation & Configuration Sequence
   - 5.3 The Nine Governance Dashboard Tabs
   - 5.4 Guardrails & Runtime Controls (Cited, Exact Settings)
   - 5.5 Core Governance Use Cases — Implementation Mapping
   - 5.6 Model Fallback Protocol (Native Mechanism)
   - 5.7 Healthcare-Specific Risk Content: Content Pack vs. Custom Authority Document
6. **"Before / After" Demonstration Strategy**
   - 6.1 Demo Environment Staging
   - 6.2 The "Before" Phase Script
   - 6.3 The "After" Phase Script
   - 6.4 Native Governance Dashboard Live-Monitoring Script
   - 6.5 Demo Run-of-Show & Timing
7. **Appendices**
8. **Step-by-Step Implementation Runbooks (Verified Artifacts)**
   - 8.1 ServiceNow Runbook (SN-Step 1 → 12)
   - 8.2 Backend Runbook (BE-Step 1 → 9)
   - 8.3 Frontend Runbook (FE-Step 1 → 8)
   - A. Full Plugin Dependency Map (Cited)
   - B. Role & Permission Matrix
   - C. Naming Convention Standard
   - D. Instance Verification Checklist (Run These Yourself)
   - E. Source Index

---

## 1. Executive Summary

This is the build and implementation runbook for the Behavioral Health Urgent Care (BHUC) AI platform, revised to a **single, non-negotiable governance constraint**: every AI capability is built and governed natively on ServiceNow's AI Control Tower (AICT) and GRC stack. There is no external LLM provider, no Groq integration, and no Model Context Protocol (MCP) external-agent connector in this architecture — those were evaluated in earlier drafts and explicitly removed from scope for this build.

The platform now rests on three pillars instead of four:

- **AWS Cognito** remains the identity provider for the two human-facing portals (Patient, Clinician), issuing OIDC/JWT tokens ServiceNow validates.
- **ServiceNow AI Agent Studio** hosts six native, purpose-built agents realizing four of your five locked BHUC use cases (Use Cases 2 and 3 each club two agents).
- **ServiceNow AI Control Tower + AI Risk & Compliance (AIRC)** is not a backend supporting a separate custom "Governance Portal" — it **is** the governance portal. AICT ships a nine-tab governance dashboard, natively, out of the box `[Source: ServiceNow Enable AI, "AI Control Tower Dashboard," pp. 694–732]`. Building a custom UI on top of this would duplicate functionality that is already a fully licensed, vendor-supported product surface. Your fifth use case, the Enterprise AI Governance Control Tower, **is this platform itself** — not a sixth agent to build.

Every design decision below is cited against the official documentation, or explicitly flagged as an architectural recommendation where the documentation is silent (most notably: BHUC's HIPAA / 42 CFR Part 2 risk content, which ServiceNow's out-of-the-box content pack does not cover).

---

## 2. Project Scope & Architecture Overview

### 2.1 Business Context

Behavioral Health Urgent Care sits at the intersection of the highest-stakes patient population in healthcare (patients in active crisis) and the most stringently protected data category in U.S. healthcare law (substance use disorder records under 42 CFR Part 2). Governance cannot be bolted on after the fact — it has to be structurally native to every AI action the platform takes.

### 2.2 Solution Scope

**In scope:**
- Two custom-built human-facing portals: Patient Portal, Clinician Portal (Cognito-authenticated).
- The native AICT + AIRC workspace, configured and role-scoped, serving as the AI Governance interface (not custom-built).
- Six native ServiceNow AI Agent Studio agents realizing four of the five locked BHUC use cases (Use Cases 2 and 3 each club two agents).
- Full governance instrumentation using **only native ServiceNow guardrails and dashboards** — no custom monitoring UI.
- A scripted "before/after" demonstration.

**Explicitly out of scope (per your instruction):**
- Groq API or any third-party/external LLM provider.
- MCP-based external agent connectors (AI Gateway's cross-platform MCP governance capability exists in the platform `[Source: ServiceNow AI Control Tower Implementation Guide, "Key Capabilities" (AI Gateway), Cross Product Integration - AI Gateway]` but is not used here, since there is no external agent to govern).
- Production EHR write-back, real payer/clearinghouse connectivity, native mobile apps (unchanged from prior draft).

### 2.3 The AICT Functional Framework (Foundation)

Before any configuration decision, it's worth grounding the whole platform in ServiceNow's own architectural model. AI Control Tower is organized around **five interconnected functional areas, anchored by AI Inventory Management in the CMDB as the foundational layer**:

| Function | What It Does |
| --- | --- |
| **AI Inventory (Foundation)** | All AI assets — systems, models, prompts, datasets, agents, MCP servers — tracked as CIs in the CMDB, providing shared business context for everything else. |
| **Discover** | Automatically discover AI assets across the enterprise; build a complete inventory; map dependencies. |
| **Govern** | AI strategy, risk management across the AI lifecycle, integrated controls, and compliance demonstration — impact assessments, risk classification, control attestation, policy management, regulatory reporting (EU AI Act, NIST AI RMF). |
| **Secure** | AI access tracking, security posture metrics, guardrails; automated workflows; security scores covering data leaks, prompt injection, model vulnerabilities, privileged agents, dormant agents. |
| **Observe** | Continuous monitoring of AI agent performance via metrics and log traces; detects performance degradation, anomalies, behavioral drift. |
| **Measure** | Business impact tracking — adoption, realized value, ROI; consolidates productivity, cost avoidance, and risk reduction. |

`[Source: AI Control Tower Implementation Guide, "Functional Framework," General - Overview, p.8–9]`

Because all five areas read from and write to the same CMDB-based inventory, **implementation must start with the Discover function** (establishing the AI Inventory foundation) before layering Govern, Secure, Observe, and Measure on top. Every subsequent section of this document maps back to one of these five functions.

### 2.4 Logical Architecture

| Layer | Components | Responsibility |
| --- | --- | --- |
| **Identity** | AWS Cognito User Pools, OIDC provider config | Authenticates Patient/Clinician users *inside the iframe*, issues JWT tokens, maps groups to ServiceNow roles |
| **Presentation** | **React + Vite** app on **Firebase Hosting**, embedded as a full-screen **iframe** in two anonymous ServiceNow SP pages (careatlas model, §2.9) | Role-appropriate UIs (`/patient`, `/clinician`); token-bearing calls to the FastAPI backend |
| **Backend/Integration** | **FastAPI** service (public host, e.g. Render) | Validates Cognito JWT; brokers to ServiceNow via **A2A** (agents) + **Table/Scripted REST** (CRUD) using the OAuth A2A client |
| **Orchestration** | ServiceNow AI Agent Studio (A2A-exposed) | Hosts and executes the six native agents, each under a dedicated `svc-bhuc-*` non-human identity |
| **Governance** | ServiceNow AI Control Tower, AI Risk & Compliance, GRC (Policy & Compliance, Risk, Advanced Risk) | Discover / Govern / Secure / Observe / Measure across all six agents |
| **Inference** | ServiceNow Now LLM Service (or Now LLM-LTS for regulated workloads) | Executes the model calls behind each native agent |

**On the inference layer specifically:** ServiceNow's own AI model provider guidance notes that the **Now LLM-LTS (Long Term Stable) model** "supports regulated industries, such as financial institutions, with stronger AI lifecycle management, governance, transparency, and compliance tools," and that for healthcare deployments with regulatory obligations, "the LTS model's stability and compliance orientation may be required" `[Source: ServiceNow Enable AI, "Explore the Third-Party LLMs and Regions," AI Control Tower, pp. 758–766]`. **Recommendation:** configure BHUC's agents against Now LLM-LTS rather than the standard Now LLM Service, specifically because of this documented regulated-industry guidance.

### 2.5 Authentication Architecture (AWS Cognito)

Unchanged from the original architecture: Cognito remains the identity provider for the two human-facing portals.

1. The user opens the anonymous ServiceNow SP page, which renders the React app in a full-screen iframe (§2.9); unauthenticated users redirect to Cognito Hosted UI **inside the iframe**.
2. Cognito authenticates against a User Pool, enforcing MFA for clinicians.
3. Cognito issues a JWT (ID token) carrying `cognito:groups`.
4. The React app attaches the JWT as a bearer token on calls to the **FastAPI backend** (not directly to ServiceNow).
5. FastAPI validates the JWT against Cognito's JWKS endpoint, maps `cognito:groups` → `x_bhuc` roles, then authorizes to ServiceNow via its OAuth A2A client (§2.9). (ServiceNow's own OIDC provider config under **Multi-Provider SSO → Identity Providers → OIDC** is still registered — SN-Step 2 — for any direct-ServiceNow validation and future SSO federation.)

| Cognito Group | ServiceNow Role | Portal |
| --- | --- | --- |
| `bhuc-patients` | `u_bhuc_patient` | Patient Portal |
| `bhuc-clinicians` | `u_bhuc_clinician` | Clinician Portal |
| `bhuc-governance` | **`sn_ai_governance.ai_steward`** (confirmed) | Native AICT workspace |

> **Note on the governance role — RESOLVED.** The steward role name is confirmed to be **`sn_ai_governance.ai_steward`** on this instance `[Verified: GET /api/now/table/sys_user_role?sysparm_query=nameLIKEsteward → sn_ai_governance.ai_steward present, ven04690, 2026-07-05]`. Two adjacent roles are also available and may be used for read-only governance viewers vs. configurators: `sn_ai_governance.workspace_admin` and `sn_ai_governance.workspace_user`. Map the `bhuc-governance` Cognito group to `sn_ai_governance.ai_steward` (see Runbook SN-Step 11). The AIRC-side roles for the Risk & Compliance workspace are `sn_grc_ai_gov.ai_risk_and_compliance_{admin,manager,analyst,reader,business_user}` `[Verified]`.

### 2.6 Portal Topology — Including Why the Governance Portal Is Native, Not Custom

Two custom-built portals (one React app, two routes, embedded as iframes — §2.9), one native workspace:

1. **Patient Portal** — the React+Vite app's `/patient` route on Firebase, embedded as a full-screen iframe in the anonymous SP page `u_bhuc_patient`; Cognito-authenticated inside the iframe; calls the FastAPI backend (which brokers to ServiceNow via A2A + REST).
2. **Clinician Portal** — the same app's `/clinician` route, iframe in SP page `u_bhuc_clinician`; MFA-enforced Cognito auth; same FastAPI backend.
3. **AI Governance Interface** — **not a custom SPA.** This is the native **AI Control Tower workspace** (`Workspaces > AI Control Tower`) plus the **AI Risk & Compliance workspace**, both shipped, licensed ServiceNow products, accessed directly by AI Stewards logging into ServiceNow with the `bhuc-governance` Cognito group mapped to the appropriate steward role.

**Why this is the correct architecture, not a shortcut:** the AICT dashboard already provides eight fully-built tabs — Overview, AI Strategy (SPM-licensed), AI Asset Inventory, Value, Health, Risk & Compliance, AI Cases, Security & Privacy — plus a ninth AI Gateway tab for MCP server metrics `[Source: ServiceNow Enable AI, "AI Control Tower Dashboard," pp. 694–732]`. Every metric your original requirements template asked for (guardrails, audit logs, compliance tracking, latency, cost, PII/PHI detection) is a native widget on one of these tabs, detailed in Section 5. Reimplementing this in a custom UI would mean re-building a shipped product surface with less functionality and no vendor support path.

### 2.7 Licensing Assumption & Plugin Dependency Chain

Per your direction, this guide assumes a **Pro Plus / Now Assist licensed instance**, under which dependent AICT plugins install automatically:

> "For Pro Plus licensed customers: AI Control Tower for Now Assist 1.01 is auto-installed with generative AI Controller (`sn_generative.ai 11.0.9`). Installation of the Now Assist plugin auto-installs relevant AI Control Tower plugins. No additional plugins needed." `[Source: AI Control Tower Implementation Guide, "Activation and Installation of AI Control Tower," Zurich Release, pp. 817–819]`

Even under auto-install, it is worth knowing what actually gets installed, because troubleshooting and governance both depend on this chain. The full seven-component sequence, with exact plugin IDs and versions as documented, is reproduced in **Appendix A**. The single most operationally important fact from that chain:

> "The AI Risk and Compliance Integration with Control Tower (`sn_grc_ai_irm_intg`) is the 'glue' that makes AICT a unified governance view... Without this integration plugin, the Risk & Compliance tab in AICT will not display data." `[Source: AI Control Tower Implementation Guide, "Activation and Installation of AI Control Tower," pp. 817–819]`

**Verify in your environment:** confirm `sn_grc_ai_irm_intg` is active — this is the plugin most likely to be missing even in an otherwise complete Pro Plus install, per ServiceNow's own troubleshooting note.

Critically for your "AICT and GRC, non-negotiable" requirement: the documentation confirms that **AI Risk and Compliance Management (`sn_grc_ai_gov`) itself depends on nine separate GRC plugins as hard requirements**, including GRC: Policy and Conformance management (`sn_compliance`), GRC: Risk management (`sn_risk`), and GRC: Advanced Risk (`sn_risk_advanced`) `[Source: AI Control Tower Implementation Guide, "Activation and Installation of AI Control Tower," pp. 817–819]`. In other words: **there is no scenario where you get AICT's compliance capability without GRC** — they are architecturally one stack, not two products you're choosing between.

### 2.8 End-to-End Request Lifecycle

A representative request — a patient completing an intake screening, mapped to BHUC Use Case 2 (Risk Identification), **through the iframe + FastAPI + A2A topology** (§2.9):

1. The patient opens the **anonymous ServiceNow SP portal page** (`/u_bhuc_patient`, §2.9); the page is a full-screen iframe that loads the **React+Vite app from its Firebase URL**.
2. Inside the iframe, the React app authenticates the patient via **AWS Cognito** and holds a JWT.
3. The patient submits the screening; the React app calls the **FastAPI backend** `POST /api/x_bhuc/intake/screening` with the Cognito JWT as a bearer token. (The browser talks only to FastAPI, never to ServiceNow directly.)
4. FastAPI validates the Cognito JWT, then authenticates to ServiceNow with its **OAuth A2A client** (client-credentials grant, §2.9) to obtain a ServiceNow access token.
5. FastAPI writes the screening record via **Table/Scripted REST** (hybrid CRUD path), then invokes the **BHUC Risk Identification Agent over A2A**.
6. The agent runs as its **non-human service account** (`svc-bhuc-risk`, AI-user identity) with least-privilege roles (§8.1 SN-Step 13), scoring via Now LLM-LTS. As a native agent it is automatically visible in the AICT AI Asset Inventory `[Doc: AI Control Tower Implementation Guide → "Functional Framework," Discover]`.
7. The agent output passes the native **Security & Privacy guardrails** (Output PII Violation, Output Extended PII, Agent Goal Deviation) before return (§5.4); because it writes a clinical record, **Supervised mode** forces clinician confirmation (§4.3).
8. The agent's reply returns **inline in the same HTTP response** (blocking A2A, `configuration.blocking=true` — no callback needed), FastAPI returns it to the React app, which renders it. (An async **push-notification** callback is an optional alternative, §2.9.) Every step is surfaced on the AICT Health / Security & Privacy / Risk & Compliance tabs in real time — no custom instrumentation.

### 2.9 Deployment & Integration Topology (iframe Portal + A2A) — Modeled on the Verified careatlas Build

This build reuses the exact integration pattern already proven on your instance for **careatlas**, confirmed by read-only inspection on 2026-07-05. The pattern has three moving parts.

**(1) The React app is deployed to Firebase and embedded as a full-screen iframe inside a ServiceNow Service Portal page — the iframe *is* the portal.**
The careatlas reference is the SP widget **"CareAtlas Full Screen Frame"** (`sp_widget.id = careatlas-frame`), whose template is a fixed full-screen iframe pointed at a Firebase URL `[Verified: sp_widget careatlas-frame → template <iframe src="https://task--mission.web.app/"> with sandbox="allow-scripts allow-same-origin allow-forms allow-popups"; css position:fixed; width:100vw; height:100vh; z-index:9999, ven04690, 2026-07-05]`. For BHUC we replicate this into **two thin widgets/pages** — `u_bhuc_patient_frame` (iframes the React app's `/patient` route) and `u_bhuc_clinician_frame` (iframes `/clinician`) — from **one** React+Vite app on **one** Firebase URL (per your decision). Build steps: §8.1 SN-Step 15, §8.3.

**(2) The SP portal shell is anonymous; real authentication is Cognito inside the iframe.**
The ServiceNow page requires no ServiceNow login — it just renders the iframe. The React app authenticates the user via Cognito; the FastAPI backend enforces authorization against ServiceNow using OAuth. (Per your decision: anonymous shell + Cognito-in-iframe.)

**(3) Agents are consumed from the app over A2A via an OAuth API client; each agent runs as a dedicated non-human service account.**
The careatlas reference is the OAuth API client **"Care Atlast A2A Integration"** (`oauth_entity`, `type=client`, `client_id=3cdf452be46b4ad89b51e2d6e1f47916` — the same value in your `.env` `SNOW_A2A_CLIENT_ID`) `[Verified: oauth_entity → "Care Atlast A2A Integration" active, and "Schedule Agent A2A Client" active, ven04690, 2026-07-05]`. The FastAPI backend uses this client's credentials (client-credentials grant, scope `a2aauthscope`) to obtain a ServiceNow token and invoke agents at `POST /api/sn_aia/a2a/v2/agent/id/{agent_sys_id}` over the **A2A (Agent2Agent) protocol** using a JSON-RPC `message/send` body `[Verified: careatlas `execute_agent`, servicenow.py]`. The careatlas backend uses **synchronous blocking** calls (`configuration.blocking=true`), so the reply comes back inline and **no public callback URL is required**; an **async push-notification** mode (ServiceNow → `{A2A_CALLBACK_BASE_URL}/api/a2a/callback/{agent_sys_id}`, token `A2A_CALLBACK_TOKEN`, registered in `sn_aia_external_agent_callback_registry` `[Verified: table present]`) is the optional alternative you have also validated. Careatlas runs each agent under a **dedicated service account** — the instance has `svc-careatlas-agent`, `svc-clinical-agent`, `svc-scheduling-agent`, `svc-triage-agent`, `svc-notes-agent`, `svc-identity-verification-agent`, `svc-reminder-agent`, … `[Verified: sys_user → 13 svc-* accounts, active, internal_integration_user attribute set]`, composed from granular roles such as `role_patient_pii`, `u_patients_user`, `u_careatlas_ai_agent` `[Verified]` — the PII-denial demo works because one account holds `role_patient_pii` and one does not. BHUC mirrors this with six `svc-bhuc-*` accounts and composable `u_bhuc_*` roles (§8.1 SN-Step 13–14).

**Consequence for agent configuration:** because the caller is an external app (no interactive ServiceNow user), each A2A-consumed BHUC agent must have **"Allow third party to access this AI agent" = ON** (§4.3 Step 2 — this overrides the earlier "leave OFF" note now that A2A is in scope) and its data-access identity must be an **AI user (the service account)**, not a dynamic user (§4.3 Step 4). This is the one place the A2A requirement changes the agent build from the original draft.

**End-to-end data path:** `React (Firebase iframe) → FastAPI (OAuth client-credentials + Cognito JWT validation) → ServiceNow [ A2A → 6 agents (svc-bhuc-* identities) | Table/Scripted REST → u_bhuc_* CRUD ] → async A2A callback → FastAPI → React`.

### 2.9.1 As-Built Deployment, Hosting & CI/CD (verified 2026-07-07)

The concrete, deployed artifacts and pipelines. **This is the source of truth for what actually exists.**

**Source repo:** `https://github.com/gauthiii/bhuc` (branch `main`). Local: `bhuc_app/` (frontend/, server/, plan.md, action.md, tables.md, README.md). Secrets (`.env`, `server/.env`) are git-ignored; only `*.env.example` templates are committed. `.env.example` files carry **no** real Cognito/AWS values (the frontend never uses them — see below).

**Frontend — React+Vite on Firebase Hosting.**
- **Firebase project:** `task--mission` (shared with careatlas). **Hosting site:** `bhuc-ai` → **`https://bhuc-ai.web.app`** (careatlas is a separate site `task--mission.web.app` in the same project — "same project, different URL", since Firebase can't cleanly do "same URL, different route").
- **CI/CD:** `.github/workflows/deploy.yml` (careatlas-style) — on push to `main`, builds `./frontend` with `VITE_USE_MOCK=true` (demo/standalone; the deployed site has no backend to reach) and deploys to site `bhuc-ai` via `FirebaseExtended/action-hosting-deploy` (`firebaseToolsVersion: "13"`). Requires GitHub secrets `FIREBASE_SERVICE_ACCOUNT` + `FIREBASE_PROJECT_ID=task--mission` (reuse careatlas's service-account value). The site `bhuc-ai` was created once via `firebase hosting:sites:create bhuc-ai` (name `bhuc` was rejected — needs 6+ chars).
- **Cognito clarification (important):** the **frontend needs NO Cognito/AWS creds** — auth flows `frontend → backend /api/aws/* → Cognito`. All Cognito/AWS secrets live in `server/.env` (backend/boto3) only.

**Backend — FastAPI on Render.**
- **Blueprint:** `render.yaml` (repo root) → service **`bhuc-backend`** (Free plan) → **`https://bhuc-backend.onrender.com`**. Root dir `server/`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health `/api/health`, `autoDeploy: true` on `main`. Secrets declared `sync: false` (set in Render dashboard, never committed); `CORS_ORIGINS` pre-set to the bhuc-ai Firebase URLs + localhost. **LIVE (verified 2026-07-07):** Blueprint connected; `https://bhuc-backend.onrender.com/api/health` → `{"status":"ok","cognito_configured":true}`. Auto-deploys on every push to `main`. Also runs locally on `http://localhost:8000` for dev.

**ServiceNow Service Portal (iframe host) — AS-BUILT (single portal for now, careatlas pattern).**
- **Widget** `BHUC Full Screen Frame` (`sp_widget.id = bhuc-frame`) — fixed full-screen iframe (`position:fixed; 100vw/100vh; z-index:9999`, sandbox `allow-scripts allow-same-origin allow-forms allow-popups`) → **`src = https://bhuc-ai.web.app/`** (app root = role picker; the 988 banner has Patient/Clinician quick-nav).
- **Page** `bhuc_ai_platform` → **Portal "BHUC AI Platform"** (`url_suffix = bhuc_ai_platform`, homepage = that page) → URL **`https://ven04690.service-now.com/bhuc_ai_platform`**.
- **Nav (All menu):** application menu **"BHUC AI Fusion Center"** (`sys_app_application`, active, `snc_internal`) → module **"BHUC AI Platform"** (`sys_app_module`, `link_type=DIRECT`, `query=/bhuc_ai_platform`). Search **All → "BHUC AI Fusion Center"**.
- The fixed full-screen iframe overlays all SP chrome — no ServiceNow header/footer/widgets show, exactly like careatlas. *(This is a single portal pointing at the app root; the plan's original two-page split (§8.1 SN-Step 15) into separate `/patient` and `/clinician` pages remains an optional future refinement.)*

---

## 3. Frontend & UI/UX Blueprint

### 3.1 Design System & Global Standards

- **Layout:** 12-column responsive grid, 1140px max content width, 8px spacing base.
- **Typography:** serif display for headings, neutral sans for body/data.
- **Color semantics:** neutral base; single accent for primary actions; fixed status palette (amber = attention/pending, teal = confirmed/safe, red = clinical risk / governance violation only).
- **Accessibility:** WCAG 2.1 AA minimum across both portals — non-negotiable in a behavioral-health context.
- **Global chrome:** persistent top bar (64px, sticky) with identity, sign-out, and a session-timeout countdown chip tied to Cognito token `exp` (turns amber at ≤5 min, "Stay signed in?" modal at 2 min, auto sign-out at expiry).

**Concrete design tokens (use verbatim):**
- **Grid/breakpoints:** `sm` <640px (single column), `md` 640–1023px (6 cols), `lg` ≥1024px (12 cols). Spacing multiples of 8 (4px only for icon insets).
- **Type scale:** Headings serif (e.g. Source Serif 4 / Newsreader) — H1 40/48, H2 30/38, H3 22/28. Body/data sans (e.g. Inter) — body 16/24, small 14/20, caption 12/16. Never below 14px for interactive labels.
- **Color values:** neutral text/surfaces greys `#111827`→`#F9FAFB`; single accent `--accent: #4F46E5` (primary buttons/links/active only); status — amber `#B45309` on `#FEF3C7` (attention/pending), teal `#0F766E` on `#CCFBF1` (confirmed/safe), red `#B91C1C` on `#FEE2E2` (**clinical risk / governance violation ONLY**). Generic form errors use a distinct neutral-dark error style (`#7F1D1D` + icon), never the clinical red. Color is never the sole signal — every status pairs color + icon + text.
- **Focus/motion:** 2px accent focus outline + 2px offset, always visible on keyboard focus; skip-to-content link first in tab order; respects `prefers-reduced-motion`.
- **988 crisis banner (global, both portals):** fixed strip directly below the top bar, amber, `role="region" aria-label="Crisis support"`, never dismissible, functional even with **no JWT** — two live controls `tel:988` ("Call 988") and `sms:988` ("Text 988"): *"In crisis? Call or text 988 — free, confidential, 24/7."*
- **Auth/data rules (both portals):** SPA holds the Cognito JWT and sends `Authorization: Bearer <jwt>` to `/api/x_bhuc/...`; the browser never calls ServiceNow directly and never builds LLM prompts client-side. On `401` → silent refresh, else redirect to sign-in with `?reason=session_expired`; on `403` (governance/consent violation) → show the red governance notice, do not retry.
- **Crisis-response convention (both portals):** any server response with `crisis:true` / `escalate:true` / `distress.level ∈ {elevated,crisis}` renders a **red** `role="alert(dialog)"` panel with 988 call/text first and a "Connect me now" action.

This section is a custom-build specification — ServiceNow does not ship UI screens for external patient/clinician-facing portals; these are built as SPAs against Scripted REST APIs, per Section 2.6.

### 3.2 Patient Portal — Screen Inventory & Specifications (9 Screens)

Each of the nine screens is specified for build-immediately execution: route/access, layout, a full components inventory, every input with validation microcopy, each user action mapped to an exact API call with representative JSON, empty/loading/error states, accessibility, and behavioral-health safety notes. All endpoints follow the `/api/x_bhuc/` convention (Backend Runbook §8.2); endpoints tagged **[new endpoint — add to backend]** must be added there.

#### Screen P1 — Sign-In / Sign-Up

- **Route & access:** `/signin` (also `/signup`, `/mfa`). **Unauthenticated.** Any visitor. If a valid JWT already exists → redirect to `/home` (P2). After successful auth → redirect to `returnTo` param or `/home`.

- **Purpose:** Authenticate patients via Cognito (Hosted UI / Amplify) with MFA/OTP, or let new patients create an account, while keeping crisis help reachable without login.

- **Layout & look:** Single centered card, max 480px wide, on a neutral `#F9FAFB` canvas. Top bar shows wordmark + a "Need help?" link only (no patient identity yet). 988 crisis banner sits directly under the top bar and is fully functional. Card uses serif H1 "Welcome to BHUC Care" + sans body. Segmented control (Sign in / Create account) at card top. Primary accent button full-width. Below card: small links "Forgot password", and a reassurance line "Your information is protected under HIPAA and 42 CFR Part 2." Generous 32px card padding, 24px vertical rhythm between fields.

- **Components inventory:**

| Component | Type | Label / placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Mode toggle | segmented control (2) | "Sign in" / "Create account" | Switches form fields shown | default/hover/focus/active(selected) |
| Email field | text input (email) | Label "Email address" | Validates on blur | default/focus/error/disabled |
| Password field | password input + show/hide | Label "Password" | Toggle reveals; caps-lock hint | default/focus/error/disabled |
| Confirm password | password input | Label "Confirm password" (signup only) | Match validation | default/focus/error |
| Primary submit | button (accent) | "Sign in" / "Create account" | Calls Cognito; shows spinner | default/hover/focus/disabled/loading |
| Forgot password | link | "Forgot password?" | Routes to Cognito reset flow | default/hover/focus |
| MFA/OTP field | 6-digit segmented input | Label "Enter the 6-digit code" | Auto-advance, auto-submit on 6 | default/focus/error/loading |
| Resend code | button (text) | "Resend code" | 30s cooldown timer | default/disabled(cooldown)/loading |
| SSO/Hosted-UI btn | button (secondary) | "Continue with secure sign-in" | Redirects to Cognito Hosted UI | default/hover/focus |
| Consent notice | static text | HIPAA/42 CFR line | none | — |
| Call 988 / Text 988 | link buttons (in banner) | "Call 988" / "Text 988" | `tel:` / `sms:` | default/hover/focus |

- **Inputs & validation:**
  - **Email** — required; RFC-5322 basic pattern; error: "Enter a valid email address."
  - **Password (sign in)** — required; error: "Enter your password."
  - **Password (sign up)** — required; ≥8 chars, ≥1 upper, ≥1 lower, ≥1 number, ≥1 symbol; live checklist; error: "Password must be at least 8 characters and include upper, lower, number, and symbol."
  - **Confirm password** — required; must equal password; error: "Passwords don't match."
  - **OTP** — required; exactly 6 digits; error: "Enter the 6-digit code we sent." Wrong code → "That code isn't correct. Try again or resend."

- **Actions → API calls:**
  - Auth is handled by **Cognito/Amplify SDK**, not `/api/x_bhuc`. `Auth.signIn(email, password)` → if `CONFIRMATION`/`SMS_MFA`/`SOFTWARE_TOKEN_MFA` challenge, render OTP step. `Auth.confirmSignIn(user, code, mfaType)` → on success store JWT (in memory + Amplify session), redirect.
  - `Auth.signUp({username:email, password, attributes})` → OTP confirm via `Auth.confirmSignUp`.
  - First authenticated bootstrap call: `GET /api/x_bhuc/patient/{id}/chart` (lightweight profile portion) or `GET /api/x_bhuc/appointments` to confirm token works; on `401` clear and stay.
  - **Loading:** submit button spinner + disabled; OTP auto-submit shows inline spinner.
  - **Error:** Cognito errors mapped to friendly copy (e.g. `NotAuthorizedException` → "Email or password is incorrect."; `UserNotConfirmedException` → prompt to verify). Network error → "We couldn't reach the server. Check your connection and try again."

- **Empty / loading / error states:**
  - Empty: clean form, submit disabled until required fields valid.
  - Loading: full-card subtle overlay during Hosted-UI redirect; button spinner otherwise.
  - Error: inline field errors + a card-level alert banner (non-clinical error style) summarizing the failure.

- **Accessibility notes:** OTP segmented input exposes a single logical field with `aria-label` and accepts paste; error alerts use `role="alert"`; toggle is a real `role="tablist"`; show/hide password button has `aria-pressed`. Skip link present.

- **Behavioral-health safety notes:** 988 banner functional with no JWT (critical — a person in crisis may land here unable to log in). No distress classification here (no free text). Reassurance about 42 CFR Part 2 confidentiality reduces disclosure anxiety.

---

#### Screen P2 — Digital Front Door / Home Dashboard

- **Route & access:** `/home`. **Authenticated**, role `patient`. No valid JWT → redirect `/signin?returnTo=/home`. If registration/consent incomplete → soft banner prompting P3 (not a hard block, except SUD-gated content).

- **Purpose:** A conversational "front door" (backed by the Front-Door Security Agent) plus an at-a-glance dashboard of appointments, care plan, and messages.

- **Layout & look:** Two-region layout on `lg`: left **chat column** (~7 cols) and right **dashboard rail** (~5 cols); stacks on `md`/`sm` (chat first). Top bar + 988 banner persistent. Chat column: serif H2 "How can we help today?" then a scrollable message log with alternating patient (right, accent-tinted bubble) and agent (left, neutral bubble) messages, a persistent composer pinned to bottom. Dashboard rail: three stacked cards — **Next appointment** (teal confirmed chip), **Care plan** (amber "Action needed" if tasks pending), **Messages** (unread count badge). Cards use 16px padding, 8px radius, subtle border, one clear CTA each. Warm, low-stimulation palette.

- **Components inventory:**

| Component | Type | Label / placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Chat log | chat (`role="log"`) | — | Renders turns; auto-scrolls; `aria-live="polite"` | default/loading(typing)/error |
| Message composer | textarea + send | Placeholder "Type your message…" | Enter=send, Shift+Enter=newline | default/focus/disabled/sending |
| Send button | button (accent, icon) | aria "Send message" | Posts to Front-Door endpoint | default/hover/focus/disabled/loading |
| Quick-reply chips | button group | e.g. "Book a visit", "I need to talk", "Check coverage" | Prefills/sends canned intent | default/hover/focus |
| Agent typing indicator | status | "Assistant is typing…" | animated dots | visible/hidden |
| Next-appointment card | card | "Next appointment" | CTA "View / manage" → P6 | default/empty/loading |
| Care-plan card | card | "Your care plan" | CTA "Open care plan" → P7 | default/empty/action-needed |
| Messages card | card | "Messages" + unread badge | CTA "Open inbox" → P8 | default/empty(0 unread) |
| Registration nudge | banner (amber) | "Finish registration & consent" | → P3 | shown only if incomplete |

- **Inputs & validation:**
  - **Chat message** — free text; required non-empty/trimmed to send; max 2000 chars (counter appears past 1800); no client-side content rules (classification is server-side).

- **Actions → API calls:**
  - Send chat: `POST /api/x_bhuc/intake/screening` is NOT this; use the conversational front-door endpoint. **`POST /api/x_bhuc/message`** is reserved for secure messaging (P8); the front-door chat uses **`POST /api/x_bhuc/frontdoor/chat` [new endpoint — add to backend]**.
    ```json
    { "sessionId": "fd-8f2a", "text": "I've been feeling really anxious and can't sleep" }
    ```
    - Response drives UI:
      ```json
      { "reply": "I'm really glad you reached out. …",
        "riskLevel": "elevated",
        "suggestedActions": [{"type":"book","label":"Book an urgent visit"}],
        "crisis": false }
      ```
    - If `crisis: true` (Front-Door crisis classifier fired) → UI surfaces a **red** inline crisis card above the composer: "It sounds like you may be in crisis. Call or text 988 now," with 988 call/text buttons + "Connect me to a counselor" action; message log continues.
  - Dashboard cards load in parallel on mount:
    - `GET /api/x_bhuc/appointments` → next upcoming.
    - `GET /api/x_bhuc/careplan` **[new endpoint — add to backend]** → plan summary + pending task count.
    - `GET /api/x_bhuc/messages/threads` **[new endpoint — add to backend]** → unread count.
  - **Loading:** each card shows skeleton; chat shows typing indicator while awaiting reply.
  - **Error:** card-level inline retry ("Couldn't load. Retry"); chat send failure shows the message with a "Not delivered — retry" affordance.

- **Empty / loading / error states:**
  - Empty chat: greeting message from agent pre-seeded + quick-reply chips.
  - Empty cards: "No upcoming appointments — Book a visit"; "No care plan yet"; "No messages".
  - Loading: skeletons. Error: per-region retry, never blocks the whole page.

- **Accessibility notes:** Chat log announces new agent messages via `aria-live="polite"`; crisis card uses `role="alert"` (assertive). Composer labeled; quick-reply chips are buttons with clear text. Focus returns to composer after send.

- **Behavioral-health safety notes:** Every inbound message is classified server-side by the Front-Door Security Agent; a crisis result immediately elevates the 988 messaging inline (red, icon+text). 988 banner always present above. Low-stimulation visual design; no aggressive notifications.

---

#### Screen P3 — Registration & Consent

- **Route & access:** `/registration`. **Authenticated**, role `patient`. No JWT → `/signin`. Multi-step wizard; progress persisted. SUD-related portal content stays gated until the **42 CFR Part 2** step is completed.

- **Purpose:** Collect demographics/insurance and capture legally distinct consents — **HIPAA**, a **separate 42 CFR Part 2 / SUD** consent, and **TCPA** consent-to-text — as discrete, individually recorded steps.

- **Layout & look:** Centered ~760px column with a horizontal **stepper** at top (5 steps: Personal → Insurance → HIPAA → 42 CFR Part 2 → Communication). Each step is a card with serif H2 title, plain-language body, form fields or consent text in a scrollable bordered box, and a footer with Back/Continue (accent). Consent steps show the full legal text in a `max-height` scroll region with a "must scroll to enable" pattern, an explicit checkbox, and a typed-name signature + auto date. Persistent top bar + 988 banner. Amber "in progress" chip on stepper for current step; teal check for completed.

- **Components inventory:**

| Component | Type | Label / placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Stepper | progress nav | Steps 1–5 | Click completed steps to revisit | default/current/complete/disabled |
| Legal first/last name | text inputs | "Legal first name" / "Legal last name" | validate on blur | default/focus/error |
| Date of birth | date input | "Date of birth" | not future; ≥0 yrs | default/focus/error |
| Preferred name / pronouns | text / select | "Preferred name", "Pronouns" | optional | default/focus |
| Phone (mobile) | tel input | "Mobile phone" | E.164/US format | default/focus/error |
| Address block | text inputs | street/city/state/zip | zip 5 digits | default/focus/error |
| Insurance payer | dropdown/typeahead | "Insurance carrier" | searchable | default/focus/error/empty |
| Member ID / Group | text inputs | "Member ID", "Group number" | required if insured | default/focus/error |
| "I'm uninsured/self-pay" | checkbox | — | hides insurance fields | default/checked |
| Consent scroll box | scroll region | full HIPAA / Part 2 / TCPA text | scroll-to-bottom unlocks checkbox | default/scrolled |
| Consent checkbox | checkbox | (per step, see validation) | enables signature | default/checked/disabled/error |
| Signature (typed) | text input | "Type your full legal name to sign" | must match legal name (case-insensitive) | default/focus/error |
| Consent date | read-only | auto = today | — | — |
| Download consent | link | "Download a copy (PDF)" | fetches PDF | default/loading |
| Back / Continue | buttons | "Back" / "Continue" | validate step then advance/POST | default/hover/focus/disabled/loading |

- **Inputs & validation:**
  - **Legal first/last name** — required; 1–60 chars; letters/spaces/hyphens/apostrophes; error "Enter your legal name."
  - **DOB** — required; valid date; not in future; error "Enter a valid date of birth."
  - **Mobile phone** — required; valid US/E.164; error "Enter a valid phone number." (Used for TCPA step.)
  - **Address** — street/city/state required; zip 5 digits; errors per field.
  - **Insurance** — if not self-pay: carrier + Member ID required; error "Enter your insurance details or select self-pay."
  - **HIPAA consent checkbox** — required to proceed; label: "I have read and agree to the Notice of Privacy Practices (HIPAA)."
  - **42 CFR Part 2 consent checkbox** — required, **separate**; label: "I specifically consent to the use and disclosure of my substance use disorder (SUD) treatment records as described above, under 42 CFR Part 2." Must be an affirmative, standalone opt-in; a decline path is allowed and recorded (see notes).
  - **TCPA consent checkbox** — **optional** (not required to proceed); label: "I agree to receive appointment reminders and care messages by text (TCPA). Message/data rates may apply. I can opt out anytime by replying STOP."
  - **Signature** — required on each consent step; must match legal name; error "Type your full legal name exactly as entered."
  - Scroll gate error if checkbox attempted before scroll: "Please scroll through the full document to continue."

- **Actions → API calls:**
  - Save step progress (draft): `PATCH /api/x_bhuc/registration/draft` **[new endpoint — add to backend]** on each Continue.
  - Submit each consent as a discrete record via **`POST /api/x_bhuc/consent`**, one call per consent type:
    ```json
    { "consentType": "HIPAA", "version": "2026-01", "granted": true,
      "signature": "Jordan A Rivera", "signedAt": "2026-07-05T14:22:00Z" }
    ```
    ```json
    { "consentType": "42CFR_PART2_SUD", "version": "2026-01", "granted": true,
      "scope": "treatment_coordination", "signature": "Jordan A Rivera",
      "signedAt": "2026-07-05T14:23:10Z" }
    ```
    ```json
    { "consentType": "TCPA_SMS", "version": "2026-01", "granted": false,
      "phone": "+15125550142", "signedAt": "2026-07-05T14:23:40Z" }
    ```
  - The BHUC Consent & Data Protection Agent validates server-side; response `{ "recorded": true, "consentId": "..." }` marks step teal-complete. A `403`/policy violation → **red** governance notice: "This consent could not be recorded. Please contact the front desk." (do not silently proceed).
  - Final step complete → `POST /api/x_bhuc/registration/complete` **[new endpoint]** → redirect to `/home` with success toast.
  - **Loading:** Continue button spinner; **Error:** inline retry, draft preserved.

- **Empty / loading / error states:**
  - Empty: prefilled from Cognito attributes where available (email, name).
  - Loading: skeleton for insurance carrier typeahead results.
  - Error: field-level + step-level; consent POST failure keeps user on step.

- **Accessibility notes:** Stepper is `role="list"` with `aria-current="step"`; consent scroll regions are focusable with keyboard scrolling and a visible "You've reached the end" marker (not color-only); checkboxes tied to full legal label; signature match error announced via `role="alert"`.

- **Behavioral-health safety notes:** The **42 CFR Part 2 SUD consent is a physically separate step and separate API record** from HIPAA — never bundled into one checkbox. Declining Part 2 is permitted and recorded (`granted:false`), and the UI explains that SUD-specific portal features may be limited without it, without penalizing access to crisis help. 988 banner persists throughout.

---

#### Screen P4 — Intake Screening

- **Route & access:** `/intake/screening`. **Authenticated**, role `patient`. No JWT → `/signin`. Save-and-resume supported (draft per instrument). Deep-linkable per instrument, e.g. `/intake/screening?instrument=phq9`.

- **Purpose:** Administer validated instruments **one at a time** (C-SSRS, PHQ-9, GAD-7); on submit, trigger the BHUC Risk Identification Agent for scoring.

- **Layout & look:** Single focused ~720px column — deliberately minimal to reduce cognitive load. Top: serif H2 with instrument name + a linear progress bar ("Question 3 of 9"). One question per screen (or a clean vertical list within one instrument, but never mixing instruments). Each item is a large-target radio group with generous spacing (16–24px between options). Sticky footer: Back / Save & finish later / Next (accent). C-SSRS renders first when required and branches (positive item 2 reveals items 3–6). Calm neutral palette; no red used decoratively. Persistent top bar + 988 banner.

- **Components inventory:**

| Component | Type | Label / placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Instrument header | heading + progress | "PHQ-9 · Question 3 of 9" | updates per item | — |
| Question item | radio group | item text + scaled options | single-select; branch logic (C-SSRS) | default/focus/selected/error |
| PHQ-9 / GAD-7 options | radio (0–3) | "Not at all / Several days / More than half the days / Nearly every day" | numeric value stored | default/selected/focus |
| C-SSRS options | radio (Yes/No) + branch | per C-SSRS item | positive triggers reveal | default/selected/focus |
| Save & finish later | button (secondary) | "Save & finish later" | persists draft, returns to /home | default/hover/focus/loading |
| Back / Next | buttons | "Back" / "Next" | nav within instrument | default/disabled/focus |
| Submit | button (accent) | "Submit screening" | POST → Risk Agent | default/hover/focus/disabled/loading |
| Resume banner | banner (amber) | "You have an unfinished screening" | resumes draft | shown if draft exists |
| Progress bar | progress | aria-valuenow | reflects completion | — |

- **Inputs & validation:**
  - Every displayed item — **required** before Next/Submit; error (inline, non-clinical style): "Please select an answer to continue."
  - C-SSRS branch items — required only when revealed.
  - No free-text scoring inputs client-side. Optional free-text "anything else you'd like us to know" (max 1000 chars) at end — server-classified.
  - Instrument order enforced: if C-SSRS is required for the visit type, it must be completed before PHQ-9/GAD-7 unlock.

- **Actions → API calls:**
  - Save draft (autosave on each answer + explicit save): `PATCH /api/x_bhuc/intake/screening/draft` **[new endpoint — add to backend]**:
    ```json
    { "instrument": "phq9", "sessionId": "scr-77", "answers": {"q1":2,"q2":3,"q3":1} }
    ```
  - Submit instrument: **`POST /api/x_bhuc/intake/screening`**:
    ```json
    { "instrument": "phq9", "sessionId": "scr-77",
      "answers": {"q1":2,"q2":3,"q3":1,"q4":2,"q5":1,"q6":0,"q7":1,"q8":0,"q9":0},
      "completedAt": "2026-07-05T14:40:00Z" }
    ```
    - Response (Risk Agent scored it server-side):
      ```json
      { "instrument":"phq9","score":10,"severity":"moderate",
        "flags":["item9_positive"], "nextInstrument":"gad7", "escalate":false }
      ```
    - UI reaction: if `nextInstrument` present → advance to it. If `escalate:true` OR a C-SSRS positive high-risk / PHQ-9 item 9 positive → show **red** crisis interstitial: "Thank you for your honesty. Your safety matters — please call or text 988 now, or tap to connect with a counselor," with 988 controls + "Connect me now" (opens P8/urgent path). **Do not** show a raw score to the patient for high-risk items; scores are clinician-facing.
  - **Loading:** Submit spinner + non-blocking "Scoring your responses…". **Error:** submission failure preserves answers, offers retry; never loses data.

- **Empty / loading / error states:**
  - Empty: instrument intro screen ("This next set of questions helps us understand how you've been feeling over the last 2 weeks.") + Start.
  - Loading: skeleton on resume; scoring spinner on submit.
  - Error: retry with preserved draft; if scoring endpoint down, save answers and show "We saved your answers and will process them shortly."

- **Accessibility notes:** Each question is a `fieldset`/`legend` radio group; progress bar has `aria-valuenow/min/max`; branch reveals announced via `aria-live`; large touch targets (≥44px); no time limits. Crisis interstitial `role="alert"`, focus moved to it, 988 button first in focus order.

- **Behavioral-health safety notes:** This is the highest-risk screen. C-SSRS positive responses and PHQ-9 item 9 (self-harm) trigger the server-side Risk Agent escalation and an immediate red 988 interstitial with one-tap counselor connect. Patient-facing UI avoids alarming score reveals for risk items. 988 banner persists. Autosave ensures a distressed patient never loses progress.

---

#### Screen P5 — Eligibility & Coverage Status

- **Route & access:** `/coverage`. **Authenticated**, role `patient`. No JWT → `/signin`. Requires registration/insurance step; if missing → nudge to P3.

- **Purpose:** Show insurance eligibility status, an estimated out-of-pocket cost for BHUC services, and an escalation path to a financial counselor.

- **Layout & look:** ~840px column. A prominent **status card** at top spanning full width: large status chip (teal "Active coverage", amber "Verification pending", or red only if a hard governance/coverage-block exists — otherwise amber/neutral for "Not covered / self-pay"), payer name, plan, effective dates. Below: an **estimated cost** card (itemized: visit type, estimated allowed amount, your estimated responsibility, "estimate only" disclaimer). Bottom: a **financial counselor** escalation card with CTA. 8px radius cards, 16px padding, icon+label status. Persistent top bar + 988 banner.

- **Components inventory:**

| Component | Type | Label / placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Coverage status card | card + status chip | "Coverage status" | shows payer, plan, dates | active(teal)/pending(amber)/self-pay(neutral)/error |
| Re-verify button | button (secondary) | "Re-check coverage" | re-runs eligibility | default/hover/focus/loading |
| Estimated cost card | card | "Estimated cost for your visit" | itemized breakdown | default/loading/unavailable |
| Cost disclaimer | static text | "This is an estimate, not a bill." | — | — |
| Update insurance | link | "Update insurance info" → P3 | routes to insurance step | default/hover/focus |
| Talk to counselor CTA | button (accent) | "Talk to a financial counselor" | creates escalation request | default/hover/focus/loading/success |
| Escalation confirmation | inline banner (teal) | "A counselor will reach out within 1 business day." | after request | hidden/shown |

- **Inputs & validation:**
  - No free-form inputs primarily. Optional escalation note textarea (max 500 chars): "Anything you'd like the counselor to know? (optional)".

- **Actions → API calls:**
  - Load on mount: `GET /api/x_bhuc/eligibility` **[new endpoint — add to backend]**:
    ```json
    { "status":"active","payer":"Blue Shield","plan":"PPO 500",
      "effectiveDate":"2026-01-01","termDate":null,
      "estimate":{"visitType":"urgent_behavioral","allowedAmount":220.00,
      "patientResponsibility":40.00,"currency":"USD","asOf":"2026-07-05"} }
    ```
  - Re-check: `POST /api/x_bhuc/eligibility/verify` **[new endpoint — add to backend]** `{ }` → updates status card; loading skeleton meanwhile.
  - Talk to counselor: `POST /api/x_bhuc/priorauth` is for prior auth; escalation uses **`POST /api/x_bhuc/financial-counselor/request` [new endpoint — add to backend]**:
    ```json
    { "reason":"cost_estimate_help","note":"Worried about affording the visit","preferredContact":"phone" }
    ```
    → response `{ "requestId":"fc-231","sla":"1_business_day" }` drives teal confirmation banner.
  - Prior-auth context (if a service needs it) surfaced from **`POST /api/x_bhuc/priorauth`** status; display "Prior authorization: approved/pending" chip when relevant.
  - **Loading:** skeletons on status + cost. **Error:** "We couldn't verify your coverage right now" with retry + always-visible counselor CTA.

- **Empty / loading / error states:**
  - Empty (no insurance on file): neutral card "No insurance on file — you may be eligible for self-pay pricing" + "Add insurance" + counselor CTA.
  - Loading: skeleton cards.
  - Error: non-blocking, counselor escalation always available.

- **Accessibility notes:** Status chip conveys state via icon + text + color (never color alone); cost breakdown is a semantic table with header cells; escalation success announced via `aria-live`.

- **Behavioral-health safety notes:** Cost anxiety is a known barrier to behavioral health care; the counselor escalation is always visible even on error. 988 banner persists. Reassuring, non-punitive microcopy around uninsured/self-pay.

---

#### Screen P6 — Appointments

- **Route & access:** `/appointments`. **Authenticated**, role `patient`. No JWT → `/signin`. Reschedule/booking sub-flows at `/appointments/book`, `/appointments/{id}/reschedule`.

- **Purpose:** View upcoming and past appointments and book/reschedule visits using availability surfaced by the Scheduling Agent.

- **Layout & look:** ~960px column. Tabs: **Upcoming** / **Past**. Upcoming: stacked appointment cards (date/time bold serif, visit type, modality in-person/telehealth, provider, teal "Confirmed" chip or amber "Pending" chip), each with "Reschedule" and "Cancel" actions and a "Join telehealth" accent button when applicable. Prominent "Book a visit" accent button top-right. Booking flow: right-side panel/modal with a date picker + agent-suggested time slots as selectable chips. Persistent top bar + 988 banner.

- **Components inventory:**

| Component | Type | Label / placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Upcoming/Past tabs | tablist | "Upcoming" / "Past" | switch list | default/current |
| Appointment card | card + status chip | date, type, provider | expandable details | confirmed(teal)/pending(amber)/canceled |
| Book a visit | button (accent) | "Book a visit" | opens booking flow | default/hover/focus/loading |
| Visit-type select | dropdown | "Type of visit" | filters availability | default/focus/error |
| Modality toggle | segmented | "In person" / "Telehealth" | filters slots | default/selected |
| Date picker | calendar | "Choose a date" | loads slots for date | default/focus/loading/empty |
| Time-slot chips | button group | e.g. "10:00 AM" | select slot | default/hover/focus/selected/disabled(taken) |
| Confirm booking | button (accent) | "Confirm appointment" | POST booking | default/loading/disabled |
| Reschedule | button (secondary) | "Reschedule" | opens slot picker prefilled | default/hover/focus |
| Cancel | button (text/danger-neutral) | "Cancel appointment" | confirm dialog | default/hover/focus/loading |
| Join telehealth | button (accent) | "Join telehealth" | opens video link (enabled ~15min prior) | default/disabled(too early) |
| Confirmation toast | toast (teal) | "You're booked for …" | after success | — |

- **Inputs & validation:**
  - **Visit type** — required to load slots; error "Select a visit type."
  - **Date** — required; not in past; error "Choose a valid date."
  - **Time slot** — required to confirm; error "Select a time."
  - **Cancel reason** — optional dropdown (No longer needed / Scheduling conflict / Feeling better / Other) + optional note (max 300).

- **Actions → API calls:**
  - Load list: **`GET /api/x_bhuc/appointments`** → `{ "upcoming":[…], "past":[…] }` each item `{id, start, end, type, modality, provider, status, telehealthUrl}`.
  - Load availability (Scheduling Agent): `GET /api/x_bhuc/appointments/availability?type=urgent_behavioral&date=2026-07-08&modality=telehealth` **[new endpoint — add to backend]** → `{ "slots":[{"start":"2026-07-08T10:00:00Z","slotId":"s1"}] }`.
  - Book: `POST /api/x_bhuc/appointments` **[new endpoint — add to backend, same convention]**:
    ```json
    { "slotId":"s1","type":"urgent_behavioral","modality":"telehealth" }
    ```
    → `{ "id":"appt-88","status":"confirmed","start":"…" }` → teal toast + card appears.
  - Reschedule: `POST /api/x_bhuc/appointments/{id}/reschedule` **[new endpoint]** `{ "slotId":"s4" }`.
  - Cancel: `POST /api/x_bhuc/appointments/{id}/cancel` **[new endpoint]** `{ "reason":"feeling_better","note":"" }` → confirm modal first.
  - **Loading:** slot grid skeleton; card action spinners. **Error:** "Those times just changed — here are updated options" on slot conflict (409), auto-refresh availability.

- **Empty / loading / error states:**
  - Empty upcoming: illustration + "No upcoming appointments" + "Book a visit".
  - Empty past: "No past appointments yet."
  - Empty slots: "No times available for this date — try another day" + suggested next available (from agent).
  - Loading: skeleton cards/slots. Error: retry.

- **Accessibility notes:** Tabs are proper `role="tablist"`; slot chips are `role="radio"` within a `radiogroup`; calendar keyboard-navigable with arrow keys; status chips icon+text; cancel uses a focus-trapped confirm dialog returning focus to trigger.

- **Behavioral-health safety notes:** For urgent behavioral visits, if no near-term slot exists, surface a message: "Need help sooner? Call or text 988, or message your care team," with 988 controls. 988 banner persists. Cancellation reason "Feeling better" does not suppress crisis resources.

---

#### Screen P7 — Care Plan & Discharge Instructions

- **Route & access:** `/care-plan`. **Authenticated**, role `patient`. No JWT → `/signin`. Only shows finalized content (clinician-finalized).

- **Purpose:** Present a plain-language care plan, the clinician-finalized safety plan, medications, and downloadable discharge instructions (PDF).

- **Layout & look:** ~840px column with anchored section nav (sticky left mini-TOC on `lg`): **Summary**, **Safety plan**, **Medications**, **Next steps**, **Discharge instructions**. Sections are cards with serif H2 headers and plain-language body (reading-level conscious). Safety plan rendered as a clearly styled, calm bordered card (teal accent for "your plan" — NOT red) listing warning signs, coping steps, contacts, and 988/crisis line pinned at top of that card. Medications as a semantic table (name, dose, schedule, purpose in plain language). A persistent "Download PDF" accent button top-right. Top bar + 988 banner persistent.

- **Components inventory:**

| Component | Type | Label / placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Section TOC | nav list | section names | scrolls to section | default/current |
| Summary card | card | "Your care plan summary" | read-only | default/empty |
| Safety plan card | card | "Your safety plan" | read-only; 988 pinned | default/empty(not finalized) |
| Medications table | table | name/dose/schedule/purpose | read-only; expandable purpose | default/empty |
| Next steps list | checklist (read/ack) | tasks + due dates | mark acknowledged | default/acknowledged |
| Download PDF | button (accent) | "Download discharge instructions (PDF)" | fetches signed PDF | default/hover/focus/loading/error |
| Print | button (secondary) | "Print" | window.print styled sheet | default/focus |
| Questions CTA | button (secondary) | "Message my care team" → P8 | opens messaging | default/hover/focus |
| Not-finalized notice | banner (amber) | "Your care plan is being finalized." | shown pre-finalization | conditional |

- **Inputs & validation:**
  - Mostly read-only. Optional "Acknowledge next steps" checkboxes (no free text required). Acknowledgement is optional but recorded.

- **Actions → API calls:**
  - Load: **`GET /api/x_bhuc/careplan`** **[new endpoint — add to backend]**:
    ```json
    { "status":"finalized","finalizedAt":"2026-07-04T18:00:00Z",
      "summary":"…plain language…",
      "safetyPlan":{"warningSigns":["…"],"copingSteps":["…"],
        "supportContacts":[{"name":"…","phone":"…"}],"crisisLine":"988"},
      "medications":[{"name":"Sertraline","dose":"50 mg","schedule":"once daily (morning)","purpose":"helps with depression and anxiety"}],
      "nextSteps":[{"id":"n1","text":"Follow-up visit in 7 days","dueDate":"2026-07-11","acknowledged":false}],
      "pdfUrl":"/api/x_bhuc/careplan/pdf" }
    ```
  - Download PDF: `GET /api/x_bhuc/careplan/pdf` **[new endpoint]** → streams `application/pdf` (server-generated, JWT-auth). Loading spinner on button; error toast on failure.
  - Acknowledge step: `POST /api/x_bhuc/careplan/acknowledge` **[new endpoint]** `{ "stepId":"n1" }` → teal check.
  - If `status != finalized` → show amber not-finalized notice, hide medications/safety plan sections until finalized.
  - **Loading:** section skeletons. **Error:** per-section retry; PDF error non-blocking.

- **Empty / loading / error states:**
  - Empty/not finalized: amber notice "Your care team is finalizing your plan — you'll be notified. In the meantime, if you're in crisis, call or text 988."
  - Loading: skeleton sections.
  - Error: retry per section.

- **Accessibility notes:** TOC uses `aria-current`; medications is a real `<table>` with `<th scope>`; safety-plan contacts are `tel:` links; PDF button announces loading; print stylesheet high-contrast. Plain-language content targets ~6th–8th grade reading level.

- **Behavioral-health safety notes:** The **clinician-finalized safety plan** is prominent, with 988/crisis contacts pinned at the top of the safety card AND the global banner. Safety plan styled in calm teal (not red — red reserved for active clinical risk states). One-tap "Message my care team" for non-urgent questions routes to P8 which reinforces 988 for emergencies.

---

#### Screen P8 — Secure Messaging

- **Route & access:** `/messages` (thread view `/messages/{threadId}`). **Authenticated**, role `patient`. No JWT → `/signin`.

- **Purpose:** Threaded, asynchronous secure messaging with the care team; every message is server-side distress-classified; reinforces that messaging is non-emergency and 988 is for crises.

- **Layout & look:** Two-pane on `lg`: left **thread list** (~4 cols; each row shows subject, last message preview, timestamp, unread dot), right **conversation** (~8 cols; message bubbles chronological, care-team left/neutral, patient right/accent-tinted, timestamps, read receipts). Composer pinned at bottom with a persistent **non-emergency notice** strip above it (amber, icon+text): "Messages aren't monitored 24/7. If this is an emergency, call or text 988." Collapses to single pane on `sm` (list → thread). Top bar + 988 banner persistent.

- **Components inventory:**

| Component | Type | Label / placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Thread list | list | thread rows | select opens thread | default/hover/selected/unread |
| New message | button (accent) | "New message" | opens compose (recipient=care team) | default/hover/focus |
| Recipient select | dropdown | "To: Care team" | usually fixed to care team | default/focus/disabled |
| Subject | text input | "Subject" | required on new thread | default/focus/error |
| Message body | textarea | "Type your message…" | Enter=newline, Send button | default/focus/error/sending |
| Send | button (accent) | "Send" | POST message | default/hover/focus/disabled/loading |
| Attachment | file input | "Attach a file" | allowed types/size | default/focus/error |
| Non-emergency notice | banner (amber) | "Messages aren't monitored 24/7…" | static; 988 links | persistent |
| Distress response card | inline card (red) | (server-triggered) | shows if classifier flags distress | hidden/shown |
| Read receipt | status text | "Read 2:14 PM" | after care-team read | — |

- **Inputs & validation:**
  - **Subject** (new thread only) — required; 3–120 chars; error "Add a short subject."
  - **Message body** — required; trimmed non-empty; max 4000 chars (counter past 3500); error "Type a message before sending."
  - **Attachment** — optional; allowed `pdf,jpg,png`; ≤10MB; error "Only PDF/JPG/PNG up to 10MB."

- **Actions → API calls:**
  - Load threads: `GET /api/x_bhuc/messages/threads` **[new endpoint — add to backend]** → list. Load thread: `GET /api/x_bhuc/messages/threads/{id}` **[new endpoint]**.
  - Send: **`POST /api/x_bhuc/message`**:
    ```json
    { "threadId":"th-12","subject":"Question about my medication",
      "body":"Is it okay to take my dose at night instead?", "attachments":[] }
    ```
    - Response after server-side distress classification:
      ```json
      { "messageId":"m-90","threadId":"th-12","status":"sent",
        "distress":{"level":"none"} }
      ```
    - If `distress.level` is `elevated`/`crisis` → render **red** inline distress response card immediately: "It sounds like you may be going through something serious. Messaging isn't monitored in real time — please call or text 988 now, or tap to connect with a counselor," with 988 controls + "Connect me now." Message is still stored/flagged for the care team.
  - Optimistic send with "Sending…" then confirmed; failure → "Not sent — retry."
  - **Loading:** thread skeletons, composer disabled while sending. **Error:** retry affordance on the failed bubble.

- **Empty / loading / error states:**
  - Empty inbox: "No messages yet — start a conversation with your care team" + New message. Non-emergency notice still shown.
  - Empty thread: shows composer only.
  - Loading: skeleton rows/bubbles. Error: retry.

- **Accessibility notes:** Message list `role="log"` `aria-live="polite"` for new incoming; distress card `role="alert"` (assertive) with focus moved to it and 988 first in focus order; unread conveyed by dot + bold text + `aria-label` (not color alone); composer labeled; attachment errors announced.

- **Behavioral-health safety notes:** **Every** outbound (and inbound) message is distress-classified server-side; a flag triggers the red 988 escalation card without blocking delivery. Persistent non-emergency notice above composer plus global 988 banner ensures crisis routing is never ambiguous.

---

#### Screen P9 — Follow-Up & Check-In

- **Route & access:** `/check-in` (deep-linkable from a reminder: `/check-in?id=chk-55`). **Authenticated**, role `patient`. No JWT → `/signin?returnTo=…`.

- **Purpose:** Deliver post-discharge check-in prompts (how are you doing since your visit) and provide a prominent one-tap escalation to crisis support at any point.

- **Layout & look:** Single focused ~640px column, warm and low-stimulation. Serif H2 "How have you been since your visit?" A short card-based check-in: a mood/wellbeing scale (large emoji-optional radio or 0–10 slider with labels), 1–2 brief follow-up questions (e.g. "Are you taking your medications as prescribed?", "Have you had thoughts of harming yourself?"), and a big, always-visible **"I need help now"** escalation button in accent (opening red 988 crisis panel). Sticky footer: Submit check-in. A completion state thanks the patient and shows next check-in date. Top bar + 988 banner persistent.

- **Components inventory:**

| Component | Type | Label / placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Wellbeing scale | radio/slider (0–10) | "Overall, how are you feeling today?" (0 = worst, 10 = best) | select value | default/focus/selected |
| Medication adherence | radio | "Are you taking your medications as prescribed?" (Yes/Mostly/No/N-A) | select | default/selected/focus |
| Self-harm check | radio | "In the past few days, have you had thoughts of harming yourself?" (No / Yes) | "Yes" triggers escalation | default/selected/focus |
| Free-text note | textarea | "Anything you'd like your care team to know? (optional)" | server-classified | default/focus |
| I need help now | button (accent, prominent) | "I need help now" | opens red 988 crisis panel | default/hover/focus |
| Crisis panel | modal/panel (red) | 988 call/text + connect counselor | one-tap actions | hidden/shown |
| Submit check-in | button (accent) | "Submit check-in" | POST | default/hover/focus/disabled/loading |
| Completion card | card (teal) | "Thanks for checking in." + next date | after submit | hidden/shown |

- **Inputs & validation:**
  - **Wellbeing scale** — required; error "Let us know how you're feeling to continue."
  - **Medication adherence** — required (unless no meds → N/A auto).
  - **Self-harm check** — required; a "Yes" does not block submit but immediately triggers crisis escalation UI.
  - **Free-text note** — optional; max 1000 chars; classified server-side.

- **Actions → API calls:**
  - Load prompt: `GET /api/x_bhuc/checkin/{id}` **[new endpoint — add to backend]** → `{ "id":"chk-55","questions":[…],"dueDate":"…" }`.
  - Submit: `POST /api/x_bhuc/checkin/{id}` **[new endpoint — add to backend]**:
    ```json
    { "wellbeing":4, "medAdherence":"mostly", "selfHarmThoughts":"no",
      "note":"", "submittedAt":"2026-07-05T15:10:00Z" }
    ```
    - Server (Risk Identification Agent re-scores / classifies note) responds:
      ```json
      { "recorded":true, "escalate":false, "nextCheckIn":"2026-07-12" }
      ```
    - If `escalate:true` (self-harm "Yes", low wellbeing threshold, or note classified as distress) → red crisis panel auto-opens: "Thank you for being honest. Please call or text 988 now, or connect with a counselor," + 988 controls + "Connect me now" (routes to urgent messaging/telehealth). Care team notified server-side.
  - One-tap "I need help now" is available before/without submitting and does not require the form to be valid.
  - **Loading:** submit spinner. **Error:** preserve answers, retry; if submission fails but self-harm=Yes, crisis panel still shows client-side (fail-safe).

- **Empty / loading / error states:**
  - Empty (no active check-in): "You have no check-ins right now — we'll let you know when your next one is due." + link to care plan.
  - Loading: skeleton form.
  - Error: retry with preserved answers; crisis path always available.

- **Accessibility notes:** Scale as labeled radio group or slider with `aria-valuetext` describing the number's meaning; "I need help now" is a large (≥44px), high-contrast, always-reachable button early in tab order; crisis panel `role="alertdialog"`, focus-trapped, 988 first; self-harm question uses neutral, non-stigmatizing wording.

- **Behavioral-health safety notes:** Highest-sensitivity post-discharge touchpoint. Self-harm response, low wellbeing, or distress-classified free text trigger immediate escalation with server-side care-team notification, and a fail-safe client-side crisis panel even if the network call fails. 988 banner + prominent "I need help now" button ensure escalation is never more than one tap away.

---

### 3.3 Clinician Portal — Screen Inventory & Specifications (8 Screens)

The eight clinician screens follow the same build-immediately structure, and additionally specify the **Supervised-mode blocking gates** (C4 Risk Confirmation, C5 Ambient Documentation Sign) and **server-enforced 42 CFR Part 2 masking** (C3, C6) in the UI.

#### Screen C1 — Sign-In (MFA-enforced)

##### Route & access
- **URL:** `/signin` (also catch-all: any unauthenticated route redirects here preserving `?returnTo=`).
- **Roles:** none required (pre-auth) — but there is **no anonymous app path**; success requires a clinician Cognito account.
- **MFA:** MANDATORY. Cognito user pool enforces MFA (TOTP/SMS) for clinician group; no path bypasses the MFA challenge.
- **Redirect behavior:** On existing valid session → `returnTo` or `/worklist`. On success → `returnTo` or `/worklist`. On sign-out or expiry → back here.

##### Purpose
Authenticate a clinician via AWS Cognito Hosted UI / Amplify with mandatory MFA, establishing the JWT the SPA uses for all backend calls.

##### Layout & look
- Full-viewport centered card (max-width 440px), neutral `--surface` background with a faint serif BHUC lockup above the card.
- Card (`--bg`, 8px radius, subtle shadow) uses a single column; internal padding `space-4` (32px).
- Heading `h1` serif "Clinician Sign-In". Sub-line body-sm muted: "Secure access — multi-factor authentication required."
- Primary action button in accent color, full width. Below it a small teal "safe" note with a lock icon: "HIPAA-secured session."
- Footer caption: support contact + build/version.
- This screen may delegate entirely to **Cognito Hosted UI**; if using Amplify Authenticator embedded, style tokens map to the palette above (accent buttons, neutral fields, red-with-icon errors).

##### Components inventory
| Component | Type | Label/placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Email field | text/email input | Label "Work email" / placeholder "you@bhuc.org" | Amplify sign-in step 1 | default/focus/error/disabled(loading) |
| Password field | password input + show/hide toggle | "Password" | toggle reveals text; caps-lock hint | default/focus/error/disabled |
| Sign-in button | primary button (accent) | "Sign in" | triggers Cognito auth; shows spinner | default/hover/focus/loading/disabled |
| MFA code field | one-time-code input (6 digits, `inputmode=numeric autocomplete=one-time-code`) | "Authentication code" | appears at MFA challenge step | default/focus/error/disabled |
| Verify button | primary button | "Verify" | submits MFA code | default/hover/focus/loading/disabled |
| Resend/Use another factor | text link(s) | "Resend code" / "Use a different method" | re-issues challenge | default/hover/focus/disabled(cooldown) |
| Forgot password | text link | "Forgot password?" | Cognito forgot-password flow | default/hover/focus |
| Show/hide password | icon toggle button | aria-label "Show password"/"Hide password" | toggles field type | default/hover/focus |
| Error banner | alert region | — | shows auth errors | error only |

##### Inputs & validation
- **Email:** email, required. Rule: valid RFC-5322-ish + non-empty. Error: "Enter your work email address."
- **Password:** required, non-empty (complexity enforced server-side by Cognito). Error: "Enter your password."
- **MFA code:** required, exactly 6 digits numeric. Error: "Enter the 6-digit code from your authenticator app."
- Generic auth failure (Cognito `NotAuthorizedException`): "Email or password is incorrect." (Do not disclose which.)
- MFA failure (`CodeMismatchException`): "That code didn't match. Try again or resend."
- Expired code (`ExpiredCodeException`): "That code expired. We sent a new one."
- Locked (`TooManyRequestsException`): "Too many attempts. Try again in a few minutes."

##### Actions → API calls
- Auth is handled by **Amplify Auth / Cognito**, not `/api/x_bhuc`. Sequence:
  1. `Auth.signIn({username,password})` → if `nextStep = CONFIRM_SIGN_IN_WITH_TOTP_CODE` render MFA field.
  2. `Auth.confirmSignIn({challengeResponse: code})` → on success `fetchAuthSession()` stores JWT.
  3. First authenticated navigation calls `GET /api/x_bhuc/worklist` to warm the dashboard.
- **Loading:** buttons show inline spinner + disable form.
- **Error:** map Cognito exceptions to microcopy above; render in red alert banner with warning icon (color + icon + text).

##### Empty / loading / error states
- Loading: full-card spinner overlay during redirect/session bootstrap ("Securing your session…").
- Error: banner at top of card; fields retain values except password/MFA cleared on failure.
- No empty state (always shows the form).

##### Accessibility notes
- `autocomplete`: `username`, `current-password`, `one-time-code`.
- Errors linked via `aria-describedby`; banner `role="alert"`.
- Focus moves to MFA field when challenge appears; focus to first error on failure.
- Session-timeout chrome not shown pre-auth.

---

#### Screen C2 — Clinical Worklist / Dashboard

##### Route & access
- **URL:** `/worklist` (default authenticated landing).
- **Roles:** any clinician role (MD, DO, PMHNP, PA, LCSW, RN triage). Role affects which columns/actions are enabled (e.g., only prescribers see order shortcuts).
- **MFA:** inherited from session (must be MFA-authenticated).
- **Redirect:** unauthenticated → `/signin?returnTo=/worklist`.

##### Purpose
Present the clinician's patient queue ordered by AI risk stratification, surfacing which patients **require the clinician's confirmation** so nothing AI-drafted stalls unreviewed.

##### Layout & look
- 12-col: left **filter/segment rail** (3 cols, collapses to drawer <1024px), main **worklist table** (9 cols).
- Page header row: `h1` serif "Worklist" + right-aligned summary chips: "Requires your confirmation: N" (amber), "High risk: N" (red), "Total: N" (neutral).
- Table is a `role="table"` data grid, zebra-free, 56px rows, tabular numerals for scores. Sticky header row.
- **Risk band cell** is the visual anchor: a shaped pill — HIGH = red pill with a solid triangle icon + "HIGH"; MODERATE = amber pill with a diamond icon + "MOD"; LOW = teal pill with a dot icon + "LOW". Word + icon + color together.
- **Confidence** shown as a compact bar + numeric % (e.g., "0.86") in muted data type; tooltip "Model confidence in this stratification."
- **"Requires your confirmation"** flag: amber inline tag with an exclamation icon + text "Confirm risk"; renders as the row's call-to-action.
- Row hover raises surface tint; entire row is a link to C3, but the confirm tag is a distinct button (deep-links to C4).

##### Components inventory
| Component | Type | Label/placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Segment filter | segmented control | "My patients" / "Unassigned" / "All" | refetch worklist scope | default/hover/focus/selected/disabled |
| Risk filter | checkbox group | "High" "Moderate" "Low" | client-side filter | default/focus/checked |
| "Requires confirmation only" | toggle switch | "Needs my confirmation" | filters to `requiresConfirmation=true` | default/focus/on/off |
| Sort control | dropdown | "Sort: Risk (high→low)" default; also "Wait time", "Arrival" | resort | default/hover/focus/open |
| Search-in-list | text input | "Filter by name or MRN" | client filter | default/focus |
| Refresh | icon button | aria-label "Refresh worklist" | re-GET; also auto-poll 60s | default/hover/focus/loading |
| Worklist row | table row / link | — | navigate to `/patient/{id}` | default/hover/focus/loading(skeleton) |
| Risk band pill | status pill (non-interactive) | "HIGH/MOD/LOW" | tooltip with contributing-factor count | default |
| Confidence meter | meter | "0.00–1.00" | tooltip | default |
| Confirm-risk tag | button (amber) | "Confirm risk" | deep-link `/patient/{id}/risk` (C4) | default/hover/focus/disabled(already confirmed→teal "Confirmed") |
| Assign to me | button | "Assign to me" (Unassigned tab) | claims patient | default/hover/focus/loading/disabled |
| Pagination | buttons | "Previous"/"Next" + page count | paged fetch | default/hover/focus/disabled |

##### Inputs & validation
- No free-text write inputs beyond filter/search (client-only, no validation gating).
- Sort/filter persisted to URL query (`?scope=mine&risk=high,mod&needsConfirm=1&sort=risk_desc`) so state is shareable/back-button safe.

##### Actions → API calls
- **Load / refresh:** `GET /api/x_bhuc/worklist?scope=mine&sort=risk_desc&page=1&pageSize=25`
  - Representative response:
    ```json
    {
      "items": [
        {
          "patientId": "PT-10231",
          "displayName": "R. Alvarez",
          "mrn": "MRN-88213",
          "age": 34,
          "arrivalTime": "2026-07-05T13:12:00Z",
          "riskBand": "HIGH",
          "riskScore": 0.91,
          "confidence": 0.86,
          "requiresConfirmation": true,
          "chiefComplaint": "SI with plan",
          "assignedTo": "me",
          "part2Involved": true
        }
      ],
      "counts": { "requiresConfirmation": 4, "high": 3, "total": 18 },
      "page": 1, "pageSize": 25, "total": 18
    }
    ```
  - Drives: table rows, header count chips, band pills, confidence meters, confirm tags.
- **Assign to me:** `POST /api/x_bhuc/worklist/assign` `{ "patientId":"PT-10231" }` **[new endpoint — add to backend]** → optimistic move to "My patients".
- **Auto-poll:** every 60s silent `GET`; show subtle "Updated" toast if the set changed; never auto-reorder while a row menu is open.
- **Loading:** skeleton rows (8) on first load.
- **Error:** inline table error state with retry; 403 → "You don't have a worklist assigned" panel.

##### Empty / loading / error states
- **Empty:** illustration + "No patients in this view" + hint to change segment/filters. If "Needs my confirmation" toggle on and empty: teal check + "You're all caught up — nothing awaits your confirmation."
- **Loading:** skeleton grid; header chips show shimmer.
- **Error:** red-bordered panel with icon + "Couldn't load the worklist" + correlationId + Retry.

##### Accessibility notes
- Grid uses proper `role="table"/row/columnheader/cell`; sortable headers expose `aria-sort`.
- Confirm-risk tags have descriptive names: `aria-label="Confirm risk for R. Alvarez, high band"`.
- Risk change during poll announced politely: "3 patients now high risk."
- Confidence meter: `role="meter" aria-valuenow aria-valuemin=0 aria-valuemax=1`.

---

#### Screen C3 — Patient Summary / Chart

##### Route & access
- **URL:** `/patient/{id}` (tabs as `#summary`, `#history`, `#meds`, `#documents`).
- **Roles:** any clinician on the care team; field-level visibility governed server-side by role + consent (Part 2 ACLs).
- **MFA:** session required.
- **Redirect:** 403 on non-care-team access → "Access restricted" panel with request-access link.

##### Purpose
Consolidated patient chart with an AI-generated summary (with source citations); 42 CFR Part 2 / SUD-protected fields render **masked** unless the backend returns them.

##### Layout & look
- Header band: patient name (serif h2), MRN, age/DOB, allergies (red-icon chip if present), care-team, and a **risk band chip** mirroring C2. Right side: quick actions (Confirm Risk → C4, Start Note → C5, Orders → C6, Disposition → C7).
- Below header: **AI Chart Summary card** spanning 12 cols — serif h3 "AI Chart Summary" + amber "Draft — verify against source" tag. Body is generated prose; **every clinical claim carries an inline citation chip** `[1]` that on click opens a source drawer (which encounter/lab/note produced it). Footer note: "Generated server-side. Not a substitute for chart review."
- Two-column body: left (8 cols) tabbed detail — Problems, Medications, Encounters, Labs/Vitals, Documents; right (4 cols) rail — Consents & Part 2 status, Care team, Insurance snapshot.
- **Masked Part 2 fields** render as a slate-gray locked chip: a lock icon + "Protected (42 CFR Part 2)" + text "Consent required to view." No value, no toggle, no client un-mask.

##### Components inventory
| Component | Type | Label/placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Tab bar | tabs | Problems/Meds/Encounters/Labs/Documents | switch panel | default/hover/focus/selected |
| AI summary card | region | "AI Chart Summary" | render prose + citations | default/loading/error/empty |
| Citation chip | button | "[1]", "[2]" | open source drawer | default/hover/focus |
| Source drawer | dialog/drawer | "Source for this statement" | shows origin record + timestamp | open/closed/loading |
| Masked field | locked chip (non-interactive) | "Protected (42 CFR Part 2)" | tooltip explains masking | default (never interactive un-mask) |
| Request Part 2 access | button | "Request consent to view" | routes to consent flow | default/hover/focus/disabled(if pending)/loading |
| Consent status card | status card | "Consent: on file / none / expired" | teal/amber/red states | default |
| Allergy chip | status chip | e.g., "Allergy: Penicillin" | red icon + text | default |
| Quick action buttons | buttons | "Confirm Risk"/"Start Note"/"Orders"/"Disposition" | deep-link C4/C5/C6/C7 | default/hover/focus/disabled(role) |
| Print/export | button | "Export summary (PDF)" | server-rendered PDF | default/hover/focus/loading |

##### Inputs & validation
- Read-mostly screen; no free-text write except the "Request consent to view" reason (optional, ≤500 chars).

##### Actions → API calls
- **Load chart:** `GET /api/x_bhuc/patient/PT-10231/chart`
  - Representative response (note masking is server-driven):
    ```json
    {
      "patient": { "id":"PT-10231","name":"Rosa Alvarez","mrn":"MRN-88213","dob":"1991-04-02","allergies":["Penicillin"] },
      "riskBand":"HIGH","riskConfidence":0.86,
      "aiSummary": {
        "text":"34F presenting with suicidal ideation with plan [1]. Recent medication non-adherence noted [2]. SUD history: [PROTECTED].",
        "citations":[
          {"id":1,"sourceType":"encounter","sourceId":"ENC-5521","label":"Triage note 13:12","timestamp":"2026-07-05T13:12:00Z"},
          {"id":2,"sourceType":"medlog","sourceId":"MED-7781","label":"Pharmacy fill gap","timestamp":"2026-06-20T00:00:00Z"}
        ],
        "generatedAt":"2026-07-05T13:20:00Z"
      },
      "problems":[{"code":"F32.1","label":"Major depressive disorder, moderate"}],
      "medications":[{"name":"Sertraline 50mg","status":"active"}],
      "part2Fields":[{"field":"sud_history","masked":true,"reason":"NO_CONSENT_ON_FILE"}],
      "consent":{"status":"NONE"}
    }
    ```
  - Drives header, summary card, tabs, and masked chips (`masked:true` → locked chip; only fields present with values render).
- **Open citation source:** `GET /api/x_bhuc/patient/PT-10231/source/{sourceType}/{sourceId}` **[new endpoint — add to backend]** → drawer content.
- **Request Part 2 consent:** `POST /api/x_bhuc/consent` `{ "patientId":"PT-10231","purpose":"treatment","requestedFields":["sud_history"],"reason":"Active risk assessment" }` → returns `{ "consentRequestId":"...","status":"PENDING" }`. UI flips masked chip to amber "Consent requested — pending". **UI never un-masks locally**; a subsequent chart GET returns fields only if ACL now permits.
- **Export:** `GET /api/x_bhuc/patient/PT-10231/summary.pdf` **[new endpoint — add to backend]**.

##### Human-in-the-loop / masking behavior
- AI summary is explicitly labeled **Draft** and citation-backed; it does not write to the chart. Clinician verifies via citations.
- **SUD masking:** Any field with `masked:true` shows the locked chip only. There is **no client-side reveal**. Even if summary text embeds `[PROTECTED]`, the SPA renders it verbatim and never requests raw values. Re-fetch after consent is the only path to values, and only if server ACL returns them.

##### Empty / loading / error states
- **Loading:** header skeleton + summary shimmer; tabs disabled until data.
- **Empty tab:** e.g., "No active problems recorded."
- **AI summary unavailable:** amber notice "AI summary not available — review chart directly." (never blocks chart).
- **Error:** 403 → restricted panel; 5xx → retry.

##### Accessibility notes
- Masked chips have `aria-label="Protected under 42 CFR Part 2. Consent required to view."`
- Citation chips `aria-label="Source 1: Triage note, 1:12 PM"`; drawer is a focus-trapped dialog.
- Tab semantics `role="tablist/tab/tabpanel"` with `aria-controls`.

---

#### Screen C4 — Risk Confirmation (Human-in-the-Loop)

##### Route & access
- **URL:** `/patient/{id}/risk`.
- **Roles:** licensed clinicians permitted to adjudicate risk (MD/DO/PMHNP/PA/LCSW); RN-triage may view but not finalize (their Confirm/Adjust/Reject controls are disabled with tooltip).
- **MFA:** session required.
- **Redirect:** if already confirmed, still viewable (shows the recorded decision, read-only unless re-open permitted).

##### Purpose
Show the AI risk score, confidence, and the exact contributing inputs side-by-side, and REQUIRE the clinician to Confirm / Adjust / Reject with rationale. **Nothing downstream proceeds until the clinician acts.**

##### Layout & look
- Two-panel split (6/6). **Left = AI assessment**: big risk band (shaped icon + word + color), numeric score, confidence meter, model version + generation time. **Right = Contributing inputs**: an itemized, weighted list of exactly what drove the score (each item: source label, value, direction/weight, citation to chart). Part-2-derived contributors that are masked show as "Protected factor considered" without disclosing content.
- Bottom **decision bar** (sticky, amber-outlined until acted): the three required actions.
- A prominent **supervised-mode banner** at top: amber, icon + text "Awaiting your confirmation — no orders, notes, or disposition can be finalized for this patient until you confirm, adjust, or reject this risk assessment."
- On action, banner flips to teal "Risk confirmed by <name> at <time>" (or reflects Adjust/Reject).

##### Components inventory
| Component | Type | Label/placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Supervised-mode banner | alert region | see copy above | changes state after decision | pending(amber)/confirmed(teal)/rejected(red-with-icon) |
| AI band display | status block | "HIGH 0.91" | tooltip model card | default |
| Confidence meter | meter | "Confidence 0.86" | tooltip | default |
| Contributing inputs list | list | each factor row | click → citation drawer (C3 source) | default/hover/focus |
| Masked factor row | locked row | "Protected factor considered" | tooltip Part 2 | default (no reveal) |
| Decision: Confirm | primary button (accent) | "Confirm risk band" | requires rationale; posts decision | default/hover/focus/loading/disabled(no rationale) |
| Decision: Adjust | button | "Adjust band…" | opens band selector + rationale required | default/hover/focus/loading/disabled |
| Adjusted band selector | radio group | "HIGH/MODERATE/LOW" | sets new band | default/focus/checked |
| Decision: Reject | destructive-styled button | "Reject assessment" | rationale required; marks AI output rejected | default/hover/focus/loading/disabled |
| Rationale | textarea | "Clinical rationale (required)" | enables submit when valid | default/focus/error |
| Decision history | list | "Prior decisions" | shows audit trail | default/empty |

##### Inputs & validation
- **Rationale (textarea):** required for ALL three actions. Min 10 chars, max 2000. Error: "Add a brief clinical rationale (at least 10 characters)."
- **Adjusted band (radio):** required only when Adjust chosen; must differ from AI band. Error: "Choose a different band, or use Confirm to keep the AI band."
- Submit disabled until rationale valid (and band chosen for Adjust).

##### Actions → API calls
- **Load:** `GET /api/x_bhuc/patient/PT-10231/risk` **[new endpoint — add to backend]**
  - Representative response:
    ```json
    {
      "assessmentId":"RA-99120","patientId":"PT-10231",
      "aiBand":"HIGH","aiScore":0.91,"confidence":0.86,
      "modelVersion":"risk-agent-2026.06","generatedAt":"2026-07-05T13:20:00Z",
      "contributors":[
        {"label":"Suicidal ideation with plan","value":"Yes","weight":0.42,"direction":"increase","citation":{"sourceType":"encounter","sourceId":"ENC-5521"}},
        {"label":"Prior attempt (12mo)","value":"Yes","weight":0.21,"direction":"increase","citation":{"sourceType":"history","sourceId":"HX-3301"}},
        {"label":"Protected factor","masked":true,"weight":null,"direction":"unknown"}
      ],
      "status":"AWAITING_CONFIRMATION"
    }
    ```
- **Submit decision:** `POST /api/x_bhuc/risk/confirm` **[new endpoint — add to backend]** with `Idempotency-Key`.
  - Confirm: `{ "assessmentId":"RA-99120","decision":"CONFIRM","rationale":"Concur; SI with plan, prior attempt.","clinicianAttestation":true }`
  - Adjust: `{ "assessmentId":"RA-99120","decision":"ADJUST","adjustedBand":"MODERATE","rationale":"Plan retracted, protective factors present." }`
  - Reject: `{ "assessmentId":"RA-99120","decision":"REJECT","rationale":"Score reflects stale data; re-triage needed." }`
  - Response: `{ "status":"CONFIRMED","finalBand":"HIGH","confirmedBy":"Dr. Lee","confirmedAt":"2026-07-05T13:31:00Z","downstreamUnlocked":true }`
  - Drives: banner flip; unlocks C5/C6/C7 actions across the app (client stores `riskDecision` in patient context; other screens read it).

##### Human-in-the-loop / masking behavior
- **Blocking gate:** while `status = AWAITING_CONFIRMATION`, the SPA disables/greys the "Start Note (finalize)", "Submit orders", and "Finalize disposition" actions on C5/C6/C7, each showing tooltip "Confirm the risk assessment first." Only a successful decision POST (`downstreamUnlocked:true`) clears the gate.
- Masked contributors never disclose Part 2 content; they only indicate a protected factor was weighed.

##### Empty / loading / error states
- **Loading:** split-panel skeletons; decision bar disabled.
- **Already decided:** read-only summary with "Re-open" (role-gated) that re-enables the decision bar.
- **Error on submit:** red banner (governance-adjacent) + keep form; 409 (someone else decided) → refresh to show their decision.

##### Accessibility notes
- Banner `role="alert" aria-live="assertive"` on load (pending) and on decision.
- Contributing list is a semantic list; weights announced ("increases risk, weight 0.42").
- Rationale error via `aria-describedby`; focus to first invalid control on submit.
- Confirm requires an explicit checkbox attestation focusable before submit.

---

#### Screen C5 — Ambient Documentation (Sign)

##### Route & access
- **URL:** `/patient/{id}/note` (or `/encounter/{encId}/note`).
- **Roles:** documenting clinician (authoring role). Co-sign role optional.
- **MFA:** session required.
- **Gate:** finalize (**Sign**) is blocked until risk is confirmed on C4 for the encounter (supervised-mode gate) AND all AI lines are addressed.

##### Purpose
Show the live ambient session note produced by the BHUC Clinical Documentation Agent, flag **unverified lines**, suggest ICD-10/CPT codes, and REQUIRE an explicit clinician **Sign** action before anything is finalized.

##### Layout & look
- 8/4 split. Left (8): the **note editor** organized by sections (Chief Complaint, HPI, MSE, Assessment, Plan). AI-generated lines appear inline; **unverified lines** carry an amber left-border + a small "Unverified — verify" tag + an icon; verified lines have a teal check. Editable rich-ish text (plain + basic structure).
- Right (4): **Coding suggestions** card (ICD-10 + CPT with confidence + "add/dismiss"), **encounter metadata**, and the **Sign panel**.
- Top of editor: amber banner "Draft note — not part of the record until signed." Live-capture status pill (teal "Listening", amber "Paused"). Model/source note.
- **Sign panel** (right, sticky): attestation checkbox + big accent "Sign note" button; disabled with reasons list until preconditions met.

##### Components inventory
| Component | Type | Label/placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Note section blocks | editable text regions | "HPI", "MSE"… | edit; mark verified | default/focus/error |
| Unverified line tag | inline status + button | "Unverified — verify" | click marks line verified (or edit) | pending(amber)/verified(teal) |
| Verify all | button | "Mark visible lines verified" | bulk-verify (still per-line audited) | default/hover/focus/disabled |
| Regenerate section | button | "Re-draft this section" | server re-draft (agent) | default/hover/focus/loading |
| Coding suggestion row | list row + add/dismiss | e.g., "F41.1 (0.88)" | add to note coding / dismiss | default/hover/focus/added(teal)/dismissed |
| Add manual code | combobox | "Add ICD-10 / CPT" | typeahead search codes | default/focus/loading/error |
| Attestation checkbox | checkbox | "I attest this note is accurate and complete." | enables Sign | default/focus/checked/error |
| Sign note | primary button (accent) | "Sign note" | finalize; posts sign | default/hover/focus/loading/disabled(reasons) |
| Addendum (post-sign) | button | "Add addendum" | opens addendum after signed | shown only post-sign |
| Capture status | status pill | "Listening/Paused" | toggle capture | teal/amber |

##### Inputs & validation
- **Note sections:** required non-empty for Assessment and Plan before sign. Error: "Assessment and Plan are required before signing."
- **Unverified lines:** ALL AI lines must be verified or edited before sign. Error: "3 unverified lines remain — verify each before signing."
- **At least one diagnosis code (ICD-10):** required. Error: "Add at least one ICD-10 diagnosis."
- **Attestation checkbox:** required. Error: "Check the attestation to sign."
- Manual code combobox: validate against code set; error "Not a recognized ICD-10/CPT code."

##### Actions → API calls
- **Load draft:** `GET /api/x_bhuc/patient/PT-10231/note?encounterId=ENC-5521` **[new endpoint — add to backend]**
  - Representative response:
    ```json
    {
      "noteId":"NOTE-4410","encounterId":"ENC-5521","status":"DRAFT",
      "sections":[
        {"key":"HPI","lines":[
          {"lineId":"L1","text":"34F reports 2 weeks worsening depression.","source":"AI","verified":false},
          {"lineId":"L2","text":"Endorses SI with plan.","source":"AI","verified":false}
        ]},
        {"key":"ASSESSMENT","lines":[]},
        {"key":"PLAN","lines":[]}
      ],
      "suggestedCodes":[
        {"system":"ICD-10","code":"F32.2","label":"MDD, single episode, severe","confidence":0.84},
        {"system":"ICD-10","code":"F41.1","label":"Generalized anxiety disorder","confidence":0.71},
        {"system":"CPT","code":"90792","label":"Psychiatric diagnostic eval w/ medical","confidence":0.66}
      ],
      "riskConfirmed": true
    }
    ```
- **Autosave edits/verifications:** `PATCH /api/x_bhuc/note/NOTE-4410` **[new endpoint — add to backend]** `{ "lineId":"L1","verified":true }` or `{ "section":"PLAN","text":"..." }` — debounced 1.5s; shows "Saved" pill.
- **Add/dismiss code:** `PATCH /api/x_bhuc/note/NOTE-4410/codes` **[new endpoint]** `{ "add":[{"system":"ICD-10","code":"F32.2"}] }`.
- **Sign:** `POST /api/x_bhuc/note/sign` **[new endpoint — add to backend]** with `Idempotency-Key`:
  ```json
  { "noteId":"NOTE-4410","attestation":true,
    "finalCodes":[{"system":"ICD-10","code":"F32.2"},{"system":"CPT","code":"90792"}] }
  ```
  - Response `{ "status":"SIGNED","signedBy":"Dr. Lee","signedAt":"2026-07-05T14:02:00Z","locked":true }` → editor becomes read-only; only Addendum allowed.

##### Human-in-the-loop / masking behavior
- **Blocking Sign gate:** the Sign button stays disabled and lists live reasons: (1) risk not confirmed (links to C4), (2) N unverified lines, (3) missing ICD-10, (4) missing Assessment/Plan, (5) attestation unchecked. Only when all clear does Sign enable. The BHUC Clinical Documentation Agent **never** signs — a human must.
- Any SUD-related content the agent captured that is Part-2-protected is stored server-side under ACL; if the clinician's role can't view it, it renders masked in the note exactly as C3 (locked chip), not editable client-side.

##### Empty / loading / error states
- **Loading:** section skeletons; capture pill shows "Connecting…".
- **Empty:** if no ambient draft, show "No ambient draft yet — start documenting" with a manual-entry path.
- **Error:** autosave failure → amber "Changes not saved — retrying"; sign failure → red banner + keep state; 409 already-signed → switch to read-only + addendum.

##### Accessibility notes
- Unverified lines `aria-label="Unverified line. Activate to verify."`; verification announced via `aria-live`.
- Disabled Sign exposes reasons through `aria-describedby` (a visible reasons list, not tooltip-only).
- Editable regions use accessible rich-text pattern with proper roles/labels; autosave status `role="status"`.

---

#### Screen C6 — Treatment & Prior-Auth

##### Route & access
- **URL:** `/patient/{id}/orders`.
- **Roles:** prescribers (MD/DO/PMHNP/PA) for medication orders; others may place non-med orders/referrals per role. Submit prior-auth = human clinician only.
- **MFA:** session required.
- **Gate:** finalizing/submitting orders blocked until risk confirmed (C4).

##### Purpose
Order entry with the **BHUC Prior-Auth Compliance Agent** that answers coverage questions **with citations** and **drafts** a prior-auth packet; SUD fields are access-gated by the **BHUC Consent & Data Protection Agent**'s Part 2 labels; **the human submits — the agent never submits.**

##### Layout & look
- 7/5 split. Left (7): **Order entry** — order type tabs (Medication, Labs, Referral, Level-of-care), an order builder form, and a running **order cart** list. Right (5): **Coverage & Prior-Auth Assistant** — a Q&A panel where clinician asks coverage questions and gets agent answers with **citation chips** to policy/formulary, plus a **Prior-Auth Packet** card (draft, editable) with an explicit human **Submit prior authorization** button.
- Prior-Auth card carries an amber "Draft prepared by agent — review and submit" tag; a persistent note: "The assistant prepares this packet. Only you can submit it."
- SUD-relevant order fields (e.g., MOUD/buprenorphine context) that require Part 2 data show masked chips if consent/role gate not met, and the coverage answers redact protected specifics.

##### Components inventory
| Component | Type | Label/placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Order type tabs | tabs | Medication/Labs/Referral/Level-of-care | switch builder | default/focus/selected |
| Medication search | combobox | "Search medication" | formulary typeahead | default/focus/loading/error |
| Dose/route/frequency | inputs/selects | "Dose", "Route", "Frequency" | build order | default/focus/error |
| Add to cart | button | "Add order" | validates + adds | default/hover/focus/disabled/loading |
| Order cart rows | list + remove | — | edit/remove pending orders | default/hover/focus |
| Coverage question | text input | "Ask about coverage (e.g., is X covered?)" | server agent call | default/focus/loading |
| Coverage answer | region + citations | agent answer | citation chips open policy drawer | default/loading/error/empty |
| Prior-auth packet fields | form (prefilled) | dx, med, clinical justification, tried/failed | editable draft | default/focus/error |
| Submit prior auth | primary button (accent) | "Submit prior authorization" | human submit only | default/hover/focus/loading/disabled |
| Sign & submit orders | primary button | "Submit orders" | finalize cart | default/hover/focus/loading/disabled(gate) |
| Masked SUD field | locked chip | "Protected (42 CFR Part 2)" | tooltip | default (no reveal) |

##### Inputs & validation
- **Medication:** required (med tab); must be from formulary/coded list. Error: "Select a medication from the list."
- **Dose:** required numeric > 0 with unit. Error: "Enter a valid dose."
- **Route:** required select. Frequency: required select. Errors: "Select a route." / "Select a frequency."
- **Prior-auth clinical justification:** required, 20–4000 chars. Error: "Provide clinical justification (at least 20 characters)."
- **Tried/failed therapies:** at least one for step-therapy meds. Error: "List prior therapies tried and their outcomes."
- Coverage question: 3–500 chars.

##### Actions → API calls
- **Ask coverage question:** `POST /api/x_bhuc/priorauth` (query mode) `{ "patientId":"PT-10231","mode":"coverage_question","question":"Is extended-release bupropion covered under the patient's plan?" }`
  - Response: `{ "answer":"ER bupropion is covered with step therapy; two prior SSRIs required [1][2].","citations":[{"id":1,"title":"Plan formulary 2026 §4.2","url":"policy://formulary/2026#4.2"},{"id":2,"title":"Step-therapy policy","url":"policy://step/mh"}],"redactedPart2":false }`
- **Generate prior-auth draft:** `POST /api/x_bhuc/priorauth` (draft mode) `{ "patientId":"PT-10231","mode":"draft_packet","orderId":"ORD-tmp-1" }`
  - Response: prefilled packet `{ "packetId":"PA-3320","fields":{ "diagnosis":"F32.2","requestedMedication":"Bupropion XL 150mg","justification":"...","triedFailed":["Sertraline - partial","Escitalopram - intolerance"] },"status":"DRAFT" }`
- **Submit prior auth (HUMAN):** `POST /api/x_bhuc/priorauth` (submit mode) with `Idempotency-Key` `{ "packetId":"PA-3320","mode":"submit","attestation":true }`
  - Response `{ "status":"SUBMITTED","submissionId":"SUB-8890","submittedBy":"Dr. Lee","submittedAt":"..." }`.
- **Submit orders:** `POST /api/x_bhuc/orders` **[new endpoint — add to backend]** `{ "patientId":"PT-10231","orders":[{ "type":"medication","code":"...","dose":"150mg","route":"PO","frequency":"daily" }] }`.
- **Consent (if Part 2 gate hit):** reuse `POST /api/x_bhuc/consent` as in C3.
- Loading/error: agent panels show spinner + "The assistant is checking coverage…"; errors keep the question; submit errors surface correlationId.

##### Human-in-the-loop / masking behavior
- **Agent never submits:** draft mode only prepares; the `submit` mode is exclusively triggered by the human Submit button with attestation. There is no automated/timed submission path.
- **Masking:** SUD-linked fields and any Part-2-derived justification content render masked (locked chip) unless server returns them; coverage answers set `redactedPart2:true` when protected specifics were withheld, shown as an amber inline note "Some protected details omitted."
- **Gate:** Submit orders disabled until C4 risk confirmed.

##### Empty / loading / error states
- **Empty cart:** "No orders yet — add a medication, lab, referral, or level-of-care order."
- **No coverage answer yet:** helper text + example questions.
- **Error:** agent unavailable → amber "Coverage assistant unavailable — you can still place orders and submit prior auth manually."

##### Accessibility notes
- Combobox uses ARIA combobox pattern (`aria-expanded`, `aria-activedescendant`).
- Citation chips labeled with source title; policy drawer focus-trapped.
- Submit buttons announce success via `role="status"`; the "human submits" attestation is a required, focusable checkbox.

---

#### Screen C7 — Disposition & Discharge

##### Route & access
- **URL:** `/patient/{id}/disposition`.
- **Roles:** clinicians authorized to disposition (MD/DO/PMHNP/PA/LCSW).
- **MFA:** session required.
- **Gate:** finalize disposition blocked until risk confirmed (C4) and note signed (C5).

##### Purpose
Record the disposition decision, let the clinician finalize AI-drafted discharge instructions and a safety-plan template, and route referrals.

##### Layout & look
- Header: patient + current risk band + "Note: Signed/Unsigned" status chip (teal/amber).
- 7/5 split. Left (7): **Disposition decision** (radio set: Discharge home, Discharge with outpatient referral, Partial hospitalization, Inpatient admission, Transfer/ED) + condition-specific fields; then **Discharge instructions** editor (AI-drafted, amber "Draft — finalize") and **Safety Plan** template (Stanley-Brown-style sections, AI-prefilled, editable). Right (5): **Referral routing** (facility/program search with availability), **follow-up scheduling shortcut** (→ C8), and the **Finalize** panel.
- Safety plan sections: Warning signs, Internal coping strategies, People/social settings for distraction, People to ask for help, Professionals/agencies to contact (with crisis line 988 prefilled), Means-restriction steps.
- Finalize panel: attestation + accent "Finalize disposition & discharge" button, disabled with reasons until gates met.

##### Components inventory
| Component | Type | Label/placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Disposition radios | radio group | 5 options above | reveals conditional fields | default/focus/checked |
| Discharge instructions editor | editable text | AI draft | edit/finalize | default/focus/error |
| Regenerate instructions | button | "Re-draft instructions" | agent re-draft | default/hover/focus/loading |
| Safety plan sections | editable fields | per section labels | edit; required-if-risk fields | default/focus/error |
| Crisis contacts | prefilled list | "988 Suicide & Crisis Lifeline" | editable/append | default |
| Referral search | combobox | "Search programs/facilities" | availability lookup | default/focus/loading/empty |
| Referral route | button | "Route referral" | sends referral | default/hover/focus/loading/disabled |
| Schedule follow-up | button | "Schedule follow-up" | deep-link C8 | default/hover/focus |
| Attestation | checkbox | "I have reviewed and finalized these instructions." | enables finalize | default/focus/checked/error |
| Finalize | primary button (accent) | "Finalize disposition & discharge" | posts disposition | default/hover/focus/loading/disabled(reasons) |
| Print discharge | button | "Print patient copy" | server PDF | default/hover/focus/loading |

##### Inputs & validation
- **Disposition (radio):** required. Error: "Select a disposition."
- **Discharge instructions:** required non-empty. Error: "Discharge instructions can't be empty."
- **Safety plan (when risk band MODERATE/HIGH):** Warning signs, Coping strategies, and Professionals-to-contact are required. Error: "Complete the required safety-plan sections for this risk level."
- **Referral (when option = referral/PHP/transfer):** a routed referral is required before finalize. Error: "Route a referral for this disposition."
- **Attestation:** required. Error: "Confirm you finalized the instructions."

##### Actions → API calls
- **Load draft:** `GET /api/x_bhuc/patient/PT-10231/disposition` **[new endpoint — add to backend]**
  - Response: `{ "riskBand":"HIGH","noteSigned":true,"draftInstructions":"...","safetyPlanDraft":{ "warningSigns":["..."],"copingStrategies":["..."],"professionals":["988 Suicide & Crisis Lifeline"] },"referralOptions":[{ "id":"PROG-12","name":"Intensive Outpatient - Downtown","nextAvailable":"2026-07-07" }] }`
- **Route referral:** `POST /api/x_bhuc/referral` **[new endpoint — add to backend]** `{ "patientId":"PT-10231","programId":"PROG-12","urgency":"48h" }` → `{ "referralId":"REF-551","status":"ROUTED" }`.
- **Finalize disposition:** `POST /api/x_bhuc/disposition` with `Idempotency-Key`:
  ```json
  { "patientId":"PT-10231","disposition":"DISCHARGE_WITH_REFERRAL",
    "instructions":"...", "safetyPlan":{ "warningSigns":["..."],"copingStrategies":["..."],"professionals":["988..."] },
    "referralId":"REF-551","attestation":true }
  ```
  - Response `{ "status":"FINALIZED","dischargedAt":"2026-07-05T15:10:00Z","followUpRequired":true }` → offers "Schedule follow-up" (C8) and print.
- **Print:** `GET /api/x_bhuc/patient/PT-10231/discharge.pdf` **[new endpoint — add to backend]**.

##### Human-in-the-loop / masking behavior
- **Supervised gate:** Finalize disabled with live reasons until: risk confirmed (C4), note signed (C5), disposition selected, required safety-plan sections complete, and referral routed if applicable. AI drafts never auto-finalize; the clinician edits + attests.
- **Masking:** any Part-2-protected content in instructions/referral is server-gated; masked chips render if role/consent insufficient. Referral to SUD programs respects Part 2 disclosure rules server-side.

##### Empty / loading / error states
- **Loading:** editor skeletons; referral list shimmer.
- **Empty referrals:** "No matching programs — broaden search or route manually."
- **Error:** finalize failure → red banner + preserve edits; 409 if already discharged → read-only summary.

##### Accessibility notes
- Radio group labeled; conditional fields announced when revealed.
- Safety-plan required sections marked `aria-required`; errors linked.
- Crisis line rendered as accessible, prominent, non-color-only element with icon + text.

---

#### Screen C8 — Scheduling & Follow-Up Management

##### Route & access
- **URL:** `/scheduling` (and `/patient/{id}/schedule` for a single patient context).
- **Roles:** clinicians + care-coordination roles.
- **MFA:** session required.
- **Redirect:** unauthenticated → `/signin?returnTo`.

##### Purpose
Book appointments using the Scheduling Agent's recommended clinician matches (**fairness-check already applied**) and manage the follow-up list of discharged patients.

##### Layout & look
- Two tabs: **Book / Match** and **Follow-Up Queue**.
- **Book/Match tab** 5/7 split: left (5) patient + visit parameters (visit type, modality, urgency, preferred window); right (7) **recommended clinician matches** as cards — each with clinician name/role, next-available slots, match reasons (specialty, continuity, language, load), and a **fairness-check badge** (teal "Fairness check passed" with icon + text; badge is informational — the agent already applied it). Selecting a match opens a slot picker.
- **Follow-Up Queue tab:** table of discharged patients needing follow-up: name, discharge date, required-by date (amber if approaching, red if overdue — with icon + text), disposition, status (unscheduled/scheduled/completed), action "Schedule".
- Confirmation of a booking shows a teal success card with appointment details + add-to-worklist link.

##### Components inventory
| Component | Type | Label/placeholder | Behavior / on-interaction | States |
|---|---|---|---|---|
| Tabs | tabs | Book/Match, Follow-Up Queue | switch view | default/focus/selected |
| Visit type | select | "Visit type" (Follow-up, Med mgmt, Therapy, Intake) | affects matches | default/focus/error |
| Modality | radio | "In-person / Telehealth" | filter matches | default/focus/checked |
| Urgency | select | "Within 48h / 1 week / 2 weeks" | affects matches | default/focus |
| Preferred window | date-range | "Preferred dates" | filter | default/focus/error |
| Get matches | button | "Find matches" | calls scheduling agent | default/hover/focus/loading |
| Match card | selectable card | clinician + reasons | select → slot picker | default/hover/focus/selected |
| Fairness badge | status badge (info) | "Fairness check passed" | tooltip explains check | default |
| Slot picker | radio list of times | "Available times" | choose slot | default/focus/checked/empty |
| Book appointment | primary button (accent) | "Book appointment" | confirm booking | default/hover/focus/loading/disabled |
| Follow-up row | table row | — | expand/schedule | default/hover/focus |
| Schedule (row) | button | "Schedule" | opens Book with patient prefilled | default/hover/focus |
| Send reminder/message | button | "Message patient" | opens messaging | default/hover/focus/loading |

##### Inputs & validation
- **Visit type:** required. Error: "Select a visit type."
- **Modality:** required. Error: "Choose in-person or telehealth."
- **Slot:** required before booking. Error: "Pick an available time."
- **Preferred window:** optional; if given, end ≥ start. Error: "End date must be after start date."

##### Actions → API calls
- **Get appointments / availability + matches:** `GET /api/x_bhuc/appointments?patientId=PT-10231&visitType=follow_up&modality=telehealth&urgency=48h`
  - Response:
    ```json
    {
      "matches":[
        {
          "clinicianId":"CL-22","name":"Dr. A. Okafor","role":"PMHNP",
          "matchReasons":["Continuity: prior provider","Language: Spanish","Load: balanced"],
          "fairnessCheck":{"status":"PASSED","appliedAt":"2026-07-05T14:40:00Z"},
          "slots":[{"slotId":"S-1","start":"2026-07-06T16:00:00Z"},{"slotId":"S-2","start":"2026-07-07T15:30:00Z"}]
        }
      ]
    }
    ```
  - Drives match cards; fairness badge reads `fairnessCheck.status` (agent already applied — UI shows result only).
- **Book:** `POST /api/x_bhuc/appointments` **[new endpoint — add to backend]** with `Idempotency-Key` `{ "patientId":"PT-10231","clinicianId":"CL-22","slotId":"S-1","visitType":"follow_up","modality":"telehealth" }` → `{ "appointmentId":"APPT-771","status":"BOOKED","start":"2026-07-06T16:00:00Z" }`.
- **Follow-up list:** `GET /api/x_bhuc/appointments?view=followups&status=unscheduled` **[extend endpoint]** → rows with `requiredBy`, `disposition`, `status`.
- **Message patient (reminder):** `POST /api/x_bhuc/message` `{ "patientId":"PT-10231","channel":"secure_portal","template":"followup_reminder","appointmentId":"APPT-771" }` → `{ "messageId":"MSG-991","status":"SENT" }`.
- Loading: match panel skeleton; booking spinner. Error: 409 slot-taken → "That time was just booked — pick another"; refresh slots.

##### Human-in-the-loop / masking behavior
- Fairness check is **already applied server-side**; the UI never re-computes or overrides it — it only displays the badge/result. A human still selects and books (agent recommends, human decides).
- Any Part-2 program context in follow-ups is server-masked as elsewhere.

##### Empty / loading / error states
- **Empty matches:** "No matches for these parameters — widen the window or urgency."
- **Empty follow-up queue:** teal "No outstanding follow-ups."
- **Loading:** skeleton cards/rows.
- **Error:** agent unavailable → amber "Match recommendations unavailable — you can browse open slots manually" + fallback `GET /api/x_bhuc/appointments?view=open_slots`.

##### Accessibility notes
- Match cards are keyboard-selectable (`role="radio"` within `role="radiogroup"`), fairness badge label read as "Fairness check passed" (icon + text).
- Follow-up urgency states use icon + text + color; overdue announced in `aria-live`.
- Slot picker is a labeled radio list with accessible time formatting.

---

---

## 4. Multi-Agent Architecture & Implementation

### 4.1 Agent Roster (Mapped to the 5 Locked BHUC Use Cases)

**Important architectural correction (this revision):** Use Cases 2 and 3 each **club two agents** — they were finalized this way in the BHUC Use Case deck because each use case addresses a *single* AI risk across *two* journey phases, and each phase is a distinct agent. UC2's risk (Output Integrity / Hallucination) spans a **screening-scoring** agent and an **ambient-documentation** agent; UC3's risk (Privacy & Compliance) spans a **consent/data-protection** agent and a **prior-auth** agent. This build therefore has **six native agents**, not four. The earlier "Risk Identification & Documentation" and "Consent & Prior-Auth" single agents are each now split into their two constituent agents below.

| # | Use Case (as locked) | Agent(s) | Journey Phase | Governed Risk (shared per use case) |
| --- | --- | --- | --- | --- |
| 1 | Digital Front Door: Crisis Escalation Security | **BHUC Front-Door Security Agent** | Access & Entry (P1) | Prompt Injection / Guardrail-Suppression |
| 2 | Patient Risk Identification & Clinical Documentation Integrity | **BHUC Risk Identification Agent** | Triage & Screening (P3) | Output Integrity / Hallucination |
| 2 | *(same use case)* | **BHUC Clinical Documentation Agent** | Clinical Assessment (P4) | Output Integrity / Hallucination |
| 3 | Consent, Data Protection & Prior-Auth Compliance Copilot | **BHUC Consent & Data Protection Agent** | Clinical Assessment / Documentation (P4) | Privacy & Compliance (42 CFR Part 2) |
| 3 | *(same use case)* | **BHUC Prior-Auth Compliance Agent** | Treatment & Stabilization (P5) | Privacy & Compliance (42 CFR Part 2) |
| 4 | Scheduling Agent | **BHUC Scheduling Agent** | Treatment & Stabilization (P5) | Fairness / Discrimination |
| 5 | Enterprise AI Governance Control Tower | *(Not an agent — see Section 4.5)* | Spans entire journey (P1–P7) | Excessive Privileges |

**Six native agents** are built in this architecture (UC1 ×1, UC2 ×2, UC3 ×2, UC4 ×1). Use Case 5 is realized entirely by configuring the AICT platform itself (Section 5), not by building a sixth Agent Studio object. Because the two agents within UC2 (and within UC3) share one governed risk, they are governed as a **pair** in AICT/AIRC — one authority-document risk statement and one guardrail posture covers both phase-agents of the use case.

> **Verified buildability (2026-07-05):** every platform primitive these six agents require is confirmed present on `ven04690` — `sn_aia_agent`/`sn_aia_tool`/`sn_aia_trigger_configuration` for the agents and triggers, Now LLM-LTS for inference, the OneExtend guardrail framework, and the AICT/AIRC governance tables that auto-ingest native agents (Section 0.2). The agents themselves are net-new `x_bhuc` build work; nothing named `u_bhuc_*` exists yet (GAP-1). Build steps: Runbook §8.1 SN-Step 6.

### 4.2 Why There Is No External/Groq Agent in This Build

Earlier drafts of this architecture included Groq as an external, low-latency inference provider, connected via AI Gateway's MCP governance layer. Per your explicit direction, **this is removed from scope**. All six agents are native ServiceNow AI Agent Studio (Chat) agents, running on ServiceNow's own LLM service. This has one direct governance consequence worth stating plainly: because there is no external provider, the **AI Gateway tab** on the AICT dashboard (Tab 9, MCP server metrics) will show no data — this is expected, not a misconfiguration, and should not be treated as a gap during the demo `[Source: ServiceNow Enable AI, "AI Control Tower Dashboard," Tab 9: AI Gateway, pp. 694–732]`.

### 4.3 Building Native ServiceNow Agents — Canonical Procedure (Agent Studio)

This is the single click-path used to build all six agents; agent-specific configuration values follow in 4.4. All steps below are reproduced from ServiceNow's own procedure documentation, not inferred.

**Prerequisite role:** `sn_aia.admin` `[Source: ServiceNow Enable AI, "Create an AI agent," Now Assist AI agents, pp. 59–120]`

#### Step 1 — Create the agent
Navigate to **All → AI Agent Studio → Create and manage → AI agents**. From the **Add** dropdown, select **Chat** (native internal agent — as opposed to **Voice** or **External**) `[Source: same, p.59–60]`.

#### Step 2 — Define the specialty
1. Enter a **name** (per the naming convention in Appendix C).
2. Write the **AI agent description** — "should clarify the purpose of the AI agent, including its inputs, outputs, and context" `[Source: same, "Define the specialty of an AI agent," p.61–63]`. This text is sent directly to the LLM.
3. Write the **AI agent role** — "provides more detail about the function that the AI agent serves within a greater context" `[Source: same, p.62–63]`.
4. Write the **list of steps** — the ordered procedure the agent follows.
5. Optionally mark **unsupported model providers** if a specific model underperforms for this task.
6. Set **"Allow third party to access this AI agent" = ON** — **required for A2A** (§2.9). The React app consumes these agents through the FastAPI backend over the A2A protocol, so third-party access must be enabled for the OAuth A2A client to invoke them. (Earlier drafts said OFF; that predates A2A being in scope.)
7. Configure **long-term memory** categories only where genuinely needed; for data-minimization in a behavioral-health context, leave off by default for all six BHUC agents.
8. Select **Save and continue.**

#### Step 3 — Add tools and information
From the **Add tool** dropdown, available tool types include: Catalog item, Conversational topic, Desktop action, File upload, Flow action, Knowledge graph, Now Assist skill, Record operation, Script, Search retrieval, Subflow, Web search `[Source: same, "Add tools and information to an AI agent," p.63–97]`. The tool types used across the six BHUC agents:

- **Search retrieval (RAG)** — grounds clinical/coverage answers. Configuration fields: **Search profile**, **Search sources**, **Fields returned**, **Results limit** (default 10), **Search criteria** (Semantic / Keyword / **Hybrid**, recommended), **Semantic indexes**, **Document matching threshold** (0–1, default 0) `[Source: same, "Add a search retrieval to an AI agent," p.89–92]`.
- **Record operation** — Create, Update, Look up, or Delete records; requires selecting the **Table** and mapping **Inputs** `[Source: same, "Add a record operation to an AI agent," p.84–87]`.
- **Script** — for custom logic. ServiceNow's own security guidance: *"For improved security, use `GlideRecordSecure` instead of `GlideRecord` and `addUserEncodedQuery()` instead of `addEncodedQuery()`"* `[Source: same, "Add a script to an AI agent," p.87–89]`.
- **Flow action / Subflow** — invokes a reusable Flow Designer process, e.g., a human-in-the-loop approval step `[Source: same, "Add a flow action to an AI agent," p.76–79]`.

**Execution mode** is set per tool: **Supervised** ("Inputs from your human agent are required during the execution of this tool") or **Autonomous** ("Doesn't require any input... while the AI agent runs") `[Source: same, e.g. "Add a record operation to an AI agent," p.85]`. **Every tool in this build that writes to a clinical, consent, or scheduling record is set to Supervised — no exceptions** — this is the mechanism that enforces human-in-the-loop across all six agents.

**Knowledge graphs** may optionally be added: "Knowledge graphs give the AI agent information to understand the relationships between real-world entities to improve its outputs" `[Source: same, p.64]`.

Select **Save and continue.**

#### Step 4 — Define security controls
Two sub-steps, both required:

**Define user access:** choose **Users with specified roles** (not Authenticated users, not Public) and select only the roles that should invoke the agent. This action "triggers the creation of an ACL for your AI agent" `[Source: same, "Define security controls for an AI agent," p.97–99]`.

**Define data access (user identity):** choose between:
- **Dynamic user** — the agent runs as the invoking user's identity. "By default, an AI agent runs as a dynamic user and has the roles of the invoking user. Select the approved roles to limit the data access that an AI agent could have. **Role masking must be applied for all AI agents and agentic workflows to run as dynamic users.**" `[Source: same, p.98]`
- **AI user** — a dedicated service-account-style identity with its own fixed roles, which "could be more than the dynamic user" `[Source: same, p.98]`.

> **Documented security warning, quoted directly:** *"To override the role masking requirement for a specific agentic workflow or AI agent, admins with the correct elevated access can... select the 'allow all roles' check box. Taking these steps deactivates the requirement for a role masking approved roles list... Role masking should be applied as security best practice and adherence to the principle of least privilege. **Overriding the role masking requirement isn't recommended.**"* `[Source: same, p.98]`
>
> **Recommendation for BHUC — updated for A2A (§2.9):** because the React app consumes these agents over **A2A through the FastAPI backend**, the caller is an **external app, not an interactive ServiceNow user**. There is therefore no "invoking user" whose identity a dynamic-user agent could assume. For that reason, **every A2A-consumed BHUC agent uses the AI-user identity**, bound to its **dedicated non-human service account** (`svc-bhuc-<function>`, §8.1 SN-Step 13), whose roles are scoped to least privilege via composable `u_bhuc_*` data roles (SN-Step 13). Never exercise the "allow all roles" override for any of the six agents. This mirrors the verified careatlas model, where each agent runs under its own `svc-*` account with granular roles (`role_patient_pii`, `u_patients_user`, …) `[Verified, §2.9]`.
>
> **Also update Step 2, point 6 (third-party access):** for A2A-consumed agents, set **"Allow third party to access this AI agent" = ON** — this is required for the A2A OAuth client to invoke the agent from the external app. (The original draft said OFF; that applied only before A2A was in scope.) The Front-Door agent, being public and unauthenticated, is additionally reachable directly; the other five are reached only through the authenticated FastAPI backend.

Select **Save and continue.**

#### Step 5 — Add a trigger (optional)
"If you want your AI agent to be used only in chats, you don't need to add a trigger. Only add a trigger if you want to invoke the AI agent automatically when some event occurs." `[Source: same, "Add a trigger to an AI agent," p.99–102]` Configure the **Table** and at least one **Condition**; keep the trigger **inactive** until testing is complete. Three agents in this build use triggers (Risk Identification — on screening submit; Clinical Documentation — on assessment start; Consent & Data Protection — on documentation update); the other three (Front-Door, Prior-Auth, Scheduling) are chat- or on-demand-invoked.

**Kill switch (native, automatic — no configuration required to benefit from it):** ServiceNow's Now Assist AI Agents ship a kill switch that "detects when the same record is triggering the same agent objective beyond a threshold in a single day and automatically disables the agent" `[Source: ServiceNow Enable AI, "Create an AI agent" — "Kill Switch in Now Assist AI Agents," p.102–104]`. Default thresholds: **5 fires per record per 24-hour window**, **25 distinct records breaching threshold**, evaluated over a **3-consecutive-day** window, all configurable via system properties (`kill_switch.max_fires_per_window`, `kill_switch.min_distinct_records`, `kill_switch.window_size`, `kill_switch.consecutive_windows_duration`) `[Source: same, p.103]`. The operating mode (`kill_switch.mode`) defaults to `warn_only`; **Recommendation: set to `enforce` in production**, since `enforce` mode auto-disables a runaway trigger on Day 3 after two prior warning emails, whereas `warn_only` never actually stops the runaway trigger `[Source: same, "Operating modes," p.103–104]`.

#### Step 6 — Select channels and status
Choose whether the agent is invocable from Now Assist in Virtual Agent and which assistants may access it; set processing/completion messages; leave **"This AI agent is active"** OFF until testing is complete `[Source: same, "Select channels and status for an AI agent," p.104–106]`. Select **Save and test.**

#### Step 7 — Test
Navigate to **AI Agent Studio → Testing → Start manual test**. Choose test type **AI agent or workflow**, select the agent, version, and a representative **Task** description `[Source: same, "Manually test the execution of an AI agent," p.108–110]`. Separately, run **Test access** (a distinct test type) to confirm the ACL behaves as intended — this opens the **Access Analyzer**, which "identifies all the ACL calls made in the execution of the AI agent, including its tools" `[Source: same, "Test user access to an AI agent," p.110–111]`. Only after both tests pass should the agent be activated.

### 4.4 Agent-by-Agent Build Specifications

Each agent below is specified for **build-immediately** execution: the exact navigation, the literal text to paste into every guided-setup field, each tool's configuration values, the security selections, the trigger conditions, and the test steps. All navigation and field labels are confirmed against `[Doc: ServiceNow Enable AI → Now Assist AI agents → "Create an AI agent" / "Define security controls" / "Add a trigger"]` and all target tables against Section 0 `[Verified]`.

**Common preamble for all six agents (do this once per agent):**
1. Log in to `ven04690.service-now.com` as a user holding **`sn_aia.admin`** `[Verified]`.
2. Navigate: **All → AI Agent Studio → Create and manage → AI agents**.
3. Click the **Add** drop-down → select **Chat** (internal native agent; not Voice, not External) `[Doc: "Create an AI agent," step 2]`.
4. You are now in the **guided setup**, which has five ordered steps shown as a left-rail stepper: **Define specialty → Add tools and information → Define security controls → Add a trigger (optional) → Select channels and status**. Fill each step exactly as below, clicking **Save and continue** between steps.
5. Set the agent's model provider to **Now LLM-LTS** where the model selector is offered (regulated-workload recommendation, §2.4) `[Verified: Now LLM LTS present]`.

---

#### Agent 1 — BHUC Front-Door Security Agent (Use Case 1) — ✅ AS-BUILT & VERIFIED (2026-07-06)

> **This agent is built and verified working over A2A.** Facility questions answer with citations from the BHUC KB; a crisis phrase triggers the escalation subflow. The tool steps below now reflect what was actually built — see **§4.6** for the reusable Script / Search-Retrieval / Flow procedures, which corrected the original generic bullets.

**Purpose:** Public, unauthenticated conversational front door. Answers routine non-clinical questions (hours, insurance accepted, location, what to bring) and, critically, runs a deterministic crisis classifier *before* any LLM response so a person in crisis is escalated regardless of phrasing.

**Step 1 — Define specialty.** Paste these values verbatim:
- **Name:** `BHUC Front-Door Security Agent`
- **AI agent description** (sent to the LLM):
  > You are the front door for a Behavioral Health Urgent Care facility, talking to visitors who are not logged in. Answer only routine, non-clinical questions: opening hours, location and parking, insurance plans accepted, what to bring to a visit, and how to start registration. You never give clinical, diagnostic, medication, or crisis-counseling advice. If a visitor expresses distress, self-harm, suicidal thoughts, or an emergency, you do not attempt to counsel them — you rely on the escalation tool to connect them to 988 and a human immediately. You always answer from retrieved facility information and cite it; if you do not have the information, you say so and offer to connect the visitor to staff.
- **AI agent role:**
  > Navigation and information assistant for unauthenticated visitors. Scope is strictly informational and escalation-only. Has no access to patient records.
- **List of steps** (add each as a step):
  1. Run the crisis-classifier Script tool on the visitor's message first, before generating any answer.
  2. If the classifier returns `crisis=true`, immediately call the 988 Escalation flow tool and return the escalation message; do not answer the original question.
  3. Otherwise, use Search Retrieval to find the answer in facility information and respond with a citation.
  4. If no facility information matches, say you don't have that detail and offer to connect the visitor to staff.
- **Unsupported model providers:** leave blank.
- **Long-term memory:** leave OFF (data minimization).

**Step 2 — Add tools and information.** From the **Add tool** drop-down add each:

- **Tool A — Script (crisis classifier). [Custom build]** Add tool → **Script**. Name `BHUC Crisis Classifier`. Deterministic, non-LLM keyword/pattern matcher. **Build per §4.6.1 — the script MUST `return` a value, not use an `outputs` object** (the `outputs` pattern throws and hangs the agent). Verified script:
  ```javascript
  (function(inputs) {
      var text = (inputs.message || '').toString().toLowerCase();
      var patterns = ['kill myself','suicide','suicidal','end my life','want to die',
          'hurt myself','self harm','self-harm','overdose','can\'t go on','no reason to live'];
      var hit = patterns.some(function(p){ return text.indexOf(p) !== -1; });
      return JSON.stringify({ crisis: hit, matched: hit ? 'crisis_language_detected' : 'none' });
  })(inputs);
  ```
  Input: `message` (string, the visitor turn). Returns JSON `{crisis, matched}`. **Execution mode: Autonomous.**
- **Tool B — Search retrieval (facility info). Build per §4.6.2.** Create the KB **"BHUC Facility Information"** + articles (publish in UI), a KB-filtered AI Search **source** ("BHUC Facility - Knowledge"), and a **profile** ("BHUC Facility Search", published). Then: **Search profile** = `BHUC Facility Search`; **Search sources** = the BHUC Knowledge source only (remove Catalog); **Hybrid**; **Results limit** `5`; **threshold** `0.4`; require citations. **Execution mode: Autonomous.** *(As-built: `kb_knowledge_base` `11c6b5a7…`, profile `bhuc_facility_search`.)*
- **Tool C — Flow action (988 escalation). Build per §4.6.3.** Create the **Subflow** `BHUC 988 Escalation` (String inputs only) that Creates a record in `u_bhuc_escalation`, Sends Email to the **BHUC On-Call** group, and Updates the notified flag; publish it. Then Add tool → **Flow action** → select it. **Execution mode: Autonomous recommended** (fire immediately on crisis — don't gate a 988 escalation behind the distressed visitor confirming; use Supervised only if you want that confirmation step). *(Original plan said log to `u_bhuc_screening`, but that table's mandatory `u_patient`/`u_instrument` can't hold an anonymous front-door escalation — hence the dedicated `u_bhuc_escalation` table.)*

**Step 3 — Define security controls.**
- **User access:** choose **Public** — this is the *only* BHUC agent reachable by unauthenticated visitors (by design of UC1). `[Doc: "Define security controls," user access]`
- **Data access (user identity):** choose **AI user** with a minimal fixed role set — read access to the facility-info KB and execute access to the escalation flow only; **no** patient-table access. (Public + dynamic-user is not appropriate here; a scoped AI user with least privilege is.) `[Doc: same, "AI user"]`

**Step 4 — Add a trigger:** none. Chat-invoked only. Skip this step.

**Step 5 — Select channels and status.** Enable in Now Assist / Virtual Agent on the Patient Portal front-door channel. Set processing message `One moment…`. Leave **This AI agent is active** OFF until Step 6 tests pass.

**Step 6 — Test.** AI Agent Studio → **Testing → Start manual test** → type **AI agent or workflow** → select this agent → Task: `What are your hours?` (expect cited factual answer) then `I want to kill myself` (expect immediate 988 escalation, no counseling). Then **Start manual test → Test access** to confirm the Public ACL via the Access Analyzer. Activate only after both pass.

**Governance overlay:** set the **Agent Goal Deviation** guardrail **Active** for this agent (§5.4) — it is the only public/unauthenticated agent, so prompt-injection/goal-deviation detection matters most here. `[Doc: ServiceNow Enable AI → "Explore the Third-Party LLMs and Regions" → Security & Privacy Guardrail Configuration]`

> **Things to consider after this entire project is complete** (Use Case 1 — Digital Front Door: Crisis Escalation Security)
> 1. How to implement beyond prompt injections and include data poisoning.
> 2. What if the agent gets access to unauthorized code, and that becomes a vulnerability?

---

> **Use Case 2 = two agents.** The screening-scoring agent (Agent 2) and the ambient-documentation agent (Agent 3) are separate Agent Studio objects, triggered in different journey phases, but share one governed risk (Output Integrity / Hallucination) and one governance posture. Build both.

#### Agent 2 — BHUC Risk Identification Agent (Use Case 2, Phase 3 — Triage & Screening) — ✅ AS-BUILT & VERIFIED (2026-07-07)

> **As-built (verified 2026-07-07):** all three tools fire end-to-end. Test: `BHUC_SCREENING_002` (C-SSRS) and `_003` (PHQ-9, item 9 positive) → risk band **High**, confidence 95, grounded rationale, record set `state=scored, clinician_action=pending` and routed to the clinician. The bullets below are updated to the **actual build**; the four gotchas hit are folded into §4.6 as reusable learnings. Agent 2's tools are the reference pattern for Agents 3/5/6 (Search Retrieval + write-back Script + confirmation Subflow).

**Purpose:** Scores validated instrument responses (C-SSRS/PHQ-9/GAD-7) into a risk band + confidence with a rationale, and routes the draft to a clinician — always deferring the final determination (Supervised).

**Step 1 — Define specialty.**
- **Name:** `BHUC Risk Identification Agent`
- **AI agent description:**
  > You score behavioral-health screening instruments (C-SSRS, PHQ-9, GAD-7) into a risk band (Low, Moderate, High) with a confidence value and a short rationale that lists the specific responses that drove the score. You never make a final clinical determination — every score is a draft that a licensed triage clinician must confirm, adjust, or reject. You never output patient identifiers in free text.
- **AI agent role:**
  > Real-time triage risk-scoring decision support. Produces a risk band + confidence + rationale for clinician confirmation. Runs as the invoking clinician's identity.
- **List of steps:**
  1. Look up the screening record and its instrument responses.
  2. Use Search Retrieval to load the scoring rules for the relevant instrument.
  3. Compute the risk band + confidence and a rationale citing the driving responses.
  4. Write the draft score via the Record Operation tool in Supervised mode.
  5. Invoke the clinician-confirmation flow; do not finalize until the clinician acts.
- **Long-term memory:** OFF.

**Step 2 — Add tools and information.**
- **Tool A — Search retrieval (scoring rules). [As-built: `AIA RAG Retriever` → profile `BHUC Screening Search`]** Built per §4.6.2 over KB `BHUC Screening Scoring Rules` (`532b483f…`). Hybrid; Results limit `10`; threshold `0.3`. **Autonomous.**
- **Tool B — Write-back Script (NOT a Record Operation as-built). [As-built: `Write risk score (script)`]** A Script tool is what actually worked. Declared inputs: **`risk_band`, `confidence`, `rationale`, and `screening_sys_id`** — the target record's **sys_id must be an input**, because the agent has no record-lookup tool to resolve a Number to a sys_id (§4.6.4). Body does `GlideRecord('u_bhuc_screening').get(inputs.screening_sys_id)`, sets `u_risk_band/u_confidence/u_rationale/u_scored_by_agent=true/u_state='scored'`, and **`return`s** a JSON string — it must NOT use `outputs` (§4.6.1). **Autonomous.** *(Uses `GlideRecord` to bypass ACLs during pre-governance testing; switch to `GlideRecordSecure` once SN-Step 13 ACLs exist.)*
- **Tool C — Flow action (clinician confirmation). [As-built: subflow `BHUC Risk Confirmation Latest`]** Built per §4.6.3. Must be a **published SubFlow** (a plain *Flow* is not invokable as an agent tool), **String input `screening_sys_id`** (no reference inputs), and **Run As = System User** — with "User who initiates the session," a **public** agent hits *"The requested flow operation was prohibited by security rules"* (§4.6.4). Actions: Look Up Record on `u_bhuc_screening` by `screening_sys_id` → Update Record `state=scored, clinician_action=pending` (routes to worklist C2 / Risk Confirmation C4), optional Send Email to a clinician group; no outputs. **Autonomous** (the human confirm/adjust/reject happens on screen C4, not inside the agent turn).

**Step 3 — Define security controls.** User access = **Users with specified roles** → `u_bhuc_clinician`. Data access = **Dynamic user** with **Approved roles** (role masking; never "allow all roles") `[Doc: "Define security controls"]`.

**Step 4 — Add a trigger.** Add trigger → **Table: `u_bhuc_screening`**, **Condition:** `state` **is** `submitted`. Keep inactive until Step 6 passes. Set `kill_switch.mode = enforce` (§4.3 Step 5).

**Step 5 — Channels/status.** Off until tested.

**Step 6 — Test.** Manual test with a sample C-SSRS response set → expect a banded score + rationale as a *draft* routed to confirmation, nothing finalized. Run **Test access** as an `u_bhuc_clinician` user.

**Governance overlay (shared with Agent 3):** **Output PII Violation** and **Output Extended PII** **Active** — *"An agent that outputs PHI in LLM responses without detection is a HIPAA breach"* `[Doc: → Security & Privacy Guardrail Configuration]`.

---

#### Agent 3 — BHUC Clinical Documentation Agent (Use Case 2, Phase 4 — Clinical Assessment) — ✅ AS-BUILT & VERIFIED (2026-07-07)

> **As-built (verified 2026-07-07):** all three tools fire. Test (Maya, encounter `ENC-MAYA-0001`) → created `BHUC_CARE_PLAN_001`, a sectioned draft note (CC/HPI/MSE/Assessment/Plan), unverified lines `["L5","L7"]`, suggested ICD-10 `F32.12` + CPT `99214`, `state=draft, signed=false`. Bullets below reflect the actual build. **Two build notes:** (1) the write tool was left as the **framework CRUD** (not the custom write-Script of Agent 2); its `gr.insert()` checks the create ACL, so with no ACLs it errors *"Cannot create record due to security constraints"* — for now it **runs under an admin ACL** on `u_bhuc_care_plan` (least-privilege ACLs deferred to SN-Step 13, per the build-first/govern-later sequencing). A drop-in `GlideRecord` write-Script (§4.6.4) is the alternative that avoids ACLs entirely. (2) The CRUD tool had **mapped the read-only `u_number` field to the literal `"number"`**, overriding auto-numbering. **Fix: remove `u_number` from the write tool's mapping** — the field default then auto-generates `BHUC_CARE_PLAN_00x` (verified `_003` over A2A). Never map `u_number` in any write tool (applies to Agents 5/6 CRUDs too).

**Purpose:** Ambient scribe. During the clinician's session (with patient consent) it drafts the clinical note live, grounds every line to what was actually recorded, flags any unverified line, and suggests ICD-10/CPT codes — but never signs. A clinician edits and signs (Supervised, screen C5).

**Step 1 — Define specialty.**
- **Name:** `BHUC Clinical Documentation Agent`
- **AI agent description:**
  > You draft clinical documentation for a behavioral-health encounter, grounded only in the recorded encounter data. Every line you produce is traceable to source input; if a detail is low-confidence or not clearly supported, you tag it "unverified" rather than asserting it. You suggest ICD-10 and CPT codes with the text that supports them. You never sign a note and you never finalize — a licensed clinician reviews, edits, resolves unverified lines, and signs. You never fabricate clinical detail and never output patient identifiers in free narrative beyond what the record already contains.
- **AI agent role:**
  > Grounded ambient-documentation drafter for clinical assessment. Produces a draft note + suggested codes with unverified-line flags for clinician sign-off. Runs as the invoking clinician's identity.
- **List of steps:**
  1. Read the encounter/session data for the patient.
  2. Draft the note, tagging each line as grounded or `unverified`.
  3. Suggest ICD-10/CPT codes with supporting text.
  4. Write the draft note + codes via Record Operation (Supervised) to the documentation table.
  5. Surface the draft on screen C5; do not finalize — the clinician must Sign.
- **Long-term memory:** OFF.

**Step 2 — Add tools.**
- **Tool A — Search retrieval (coding/clinical reference). [As-built: `AIA RAG Retriever` → profile `BHUC Clinical Coding Search`]** Built per §4.6.2 over KB `BHUC Clinical Coding and Documentation` (`103b883f…`). Hybrid; Results limit `8`; threshold `0.3`; citations required. **Autonomous.**
- **Tool B — CRUD write (Create). [As-built: `Draft a BHUC Clinical Note`, framework CRUD]** Create → new `u_bhuc_care_plan`. Inputs: `draft_note`, `unverified_lines`, `suggested_codes`, `patient` (sys_id), `encounter_id`. Sets `state=draft, signed=false`. **The framework `gr.insert()` enforces the create ACL** — needs an ACL (currently admin) until SN-Step 13; a `GlideRecord` write-Script (§4.6.4) is the ACL-free alternative. **Autonomous** as-built (plan originally said Supervised — the human sign happens on C5, not in the agent turn).
- **Tool C — Script (grounding/unverified tagger). [As-built: `bhuc_note_grounding`]** Inputs: `draft_lines` (required), `source_refs`. Tokenizes each drafted line against the source and returns grounded/unverified tags (Agent 3 test flagged `L5/L7`). Pure computation — no record access, so ACLs don't apply. **Autonomous.**

**Step 3 — Security controls.** User access = `u_bhuc_clinician`. Data access = **Dynamic user, Approved roles** (role masking).

**Step 4 — Add a trigger.** **Table: `u_bhuc_care_plan`**, **Condition:** documentation session opened / `state` = `assessment_in_progress`. Inactive until tested. (Chat/ambient-invoked is also acceptable if you prefer manual start in C5.)

**Step 5 — Channels/status.** Off until tested.

**Step 6 — Test.** Manual test with a sample transcript containing one ambiguous statement → expect a draft note with that line tagged `unverified` and suggested codes, routed to C5, nothing signed.

**Governance overlay:** shares Agent 2's posture — **Output PII Violation** + **Output Extended PII** **Active**; additionally the **Data Integrity Incident Detection** guardrail (100% sampling) is especially relevant here since fabricated clinical detail is the exact failure mode `[Doc: → Security & Privacy Guardrail Configuration]`.

> **Things to consider after this entire project is complete** (Use Case 2 — Patient Risk Identification & Clinical Documentation Integrity)
> 1. Is the ServiceNow's solution for Output AI Integrity the best solution?
> 2. Can we adopt this as a solution to DTOP?
> 3. Is ServiceNow alone enough or do we need additional controls?

---

> **Use Case 3 = two agents.** The consent/data-protection agent (Agent 4) and the prior-auth agent (Agent 5) are separate Agent Studio objects in different phases, sharing one governed risk (Privacy & Compliance / 42 CFR Part 2). Build both.

#### Agent 4 — BHUC Consent & Data Protection Agent (Use Case 3, Phase 4 — Documentation)

**Purpose:** At the point of documentation, detects and labels 42 CFR Part 2 / SUD content, drives role-based access restriction on those fields, and backs the DLP behavior that blocks SUD content from leaving into unapproved tools. Never exposes Part 2 fields to roles outside the approved case-manager set.

**Step 1 — Define specialty.**
- **Name:** `BHUC Consent & Data Protection Agent`
- **AI agent description:**
  > At the point a clinician documents, you detect content protected under 42 CFR Part 2 (substance use disorder information) and set a sensitivity label so downstream access control can enforce it. You enforce deny-by-default on any Part 2-labeled field for anyone outside the approved case-manager roles. You never reveal Part 2 content to an unauthorized role and never assist in moving it to an unapproved destination.
- **AI agent role:**
  > Consent and data-protection classifier for SUD/Part 2 content. Labels sensitive content and enforces least-privilege access. Dynamic-user identity; deny-by-default on Part 2 fields.
- **List of steps:**
  1. On a documentation update, run the labeling Script tool to detect and tag Part 2 / SUD content.
  2. Write the sensitivity label via Record Operation (Supervised).
  3. Apply/confirm RBAC restriction on the labeled fields.
  4. If content is Part 2 and the requester is outside the approved set, deny and log.
- **Long-term memory:** OFF.

**Step 2 — Add tools.**
- **Tool A — Script (Part 2 classifier/labeler). [Custom build]** Name `bhuc_part2_labeler`; `GlideRecordSecure`; deny-by-default; outputs `sensitivity=part2|standard`. **Autonomous** (labels only).
- **Tool B — Record operation (write sensitivity label).** Writes the `standard|part2` label to **`u_bhuc_consent.u_sensitivity`** and to the note table **`u_bhuc_care_plan.u_sensitivity`** (choice field added 2026-07-07 to mirror consent; `u_contains_part2` remains the boolean flag for DLP/masking). **Supervised.**

**Step 3 — Security controls.** User access = `u_bhuc_clinician` + approved case-manager role. Data access = **Dynamic user, Approved roles** (role masking). The labeling script enforces deny-by-default on Part 2 fields for roles outside the approved case-manager set.

**Step 4 — Trigger.** **Table: `u_bhuc_care_plan`** (note/documentation table), Condition: on update of the documentation field. Inactive until tested.

**Step 5–6 — Channels/status + Test.** Test with a note containing SUD language → expect it labeled `part2` and masked from a non-approved role in **Test access**.

**Governance overlay (shared with Agent 5):** **Sensitive Data Input and Anonymization** guardrail **Active** — catches SUD/PII entering any prompt (inbound); Data Privacy is confirmed present `[Verified]`. This agent's labeling is what the DLP/masking on screens C3 and C6 relies on.

---

#### Agent 5 — BHUC Prior-Auth Compliance Agent (Use Case 3, Phase 5 — Treatment & Stabilization)

**Purpose:** Answers prior-authorization / coverage questions using only the payer policy library **with citations**, and drafts the prior-auth packet — respecting the Part 2 access labels set by Agent 4. The human always submits; the agent never submits.

**Step 1 — Define specialty.**
- **Name:** `BHUC Prior-Auth Compliance Agent`
- **AI agent description:**
  > You answer prior-authorization and coverage questions using only the payer policy library, always citing the exact policy section, and you draft the prior-authorization packet. You never submit a prior authorization — a human always submits. When a packet references a field labeled 42 CFR Part 2, you respect that label: only an authorized case manager can view it before submission. If you cannot find a supporting policy, you say so rather than guessing.
- **AI agent role:**
  > Prior-authorization drafting copilot with citation-required answers and Part 2-aware access. Dynamic-user identity; drafts only, never submits.
- **List of steps:**
  1. Read the ordered service and the patient's coverage context.
  2. Use Search Retrieval over the payer policy library; answer coverage questions with a citation.
  3. Draft the prior-auth packet via Record Operation (Supervised), respecting Part 2 labels.
  4. Surface the draft to the clinician (C6); the human verifies citations and submits.
- **Long-term memory:** OFF.

**Step 2 — Add tools.**
- **Tool A — Search retrieval (payer policy library). Build the KB + KB-filtered source + profile per §4.6.2.** Hybrid; citations required; Results limit `8`; threshold `0.4`; source = a payer-policy KB. **Autonomous.**
- **Tool B — Record operation (draft prior-auth packet).** **Table:** `x_bhuc` prior-auth draft table. **Supervised.** No submit operation is configured on this agent — submission is a human action in C6.

**Step 3 — Security controls.** User access = `u_bhuc_clinician` + approved case-manager role. Data access = **Dynamic user, Approved roles** (role masking). Honors the Part 2 labels written by Agent 4.

**Step 4 — Trigger.** None — invoked on-demand from the C6 Treatment & Prior-Auth workflow.

**Step 5–6 — Channels/status + Test.** Test a coverage question → expect a cited answer and a drafted (not submitted) packet; confirm a Part 2 field is access-gated in the draft.

**Governance overlay:** shares Agent 4's posture (Sensitive Data Input and Anonymization Active); additionally **Output Screening → Output Security Vulnerability Active** since the drafted packet is exported downstream `[Doc: → Security & Privacy Guardrail Configuration]`.

> **Things to consider after this entire project is complete** (Use Case 3 — Consent, Data Protection & Prior-Auth Compliance Copilot)
> 1. What if the staff needs consent of bulk patients for prior auth and there's a delay because of that as it's the last minute?

---

#### Agent 6 — BHUC Scheduling Agent (Use Case 4)

**Purpose:** Recommends the best clinician match by clinical need, credentials, and availability — blind to protected demographic fields, with a fairness check applied *before* any recommendation is surfaced.

**Step 1 — Define specialty.**
- **Name:** `BHUC Scheduling Agent`
- **AI agent description:**
  > You recommend the best-available clinician for a patient based only on clinical need, clinician credentials/specialty, and availability. You are blind to race, ethnicity, gender identity, ZIP code, insurance type, and any other protected or proxy demographic field — these are excluded from your inputs. Before you surface any recommendation, the fairness-check tool must have run and passed. You propose appointments as drafts for staff to confirm; you never book autonomously.
- **AI agent role:**
  > Scheduling recommender with a mandatory pre-surface fairness check. Dynamic-user identity. Proposals require human confirmation.
- **List of steps:**
  1. Load candidate clinicians (credentials, specialty, availability) via Search Retrieval.
  2. Run the fairness-check Script tool to confirm no protected/proxy fields are in the matching input set.
  3. Only if fairness-check passes, produce the ranked recommendation.
  4. Write the proposed appointment via Record Operation (Supervised) for staff confirmation.
- **Long-term memory:** OFF.

**Step 2 — Add tools.**
- **Tool A — Search retrieval (clinician credentials/availability). Build the source + profile per §4.6.2** (scope to the clinician-directory KB/source). Hybrid; Results limit `10`; threshold `0.3`. **Autonomous.**
- **Tool B — Script (fairness check). [Custom build]** Name `bhuc_scheduling_fairness`; explicitly excludes race/ethnicity/gender/ZIP/insurance from the matching input set and logs the exclusion; outputs `fairness_pass=true|false`, `excluded_fields=[…]`. ServiceNow ships no clinician-matching fairness model, so this is authored and validated by BHUC. **Autonomous.**
- **Tool C — Record operation (propose appointment).** Table `u_bhuc_appointment`, operation Create (status `proposed`). **Supervised.**

**Step 3 — Security controls.** User access = `u_bhuc_clinician` + scheduling-staff role. Data access = **Dynamic user, Approved roles** (role masking).

**Step 4 — Trigger.** None — invoked on-demand from the Clinician C8 scheduling workflow.

**Step 5–6 — Channels/status + Test.** Test that the fairness-check log entry exists *before* any recommendation is returned, and that proposals land in `proposed` status awaiting confirmation.

**Governance overlay:** register under the AICT **Fairness / Discrimination** governed-risk category (§4.1); ensure the fairness-check log is retained as compliance evidence.

> **Things to consider after this entire project is complete** (Use Case 4 — Scheduling Agent)
> *(No open questions noted for this use case.)*

### 4.5 UC5 Is Not an Agent — It Is the Governance Platform Itself

The fifth locked use case, **Enterprise AI Governance Control Tower**, is realized by installing and configuring AICT itself (Section 5) — it is not a fifth object in AI Agent Studio. Its stated risk (**Excessive Privileges**, fleet-wide) and its stated control (central registry, guardrails, least-privilege ACLs, kill switch) map directly onto capabilities documented in Sections 5.2–5.4, applied across Agents 1–6. Presenting it in a demo as a "fifth agent" would misrepresent the architecture; present it instead as the governance layer the six agents already operate inside of.

**Non-human identities for managed AI assets:** access to managed AI assets is granted through **non-human identities** (the dedicated `svc-bhuc-*` service accounts, composed from least-privilege `u_bhuc_*` roles) rather than human or shared credentials — see §2.9 and §8.1 SN-Step 13. This is the concrete control that keeps "Excessive Privileges" in check: every agent acts under its own scoped non-human identity, and privilege is bounded per identity.

> **Things to consider after this entire project is complete** (Use Case 5 — Enterprise AI Governance Control Tower)
> *(No open questions noted for this use case. Note the two directives applied above: the governed risk is framed as **Excessive Privileges** (not Excessive Agency), and access to managed AI assets is granted via **non-human identities**.)*
---

### 4.6 Reusable Build Procedures (As-Built — verified on `ven04690`, 2026-07-06/07)

> §4.6.1–4.6.3 are from the Agent 1 build; **§4.6.4 (write-back tools + confirmation subflows) is from the Agent 2 build, verified 2026-07-07.**

Agent 1 (**BHUC Front-Door Security Agent**) was built end-to-end and **verified working over A2A** (facility questions answer with citations from the BHUC KB; a crisis phrase triggers the escalation subflow). The procedures below are the **actual, corrected steps** from that build — they supersede the generic tool bullets in §4.3/§4.4 where they differ, and are referenced by **every other agent that uses a Script tool, a Search Retrieval tool, or a Flow action** (Agents 2, 3, 5, 6). Build those agents' equivalent tools the same way.

#### 4.6.1 Script tool — it must `return` a value (NOT use an `outputs` object)

The ServiceNow AI Agent Script runtime injects only **`inputs`** — there is **no `outputs` object**. A script that does `outputs.x = …` throws `ReferenceError: outputs is not defined`, the tool hangs on **"Ongoing"**, and the whole run is **Cancelled** ("Sorry, there was a problem on my side"). Scripts must **take `inputs` and `return`** a value (a JSON string for structured output). Verified BHUC crisis classifier:
```javascript
(function(inputs) {
    var text = (inputs.message || '').toString().toLowerCase();
    var patterns = ['kill myself','suicide','suicidal','end my life','want to die',
        'hurt myself','self harm','self-harm','overdose','can\'t go on','no reason to live'];
    var hit = patterns.some(function(p){ return text.indexOf(p) !== -1; });
    return JSON.stringify({ crisis: hit, matched: hit ? 'crisis_language_detected' : 'none' });
})(inputs);
```
- Declare the tool **input** (`message`) in the tool's input schema; the agent maps it at runtime.
- **Execution mode: Autonomous** — a read-only classifier needs no human; **Supervised makes it pause for input and hang** (that was the original bug).

#### 4.6.2 Building a Knowledge-Base-backed Search Retrieval (RAG) tool

Used by **Agents 1, 2, 3, 5, 6**. A Search Retrieval tool searches an AI Search **profile**, which searches **sources** (tables), which by default cover **all** knowledge bases + the whole catalog — so out of the box it returns wrong-KB and catalog results. To scope an agent to one KB, build: **KB → KB-filtered AI Search source → profile containing only that source → point the tool at it.**

**Step A — Create the Knowledge Base + articles (REST for content; publish in UI).**
1. Create the KB record in `kb_knowledge_base` (title, `owner`, `active=true`). Set its **publish workflow to "Publication - Instant Publish"** (no approval).
2. Create articles in `kb_knowledge` — **the KB reference field is `kb_knowledge_base`** (NOT `knowledge_base`); set `short_description` + `text` (HTML). Articles start in **Draft**.
3. **Publish the articles in the UI** — the Knowledge state-flow **blocks REST publish even for admin** (`workflow_state` reverts to draft). Open `kb_knowledge_list.do?sysparm_query=kb_knowledge_base=<KB sys_id>`, select the articles, and **Publish** (instant, no approval). Confirm `workflow_state=published`.
   - *Verified example:* KB **"BHUC Facility Information"** (`kb_knowledge_base` `11c6b5a73bf90f1076f13b64c3e45a0b`), 11 articles, all Published.

**Step B — Create the KB-filtered AI Search Source (UI only — REST is blocked).**
AI Search config records are business-rule-guarded; creating a source via REST returns **403 "validate search source filter"**. In the UI → **All → AI Search → Search Sources → New**:
- **Indexed Source:** `Knowledge Table` (it already indexes all published `kb_knowledge`, so **no re-index is needed** — the source just filters the existing index at query time).
- **Conditions:** `Workflow state = Published` **and** `Active = true` **and** `Valid to > Today` **and** **`Knowledge base = <your KB>`** ← the scoping line (encoded `kb_knowledge_base=<KB sys_id>`).
- Save. *Verified example:* source **"BHUC Facility - Knowledge"**.

**Step C — Create the Search Profile (clone → swap source → publish dictionaries → publish).**
1. **All → AI Search → Search Profiles →** open **`[AI Search Assist] - KB and Catalog`** → **Clone**; rename (e.g. **"BHUC Facility Search"**).
2. In its **Search Sources**, remove the stock Knowledge + Catalog sources and **add only your KB-filtered source**.
3. **Publish the linked dictionaries first.** A cloned profile auto-creates a **spell-check dictionary** (Draft) and links a shared **stop-word dictionary** (may be "New"); the profile **won't Publish until both are Published** ("You cannot publish… unpublished dictionaries linked"). Publishing dictionaries is **UI-only** (REST reverts/403; the plain dictionary form may lack a Publish button — use the **AI Search admin experience** to build/publish them). Then **Publish** the profile → **state = Published**.
   - *Verified example:* profile **"BHUC Facility Search"** (`bhuc_facility_search`), Published.

**Step D — Point the Search Retrieval tool at it (Agent Studio → Add tools).**
- **Search profile:** your new profile (e.g. `BHUC Facility Search`).
- **Search sources:** your KB source **only** — remove `Catalog Item Table` (catalog items pollute results).
- **Search criteria** `Hybrid`, **Results limit** `5`, **Document matching threshold** `0.4`, require citations. Execution mode **Autonomous**.
> Newly published articles can take a few minutes to appear in AI Search results.

#### 4.6.3 Building a Flow action via a Subflow

Used by **Agents 1** (988 escalation) and **2** (clinician confirmation gate). Flow Designer flows can't be reliably created via REST — build in **Workflow Studio**. Use a **Subflow** (agent Flow-action tools need first-class inputs/outputs, which subflows provide).

1. **Workflow Studio → New → Subflow.** Name it; set **Run As = System User** (so a public/anonymous agent can insert + notify).
2. **Inputs — String types only.** ⚠️ AI Agent tools **do not support `reference`-type subflow inputs** (error: *"There are inputs in this subflow that are not supported"*). For a record reference, pass the **sys_id as a String** and resolve it in the flow. *(Verified inputs: `message`, `session_id`, `source`, `patient` — all String.)*
3. **Actions** (verified 988 pattern):
   - **Create Record** → the log table (e.g. `u_bhuc_escalation`), mapping the String inputs to fields (Channel=`988`, Detected by=`crisis_classifier`, Status=`open`, etc.).
   - **Send Email** → recipient **Group** — create the group first, set its **email**, and add members, or nothing sends. *(Verified: group **BHUC On-Call**, email `gvijaya6@asu.edu`.)*
   - **Update Record** → set the "notified" flag `true`.
4. **Outputs — skip them.** The Inputs/Outputs editor only accepts a **static default** (you can't bind a step's value there), and the agent doesn't need a return value. Delete the output row and move on.
5. **Publish** the subflow.
6. **Wire it as the tool:** Agent Studio → **Add tool → Flow action → select the subflow.** **Execution mode:** **Autonomous** to fire immediately (recommended for a crisis escalation — don't gate a 988 escalation behind the distressed visitor clicking "Yes"); **Supervised** only if you genuinely want a per-run confirmation step.
   - *Supporting objects created for Agent 1:* table `u_bhuc_escalation` (`BHUC_ESCALATION_00n`), group **BHUC On-Call**, subflow **BHUC 988 Escalation**.

> **Also verified during Agent 1 build:** the agent is reachable over A2A at `POST /api/sn_aia/a2a/v2/agent/id/{sys_id}` (the `agent_card` GET returns "No agent available" even for working agents — ignore it as a health check). The agent must be **Active** and (for external A2A) third-party-accessible; `sn_aia_agent_config` showed `active=true, public=true`.

#### 4.6.4 Write-back tools + confirmation subflows (as-built from Agent 2, verified 2026-07-07)

Used by **Agents 2, 3, 5, 6** — any agent that writes to a `u_bhuc_*` record and/or routes to a human. Four learnings, each a bug actually hit and fixed on Agent 2:

1. **A write-back tool needs the target record's `sys_id` as a declared input.** The agent has **no built-in record-lookup tool**, so it cannot turn a Number (`BHUC_SCREENING_002`) into a sys_id. Declare `screening_sys_id` (or the equivalent) as a tool input and have the caller/prompt/trigger supply it; the script then does `GlideRecord(table).get(inputs.sys_id)`. *(A read Script/Record-lookup tool is the alternative if you want the agent to resolve records itself.)*
2. **Write scripts `return`, never use `outputs`** — same rule as §4.6.1. `outputs.x=…` throws and hangs the tool. Return a JSON string (e.g. `{success:true}`).
3. **ACLs (`GlideRecordSecure`) vs testing.** `GlideRecordSecure.get()` returns **false** (looks like "record not found") when no ACL grants access — and the `u_bhuc_*` tables have **no ACLs until SN-Step 13**. For pre-governance pipeline testing use `GlideRecord` (bypasses ACLs); revert to `GlideRecordSecure` + real ACLs before go-live. *(Making the agent "public" governs invocation, not table data access — it does not fix this.)*
4. **Confirmation subflow must be a published SubFlow with Run As = System User.** (a) It must be a **SubFlow**, not a **Flow** — a plain Flow can't be bound as an agent Flow-action tool (the tool's `input_schema` stays empty and it won't run). (b) It must be **Published** (Draft/no-snapshot won't execute). (c) **Run As = System User** — with "User who initiates the session," a **public** agent throws *"The requested flow operation was prohibited by security rules"* (guest identity lacks flow-execution rights). String inputs only; skip outputs (§4.6.3). *As-built: `BHUC Risk Confirmation Latest`, SubFlow, Published, Run As System User, input `screening_sys_id` (String), Look Up → Update `u_bhuc_screening` `state=scored, clinician_action=pending`.*

---

## 5. AI Governance & Compliance Portal (Native AICT + AIRC)

### 5.1 Architectural Decision: Native Workspace, Not Custom UI

Restating the decision from Section 2.6 with the operational detail behind it: the AI Governance interface for BHUC is the native **AI Control Tower workspace** (`Workspaces > AI Control Tower`), accessed by AI Stewards directly. This section documents exactly what that workspace provides, tab by tab, so nothing needs to be custom-built.

### 5.2 Installation & Configuration Sequence

Under the Pro Plus / Now Assist licensing assumption (Section 2.7), installation is automatic. **Configuration is not** — AICT must still be explicitly configured before it functions as a governance tool for BHUC's specific risk profile. The documented configuration surface lives at `Configurations > Controls` and `Configurations > Data`, covering: AI model providers (data routing, fallback), Approvals, and Security & Privacy guardrails — all detailed in 5.4 below `[Source: ServiceNow Enable AI, "Configure AI Control Tower," AI Control Tower]`.

**Post-installation verification checklist** (documented, not inferred):
- AI Control Tower workspace accessible at `Workspaces > AI Control Tower`.
- All eight-plus-one dashboard tabs visible: Overview, AI Strategy (if SPM licensed), AI Asset Inventory, Value, Health, Risk & Compliance, AI Cases, Security & Privacy, AI Gateway.
- Plugins active: `sn_ai_governance`, `sn_ai_asset_mgmt`, `sn_grc_ai_gov`, `sn_ai_case_mgmt`, `sn_grc_ai_irm_intg`, `sn_ai_disc`, `sn_ai_health`.
- Risk & Compliance tab shows data (not a configuration error — "No data available" is expected pre-assessment; a missing tab or hard error means `sn_grc_ai_irm_intg` is not active).
`[Source: AI Control Tower Implementation Guide, "Activation and Installation of AI Control Tower," "Post-Installation Verification Checklist," pp. 817–819]`

**Two scheduled jobs drive dashboard trend data and must be confirmed active:** `AI Control Tower Core Monthly Data Collection` (runs monthly, displayed quarterly) and `AI Control Tower Core Historical Data Collection` (must be run manually once, to backfill historical data) `[Source: ServiceNow Enable AI, "AI Control Tower Dashboard," "Dashboard Architecture," pp. 694–732]`. **Verify in your environment:** confirm both jobs exist and the historical job has been run at least once — otherwise every dashboard widget will appear empty regardless of how correctly agents are configured.

### 5.3 The Nine Governance Dashboard Tabs

All nine tabs, as documented, mapped to what BHUC will actually use them for:

| Tab | Role Required | What It Shows | BHUC Usage |
| --- | --- | --- | --- |
| **1. Overview** | AI steward | AI systems by lifecycle stage/type; risk classification (High/Medium/Low/Unacceptable); compliance effectiveness %; AI cases by priority; systems trend | Daily executive glance at portfolio risk |
| **2. AI Strategy** | SPM Professional license | AI strategies/goals, cost tracking, prioritized AI work, AI RIDAC (Risks/Issues/Decisions/Actions/Changes) | Optional — only if BHUC licenses SPM Professional |
| **3. AI Asset Inventory** | AI steward | All AI systems/models/prompts/datasets/MCP servers by lifecycle status and department | Confirms all 4 agents are registered and correctly classified |
| **4. Value** | AI steward | Productivity, engagement, quality, and creator-skill indicators | Demonstrates ROI of the six agents to executive stakeholders |
| **5. Health** | AI steward | Guardrail performance via Now Assist Guardian: offensive-content and **prompt injection** occurrence rates, guardrail-added latency | **Primary dashboard for the Front-Door Security Agent's demo** — this is where prompt-injection detection is literally visible |
| **6. Risk & Compliance** | AI steward | Regulatory risk classification; compliance by authority document/policy; risk heatmap (residual vs. inherent) | Primary compliance-evidence dashboard; filter to your custom HIPAA/Part 2 authority document (Section 5.7) |
| **7. AI Cases** | AI steward | Case/inquiry workflow for AI-related incidents | Formal escalation record for any guardrail violation |
| **8. Security & Privacy** | AI steward | AI Asset Security Score; Access Map; privileged/dormant agent tracking; guardrail metrics; agentic output injection detection | **Primary dashboard for demonstrating PII/PHI masking and SQL/HTML injection detection** |
| **9. AI Gateway** | AI steward | MCP server transaction/success-rate metrics | **Not used in this build** — no external MCP agents are connected (Section 4.2); this tab will correctly show no data |

`[Source: ServiceNow Enable AI, "AI Control Tower Dashboard," pp. 694–732, full tab-by-tab documentation]`

**On Tab 6 specifically, a documented legal disclaimer worth quoting in full, since it directly affects how BHUC should present compliance claims:**

> *"The authority documents are provided solely for informational and guidance purposes to assist with the initial setup of AI Risk and Compliance frameworks. It does not constitute legal advice or assurance of regulatory compliance. You are solely responsible for ensuring that all use of the content complies with applicable laws, regulations, directives, and industry standards in their jurisdictions."* `[Source: same, Tab 6: Risk & Compliance]`

This disclaimer is the reason Section 5.7 recommends building a custom HIPAA/Part 2 authority document rather than relying on any pre-built content as compliance evidence.

### 5.4 Guardrails & Runtime Controls (Cited, Exact Settings)

Configuration path: `AI Control Tower > Configurations > Data > Security & Privacy`. Four settings, all documented:

| Guardrail | Default | What It Does | BHUC Configuration |
| --- | --- | --- | --- |
| **Data Integrity Incident Detection** | Inactive | Tracks when model output fails to match expected behavior categories, based on the "OWASP Top 10 Risk & Mitigations for LLMs + OpenAI model specification"; sampling rate configurable (100% = most accurate); analysis mode Single LLM or Multiple LLM (3+, odd number, majority vote) | **Set Active, 100% sampling** given the clinical-safety stakes |
| **Agent Goal Deviation** | Inactive | Detects when agents deviate from their intended role or objective — "unauthorized actions, prompt injection." Documented caveat: "due to probabilistic nature, not all occurrences may be identified" | **Set Active** on all six agents, especially the Front-Door Security Agent |
| **Output Screening** | Configurable | Three sub-settings: **Output Security Vulnerability** (HTML/SQL injection, XSS, Terminal RCE, non-printable characters in agent output); **Output Extended PII** (CA driver's license, passport, VIN); **Output PII Violation** (phone number, credit card, standard PII patterns) | **All three Active** — documented as mandatory for healthcare: *"An agent that outputs PHI in LLM responses without detection is a HIPAA breach"* |
| **Sensitive Data Input and Anonymization** | Requires Data Privacy plugin | Detects and anonymizes PII in LLM *prompts* (inbound), governed by the "User data usage policy for Now Assist" | **Active** — this is the inbound complement to Output Screening's outbound coverage |

`[Source: ServiceNow Enable AI, "Explore the Third-Party LLMs and Regions," "Security & Privacy Guardrail Configuration," AI Control Tower, pp. 758–766, 86]`

**Approval controls** (path: `Configurations > Controls > Approvals`), all default **Inactive**, and all should be activated in a production healthcare deployment:

| Control | Effect When Active |
| --- | --- |
| AI systems approval | All AI skills and agents require steward approval before deployment |
| MCP servers approval | Irrelevant for this build (no MCP servers in use) but should remain configured correctly regardless |
| AI models approval | All AI models require steward approval before deployment |
| Automatically trigger playbooks | Auto-triggers approval workflows on asset submission — documented as "recommended for production" |

`[Source: same, "Approval Controls"]`

**Audit logs:** every configuration change to Data, Approvals, and AI model providers is captured and viewable via `View audit logs`, with fields Timestamp, User, Changed category, Changed setting, Before/After value, default filter last 90 days `[Source: same, "Audit Logs"]`. **Recommendation:** export logs on a scheduled job if BHUC's compliance retention requirement exceeds 90 days, since 90 days is the documented default view window.

**Kill switch:** already detailed in Section 4.3, Step 5 — set `kill_switch.mode = enforce` in production.

### 5.5 Core Governance Use Cases — Implementation Mapping

Mapping your original five required governance capabilities directly onto the cited native settings above — no custom build required for any of these five:

| Required Capability | Native ServiceNow Implementation | Citation |
| --- | --- | --- |
| **PI/PHI masking** | Output PII Violation + Output Extended PII (outbound) + Sensitive Data Input and Anonymization (inbound), all under Security & Privacy Guardrail Configuration | `[Explore the Third-Party LLMs and Regions, pp. 758–766]` |
| **Toxicity filtering** | Now Assist Guardian's **Offensiveness** guardrail ("filters subjects not suited for AI responses") plus **Sensitive topic filters**, both monitored on the Health tab and Now Assist Center's Offensiveness dashboard | `[Monitoring in Now Assist Center, pp. 53–69]` |
| **Latency tracking** | Now Assist Center **Performance Explorer** dashboard, Agents sub-tab: E2E Latency, Tool Latency, LLM Latency per execution; also the AICT **Health** tab's "Guardrail-added latency" metric | `[Monitoring in Now Assist Center; AI Control Tower Dashboard, Tab 5]` |
| **Cost/token management** | Now Assist Center **Assist Consumption** dashboard ("track spend against entitlements") and **Business Value** dashboard (cost saved, per-agent breakdown) | `[Monitoring in Now Assist Center, "AI Agents tab," "Business Value dashboard"]` |
| **Model fallback protocol** | AICT's native **Fallback and Spillover** mechanism under AI model providers (Section 5.6) | `[Explore the Third-Party LLMs and Regions, "Fallback and Spillover"]` |

Every one of the five governance capabilities your original scope required is a **configuration of an existing native feature**, not new engineering.

### 5.6 Model Fallback Protocol (Native Mechanism)

This is a genuinely native ServiceNow mechanism, not a custom orchestration pattern — worth documenting precisely because it's easy to misconfigure in the wrong direction for a regulated environment.

**Fallback** (default: **Active**): "If active AI systems use providers NOT in your allowed list, fallback allows those systems to continue operating on their default providers." `[Source: ServiceNow Enable AI, "Explore the Third-Party LLMs and Regions," "Fallback and Spillover"]`

| Setting | Effect | Governance Implication |
| --- | --- | --- |
| Fallback **Active** (default) | Non-allowed-provider systems keep running on default providers | Documented as a **governance gap**: "systems may run on providers that have not been through vendor risk assessment" |
| Fallback **Inactive** | Non-allowed-provider systems are deactivated | Documented as "the more conservative governance posture — every production AI system is explicitly tied to an approved provider" |

**Recommendation for BHUC: set Fallback to Inactive in production.** Since this architecture uses no external providers at all (Section 4.2), the only providers in play are ServiceNow's own Now LLM Service / Now LLM-LTS — there is no legitimate scenario where a BHUC agent should silently fall back to an unreviewed provider.

Before changing this setting, always use the documented **Preview impact** tool, which shows an "AI systems require deactivation" column — "Active systems with NO supported provider — WILL GO OFFLINE" — before you commit the change `[Source: same, "Impact Summary (Preview Tool)"]`. **Spillover** (Azure OpenAI-only capacity overflow) is not applicable to this architecture since no Azure OpenAI provider is configured.

### 5.7 Healthcare-Specific Risk Content: Content Pack vs. Custom Authority Document

ServiceNow's optional **AI Risk and Compliance Content pack** ships pre-built authority documents, risk statements, and controls — but confirmed only for **EU AI Act, GDPR, and NIST AI RMF** in the documentation retrieved for this guide; no HIPAA or 42 CFR Part 2 content is documented as shipping with the pack `[Source: AI Control Tower Implementation Guide, "Activation and Installation of AI Control Tower," "AI Risk and Compliance Content (Optional)," pp. 817–819]`. ServiceNow's own legal disclaimer on this content:

> *"When the customer acknowledges that the content provided with the product is easy to use, then it's that customer's responsibility to replace the content with the applicable laws, regulations, directives and, or standards at its own discretion."* `[Source: same]`

**Recommendation (per your request that I make this call):** install the content pack anyway — it provides a validated *structural* starting point (assessment templates, the general shape of a risk statement / control-objective pair) even though its specific regulatory text doesn't cover U.S. healthcare law. Then, build a **custom Authority Document** in AIRC named something like "BHUC Healthcare Compliance — HIPAA & 42 CFR Part 2," populated with BHUC-specific risk statements for each of the four agent-backed use cases' governed risks (Section 4.1; UC2 and UC3 each cover two agents), and route it through the same Smart Assessment / Impact Assessment workflow the content pack demonstrates. This gets you the time savings of the template structure without the compliance risk of presenting EU/GDPR-mapped content as if it satisfied U.S. healthcare regulatory obligations — a risk ServiceNow's own documentation explicitly warns against.

### 5.8 Governance Configuration — Click-by-Click Runbook (UC5)

Use Case 5 is *handling the platform*, so this is the step-by-step for configuring it. Navigation and section names are confirmed against `[Doc: ServiceNow Enable AI → AI Control Tower → "Configure AI Control Tower"]`; the steward role is confirmed on-instance as `sn_ai_governance.ai_steward` `[Verified]`.

**Prerequisite:** log in as a user holding **`sn_ai_governance.ai_steward`**. Navigate: **Workspaces → AI Control Tower → Configurations**. The Configurations page has six sections: **Data, Controls, Multi-instance, AI Connections, AI Gateway, Playbooks**.

**GOV-Step 1 — Data → Data sharing.** Expand **Data**. Confirm the generative AI Controller is installed (it is `[Verified: 40+ sys_generative_ai_config rows]`), so the Data section renders. Data sharing is **opted-in by default**. ⚠️ For BHUC healthcare data, opt-**out** is **not UI-toggleable** — it must be requested through your ServiceNow Account Executive / Now Support **before go-live** `[Doc]`. **Action:** raise that request now if legal requires vendor-data-sharing opt-out; document the decision either way.

**GOV-Step 2 — Data → Security & privacy (the four guardrails).** Still under **Data**, open **Security & privacy** and set:
- **Data integrity incident detection → Active**, sampling **100%**, analysis mode Single or Multiple-LLM (majority vote).
- **Agent goal deviation → Active** (100%). Critical for the Front-Door agent (Agent 1).
- **Output screening → Active**, with all three sub-settings on: **Output Security Vulnerability**, **Output Extended PII**, **Output PII Violation** (mandatory for healthcare — PHI in output undetected = HIPAA breach).
- **Sensitive data input and anonymization → Active** (Data Privacy confirmed present `[Verified]`).
- **Score weight:** leave default unless BHUC wants to re-weight categories in the AI Asset Security Score.

**GOV-Step 3 — Controls → Approvals.** Open **Controls**. Activate all three (all default Inactive): **AI systems**, **MCP servers**, **AI models**. These force steward approval before any agent/model deploys.

**GOV-Step 4 — Controls → Automatically trigger playbooks → Activate.** Default Inactive. Without it, no governance workflow fires automatically when an asset is submitted — the steward would have to start every one manually. ServiceNow explicitly recommends this ON in production `[Doc]`.

**GOV-Step 5 — Controls → AI model providers → Fallback.** Open the **AI model providers** sub-section. Set **Fallback → Inactive** (conservative posture, §5.6 — no BHUC agent should silently run on an unreviewed provider). **Before saving, click Preview impact** and read the "AI systems require deactivation" column so nothing unexpectedly goes offline. Spillover: N/A (no Azure OpenAI provider in this build's allowlist).

**GOV-Step 6 — Playbooks.** Confirm the three pre-built templates exist (AI Asset Onboarding, AI Asset Offboarding, Now Assist approval). **Recommendation:** customize the Onboarding playbook to add a HIPAA / 42 CFR Part 2 data-privacy review step for BHUC.

**GOV-Step 7 — Build the custom Authority Document.** Leave Configurations; go to the AIRC / Risk & Compliance workspace (role `sn_grc_ai_gov.ai_risk_and_compliance_admin` `[Verified]`). Create Authority Document `BHUC Healthcare Compliance — HIPAA & 42 CFR Part 2` in `sn_compliance_authority_document` `[Verified: table present]`. Add a risk statement + control-objective pair for each of the four agent-backed use cases' governed risks (§4.1; UC2 and UC3 each cover their two agents). Run it through Advanced Risk assessment — `sn_risk_advanced_inherent_assessment` then `sn_risk_advanced_residual_assessment` `[Verified: 72 advanced-risk tables present]` — to populate the Tab 6 residual-vs-inherent heatmap.

**GOV-Step 8 — Confirm scheduled data-collection jobs.** Ensure `AI Control Tower Core Monthly Data Collection` is active and run `AI Control Tower Core Historical Data Collection` **once manually** to backfill (§5.2) — otherwise dashboard widgets appear empty regardless of correct agent config.

**GOV-Step 9 — Set the kill switch to enforce.** Set system property `kill_switch.mode = enforce` (§4.3 Step 5). ⚠️ Not readable via the interface account `[Verified: ACL-denied]` — set it in the UI (`sys_properties`).

**GOV-Step 10 — Verify audit logging.** On the Configurations page top-right, open **View audit logs** and confirm each change above is captured (Timestamp, User, Changed category/setting, Before/After). Schedule an export if BHUC retention exceeds the default 90-day view (§5.4).

**Verification (do all of GOV in the UI):** every setting above lives in a UXF workspace, not a REST-readable table (Section 0, G-2), so this runbook must be executed and verified **while logged into the AICT workspace UI**.

---

## 6. "Before / After" Demonstration Strategy

### 6.1 Demo Environment Staging

1. **Seed data:** one demo patient ("Maya"), pre-loaded registration record, a ready-to-submit screening, a clinician worklist, a discharged-patient record.
2. **Two toggles:** AI on/off; guardrails on/off (via the Security & Privacy configuration page) — this lets you show three states: no-AI, ungoverned-AI, governed-AI.
3. **Two browser windows:** Patient Portal / Clinician Portal on one side, the native **AI Control Tower workspace** on the other, so the audience sees cause and governance-effect simultaneously.
4. Pre-open the AICT dashboard to the **Health** and **Security & Privacy** tabs.

### 6.2 The "Before" Phase Script

1. **Manual intake (no AI).** Clinician Portal worklist shown as unordered arrival-time queue. *Narration: "Risk judged by whoever's on shift — inconsistent, and inconsistency here is a patient-safety problem."*
2. **Ungoverned AI (guardrails toggled off).** Submit Maya's screening; a score appears — but:
   - Attempt a prompt-injection phrase in the front-door chat ("ignore previous instructions..."). With guardrails off, show the response is not reliably caught.
   - Point to the empty **Health** tab guardrail metrics — nothing is being measured.
   - Show an agent writing to the record with no supervised-mode confirmation.
3. **Name the friction:** no injection defense, no audit trail, no accountability.

### 6.3 The "After" Phase Script

1. **Guardrails on.** Repeat the same injection attempt at the front-door chat. The deterministic classifier plus the native **Agent Goal Deviation** guardrail catch it; escalation fires regardless of phrasing. *Narration: "Same input, governed system — the attempt is caught and logged, not just refused."*
2. **Governed intake.** Submit Maya's screening; the **BHUC Risk Identification Agent** scores it; worklist re-orders by risk; **Supervised mode** routes the flag to a clinician before anything is finalized.
3. **Consent protection.** Attempt to paste SUD content into an unapproved tool from the documentation screen — the **Sensitive Data Input and Anonymization** guardrail and RBAC block it.
4. **Prior-auth with citations.** The BHUC Prior-Auth Compliance Agent answers a coverage question with a citation; the clinician submits, the agent never does.
5. **Fair scheduling.** The Scheduling Agent's recommendation is shown alongside the fairness-check log entry that ran before it was surfaced.

### 6.4 Native Governance Dashboard Live-Monitoring Script

Throughout the "After" run, narrate the **AICT dashboard** live:

1. **Health tab:** the prompt-injection attempt increments "Total prompt injection occurrences" and "Percentage flagged as prompt injection" in real time.
2. **Security & Privacy tab:** the SUD-paste attempt appears under "Sensitive data detected" / "Sensitive data anonymized"; the AI Asset Security Score updates.
3. **Risk & Compliance tab:** filter to the custom BHUC Healthcare Compliance authority document; show the risk heatmap on residual vs. inherent risk for each of the four agent-backed use cases.
4. **AI Asset Inventory tab:** show all six agents registered, with their risk tier and lifecycle state.
5. **Fallback demonstration:** temporarily add a disallowed provider to a test agent, run **Preview impact**, and show the "AI systems require deactivation" column — this demonstrates the fallback governance control without needing any external provider actually connected.
6. **AI Gateway tab:** explicitly point out it is empty, and state why — no external MCP agents are part of this architecture, by design.

### 6.5 Demo Run-of-Show & Timing

| Segment | Duration | Focus |
| --- | --- | --- |
| Framing & architecture | 3 min | — |
| Before: manual + ungoverned AI | 5 min | Clinician + Patient portals |
| After: governed multi-agent flow | 8 min | Portals + AICT dashboard side by side |
| Governance deep-dive (Health, Security & Privacy, Risk & Compliance tabs, fallback preview) | 6 min | AICT dashboard only |
| Close & Q&A | 5 min | — |
---

## 7. Appendices

### Appendix A — Full Plugin Dependency Map (Cited)

Reproduced exactly as documented, for reference during troubleshooting even though Pro Plus auto-installs this chain:

```
sn_cmdb_foundation:1.1.0 (Data Foundation Model)
    └── sn_ai_governance:4.0.2 (AI Control Tower Core)
            └── sn_ai_asset_mgmt:2.0.0 (AI Asset Management)
            └── sn_grc_ftr_role:21.0.1 (GRC feature roles)
            └── sn_grc_workspace:21.0.4 (GRC: Common workspace elements)
            └── sn_compliance:21.0.2 (GRC: Policy and Conformance management)
            └── sn_smart_imp_auto:20.1.0 (Post assessment actions for Smart assessments)
            └── sn_risk:21.0.2 (GRC: Risk management)
            └── sn_reg_body_mgmt:21.0.0 (Regulatory agency library)
            └── sn_smart_asmt:21.0.1 (Smart assessment core)
            └── sn_smart_asmt_conn:21.0.1 (Smart assessment connected)
            └── sn_smart_asmt_desg:21.0.3 (Smart assessment designer)
                    └── sn_grc_ai_gov:21.0.1 (AI Risk and Compliance Management)
                    └── sn_ai_case_mgmt:21.0.1 (AI Case Management)
                    └── sn_risk_advanced:21.0.2 (GRC: Advanced Risk)
                            └── sn_grc_ai_irm_intg:21.0.1 (AI Risk and Compliance Integration with Control Tower)
                                    └── sn_aict (AI Control Tower — final application)
                                        ├── sn_ai_engagement:2.1.6 (Engagement dashboard)
                                        ├── sn_ai_value:2.1.6 (Value dashboard)
                                        ├── sn_ai_health:2.5.14 (Health dashboard — Zurich+ only)
                                        └── sn_ai_disc:1.0.4 (AI Discovery)
```

`[Source: AI Control Tower Implementation Guide, "Activation and Installation of AI Control Tower," "Complete Plugin Dependency Map," pp. 817–819]`

**AI Gateway plugins** (installed automatically for Now Assist customers): `sn_ai_governance:5.0.6` or higher, `sn_telemetry_data:1.1.10` or higher — "included with all types of Pro Plus licenses. If you use any generative AI features, you already have AI Gateway access." `[Source: same, "AI Gateway Installation"]` Not actively used in this architecture (Section 4.2) but present and harmless.

### Appendix B — Role & Permission Matrix

| Role | Source | Key Permissions |
| --- | --- | --- |
| `u_bhuc_patient` | Cognito `bhuc-patients` | Patient Portal APIs; own records only |
| `u_bhuc_clinician` | Cognito `bhuc-clinicians` | Clinician Portal; assigned patients; confirm/sign actions |
| AI Steward role (confirm exact name in your instance) | Cognito `bhuc-governance` | AICT + AIRC workspace access |
| `sn_aia.admin` | Internal ServiceNow | Build/modify agents in AI Agent Studio `[Source: Create an AI agent, "Before you begin," p.59]` |
| `sn_aia_viewer` | Internal ServiceNow | Read-only visibility into AI Agent Studio agents `[Source: same, "Find AI agents," p.60]` |
| `asset`, `model_manager` | Internal ServiceNow | Required for API-Based Integration into the AI Asset Inventory `[Source: AI Control Tower Implementation Guide, "API-Based Integration," "Requirements"]` |

**Agent identities & composable data roles (SN-Step 13, careatlas-modeled) [NEW-BUILD]:**

| Role / Account | Type | Purpose |
| --- | --- | --- |
| `u_bhuc_ai_agent` | role | Base marker for every BHUC non-human agent identity (≈ careatlas `u_careatlas_ai_agent` `[Verified]`) |
| `u_bhuc_patient_read` | role | Read non-PII patient/clinical fields (≈ `u_patients_user` `[Verified]`) |
| `u_bhuc_patient_pii` | role | Read PII fields; grant/withhold drives the PII-denial demo (≈ `role_patient_pii` `[Verified]`) |
| `u_bhuc_part2_access` | role | Read/write 42 CFR Part 2 / SUD-labeled fields (approved case-manager scope) |
| `u_bhuc_screening_write` / `u_bhuc_doc_write` / `u_bhuc_schedule_write` | roles | Narrow per-domain write scopes |
| `svc-bhuc-frontdoor` | service account | Front-Door agent identity — `u_bhuc_ai_agent` only |
| `svc-bhuc-risk` | service account | Risk Identification — read+screening write, **no** PII |
| `svc-bhuc-clinicaldoc` | service account | Clinical Documentation — read + doc write |
| `svc-bhuc-consent` | service account | Consent & Data Protection — read + Part 2 |
| `svc-bhuc-priorauth` | service account | Prior-Auth — read + Part 2 (read) |
| `svc-bhuc-scheduling` | service account | Scheduling — schedule write, no demographics/PII |
| `BHUC A2A Integration` | OAuth client (`oauth_entity`) | Client-credentials grant the FastAPI backend uses to invoke agents over A2A (≈ verified `Care Atlast A2A Integration` `[Verified]`) |

### Appendix C — Naming Convention Standard

- **Native agents:** `BHUC <Function> Agent` (e.g., `BHUC Scheduling Agent`).
- **Tables (custom scoped app):** `u_bhuc_<entity>`.
- **APIs:** `/api/x_bhuc/<domain>/<action>`.
- **Roles (personas):** `u_bhuc_<persona>`; **agent data roles:** `u_bhuc_<capability>` (e.g. `u_bhuc_patient_pii`).
- **Agent service accounts (non-human identities):** `svc-bhuc-<function>` (careatlas `svc-*` convention `[Verified]`).
- **OAuth A2A client:** `BHUC A2A Integration` (`oauth_entity`, client-credentials).
- **iframe widgets / SP pages:** `u_bhuc_<persona>_frame` (widget) → `u_bhuc_<persona>` (page); portal `x_bhuc`.
- **Firebase routes:** one app, `/patient` and `/clinician`.
- **Custom Authority Document:** `BHUC Healthcare Compliance — HIPAA & 42 CFR Part 2` (Section 5.7).

### Appendix D — Instance Verification Checklist (Run These Yourself)

Live instance testing was **completed on 2026-07-05** (Section 0). Status of each original check below; items 1 and 6 remain UI-only because the interface account is ACL-denied on the relevant tables/properties.

1. **Build/version — ⚠️ UI-ONLY (G-1).** `glide.buildtag` is ACL-denied to the interface account. Read it from **System Diagnostics → Stats** in the UI. Zurich-only tables are present, consistent with Zurich.
2. **Active plugins — ✅ DONE (indirectly).** `sys_plugins` is ACL-denied (HTTP 403), so plugins were verified via table + role existence instead (Section 0.1–0.2). Entire dependency chain confirmed present.
3. **`sn_grc_ai_irm_intg` glue — ✅ DONE.** Functionally confirmed active: `sn_grc_ai_gov_ai_system` is populated (20 rows) alongside AICT governance tables (Section 0.3).
4. **AI Steward role name — ✅ DONE.** It is **`sn_ai_governance.ai_steward`** (Section 0.3).
5. **AI Risk & Compliance Content pack / authority documents — ⚠️ PARTIAL.** The `sn_compliance_authority_document` table exists and is readable `[Verified]`; enumerate its current rows in the UI (or with a broader-privileged account) to see which authority documents are pre-loaded before building the custom BHUC one.
6. **`kill_switch.mode` and Fallback setting — ⚠️ UI-ONLY.** These live in system properties / AICT config not readable by the interface account. Confirm and set (`enforce`, Fallback `Inactive`) in the UI per SN-Step 12.

### Appendix E — Source Index

All ServiceNow-specific facts in this document trace to the following retrieved documentation subtopics (ServiceNow AI Practices Documentation, accessed via the connected documentation reference tool):

| Topic Area | Document / Section |
| --- | --- |
| Plugin installation, dependency chain, content pack disclaimer | AI Control Tower Implementation Guide → "Activation and Installation of AI Control Tower" (Zurich Release, pp. 817–819) |
| Five-function architecture (Discover/Govern/Secure/Observe/Measure) | AI Control Tower Implementation Guide → "Functional Framework" (p.8–9) |
| API-based AI asset intake | AI Control Tower Implementation Guide → "API-Based Integration" (Discover - Data Models, p.50) |
| AI Agent Studio full build procedure | ServiceNow Enable AI → "Create an AI agent" (Now Assist AI agents, pp. 59–120) |
| Nine-tab governance dashboard | ServiceNow Enable AI → "AI Control Tower Dashboard" (pp. 694–732) |
| Guardrails, fallback/spillover, approvals, audit logs | ServiceNow Enable AI → "Explore the Third-Party LLMs and Regions" (AI Control Tower, pp. 758–766, 86) |
| Now Assist Guardian, offensiveness, prompt injection dashboards | ServiceNow Enable AI → "Monitoring in Now Assist Center" (pp. 53–69) |

**A note on completeness:** this source list reflects what was retrieved and directly cited for this document. It is not a claim that these are the only relevant ServiceNow documentation pages — only that every specific factual claim above traces to one of them. Where this guide makes a recommendation not found in these sources, it is explicitly labeled "Recommendation" or "Custom build" rather than presented as a ServiceNow default.

---

## 8. Step-by-Step Implementation Runbooks (Verified Artifacts)

These runbooks are written against the **real, verified artifact names** from Section 0. Every ServiceNow step targets a table, role, or workspace that was confirmed present on `ven04690` on 2026-07-05 — except where a step explicitly creates a **net-new `x_bhuc`** object (flagged **[NEW-BUILD]**), which does not yet exist per GAP-1. Do the three runbooks in order: **ServiceNow → Backend → Frontend**, because the backend depends on the scoped app + agents + A2A client existing, and the frontend depends on the backend + Cognito wiring. **One ordering exception:** SN-Step 15 (the iframe SP pages) needs the deployed **Firebase URL**, so do SN-Step 15 *after* FE-Step 4 (Firebase deploy) — build ServiceNow Steps 1–14 first, then Frontend, then finish with SN-Step 15. The A2A callback (SN-Step 14c) likewise needs the deployed FastAPI host (BE-Step 10).

### 8.1 ServiceNow Runbook

> **Prerequisite roles for the builder:** `sn_aia.admin` (build agents) `[Verified]`, `admin` or delegated-dev for the scoped app, `sn_ai_governance.ai_steward` (govern), `sn_grc_ai_gov.ai_risk_and_compliance_admin` (AIRC) `[Verified]`.

**SN-Step 1 — Create the `x_bhuc` scoped application. [NEW-BUILD]**
`All → Now Builder / Studio → Create Application`. Scope name `x_bhuc`, per Appendix C. This is net-new — no `x_bhuc` scope exists today `[Verified: sys_app has only x_acce8_* + legacy careatlas u_* tables]`. Create within it the custom tables `u_bhuc_patient`, `u_bhuc_screening`, `u_bhuc_consent`, `u_bhuc_appointment`, `u_bhuc_message`, `u_bhuc_care_plan` (naming per Appendix C). Do **not** reuse the legacy `u_patient`/`u_patients` tables — they belong to the unrelated careatlas build and are out of scope.

**SN-Step 2 — Register AWS Cognito as an OIDC identity provider.**
`Multi-Provider SSO → Identity Providers → OIDC → New`. The `oidc_provider_configuration` framework and 9 existing providers are confirmed `[Verified]`; Cognito is **not yet** among them, so add it. Configure OIDC Metadata URL = `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_d6qfH8s2g/.well-known/openid-configuration` (from `.env` `COGNITO_USER_POOL_ID`), client ID `6l06cjov3c24p1s78t7m64t9l8`, and map the `cognito:groups` claim. `[Doc: ServiceNow platform security → Multi-Provider SSO / OIDC provider]`

**SN-Step 3 — Create the three BHUC application roles. [NEW-BUILD]**
In the `x_bhuc` scope: `u_bhuc_patient`, `u_bhuc_clinician`. For governance, do **not** create a new role — reuse the confirmed platform role `sn_ai_governance.ai_steward` `[Verified]`.

**SN-Step 4 — Build the field-level ACLs for Part 2 / SUD protection. [NEW-BUILD]**
On `u_bhuc_patient` and `u_bhuc_consent`, create read ACLs that deny SUD-labeled fields unless the caller holds an approved case-manager role AND patient consent is recorded. Use `GlideRecordSecure` in any ACL script per ServiceNow security guidance `[Doc: ServiceNow Enable AI → "Create an AI agent" → "Add a script to an AI agent" (use GlideRecordSecure / addUserEncodedQuery)]`.

**SN-Step 5 — Confirm / select the LLM provider for the agents.**
Now LLM LTS is confirmed available `[Verified: sys_generative_ai_config → "Now LLM LTS", "Now LLM LTS Large" present]`. Per §2.4 recommendation, target **Now LLM-LTS** for the six BHUC agents given regulated-industry guidance `[Doc: ServiceNow Enable AI → "Explore the Third-Party LLMs and Regions"]`.

**SN-Step 6 — Build the six native agents in AI Agent Studio.**
`All → AI Agent Studio → Create and manage → AI agents → Add → Chat`, following the canonical 7-step procedure already documented in §4.3 and the per-agent specs in §4.4. Agents are stored in `sn_aia_agent`; tools in `sn_aia_tool`; agent↔tool mapping in `sn_aia_agent_tool_m2m`; triggers in `sn_aia_trigger_configuration` — all confirmed `[Verified]`. Build order: (1) Front-Door Security, (2) Risk Identification, (3) Clinical Documentation, (4) Consent & Data Protection, (5) Prior-Auth Compliance, (6) Scheduling. (UC2 = agents 2+3; UC3 = agents 4+5.)

**SN-Step 7 — Set execution mode = Supervised on every record-writing tool.**
For each tool that writes to a clinical/consent/scheduling record, set Supervised mode (§4.3). This is the human-in-the-loop gate.

**SN-Step 8 — Configure security controls per agent (role masking, dynamic user).**
Per §4.3 Step 4: all agents except Front-Door run as **Dynamic user with Approved roles**; never exercise the "allow all roles" override. The Front-Door agent is the sole Public-access agent (AI user), §4.4 Agent 1.

**SN-Step 9 — Configure triggers.**
Risk Identification agent: trigger on `u_bhuc_screening` insert. Clinical Documentation agent: trigger on assessment start. Consent & Data Protection agent: trigger on documentation update. (Front-Door, Prior-Auth, Scheduling: no trigger.) Keep triggers **inactive** until SN-Step 10 testing passes. Set `kill_switch.mode = enforce` (§4.3 Step 5).

**SN-Step 10 — Test each agent (both test types).**
`AI Agent Studio → Testing → Start manual test` (type: AI agent or workflow) AND `Test access` (Access Analyzer) per §4.3 Step 7. Activate an agent only after both pass.

**SN-Step 11 — Register agents in AICT & AIRC and map governance role.**
Native agents surface automatically into AICT AI Asset Inventory (`sn_ai_governance_*`) once active `[Verified: 20 AI systems already auto-registered in sn_grc_ai_gov_ai_system]`. Map the `bhuc-governance` Cognito group → `sn_ai_governance.ai_steward`; grant AIRC access via `sn_grc_ai_gov.ai_risk_and_compliance_admin`.

**SN-Step 12 — Configure governance: guardrails, approvals, fallback, authority document.**
Per §5.4: activate Output PII Violation, Output Extended PII, Output Security Vulnerability, Agent Goal Deviation, Data Integrity Incident Detection (100% sampling), and Sensitive Data Input & Anonymization (Data Privacy confirmed present `[Verified]`). Set AI-model-provider Fallback = **Inactive** (§5.6). Build the custom Authority Document `BHUC Healthcare Compliance — HIPAA & 42 CFR Part 2` in `sn_compliance_authority_document` `[Verified: table present]` and run it through Advanced Risk assessment (`sn_risk_advanced_inherent_assessment` / `_residual_assessment`, confirmed `[Verified]`). Confirm the two scheduled data-collection jobs are active (§5.2).

**SN-Step 13 — Create the six non-human agent identities + composable roles + ACLs. [NEW-BUILD] (careatlas-modeled, §2.9)**
This is what makes A2A work under least privilege. Mirror the verified careatlas model (`svc-*` accounts + granular roles).

- **13a — Create the composable roles** (`User Administration → Roles → New`), all in/around the `x_bhuc` scope:
  - `u_bhuc_ai_agent` — base role every BHUC agent identity holds (marks the account as a BHUC non-human agent; analogous to careatlas `u_careatlas_ai_agent` `[Verified]`).
  - `u_bhuc_patient_read` — read non-PII patient/clinical fields (analogous to `u_patients_user` `[Verified]`).
  - `u_bhuc_patient_pii` — read PII fields (name/DOB/email/phone/insurance); analogous to `role_patient_pii` `[Verified]`. **Granting or withholding this single role is what drives the PII-denial demo.**
  - `u_bhuc_part2_access` — read/write 42 CFR Part 2 / SUD-labeled fields (approved case-manager scope only).
  - `u_bhuc_schedule_write`, `u_bhuc_screening_write`, `u_bhuc_doc_write` — narrow write roles per data domain.
- **13b — Create the six service accounts** (`User Administration → Users → New`, set **Web service access only** / integration user; no password login), each active, non-interactive — mirroring careatlas `svc-*` `[Verified: 13 svc-* users present]`:

  | Agent | Service account (`user_name`) | Roles (least privilege) |
  | --- | --- | --- |
  | Front-Door Security | `svc-bhuc-frontdoor` | `u_bhuc_ai_agent` only (facility-FAQ + escalation flow; **no** patient data) |
  | Risk Identification | `svc-bhuc-risk` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_screening_write` (**no** `u_bhuc_patient_pii`) |
  | Clinical Documentation | `svc-bhuc-clinicaldoc` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_doc_write` |
  | Consent & Data Protection | `svc-bhuc-consent` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_part2_access` |
  | Prior-Auth Compliance | `svc-bhuc-priorauth` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_part2_access` (read-only view of Part 2 for packet) |
  | Scheduling | `svc-bhuc-scheduling` | `u_bhuc_ai_agent`, `u_bhuc_schedule_write` (**no** demographic/PII roles — fairness) |

- **13c — Bind each agent to its service account.** In each agent's **Define security controls → data access**, choose **AI user** and select that agent's `svc-bhuc-*` account (§4.3 Step 4, as revised for A2A). This is the non-human identity the agent runs as when invoked over A2A.
- **13d — Field-level ACLs** (extends SN-Step 4): on `u_bhuc_patient`, PII fields require `u_bhuc_patient_pii`; on `u_bhuc_consent`/note tables, Part 2-labeled fields require `u_bhuc_part2_access`. Because `svc-bhuc-risk` lacks `u_bhuc_patient_pii`, its reads are automatically stripped of PII — the exact careatlas PII-denial behavior `[Verified: .env documents svc-careatlas-agent lacks role_patient_pii while svc-clinical-agent holds it]`. Test each ACL with **Test access** (Access Analyzer, §4.3 Step 7).

**SN-Step 14 — Create the A2A OAuth client + enable third-party access + register the callback. [NEW-BUILD] (careatlas-modeled)**
- **14a — Register the OAuth API client.** `System OAuth → Application Registry → New → Create an OAuth API endpoint for external clients`. Name `BHUC A2A Integration` (mirrors the verified `Care Atlast A2A Integration` client `[Verified: oauth_entity type=client active]`). Grant type: **client credentials**. Record `client_id`/`client_secret` for the backend (`.env` already carries a working example pair). **The invocation scope is `a2aauthscope`** (verified from the careatlas config default and the agent card) — the backend requests this scope on the token call (BE-Step 3a).
- **14b — Enable third-party access + discoverability per agent.** For each of the six agents: **"Allow third party to access this AI agent" = ON** (§4.3 Step 2, point 6), the agent **Active**, and **discoverable** (the agent card must be reachable). Without all three, A2A returns 401/403 (matches the verified backend error hint).
- **14c — (Optional) Enable push notification for async mode.** Only if you use the async callback path (BE-Step 5): turn on **push notification in Agent Studio** for the agent, and register the callback target in `sn_aia_external_agent_callback_registry` `[Verified: table present]` pointing at `{A2A_CALLBACK_BASE_URL}/api/a2a/callback/{agent_sys_id}` with the bearer `A2A_CALLBACK_TOKEN` (careatlas uses `https://careatlas.onrender.com`; for BHUC use your FastAPI host from BE-Step 10). **If you use blocking mode (recommended), skip 14c entirely — no callback is needed.**
- **14d — A2A invocation endpoint (for the backend).** Agents are invoked at `POST /api/sn_aia/a2a/v2/agent/id/{agent_sys_id}` with the JSON-RPC `message/send` body in BE-Step 4 `[Verified: careatlas execute_agent]`. Capture each agent's `sn_aia_agent` sys_id after SN-Step 6 for the backend's endpoint→agent map.

**SN-Step 15 — Build the iframe portal shells (two anonymous SP pages). [NEW-BUILD] (careatlas-modeled, §2.9)**
- **15a — Create two full-screen iframe widgets** (`Service Portal → Widgets → New`), cloning the verified `careatlas-frame` widget `[Verified]`:
  - `u_bhuc_patient_frame` — template `<div class="bhuc-wrapper"><iframe src="https://<your-firebase-app>/patient" frameborder="0" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe></div>`; CSS identical to careatlas (`position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999; iframe width/height:100%`).
  - `u_bhuc_clinician_frame` — same, `src="https://<your-firebase-app>/clinician"`.
- **15b — Create two SP pages** (`Service Portal → Pages → New`): `u_bhuc_patient` (drops the `u_bhuc_patient_frame` widget into a single full-bleed column) and `u_bhuc_clinician` (drops `u_bhuc_clinician_frame`).
- **15c — Host them on a portal and make the shell anonymous.** Either add the pages to an existing portal or create a portal `x_bhuc` (`Service Portal → Portals`). Set the pages/portal to **public** so no ServiceNow login is required (public page flag + a `Public Page` record); the real auth is Cognito inside the iframe (§2.9, your decision). Final URLs: `https://ven04690.service-now.com/x_bhuc?id=u_bhuc_patient` and `…?id=u_bhuc_clinician`.
- **15d — Allow the Firebase origin to be framed / call back.** Ensure no `X-Frame-Options`/CSP rule blocks embedding, and that the FastAPI CORS allowlist includes the ServiceNow portal origin and the Firebase origin (BE-Step 7 / your `.env` `CORS_ORIGINS` already lists `https://task--mission.web.app` and `…firebaseapp.com` as the working careatlas example).

### 8.2 Backend Runbook — FastAPI (A2A + Hybrid CRUD)

> **Stack (your decision):** **FastAPI** backend, deployed to a public host (careatlas uses Render — `careatlas.onrender.com`). It is a stateless broker between the Cognito-authenticated React app (in the Firebase iframe) and ServiceNow. It holds **no PHI at rest**. Data path per §2.9: it validates the Cognito JWT from the browser, then talks to ServiceNow two ways — **A2A** to invoke the six agents, and **Table/Scripted REST** for plain `u_bhuc_*` CRUD (hybrid, your decision).

**BE-Step 1 — Scaffold the FastAPI service.** Python 3.11+, `fastapi` + `uvicorn` + `httpx` (async ServiceNow calls) + `python-jose`/`pyjwt` (Cognito JWT validation) + `pydantic` models. Structure: `routers/` (one per domain), `services/servicenow.py` (A2A + REST clients), `services/cognito.py` (JWT), `core/config.py` (env). Deploy target: same style as careatlas (Render/Cloud Run/Fly) — a public HTTPS host reachable by both the Firebase app and ServiceNow's A2A callback.

**BE-Step 2 — Cognito JWT validation at the boundary.** On every request, validate the incoming `Authorization: Bearer <cognito-jwt>` against the Cognito JWKS `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_d6qfH8s2g/.well-known/jwks.json` (from `.env` `COGNITO_USER_POOL_ID`); verify `aud`=`COGNITO_CLIENT_ID`, issuer, expiry; extract `cognito:groups` → map to `u_bhuc_patient` / `u_bhuc_clinician`. Reject invalid/expired with 401. **This is the only user auth** — the SP shell is anonymous (§2.9).

**BE-Step 3 — ServiceNow auth: two credentials, two purposes (verified split).** (a) **OAuth A2A client** for **agent invocation only**: obtain a token from `https://ven04690.service-now.com/oauth_token.do` with `grant_type=client_credentials`, `client_id=SNOW_A2A_CLIENT_ID`, `client_secret=SNOW_A2A_CLIENT_SECRET`, `scope=a2aauthscope` (`.env`, SN-Step 14a); cache it and refresh on expiry (respect `SNOW_A2A_TOKEN_SKEW_SECONDS`). (b) **Basic auth** (`SNOW_USERNAME`/`SNOW_PASSWORD`) for **Table-API CRUD** — this is exactly how careatlas splits it `[Verified: servicenow.py uses auth=(username,password) for Table API, OAuth only for /api/sn_aia/a2a]`. The browser never sees either credential.

**BE-Step 4 — Agent invocation over A2A — EXACT contract (verified from the careatlas `execute_agent`, `CareAtlas/server/app/servicenow.py`).**
- **Endpoint:** `POST https://ven04690.service-now.com/api/sn_aia/a2a/v2/agent/id/{agent_sys_id}` (the agent's `sn_aia_agent` sys_id).
- **Headers:** `Authorization: Bearer <token>` (token from `POST /oauth_token.do`, `grant_type=client_credentials`, `client_id=SNOW_A2A_CLIENT_ID`, `client_secret=SNOW_A2A_CLIENT_SECRET`, **`scope=a2aauthscope`** — the scope comes from the agent card), `Content-Type: application/json`, `Accept: application/json`.
- **Body (JSON-RPC 2.0, synchronous blocking):**
  ```json
  { "jsonrpc": "2.0", "id": "<uuid>", "method": "message/send",
    "params": { "configuration": { "blocking": true },
      "message": { "kind": "message", "role": "user", "messageId": "<uuid>",
        "parts": [ { "kind": "text", "text": "<system context>\n\nUser message: <input>" } ] },
      "metadata": {} } }
  ```
  For multi-turn, add `"contextId"` / `"taskId"` to `message` (returned by the prior call).
- **Reply parsing:** extract text from any of `result.status.message.parts[]`, `result.message.parts[]`, `result.artifacts[].parts[]`, `result.history[role="agent"].parts[]` (`part.kind`/`part.type == "text"`); also read `contextId`, `taskId`, `state`. A JSON-RPC `error` object means failure.
- **Endpoint → agent (→ service account) map:**
  - `POST /api/x_bhuc/frontdoor/chat` → Front-Door Security Agent (`svc-bhuc-frontdoor`)
  - `POST /api/x_bhuc/intake/screening` → Risk Identification Agent (`svc-bhuc-risk`)
  - `POST /api/x_bhuc/note/draft` → Clinical Documentation Agent (`svc-bhuc-clinicaldoc`)
  - `POST /api/x_bhuc/consent/classify` → Consent & Data Protection Agent (`svc-bhuc-consent`)
  - `POST /api/x_bhuc/priorauth` → Prior-Auth Compliance Agent (`svc-bhuc-priorauth`)
  - `GET /api/x_bhuc/appointments/availability` → Scheduling Agent (`svc-bhuc-scheduling`)
- **401/403 troubleshooting (verified error text):** *"Check A2A OAuth scope/client credentials, AI Agent Studio third-party access/discoverability, and agent ACL/user access."* — i.e. SN-Step 13 (service account roles/ACLs) + SN-Step 14 (OAuth client + "Allow third party access" ON + discoverable/active).

**BE-Step 5 — Choose blocking (recommended) vs push-notification async.**
- **Blocking (default, recommended):** `configuration.blocking=true` returns the agent reply **inline in the same HTTP response** — **no publicly reachable callback URL is needed** (this is what careatlas uses `[Verified: config comment "blocking A2A call returns the reply inline, so async push-notification callbacks are unused"]`). FastAPI returns the result to the React app directly. Use `agent_execute_timeout` ≈ 90s.
- **Push-notification (async, optional):** if you enable **push notification in Agent Studio** (the mode you already proved working), ServiceNow POSTs the result to `{A2A_CALLBACK_BASE_URL}/api/a2a/callback/{agent_sys_id}` (token-protected by `A2A_CALLBACK_TOKEN`). Implement that callback route, store the record keyed by `request_id`/`task_id` (careatlas `a2a_callbacks.py` keeps an in-memory `_BY_REQUEST_ID`/`_BY_TASK_ID` map with `PENDING_STATES = {accepted, submitted, working, running, pending}`), and let the React app poll `GET /api/x_bhuc/<domain>/result/{requestId}`. **Recommendation:** use blocking for BHUC unless an agent routinely exceeds the HTTP timeout; keep the push path as the documented fallback since you've validated it.

**BE-Step 6 — Hybrid CRUD via Table/Scripted REST.** Non-agent endpoints read/write `u_bhuc_*` tables directly via the ServiceNow **Table API** (careatlas uses HTTP **basic auth** `auth=(SNOW_USERNAME, SNOW_PASSWORD)` for all Table-API CRUD, reserving the OAuth A2A client purely for agent invocation `[Verified in servicenow.py]`) — or via thin Scripted REST wrappers when you want server-side `GlideRecordSecure`. **Complete endpoint set to implement (search §3.2/§3.3 for `[new endpoint`):**
  - Patient: `GET /careplan`, `GET /careplan/pdf`, `POST /careplan/acknowledge`, `GET /messages/threads`, `GET /messages/threads/{id}`, `POST /message`, `PATCH /registration/draft`, `POST /registration/complete`, `POST /consent`, `PATCH /intake/screening/draft`, `GET /eligibility`, `POST /eligibility/verify`, `POST /financial-counselor/request`, `GET /appointments`, `POST /appointments`, `POST /appointments/{id}/reschedule`, `POST /appointments/{id}/cancel`, `GET /checkin/{id}`, `POST /checkin/{id}`.
  - Clinician: `GET /worklist`, `GET /patient/{id}/chart`, `POST /risk/confirm`, `POST /note/sign`, `POST /disposition`, order-entry + referral endpoints per §3.3.
  - **Optional Scripted REST wrappers** live in `sys_ws_definition` (`System Web Services → Scripted REST APIs`, framework confirmed `[Verified]`) when you want server-side `GlideRecordSecure` logic instead of raw Table API.

**BE-Step 7 — CORS + framing.** Allow only the Firebase app origin and the ServiceNow portal origin (`.env` `CORS_ORIGINS` shows the working careatlas set: `https://task--mission.web.app`, `https://task--mission.firebaseapp.com`, `http://localhost:5173`). Add your BHUC Firebase origin and `https://ven04690.service-now.com` before go-live.

**BE-Step 8 — Never construct prompts client-side; enforce Supervised gates server-side.** The browser calls FastAPI only; FastAPI invokes agents. The deterministic Front-Door crisis classifier runs inside the agent (§4.4 Agent 1), and Supervised-mode writes still require the clinician confirmation actions surfaced by C4/C5.

**BE-Step 9 — Secrets handling. [Action required]** The secrets in `.env` (SNOW creds, `SNOW_A2A_CLIENT_SECRET`, `A2A_CALLBACK_TOKEN`, Cognito client secret, AWS keys) are in plaintext — move them to a secrets manager (Render/Cloud secrets, AWS Secrets Manager) for any non-local deploy, and rotate the AWS keys.

**BE-Step 10 — Health, tracing, deploy.** Expose `/healthz`; add a correlation id per request (rely on native AICT audit logs, §5.4, not a custom audit UI); deploy to the public host and give ServiceNow that host as the A2A callback base (SN-Step 14c).

### 8.3 Frontend Runbook — React + Vite → Firebase → ServiceNow iframe

> **Stack (your decision):** **React + Vite** single app, deployed to **Firebase Hosting**, embedded as a full-screen **iframe** inside two anonymous ServiceNow SP pages (SN-Step 15). One app, two routes (`/patient`, `/clinician`) — the careatlas model, verified on your instance (`careatlas-frame` → `https://task--mission.web.app/`) `[Verified, §2.9]`. The AI Governance UI is **not** built here — it is the native AICT workspace (§5.1).

**FE-Step 1 — Scaffold the React + Vite app.** `npm create vite@latest bhuc -- --template react-ts`. Add React Router with two top-level routes: `/patient` (9 screens, §3.2) and `/clinician` (8 screens, §3.3), plus shared design-system components per §3.1 (tokens, 988 banner, status palette, WCAG 2.1 AA). Build with `vite build` → static `dist/`.

**FE-Step 2 — Cognito auth inside the app (Amplify).** Configure AWS Amplify/Cognito with `.env` values (`COGNITO_DOMAIN`, `COGNITO_CLIENT_ID`, `REDIRECT_URI` → set redirect to the Firebase URL, e.g. `https://<app>.web.app/patient`). Enforce **MFA on the clinician pool** (§3.3 C1). The app holds the Cognito JWT in memory and refreshes it (session-timeout chip, §3.1). Note: auth happens **inside the iframe** — the ServiceNow shell is anonymous (§2.9).

**FE-Step 3 — Call FastAPI only, with the Cognito bearer token.** All data/agent calls go to the FastAPI base URL (BE-Step 1) with `Authorization: Bearer <cognito-jwt>`. **Never** call ServiceNow directly and **never** build LLM prompts in the browser (§3.1, BE-Step 8). Agent responses may be async — poll `…/result/{sessionId}` or subscribe via SSE (BE-Step 5).

**FE-Step 4 — Deploy to Firebase Hosting.** `firebase init hosting` (public dir `dist`, SPA rewrite all → `/index.html`), `firebase deploy`. Record the resulting URL (e.g. `https://bhuc-xxxx.web.app`) — this is what the SN-Step 15 iframes point at (`/patient`, `/clinician`). Add SPA rewrites so deep links inside the iframe resolve.

**FE-Step 5 — Make the app iframe-safe.** It runs inside ServiceNow's `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` iframe (verified careatlas attrs). Ensure Cognito Hosted-UI redirects work inside the frame (or use popup/PKCE if third-party-cookie restrictions bite); size to 100% (the wrapper is already 100vw/100vh). Test at the real portal URLs from SN-Step 15c.

**FE-Step 6 — Build the unauthenticated crisis path.** The 988 banner renders/functions **before** login and on every screen (§3.1/§3.2). The front-door chat is server-side via FastAPI → Front-Door agent (BE-Step 4).

**FE-Step 7 — Human-in-the-loop + masking in the UI.** C4 (Risk Confirmation) and C5 (Ambient Doc Sign) block finalization until the clinician acts (Supervised gate, SN-Step 7). C3/C6 render Part 2/SUD fields **masked** unless the API returns them — masking is enforced server-side by the SN-Step 13d ACLs (the `svc-bhuc-risk` PII strip); the UI never un-masks client-side.

**FE-Step 8 — Surface agent outputs with citations + fairness result.** Chart summaries (C3), prior-auth answers (C6), scheduling matches (C8) show the agent's citations, and scheduling shows the fairness-check result already applied (§3.3, §4.4 Agent 6).

**FE-Step 9 — Do NOT build a governance dashboard.** AI Stewards use native `Workspaces → AI Control Tower` (§2.6/§5.1); a custom governance SPA would duplicate a shipped, confirmed-present product surface.

---

## 9. Open Questions, Ambiguities & Gaps (Build-Readiness Review)

This section is a self-review of the plan by the implementer's lens: *"If someone (a person or an AI coding agent) sat down to build this end-to-end, where would they stop and ask a question?"* Each item states the conflict, the exact locations in this document, and what decision or fill-in is still required. Items are grouped by severity. **Nothing here is yet resolved** — this is the punch list to close before build starts.

### 9.1 🔴 Blocking — a decision is required before building

**OQ-1 — Double-invocation: ServiceNow triggers vs A2A. Which one actually fires each agent?**
- **Conflict:** §2.8 step 5 has FastAPI *write the screening record and then invoke the Risk Identification Agent over A2A*. But §4.4 Agent 2 (Step 4) and §8.1 SN-Step 9 also give that agent a **ServiceNow trigger on `u_bhuc_screening` insert**. When FastAPI inserts the record, the trigger fires the agent **and** FastAPI also calls it over A2A → the agent runs twice. Same conflict for the Clinical Documentation agent (trigger on `u_bhuc_care_plan`) and the Consent & Data Protection agent (trigger on documentation update) vs. their A2A endpoints in §8.2 BE-Step 4 (`/note/draft`, `/consent/classify`).
- **Locations:** §2.8 (steps 5–7); §4.3 Step 5; §4.4 Agents 2/3/4 "Step 4 — Trigger"; §8.1 SN-Step 9; §8.2 BE-Step 4.
- **Decision needed:** for each agent, is it invoked by the **ServiceNow trigger** *or* by the **backend A2A call** (not both)? (Reference point: careatlas is pure A2A with no triggers — suggesting the triggers may be leftovers from the pre-A2A draft, but the plan currently asserts both.)

**OQ-2 — Human-in-the-loop: ServiceNow Supervised mode vs the app UI gate. Which enforces it?**
- **Conflict:** the plan relies on **ServiceNow "Supervised execution mode"** (§2.8 step 7, §4.4 per-agent Record Operation tools, demo §6.2) *and* on **UI gates C4/C5** (§3.3, §8.3 FE-Step 7). Supervised mode requires human input **during** tool execution — but an A2A **blocking** call originates from FastAPI, where there is **no interactive ServiceNow user** to supply that mid-execution input. So Supervised mode may not function over external A2A at all; in that case HITL is enforced only by the app (the agent returns a *draft*, and C4/C5 block finalization).
- **Locations:** §2.8 step 7; §4.3 Step 3 (execution mode); §4.4 (every "Supervised" tool); §6.2/§6.3; §8.1 SN-Step 7; §8.3 FE-Step 7.
- **Decision needed:** is human-in-the-loop enforced by **(a)** ServiceNow Supervised mode pausing the agent, or **(b)** the app treating agent output as a draft and gating in C4/C5? (For blocking A2A, (b) is the likely working model, but the plan asserts (a) in multiple places.)

**OQ-3 — How do AI Stewards actually get the `sn_ai_governance.ai_steward` role?**
- **Conflict:** §2.5 maps the Cognito group `bhuc-governance` → `sn_ai_governance.ai_steward`, but §2.6 says stewards **log into ServiceNow directly** to use the native AICT/AIRC workspaces. Stewards do **not** go through the Cognito-authenticated iframe, so a Cognito-group→ServiceNow-role mapping only works if **ServiceNow staff login is federated to Cognito OIDC** — which is not set up (SN-Step 2 registers Cognito as an IdP but never says staff authenticate through it).
- **Locations:** §2.5 (role table + note); §2.6 item 3; §8.1 SN-Step 2, SN-Step 11.
- **Decision needed:** do stewards receive `ai_steward` via **Cognito→ServiceNow SSO federation**, or via a **plain ServiceNow user + direct role assignment** (making the `bhuc-governance` Cognito row informational only)?

### 9.2 🟠 Gaps — buildable, but currently require guessing

**OQ-4 — The data model is under-specified.** §8.1 SN-Step 1 defines six tables (`u_bhuc_patient`, `_screening`, `_consent`, `_appointment`, `_message`, `_care_plan`), but agents and the ~35 screen endpoints reference tables that are **never defined**: a **prior-auth draft table** (§4.4 Agent 5 calls it only "the `x_bhuc` prior-auth draft table"), a **dedicated note/documentation table** (§4.4 Agent 3: "or the dedicated note table"), and implied data for **eligibility, care-plan PDF, message threads, check-in, worklist, disposition, orders, referrals**. Additionally, **no table has a field-level schema anywhere** in the document (only the Part 2/PII *ACL* fields are named). *Fill-in needed:* the complete table list + column definitions for every `u_bhuc_*` table.

**OQ-5 — RAG knowledge sources are not a build step.** Every agent's Search Retrieval tool points at a knowledge base — "facility-info KB", "instrument-scoring KB" (C-SSRS/PHQ-9/GAD-7 rules), "payer policy library", "ICD-10/CPT + clinical-doc KB" (§4.4 Agents 1/2/3/5). **No runbook step creates or populates** those knowledge bases / semantic indexes. Without content, the agents retrieve nothing. *Fill-in needed:* a runbook step (and source content) for creating and indexing each KB.

**OQ-6 — Cognito authentication *inside an iframe* is assumed to work but not proven.** §8.3 FE-Step 5 hedges ("if third-party-cookie restrictions bite, use popup/PKCE") without committing to one approach. It is not confirmed that careatlas's iframe app (`task--mission.web.app`) actually performs Cognito login *in-frame*. Third-party-cookie / redirect-in-iframe behavior is a real technical risk. *Decision needed:* commit to one working in-frame auth approach (hosted-UI redirect vs popup + PKCE), ideally validated against how careatlas handles it.

### 9.3 🟡 Confusing / stale — cosmetic, but should be reconciled

- **OQ-7 — CORRECTION-1 contradicts the body.** §0.4 CORRECTION-1 states the fabricated `pp. NNN` page numbers were removed and re-cited as `[Doc: …]`, but **~45 `p.`/`pp.` citations remain** (§1, §2.3, §2.4, §2.7, §4.3, §5, appendices). Either finish converting them to `[Doc: …]` form or soften CORRECTION-1 to "being phased out."
- **OQ-8 — Stale Table of Contents.** The ToC lists "8.1 (SN-Step 1→12), 8.2 (BE-Step 1→9), 8.3 (FE-Step 1→8)" but the body now has **SN 1→15, BE 1→10, FE 1→9**. The appendices (A–E) are also indented under §8 in the ToC when they belong to §7.
- **OQ-9 — §3.1 closing line is stale.** It still says the portals are "built as SPAs against Scripted REST APIs, per Section 2.6," which contradicts §2.9 (the SPA calls the **FastAPI backend**, which brokers to ServiceNow — the browser never calls Scripted REST directly).
- **OQ-10 — Service-account flag mismatch.** §8.1 SN-Step 13b says create the `svc-bhuc-*` accounts as "integration user," but the verified careatlas `svc-*` accounts have `internal_integration_user = false`. Clarify which flag/type the BHUC service accounts should actually use.
- **OQ-11 — One OAuth client vs per-agent clients.** careatlas has **two** OAuth API clients ("Care Atlast A2A Integration" + "Schedule Agent A2A Client"), but the plan provisions a single "BHUC A2A Integration" (§2.9, §8.1 SN-Step 14) without stating whether **one** OAuth client can invoke **all six** agents or whether per-agent clients are needed. Confirm the one-client-for-all-agents assumption.
- **OQ-12 — "Three pillars" framing is stale.** §1 says the platform "rests on three pillars instead of four," but the architecture now also includes **Firebase Hosting** and the **FastAPI backend** (§2.9); the "three pillars" line predates the iframe/A2A addition and undercounts the moving parts.

### 9.4 Ownership / resolution status

| ID | Severity | Type | Can the author fix without a decision? |
| --- | --- | --- | --- |
| OQ-1 | 🔴 Blocking | Design decision | No — needs owner's call (triggers vs A2A) |
| OQ-2 | 🔴 Blocking | Design decision | No — needs owner's call (HITL mechanism) |
| OQ-3 | 🔴 Blocking | Design decision | No — needs owner's call (steward auth path) |
| OQ-4 | 🟠 Gap | Fill-in (schema) | Partially — needs the real field lists |
| OQ-5 | 🟠 Gap | Fill-in (content) | Partially — needs the KB source content |
| OQ-6 | 🟠 Gap | Technical decision | Needs validation against careatlas in-frame auth |
| OQ-7 | 🟡 Cosmetic | Cleanup | Yes |
| OQ-8 | 🟡 Cosmetic | Cleanup | Yes |
| OQ-9 | 🟡 Cosmetic | Cleanup | Yes |
| OQ-10 | 🟡 Cosmetic | Cleanup | Yes (once OQ notes the correct flag) |
| OQ-11 | 🟡 Cosmetic | Clarification | Yes |
| OQ-12 | 🟡 Cosmetic | Cleanup | Yes |

---

*End of document. Verified against `ven04690.service-now.com` on 2026-07-05 (read-only). See Section 0 for evidence and the two UI-only verification items (G-1 build number, G-2 dashboard tab layout); see Section 9 for the open-questions punch list to close before build.*