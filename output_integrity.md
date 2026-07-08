# Output Integrity (Use Case 2) — Implementation Plan for Agents 2 & 3

**Governed risk:** *Output Integrity / Hallucination* — the risk that the **Risk Identification Agent (Agent 2)** produces a wrong/ungrounded risk score, or the **Clinical Documentation Agent (Agent 3)** fabricates clinical detail or leaks PHI in its output. In behavioral‑health this is a patient‑safety and HIPAA problem, so UC2 governs **both agents as one pair** (`plan.md` §4.1, §4.4).

> **Prerequisite note — roles/ACLs are NOT required for UC2.** SN‑Step 13 (`u_bhuc_*` least‑privilege roles + `svc-bhuc-*` service accounts + PII/Part 2 masking) governs **UC3 (Privacy / 42 CFR Part 2)** and **UC5 (Excessive Privileges)**, not Output Integrity. The native guardrails hook the agent's LLM output regardless of data‑access roles, and the app‑layer grounding/HITL run under the current open/admin setup. The AICT/AIRC config only needs the **steward roles** (`sn_ai_governance.ai_steward`, `sn_grc_ai_gov.ai_risk_and_compliance_admin`), which already exist on the instance. **Decision (2026‑07‑07): build ACLs before UC3/UC5; UC2 proceeds without them.** (One caveat: the AI Asset Security Score / access metrics only become meaningful evidence once the ACLs exist.)

This document is the **plan only** — nothing here is executed yet. It covers what to do on the **ServiceNow side**, in the **React app (backend + frontend)**, and **how to test**. Sources are cited inline; `[Doc]` = ServiceNow Enable AI docs (Zurich, retrieved via the docs MCP); `[Verified]` = confirmed on `ven04690` via REST during planning.

---

## 1. The two enforcement layers

Output Integrity is enforced in **two complementary layers**:

| Layer | Where | Catches | Status |
|---|---|---|---|
| **A. Native platform guardrails** | ServiceNow AICT (config‑only) | LLM output that mismatches expected behavior (hallucination), PHI/PII in output, injection patterns | **Not configured yet** — guardrail table `sn_vsc_security_privacy_capabilities` is empty `[Verified]` |
| **B. App‑layer human‑in‑the‑loop + grounding** | React app + agent tools | Ungrounded lines, unconfirmed scores; blocks finalization | **Mostly already built** (see §2) |

The platform guardrails **monitor and score** every agent LLM call (evidence on the AICT Health + Security & Privacy tabs). The app layer **blocks the clinical action** (no unreviewed score or note is finalized). You need both: the guardrails give the audit/measurement trail; the app gates give the hard stop.

---

## 2. What is already built (do not rebuild)

- **Agent 3 grounding tagger** `bhuc_note_grounding` — tags each drafted note line grounded/unverified; the note stores `u_unverified_lines` (e.g. `["L3","L4"]`). `[Verified — plan §4.4 Agent 3, §4.6.4]`
- **Agent 2 confidence + rationale** — `u_confidence` (0–100) and grounded `u_rationale` written to `u_bhuc_screening`. `[Verified]`
- **Human‑in‑the‑loop gates (React):**
  - C4 **Risk Confirm** — no score is finalized until a clinician Confirms / Adjusts / Rejects (writes `u_clinician_action`).
  - C5 **Documentation** — the **Sign** button is blocked until every unverified line is resolved **and** the attestation is checked; the agent never signs.
- These are the *app‑layer* Output‑Integrity controls and they work today.

**So the remaining implementation is: (A) configure the native guardrails + register the pair in AICT/AIRC, and (B) surface the Output‑Integrity signals in the app (a Governance view + reinforced clinician UI).**

---

## 3. Part A — ServiceNow side (native guardrails + governance registration)

> ✅ **PART A — AS‑BUILT (completed 2026‑07‑07):**
> - **A1 (guardrails)** — configured in AICT (Data Integrity Incident Detection + Output Screening; most settings were already on, adjusted the rest).
> - **A2 (govern the agents)** — both agents moved to **Managed** → **Start review** → **Assess** → Impact Assessment completed → progressed the lifecycle; **BHUC Risk Identification Agent** taken through Draft → Assess → Review → **Monitor**.
> - **A3a–A3c (governance records)** — created via REST: Authority Document **`AD0020001`** (`sn_compliance_authority_document`), Risk Statement "UC2 Output Integrity / Hallucination…" (`sn_risk_definition` `9afdc80c…`), Control Objective "Output Integrity Controls — Guardrails + HITL" (`sn_compliance_policy_statement` `1afdc80c…`). **Gotcha fixed:** both needed `functional_domain = AI Risk and Compliance` (`93718fbe…`) to appear in the AICT pickers.
> - **A3b scoring** — the risk statement's **Impact = 4‑High**, **Likelihood = 3‑Neutral** (inherent) and **Residual Likelihood = 2‑Unlikely** were set (impact/likelihood are refs to `sn_risk_criteria`). A risk created **before** the statement was scored inherits blanks and locks on reaching *Review* — so **remove + re‑add** the risk from the (now‑scored) statement to get a real **inherent‑vs‑residual** delta.
> - **A3d (assessment)** — risk attached to the agent with the control linked, walked Draft → Assess → Review → **Monitor** (the state machine is the governance record; the separate assessment questionnaire is optional and didn't fire for the qualitative "Risk assessment for AI inventory" methodology).
> - **Remaining:** repeat the scored risk + control on the **Clinical Documentation Agent**; run the AICT data‑collection job + invoke the agents so the Health / Security & Privacy tabs populate.

> ⚠️ **All of Part A is UI‑only.** The guardrail config lives in a UX‑Framework workspace, not a REST‑writable table (`sn_vsc_security_privacy_capabilities` returns 0 rows; `kill_switch.mode` is ACL‑denied to the interface account) `[Verified]`. Everything below must be done **logged into the AICT workspace UI** as a user holding **`sn_ai_governance.ai_steward`** `[Verified: role present]`.

### A1 — Configure the Output‑Integrity guardrails (the core step)
**Path:** `Workspaces → AI Control Tower → Configurations → Data → Security & Privacy` `[Doc: "Explore the Third‑Party LLMs and Regions" → Security & Privacy Guardrail Configuration, pp. 758–766]`

1. **Data Integrity Incident Detection → Active** (default *Inactive*). This is the hallucination guardrail — it "tracks when a model's output fails to match expected behavior categories," based on **OWASP Top 10 for LLMs + the OpenAI model spec**. Set:
   - **Sampling rate = 100%** (most accurate; justified by clinical‑safety stakes).
   - **Max skill calls per execution** = default 1,000 (min 10).
   - **Analysis mode** = Single‑LLM, or **Multiple‑LLM** (3+, odd number, majority vote) for higher accuracy. `[Doc]`
2. **Output Screening → Active**, with all three sub‑settings ON `[Doc]`:
   - **Output PII Violation** (phone, credit card, standard Data‑Privacy PII) — **mandatory**: "an agent that outputs PHI in LLM responses without detection is a HIPAA breach."
   - **Output Extended PII** (US CA driver's license, US passport, VIN).
   - **Output Security Vulnerability** (HTML/SQL injection, XSS, terminal RCE, non‑printable chars — relevant since Agent 3's note is exported downstream).
3. *(Recommended for the whole fleet, not UC2‑specific)* **Agent Goal Deviation → Active (100%)** and **Sensitive Data Input & Anonymization → Active** — these back UC1 and UC3; turning them on now gives complete coverage. `[Doc]`
4. **Score weight** — leave default unless BHUC wants to re‑weight categories in the AI Asset Security Score.

*(This is `plan.md` GOV‑Step 2.)*

> **Ordering (important):** the impact assessment in A2 **attaches the risk statement** from A3 and generates the per‑agent risk record. So do **A3a + A3b first**, then **A2**, then **A3c + A3d**. `[Doc: "Risk Statements should be configured before any AI systems go through the workflow."]`

### A2 — Govern Agents 2 & 3 in AICT (Manage → Assess → classify risk)
**Role:** `sn_ai_governance.ai_steward` (admin has it). **Nav:** `Workspaces → AI Control Tower → AI assets view`. *(Discovered agents default to **Unmanaged** — governance only applies once Managed.)* `[Doc: "View AI Assets by Life‑Cycle Stage / Enable or Disable Management," pp. 840–854]`

1. **Find the two agents.** Left nav → **AI asset inventory → Unmanaged → AI systems**. Locate **BHUC Risk Identification Agent** and **BHUC Clinical Documentation Agent**. *(If they're already under **Managed**, skip to step 3.)*
2. **Move to Managed.** Tick both checkboxes → **Move to Managed** → confirm. This **auto‑initiates** the lifecycle review, **risk‑classification**, value calc, and evaluations.
3. **Start review.** Open each agent → **Start review** → it enters the **Assess** phase.
4. **Assess → Impact Assessment.** In **Lifecycle tab → Assess**, the flow auto‑creates an **Impact Assessment task** (+ legal / security / architecture collaboration tasks) `[Doc: Govern‑Lifecycle → Assess]`. Complete the Impact Assessment questionnaire (as **AI Asset Owner**). The answers **attach the A3b Risk Statement** and drive the **Risk Classification** (expect Medium/High given clinical stakes). The **AI Risk & Compliance Manager** reviews and closes it → an analyst is auto‑assigned.
5. **Progress the lifecycle.** **Build and test** (for healthcare, add tasks: security scan, HIPAA checklist, patient‑data handling, fail‑safe verification) → **Deploy**. Result: agent = **Managed, Deployed, Risk‑classified**.
6. **Repeat for the second agent.** They're governed as a **pair** — the same authority doc + risk statement + guardrail posture (A1) cover both `[plan.md §4.1]`.

> **Note:** *Move to Managed → Unmanaged is a governance regression* (cancels the review + classification). Only unmanage with documented justification.

### A3 — AIRC Authority Document + Risk Statement + Assessment
**Role:** `sn_grc_ai_gov.ai_risk_and_compliance_admin` (admin has it). Risk Statements are a **pre‑configured library** (cause/event/impact) sourced from an authority document; they auto‑attach to AI systems via the Impact Assessment answers and spawn per‑agent risk records `[Doc: Govern‑Risk‑and‑Controls → Procedure / Overview]`.

- **A3a — Authority Document (do first).** AIRC / Policy & Compliance workspace → **Authority Documents → New** → name **"BHUC Healthcare Compliance — HIPAA & 42 CFR Part 2"** (`sn_compliance_authority_document` `[Verified: present]`). This is the source your risk library cites.
- **A3b — UC2 Output‑Integrity Risk Statement (do first, before A2 step 4).** In the **AI Risk Statement Library** → **Create Risk Statement** (structured), sourced from A3a:
  - *Cause:* ungrounded LLM generation by the Risk / Documentation agents.
  - *Event:* the agent outputs a **fabricated clinical detail** or **leaks PHI** in its response.
  - *Impact:* patient‑safety harm + HIPAA breach.
  This entry attaches to both agents via the A2 Impact Assessment and creates a **Risk record** on each.
- **A3c — Control objective + controls (evidence).** Attach a Control Objective to the statement and map the mitigating **controls**: the native guardrails (**Data Integrity Incident Detection + Output Screening**, from A1) **and** the app‑layer **grounding tagger + HITL sign/confirm gates**. This is the "how we control it" evidence.
- **A3d — Risk Assessment (inherent → residual).** On the generated Risk records, run the **Risk Assessment Methodology (RAM)**: inherent (`sn_risk_advanced_inherent_assessment`) then residual (`sn_risk_advanced_residual_assessment` `[Verified: tables present]`). Residual (lower, because guardrails + HITL mitigate) vs inherent populates the **Risk & Compliance** heatmap — the governance proof for UC2.

> **As‑built (created via REST 2026‑07‑07):** A3a–A3c are **done**. A3a Authority Document **`AD0020001`** "BHUC Healthcare Compliance — HIPAA & 42 CFR Part 2" (`sn_compliance_authority_document` `46fdc40c…`); A3b Risk Statement "UC2 Output Integrity / Hallucination — BHUC Risk & Documentation Agents" (`sn_risk_definition` `9afdc80c…`); A3c Control Objective "Output Integrity Controls — Guardrails + HITL (UC2)" (`sn_compliance_policy_statement` `1afdc80c…`, Published). **Remaining (UI‑only):** **A2** (Move Agents 2 & 3 to Managed → Assess → complete the Impact Assessment, attaching the A3b statement) and **A3d** (run the inherent → residual assessment on the generated risk records).
>
> ⚠️ **Gotcha (fixed 2026‑07‑07):** the AICT "Add risk from risk statements" and "Add controls from control objectives" pickers **filter by `functional_domain = AI Risk and Compliance`** (`sn_grc_functional_domain` `93718fbe93b91210032a1f1044891877`). Records created via REST without that field are invisible in the pickers. Both A3b and A3c were patched to set it. **Rule: any AIRC risk statement / control objective created via REST must set `functional_domain` to the AI Risk and Compliance domain**, or it won't appear on the AI‑governance asset.

### A4 — Runtime controls
- **Kill switch → enforce** — set `sys_properties` `kill_switch.mode = enforce` (UI‑only; ACL‑denied via REST `[Verified]`). Auto‑disables a runaway trigger. *(GOV‑Step 9.)*
- **Scheduled data collection** — ensure `AI Control Tower Core Monthly Data Collection` is active and run `AI Control Tower Core Historical Data Collection` once to backfill, or the Health/Security widgets stay empty. *(GOV‑Step 8.)*
- *(Optional, fleet‑wide)* Controls → **Approvals** (AI systems/models) + **Automatically trigger playbooks** ON. *(GOV‑Steps 3–4.)*

### A5 — Audit trail
- After the changes, open **Configurations → View audit logs** (top‑right) and confirm each guardrail change is captured (Timestamp / User / Category / Setting / Before / After). Export if retention > 90 days. `[Doc]` *(GOV‑Step 10.)*

**Output of Part A:** every Agent 2/3 LLM call is now sampled by Data Integrity + Output Screening; violations surface on the **Health** and **Security & Privacy** tabs and as **AI Cases**, and the UC2 risk is documented in AIRC.

---

## 4. Part B — React app (backend + frontend)

The app already enforces the *hard stops* (§2). The new app work is to **surface Output‑Integrity signals** to the governance officer and reinforce the clinician UI. Two important constraints from the crawl:

- Guardrail **metrics/incidents are UI‑only** in AICT (not a clean REST feed) — so the app **links to** the AICT Health / Security & Privacy tabs for the *platform* signal.
- The app **can** compute and show an **app‑side Output‑Integrity summary** from data it already owns: `u_bhuc_screening` (confidence, scored_by_agent, clinician_action) and `u_bhuc_care_plan` (unverified_lines, signed). `sn_ai_governance_asset_governance_details` is REST‑readable `[Verified]` if we later want native asset status too.

### B1 — Backend (FastAPI)
1. **`GET /api/x_bhuc/governance/output-integrity`** — compute a per‑agent Output‑Integrity summary from the tables the app already writes:
   - *Agent 2 (screening):* total scored, avg `u_confidence`, low‑confidence count (< threshold), % confirmed vs pending vs adjusted vs rejected (an *adjust/reject rate* is a direct hallucination signal — the clinician disagreed with the agent).
   - *Agent 3 (notes):* total drafted, notes with ≥1 unverified line, avg unverified‑line count, % signed vs draft.
   - Return counts + rates (no PHI). This is the data behind the Governance "Output Integrity" page.
2. *(Optional, recommended)* **Move the finalization gates server‑side** for robustness — reject `POST /risk/confirm` / `POST /note/sign` if integrity conditions aren't met (e.g. sign refused while `u_unverified_lines` non‑empty), so the gate can't be bypassed by calling the API directly. Today the gate is client‑side only.
3. *(Optional)* **`GET /governance/aict-links`** — return the deep links to the AICT Health / Security & Privacy / AI Cases tabs for the two agents (so the frontend can "Open in AICT").

> Note: these read endpoints are governance‑only and should eventually sit behind auth (BE‑Step 2), consistent with the current open‑for‑now posture.

### B2 — Frontend (Governance portal — new "Output Integrity" surface)
Add to the **Governance portal** (alongside Agents Inventory + Tables):
- A new **Output Integrity** page/nav item showing, for Agents 2 & 3, the app‑side summary from B1 (confidence distribution, adjust/reject rate, unverified‑line rate, signed rate) as stat tiles + a small table.
- **Deep‑link buttons** ("Open in AICT") to the native **Health** and **Security & Privacy** tabs and **AI Cases** (open in a new tab, same pattern as the Tables sidebar) — that's where the *platform* guardrail metrics (Data Integrity incidents, Output PII hits, guardrail‑added latency) live.
- A short explainer that Output Integrity = native guardrails (measured in AICT) **+** app grounding/HITL (enforced in‑app).

### B3 — Frontend (clinician reinforcement — optional polish)
- **Documentation (C5):** already shows unverified badges + a blocked Sign with reasons. Optionally add a **grounding summary** ("4 of 5 lines grounded") and surface the code‑confidence.
- **Risk Confirm (C4):** already shows confidence + rationale + contributing inputs. Optionally add a subtle "AI output — verify before finalizing" integrity note (the HITL banner already implies this).
- No patient‑facing change (scores stay clinician‑facing; patients see only screening *stages*).

---

## 5. Part C — How to test it

### C1 — Native guardrails (ServiceNow)
Run each Agent 2/3 test and then check **AICT → Security & Privacy** and **Health**:
1. **Hallucination / Data Integrity:** feed Agent 2 a contradictory/nonsense screening (e.g. all "no" C‑SSRS but ask for "high risk with plan") so the output mismatches expected categories → expect a **Data Integrity incident** recorded (sampling 100% ⇒ every call evaluated).
2. **Output PII Violation:** prompt Agent 3 (via the Governance Agents‑Inventory chat) to include a fake SSN / phone / credit‑card in the note → expect an **Output PII Violation** flag.
3. **Output Extended PII:** include a fake US passport / driver's‑license number → expect **Output Extended PII**.
4. **Output Security Vulnerability:** prompt the agent to emit `<script>` / a SQL string / HTML → expect **Output Security Vulnerability**.
5. Confirm **Health tab** shows guardrail occurrence rates + guardrail‑added latency; confirm an **AI Case** is created for a violation.

### C2 — App‑layer HITL (React)
1. **Agent 3 sign‑gate:** draft a note with unverified lines → confirm **Sign is disabled** until all lines are marked verified **and** attestation checked; verify signing sets `u_signed=true, u_state=finalized`.
2. **Agent 2 confirm‑gate:** a scored screening stays on the worklist until Confirm/Adjust/Reject; verify Reject/Adjust writes `u_clinician_action` and drops it off the queue.
3. *(If B2 server‑side gate is built)* call `POST /note/sign` directly on an unverified note → expect **HTTP 4xx** (bypass blocked).

### C3 — Governance surface (React)
- Open Governance → **Output Integrity**: verify the summary matches the records (e.g. seed a note with 2 unverified lines and confirm the unverified‑line rate reflects it).
- Verify the "Open in AICT" links land on the correct tabs.

### C4 — AIRC evidence
- Confirm the UC2 risk statement appears under the BHUC Authority Document and the inherent/residual assessment populates the Tab‑6 heatmap.

### C5 — Before/After demo (`plan.md` §6)
- Toggle guardrails **off** → repeat C1; show violations are **not** caught and the Health tab is empty ("ungoverned AI").
- Toggle **on** → same inputs are caught, scored, and logged ("governed AI"). This is the money shot for the governance story.

---

## 6. What's REST‑doable vs UI‑only (so we scope correctly)

| Item | REST? | Notes |
|---|---|---|
| Guardrail config (Data Integrity, Output Screening) | ❌ UI‑only | `sn_vsc_security_privacy_capabilities` empty; UXF workspace `[Verified]` |
| `kill_switch.mode = enforce` | ❌ UI‑only | ACL‑denied to interface acct `[Verified]` |
| AIRC authority doc + assessment | ❌ UI (do in AIRC workspace) | tables present but the assessment workflow is UXF |
| Guardrail metrics / incidents | ❌ read in AICT UI | app **links** to Health/Security tabs |
| App‑side integrity summary (confidence, unverified rate, sign rate) | ✅ REST | from `u_bhuc_screening` / `u_bhuc_care_plan` — this is the app's own data |
| `sn_ai_governance_asset_governance_details` | ✅ readable | optional native asset status in the app |

**Net:** Part A is entirely **manual in the AICT/AIRC UI** (guardrail config + governance registration). Part B is the only **code** work (a governance read endpoint + an Output‑Integrity page + optional server‑side gate). Part C is the test matrix.

---

## 7. Decisions I need from you before building Part B

1. **Governance Output‑Integrity page — read‑only summary + AICT deep links, or also try to pull native guardrail data?** (Recommend: app‑side summary + deep links, since guardrail metrics are UI‑only.)
2. **Move the sign/confirm gates server‑side** (robust, can't be bypassed via API) or leave client‑side only for now? (Recommend: move server‑side — it's the actual Output‑Integrity enforcement.)
3. **Do the ServiceNow Part‑A config now (I can guide you click‑by‑click since it's UI‑only), or build Part B first and configure guardrails after?**

Tell me your call on these and I'll execute.

---

## 8. Does this actually protect the agent against hallucination? (detective vs preventive)

**Short answer: No — monitoring *detects and measures* hallucination; it does not *prevent* the model from hallucinating.** This distinction matters for how UC2 is presented to a reviewer.

### The native guardrails are *detective*, not preventive
`Data Integrity Incident Detection` and `Output Screening` are **monitoring/assurance** controls:
- They **sample** the agent's LLM output and **flag/score** when it mismatches expected behavior (OWASP LLM + OpenAI spec) or contains PII.
- They record **incidents**, open **AI Cases**, and feed the **Health / Security & Privacy** dashboards.

But they run **after** the model generates, are **probabilistic + sampling‑based** (even at 100% sampling the docs note "not all occurrences may be identified"), and Data Integrity Incident Detection **does not block** the output — it observes and logs it. So the guardrails tell you **whether / how often / how badly** the agent hallucinates and give you the **audit trail** — they don't stop a given hallucination from being produced.

### What actually *protects* the patient (the real mitigation)
The protection is the **app‑layer controls** — which is exactly why UC2 is governed as **guardrails + HITL**, not guardrails alone:
1. **Grounding** — Agent 3's tagger marks each line grounded/**unverified** against the source, so ungrounded (hallucinated) content is *surfaced*.
2. **Human‑in‑the‑loop gates** — the clinician **must Confirm** the risk score (C4) and **Sign** the note (C5, *blocked* until every unverified line is resolved). The agent **never finalizes**. **No hallucinated content becomes part of the clinical record without a licensed human verifying it** — this is the actual safety net.

### What the residual score is claiming
- **Inherent = High × Neutral** — LLMs *do* hallucinate; unchecked that's dangerous in behavioral health.
- **Residual = High × Unlikely** — *impact* stays high, but the *likelihood of harm reaching the patient* drops, because the human gate catches it before anything is committed. The residual delta claims the harm is **contained**, not that hallucination is **eliminated**.

### The reviewer‑facing framing
> "We can't stop an LLM from ever hallucinating. Our posture is **detect → surface → gate**: the guardrails measure it and create an audit trail, the grounding flags it, and no AI output is finalized without a clinician's verification. Residual risk is reduced because the failure is caught before it harms a patient — not because the model is perfect."

**Bottom line:** the AICT guardrails give **visibility, measurement, and governance evidence**; the **human‑in‑the‑loop sign/confirm gate is what actually protects the patient**. Both together are the UC2 control — which is why the plan pairs the native guardrails with the app‑layer HITL rather than relying on either alone.

