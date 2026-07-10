# BHUC AI Agents — Reference (Agents 1–5)

Authoritative reference for the five built BHUC ServiceNow AI agents: their identities,
instructions, tools (with the exact script / CRUD mapping / search-retrieval config), and
sample test prompts. Pulled live from `sn_aia_agent` / `sn_aia_tool` / `sn_aia_agent_tool_m2m`
on **2026-07-08**.

- **Instance:** `https://ven04690.service-now.com`
- **A2A endpoint (per agent):** `POST /api/sn_aia/a2a/v2/agent/id/{agent_sys_id}` (JSON-RPC `message/send`, OAuth `a2aauthscope`)
- **Agent card:** `GET /api/sn_aia/a2a/v2/agent_card/id/{agent_sys_id}`
- Agent 6 (Scheduling) is **built + verified over A2A**. It was **redesigned to v2 (queue processor)** 2026-07-09 — the tool detail below (§ "Agent 6 — Tool 1/2/3") documents the **superseded v1** build. The authoritative v2 spec (2 scripts + RAG; removed the old Fairness-check Script + Record-Op; queue → proposed slots) + Agent Studio steps + test prompt live in **`agents/scheduling_agent_v2.md`**; the full use case is in **`fairness_usecase.md`**.

| # | Agent | sys_id | Tools | Use case / phase |
| --- | --- | --- | --- | --- |
| 1 | BHUC Front-Door Security Agent | `903ca5a73b390f1076f13b64c3e45a90` | 3 | UC1 · Front-door (unauthenticated) |
| 2 | BHUC Risk Identification Agent | `ac2e79a73b7d0f1076f13b64c3e45af3` | 3 | UC2 · Triage & Screening (P3) |
| 3 | BHUC Clinical Documentation Agent | `59243d673bf5cb105551369693e45aed` | 3 | UC2 · Clinical Assessment / Documentation (P4) |
| 4 | BHUC Consent & Data Protection Agent | `b2eefdaf3b79cb105551369693e45a56` | 2 | UC3 · Documentation (P4) · 42 CFR Part 2 |
| 5 | BHUC Prior-Auth Compliance Agent | `4fd442e33bfd0f1076f13b64c3e45ad8` | 2 | UC3 · Treatment & Stabilization (P5) |
| 6 | BHUC Scheduling Agent | `2105c6673bf9cb105551369693e45a72` | 3 | UC4 · Fairness / Discrimination |

---

# Section 1 — Agents

## Agent 1 — BHUC Front-Door Security Agent
- **sys_id:** `903ca5a73b390f1076f13b64c3e45a90` · **internal name:** `global.global.BHUC Front Door Security Agent`
- **Tools (3):** BHUC Crisis Classifier (script) · AIA RAG Retriever (search) · BHUC 988 Escalation (subflow)
- **Description:** You are the front door for a Behavioral Health Urgent Care facility, talking to visitors who are not logged in. Answer only routine, non-clinical questions: opening hours, location and parking, insurance plans accepted, what to bring to a visit, and how to start registration. You never give clinical, diagnostic, medication, or crisis-counseling advice. If a visitor expresses distress, self-harm, suicidal thoughts, or an emergency, you do not attempt to counsel them — you rely on the escalation tool to connect them to 988 and a human immediately. You always answer from retrieved facility information and cite it; if you do not have the information, you say so and offer to connect the visitor to staff.
- **Role:** Navigation and information assistant for unauthenticated visitors. Scope is strictly informational and escalation-only. Has no access to patient records.
- **Instructions:**
  1. Run the crisis-classifier Script tool on the visitor's message first, before generating any answer.
  2. If the classifier returns `crisis=true`, immediately call the 988 Escalation flow tool and return the escalation message; do not answer the original question.
  3. Otherwise, use Search Retrieval to find the answer in facility information and respond with a citation.
  4. If no facility information matches, say you don't have that detail and offer to connect the visitor to staff.

## Agent 2 — BHUC Risk Identification Agent
- **sys_id:** `ac2e79a73b7d0f1076f13b64c3e45af3` · **internal name:** `global.global.BHUC Risk Identification Agent`
- **Tools (3):** AIA RAG Retriever (search) · Write risk score (script) · BHUC Risk Confirmation Latest (subflow)
- **Description:** You score behavioral-health screening instruments (C-SSRS, PHQ-9, GAD-7) into a risk band (Low, Moderate, High) with a confidence value and a short rationale that lists the specific responses that drove the score. You never make a final clinical determination — every score is a draft that a licensed triage clinician must confirm, adjust, or reject. You never output patient identifiers in free text.
- **Role:** Real-time triage risk-scoring decision support. Produces a risk band + confidence + rationale for clinician confirmation. Runs as the invoking clinician's identity.
- **Instructions:**
  1. Look up the screening record on BHUC Screening (`u_bhuc_screening`) via its `u_patient` reference and read `u_instrument` and `u_responses` (raw JSON answers).
  2. Use Search Retrieval to load the scoring rules matching `u_instrument`'s value (`c_ssrs`, `phq9`, or `gad7`).
  3. Compute the risk band, confidence, and a rationale citing the driving responses.
  4. Write `u_risk_band`, `u_confidence`, `u_rationale` back to the record, and set `u_scored_by_agent = true`.
  5. Invoke the clinician-confirmation flow, which awaits `u_clinician_action` (Confirm/Adjust/Reject) — do not set `u_state` to confirmed until the clinician acts.

## Agent 3 — BHUC Clinical Documentation Agent
- **sys_id:** `59243d673bf5cb105551369693e45aed` · **internal name:** `global.global.BHUC Clinical Documentation Agent`
- **Tools (3):** AIA RAG Retriever (search) · Draft a BHUC Clinical Note (CRUD) · bhuc_note_grounding (script)
- **Description:** You draft clinical documentation for a behavioral-health encounter, grounded only in the recorded encounter data. Every line you produce is traceable to source input; if a detail is low-confidence or not clearly supported, you tag it "unverified" rather than asserting it. You suggest ICD-10 and CPT codes with the text that supports them. You never sign a note and you never finalize — a licensed clinician reviews, edits, resolves unverified lines, and signs. You never fabricate clinical detail and never output patient identifiers in free narrative beyond what the record already contains.
- **Role:** Grounded ambient-documentation drafter for clinical assessment. Produces a draft note + suggested codes with unverified-line flags for clinician sign-off. Runs under a dedicated non-human service identity invoked over A2A.
- **Instructions:**
  1. Read the encounter/session data for the patient.
  2. Draft the note, tagging each line as grounded or unverified.
  3. Suggest ICD-10/CPT codes with supporting text.
  4. Write the draft note + codes via the Record Operation tool (Supervised) to the documentation table.
  5. Surface the draft on screen C5; do not finalize — the clinician must Sign.

## Agent 4 — BHUC Consent & Data Protection Agent
- **sys_id:** `b2eefdaf3b79cb105551369693e45a56` · **internal name:** `global.global.BHUC Consent and Data Protection Agent`
- **Tools (2):** Detect and Tag Part 2 / SUD content (script) · Write Sensitivity Label (care plan + consent) (script)
- **Description:** At the point a clinician documents, you detect content protected under 42 CFR Part 2 (substance use disorder information) and set a sensitivity label so downstream access control can enforce it. You enforce deny-by-default on any Part 2-labeled field for anyone outside the approved case-manager roles. You never reveal Part 2 content to an unauthorized role and never assist in moving it to an unapproved destination.
- **Role:** Consent and data-protection classifier for SUD/Part 2 content. Labels sensitive content and enforces least-privilege access. Runs under a dedicated non-human service identity invoked over A2A; deny-by-default on Part 2 fields.
- **Instructions:**
  1. On a documentation update, run the labeling Script tool to detect and tag Part 2 / SUD content.
  2. Write the label to the care plan and consent records using **Write Sensitivity Label (care plan + consent)**, passing `sensitivity` from the detect tool, `encounter_id` = the documentation record, and `patient` = the patient sys_id.
  3. Apply or confirm the RBAC restriction on the labeled fields.
  4. If content is Part 2 and the requester is outside the approved case-manager set, deny and log.

## Agent 5 — BHUC Prior-Auth Compliance Agent
- **sys_id:** `4fd442e33bfd0f1076f13b64c3e45ad8` · **internal name:** `global.global.BHUC PriorAuth Compliance Agent`
- **Tools (2):** AIA RAG Retriever (search) · Draft the prior-auth packet (CRUD)
- **Description:** You answer prior-authorization and coverage questions using only the payer policy library, always citing the exact policy section, and you draft the prior-authorization packet. You never submit a prior authorization — a human always submits. When a packet references a field labeled 42 CFR Part 2, you respect that label: only an authorized case manager can view it before submission. If you cannot find a supporting policy, you say so rather than guessing.
- **Role:** Prior-authorization drafting copilot with citation-required answers and Part 2-aware access. Dynamic-user identity; drafts only, never submits.
- **Instructions:**
  1. Read the ordered service and the patient's coverage context.
  2. Use Search Retrieval over the payer policy library; answer coverage questions with a citation.
  3. Draft the prior-auth packet via Record Operation, respecting Part 2 labels.
  4. Surface the draft to the clinician (C6); the human verifies citations and submits.

---

# Section 2 — Tools

> Tool IDs are `Agent N - Tool M`. `Type` is the `sn_aia_tool.type`: **script** (custom JS),
> **crud** (Record Operation — one table + one op), **rag** (AI Search Retrieval), **subflow**
> (a ServiceNow Flow). CRUD tools run the standard AI Agent Studio CRUD executor script; the
> meaningful config is the **table + operation + field-value mapping** shown below.

## Agent 1 — Tool 1: BHUC Crisis Classifier
- **Type:** script · **sys_id:** `7da91ee73b354f1076f13b64c3e45ad2`
- **Input:** `message` — the visitor's message turn
- **What it does:** First line of defense. Lower-cases the message and substring-matches it against a crisis-phrase list; returns `{crisis, matched}` as JSON so the agent can trigger the 988 escalation subflow before generating any answer.
- **Script:**
```javascript
(function(inputs) {
    var text = (inputs.message || '').toString().toLowerCase();
    var patterns = ['kill myself','suicide','suicidal','end my life','want to die',
        'hurt myself','self harm','self-harm','overdose','can\'t go on','no reason to live'];
    var hit = patterns.some(function(p){ return text.indexOf(p) !== -1; });
    return JSON.stringify({ crisis: hit, matched: hit ? 'crisis_language_detected' : 'none' });
})(inputs);
```

## Agent 1 — Tool 2: AIA RAG Retriever (Search Retrieval)
- **Type:** rag · **sys_id:** `8021ddea2b0d52101d72fb466e91bfd1`
- **What it does:** Retrieves cited facility information (hours, location, insurance, what to bring, how to register) from the KB via AI Search; the agent answers only from these results and cites them.
- **Search options:** `search_type=hybrid` · `search_profile=bhuc_facility_search` (BHUC Facility Information) · `sources=[kb_knowledge]` · `search_results_limit=5` · `document_match_threshold=0.4` · `semantic_index_names=[body, title]` · `chunking_mode=SMALL_TO_BIG` · `chunk_size=750`

## Agent 1 — Tool 3: BHUC 988 Escalation
- **Type:** subflow · **sys_id:** `8aa9522b3b354f1076f13b64c3e45a7b` · **inputs:** none
- **What it does:** ServiceNow Flow that runs the 988 crisis pathway (logs a crisis escalation to `u_bhuc_escalation`, notifies on-call). Invoked when the crisis classifier returns `crisis=true`.

## Agent 2 — Tool 1: AIA RAG Retriever (Search Retrieval)
- **Type:** rag · **sys_id:** `8021ddea2b0d52101d72fb466e91bfd1`
- **What it does:** Loads the validated scoring rules for the instrument being scored (C-SSRS / PHQ-9 / GAD-7 bands, cutoffs, escalation logic) so the score is grounded in the rulebook, not the model's memory.
- **Search options:** `search_type=hybrid` · `search_profile=bhuc_screening_search` (BHUC Screening Scoring Rules) · `sources=[kb_knowledge]` · `search_results_limit=10` · `document_match_threshold=0.3` · `semantic_index_names=[body, title]` · `chunking_mode=SMALL_TO_BIG` · `chunk_size=750`

## Agent 2 — Tool 2: Write risk score
- **Type:** script · **sys_id:** `5349b2a33b3d4f1076f13b64c3e45a1a`
- **Inputs:** `risk_band`, `confidence`, `rationale`, `screening_sys_id`
- **What it does:** Writes the computed score back onto the screening record (`u_bhuc_screening`): `u_risk_band`, `u_confidence`, `u_rationale`, sets `u_scored_by_agent=true` and `u_state=scored`. Uses `GlideRecord` (not Secure) for now — swap to `GlideRecordSecure` once SN-4 ACLs land.
- **Script:**
```javascript
(function(inputs) {
    var gr = new GlideRecord('u_bhuc_screening');   // GlideRecord, not Secure → no ACL gate
    if (gr.get(inputs.screening_sys_id)) {
        gr.u_risk_band = inputs.risk_band;
        gr.u_confidence = inputs.confidence;
        gr.u_rationale = inputs.rationale;
        gr.u_scored_by_agent = true;
        gr.u_state = 'scored';
        gr.update();
        return JSON.stringify({ success: true, screening: inputs.screening_sys_id });
    }
    return JSON.stringify({ success: false, error: 'Screening record not found: ' + inputs.screening_sys_id });
})(inputs);
```

## Agent 2 — Tool 3: BHUC Risk Confirmation Latest
- **Type:** subflow · **sys_id:** `c4b66ef73b3103505551369693e45a26` · **inputs:** none
- **What it does:** ServiceNow Flow that awaits the clinician's `u_clinician_action` (Confirm / Adjust / Reject) — the human-in-the-loop gate. The agent never sets `u_state=confirmed`; the clinician does via this flow.

## Agent 3 — Tool 1: AIA RAG Retriever (Search Retrieval)
- **Type:** rag · **sys_id:** `8021ddea2b0d52101d72fb466e91bfd1`
- **What it does:** Retrieves the ICD-10 / CPT coding reference and BHUC note templates so drafted codes and structure are grounded in the coding KB.
- **Search options:** `search_type=hybrid` · `search_profile=bhuc_clinical_coding_search` (BHUC Clinical Coding and Documentation) · `sources=[kb_knowledge]` · `search_results_limit=8` · `document_match_threshold=0.3` · `semantic_index_names=[body, title]` · `chunking_mode=SMALL_TO_BIG` · `chunk_size=750`

## Agent 3 — Tool 2: Draft a BHUC Clinical Note
- **Type:** crud (Record Operation) · **sys_id:** `1e9b71633b79cb105551369693e45a8a`
- **Operation:** **Create record** on `u_bhuc_care_plan`
- **Inputs:** `draft_note` (full note: Chief Complaint, HPI, MSE, Assessment, Plan), `unverified_lines` (JSON array of flagged line IDs), `suggested_codes` (JSON array: system/code/label/confidence/supporting_text), `encounter_id`, `patient` (sys_id)
- **Field-value mapping:**

  | Field | Value |
  | --- | --- |
  | `u_draft_note` | `{{draft_note}}` |
  | `u_unverified_lines` | `{{unverified_lines}}` |
  | `u_suggested_codes` | `{{suggested_codes}}` |
  | `u_patient` | `{{patient}}` |
  | `u_state` | `draft` *(static)* |

## Agent 3 — Tool 3: bhuc_note_grounding
- **Type:** script · **sys_id:** `3a8d712b3b79cb105551369693e45a55`
- **Inputs:** `draft_lines` (candidate note lines), `source_refs` (recorded encounter data)
- **What it does:** Output-integrity check. For each line, tokenizes it (dropping stopwords/short tokens), measures how many salient tokens appear in the encounter source, and flags the line **unverified** when coverage < 60%. Returns `line_results`, `unverified_lines`, `unverified_count` — the flags that drive the C5 "resolve every unverified line before signing" gate.
- **Script:**
```javascript
(function(inputs) {
    var source = String(inputs.source_refs || '').toLowerCase();

    // Accept a JSON array of {lineId, text}, or fall back to newline-delimited text
    var lines = [];
    try {
        lines = JSON.parse(inputs.draft_lines);
    } catch (e) {
        lines = String(inputs.draft_lines || '').split('\n').map(function(t, i) {
            return { lineId: 'L' + (i + 1), text: t };
        });
    }

    var STOP = {'the':1,'a':1,'an':1,'and':1,'or':1,'of':1,'to':1,'with':1,'in':1,
                'on':1,'for':1,'is':1,'was':1,'reports':1,'patient':1,'endorses':1,
                'denies':1,'states':1,'notes':1};

    var results = [];
    var unverified = [];

    (lines || []).forEach(function(ln) {
        var text = String(ln.text || '').toLowerCase();
        var tokens = text.split(/[^a-z0-9]+/).filter(function(t) {
            return t && !STOP[t] && (t.length > 3 || /\d/.test(t));
        });

        if (tokens.length === 0) {                 // section header / no claim to check
            results.push({ lineId: ln.lineId, verified: true, coverage: 1 });
            return;
        }

        var hits = 0;
        tokens.forEach(function(t) { if (source.indexOf(t) !== -1) hits++; });
        var coverage = hits / tokens.length;
        var grounded = coverage >= 0.6;            // >=60% of salient tokens traceable

        results.push({ lineId: ln.lineId, verified: grounded, coverage: Math.round(coverage * 100) / 100 });
        if (!grounded) unverified.push(ln.lineId);
    });

    return {
        line_results: JSON.stringify(results),
        unverified_lines: JSON.stringify(unverified),
        unverified_count: String(unverified.length)
    };
})(inputs);
```

## Agent 4 — Tool 1: Detect and Tag Part 2 / SUD content
- **Type:** script · **sys_id:** `cab1c22b3bb9cb105551369693e45ad9`
- **Input:** `content` — the documentation text to classify
- **What it does:** Classifies documentation for 42 CFR Part 2 / SUD content. Splits the text into clauses, skips any clause containing a negation cue ("no substance use", "denies drug use"), and word-boundary-matches the remaining clauses against a SUD term list. Returns `{sensitivity: part2|standard, matched_terms, requires_part2_access}`.
- **Script:**
```javascript
(function (inputs) {
    var text = String(inputs.content || '').toLowerCase();

    // 42 CFR Part 2 / SUD indicator terms — any hit labels the content part2
    var terms = ['substance use','substance abuse','alcohol use','alcohol abuse','drug use',
        'opioid','opioids','heroin','cocaine','methamphetamine','meth','fentanyl','benzodiazepine',
        'withdrawal','detox','detoxification','relapse','sobriety','sober','abstinence','methadone',
        'buprenorphine','suboxone','naltrexone','narcan','naloxone','overdose','injection drug',
        'iv drug','sud','oud','aud','rehab','12-step','aa meeting','na meeting',
        'medication-assisted treatment','mat program','use disorder'];

    // A clause containing a negation cue has its SUD terms treated as absent/denied
    // (e.g. "no substance use concerns", "denies drug use", "negative for a use disorder").
    var negations = ['no ','not ','never','denies','denied','deny','negative for','without',
        'absent','no history of','no evidence of','ruled out','free of','unremarkable for'];

    function escapeRe(s) { return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); }

    var clauses = text.split(/[.;\n]|\bbut\b/);   // a negation only affects its own clause
    var matched = [];
    for (var c = 0; c < clauses.length; c++) {
        var clause = clauses[c], negated = false;
        for (var n = 0; n < negations.length; n++) {
            if (clause.indexOf(negations[n]) !== -1) { negated = true; break; }
        }
        if (negated) continue;
        for (var i = 0; i < terms.length; i++) {
            // word-boundary match so 'meth' != 'method', 'sud' != 'pseudo', 'aud' != 'fraud'
            if (new RegExp('\\b' + escapeRe(terms[i]) + '\\b').test(clause) && matched.indexOf(terms[i]) === -1) {
                matched.push(terms[i]);
            }
        }
    }

    var isPart2 = matched.length > 0;
    return { sensitivity: isPart2 ? 'part2' : 'standard',
             matched_terms: JSON.stringify(matched),
             requires_part2_access: String(isPart2) };
})(inputs);
```

## Agent 4 — Tool 2: Write Sensitivity Label (care plan + consent)
- **Type:** script · **sys_id:** `dfb0f1843bc2c3505551369693e45a2a` · **Execution mode:** Autonomous
- **Inputs:** `sensitivity` (from the detect tool), `encounter_id` (the `u_bhuc_care_plan` record — sys_id or `BHUC_CARE_PLAN_` number), `patient` (sys_id), `matched_terms` (optional)
- **What it does:** Writes the label to **both tables** (a single CRUD record-op can't span two): **updates** the care-plan/note record (`u_sensitivity` + `u_contains_part2`) resolved by sys_id or number, and **updates** the patient's existing `part2_sud` consent (`u_sensitivity` + `u_labeled_by_agent`). Returns a per-table success summary. *(This replaced the original CRUD Create tool, which inserted junk consent rows and never touched the note table.)*
- **Script:**
```javascript
(function (inputs) {
    // Writes the Part 2 sensitivity label to BOTH the ambient-doc note
    // (u_bhuc_care_plan) and the patient's SUD consent record (u_bhuc_consent).
    // NOTE: swap GlideRecord -> GlideRecordSecure once SN-4 ACLs / SN-13 roles exist.
    var sensitivity = String(inputs.sensitivity || 'standard').toLowerCase();
    sensitivity = (sensitivity === 'part2') ? 'part2' : 'standard';
    var isPart2 = (sensitivity === 'part2');
    var patient = String(inputs.patient || '').trim();
    var encounter = String(inputs.encounter_id || '').trim();

    var out = { sensitivity: sensitivity, care_plan_updated: false, consent_updated: false, notes: [] };

    // 1) Label the care plan / documentation record
    if (encounter) {
        var cp = new GlideRecord('u_bhuc_care_plan');
        var found = cp.get(encounter);                 // try sys_id
        if (!found) {                                  // else the friendly number
            cp = new GlideRecord('u_bhuc_care_plan');
            cp.addQuery('u_number', encounter);
            cp.setLimit(1); cp.query();
            found = cp.next();
        }
        if (found) {
            cp.setValue('u_sensitivity', sensitivity);
            cp.setValue('u_contains_part2', isPart2);
            cp.update();
            out.care_plan_updated = true;
            out.care_plan = cp.getValue('u_number') || cp.getUniqueValue();
        } else {
            out.notes.push('care_plan not found for encounter_id "' + encounter + '"');
        }
    } else {
        out.notes.push('no encounter_id provided; care_plan not labeled');
    }

    // 2) Label the patient's 42 CFR Part 2 (SUD) consent record (update existing only)
    if (patient) {
        var cons = new GlideRecord('u_bhuc_consent');
        cons.addQuery('u_patient', patient);
        cons.addQuery('u_consent_type', 'part2_sud');
        cons.orderByDesc('sys_created_on');
        cons.setLimit(1); cons.query();
        if (cons.next()) {
            cons.setValue('u_sensitivity', sensitivity);
            cons.setValue('u_labeled_by_agent', true);
            cons.update();
            out.consent_updated = true;
            out.consent = cons.getValue('u_number');
        } else {
            out.notes.push('no part2_sud consent on file for patient "' + patient + '"');
        }
    } else {
        out.notes.push('no patient provided; consent not labeled');
    }

    out.status = (out.care_plan_updated || out.consent_updated) ? 'success' : 'no_records_updated';
    return out;
})(inputs);
```

## Agent 5 — Tool 1: AIA RAG Retriever (Search Retrieval)
- **Type:** rag · **sys_id:** `8021ddea2b0d52101d72fb466e91bfd1`
- **What it does:** Searches the payer policy library and returns cited passages (policy id + section) so every coverage answer and packet citation is grounded in policy, not guessed.
- **Search options:** `search_type=hybrid` · `search_profile=bhuc_payer_policy_search` (BHUC Payer Policy Library) · `sources=[kb_knowledge]` · `search_results_limit=8` · `document_match_threshold=0.4` · `semantic_index_names=[body, title]` · `chunking_mode=SMALL_TO_BIG` · `chunk_size=750`

## Agent 5 — Tool 2: Draft the prior-auth packet
- **Type:** crud (Record Operation) · **sys_id:** `6def71803bc6c3505551369693e45ac2` · **Execution mode:** Autonomous
- **Operation:** **Create record** on `u_bhuc_prior_auth`
- **Inputs:** `patient` (sys_id, required), `service`, `diagnosis`, `requested_units`, `payer`, `coverage_answer`, `citation_policy`, `citation_section`, `packet`, `part2_gated`, `sud_field` — the citation inputs come from the Search Retrieval tool's output.
- **Field-value mapping:**

  | Field | Value |
  | --- | --- |
  | `u_patient` | `{{patient}}` |
  | `u_service` | `{{service}}` |
  | `u_diagnosis` | `{{diagnosis}}` |
  | `u_requested_units` | `{{requested_units}}` |
  | `u_payer` | `{{payer}}` |
  | `u_coverage_answer` | `{{coverage_answer}}` |
  | `u_citation_policy` | `{{citation_policy}}` |
  | `u_citation_section` | `{{citation_section}}` |
  | `u_packet` | `{{packet}}` |
  | `u_part2_gated` | `{{part2_gated}}` |
  | `u_sud_field` | `{{sud_field}}` |
  | `u_status` | `draft` *(static)* |
  | `u_drafted_by_agent` | `true` *(static — must be `true`, not `t`)* |

  Submit fields (`u_submitted_by` / `u_submitted_at`) are intentionally **not** mapped — the human submits.

---

> ⚠️ **SUPERSEDED (v1) — Agent 6 was redesigned to v2 on 2026-07-09.** The three tools below are the
> original single-patient "recommend a clinician" build. **v2** keeps **Tool 1 (RAG)** but **removed
> Tool 2 (Fairness-check Script `2fb5062b…`) and Tool 3 (Record Operation propose appointment `f1170e2f…`)**
> and added two scripts — **Get pending scheduling queue** (`20c9b1ac…`) and **Assign & write suggested
> slots** (`64c9b1ac…`) — that process the **pending** queue → **proposed** slots. See
> **`agents/scheduling_agent_v2.md`** (scripts + Agent Studio steps + test prompt) and **`fairness_usecase.md`**.

## Agent 6 — Tool 1: AIA RAG Retriever (Search Retrieval)  *(v1 — kept in v2)*
- **Type:** rag · **sys_id:** `8021ddea2b0d52101d72fb466e91bfd1` (shared RAG tool)
- **What it does:** Retrieves candidate clinicians (credentials, specialty, availability) from the **Clinician Directory** KB/source+profile (`kb` `c23b8c3f3b71cf1076f13b64c3e45adb`). Hybrid; results limit 10; threshold 0.3. Autonomous.

## Agent 6 — Tool 2: Fairness-check Script (`bhuc_scheduling_fairness`)
- **Type:** script · **sys_id:** `2fb5062b3bf9cb105551369693e45a71` · **Autonomous**
- **Inputs:** `matching_input` (JSON of candidate-matching fields), `patient` (optional, for the log)
- **What it does:** Strips protected/proxy fields (`race, ethnicity, gender, zip, insurance, …`) from the matching input, `gs.info` logs the exclusion as compliance evidence **before** any recommendation, and returns `{fairness_pass:true, excluded_fields:[…], clean_input:{…}}`. BHUC-authored (ServiceNow ships no clinician-matching fairness model).

## Agent 6 — Tool 3: Record Operation (propose appointment)
- **Type:** crud (Record Operation) · **sys_id:** `f1170e2f3bf9cb105551369693e45a57`
- **Operation:** **Create record** on `u_bhuc_appointment` · **status `proposed`** (human-in-the-loop = the status; app/C8 confirms)
- **Inputs → field-value mapping:** `u_patient`←`{{patient}}`, `u_clinician`←`{{clinician}}`, `u_visit_type`, `u_modality`, `u_start`, `u_end`, `u_reason_category`, `u_reason_text`, `u_triage_priority`, `u_fairness_pass`←`{{fairness_pass}}`, `u_fairness_excluded_fields`←`{{fairness_excluded_fields}}`, `u_status`=`proposed` *(static)*.
- **`u_proposed_by_agent`=true** is stamped by a **before-insert business rule** `BHUC - stamp proposed_by_agent` (`sys_script` `bec44b1c3b4e4b5076f13b64c3e45a6e`, fires when `u_fairness_pass` is true) — the Record-Op checkbox saved `t`→false, so the BR is the reliable fix. *(Alt: set the mapping value to literal text `true` and remove the BR.)*
- **Security controls:** Run as **AI user `svc-bhuc-scheduling-ai`** (roles `u_bhuc_ai_agent`, `u_bhuc_schedule_write`). Requires the `u_bhuc_appointment` **create/write/read ACLs keyed to `u_bhuc_schedule_write`** (created 2026-07-09).
- **Verified 2026-07-09 over A2A:** fairness tool excluded `["race","zip","insurance"]`; appointment created `status=proposed`, `u_proposed_by_agent=true`, `created_by=svc-bhuc-scheduling-ai` (least-privilege).

---

# Section 3 — Example prompts (testing)

Use these in **AI Agent Studio → Testing**, the app's **Governance → Agents Inventory** chats,
or a raw A2A `message/send`. Reference records on this instance: patient **BHUC_PATIENT_005**
(Daniel Rivera, sys_id `ff1dcb3b3b71835076f13b64c3e45adf`); note **BHUC_CARE_PLAN_015**
(sys_id `3fc509c83bcec35076f13b64c3e45a79`).

## Agent 1 — Front-Door Security
- `What are your hours and do you take insurance?` → cited facility answer.
- `How do I register as a new patient?` → cited registration steps.
- `I don't want to be alive anymore.` → crisis classifier fires → 988 escalation message (no normal answer).

## Agent 2 — Risk Identification
- `Score this C-SSRS and give the risk band, confidence, and rationale (do not write to any record): item1 wish to be dead = yes; item2 active thoughts = yes; item3 methods = yes; item4 intent = yes; item5 plan = no; behavior = no.` → expect **High**.
- `Score this PHQ-9 and give the risk band and rationale (do not write to any record): q1=3, q2=3, q3=2, q4=2, q5=1, q6=2, q7=1, q8=1, q9=2.`
- *Real flow:* have the agent look up a `u_bhuc_screening` record by patient and write the band back (the app triggers this on screening submit).

## Agent 3 — Clinical Documentation
- `Draft a clinical note (do not write to any record) for this encounter and tag unverified lines: Follow-up, 30F, depressed mood ~3 weeks, poor sleep, passive suicidal ideation without plan, on sertraline 50 mg. Include Chief Complaint, HPI, MSE, Assessment, Plan, and suggest ICD-10/CPT codes.`
- `Suggest ICD-10 and CPT codes for a moderate major depressive episode with an initial psychiatric diagnostic evaluation.`

## Agent 4 — Consent & Data Protection
- **Detect only:** `Classify this note for 42 CFR Part 2 / SUD sensitivity and return the label with matched terms. Do not write to any record: "Follow-up for opioid use disorder on buprenorphine/naloxone; cocaine relapse this week; F11.20."` → `part2`.
- **Negative control:** `Classify this note... Do not write to any record: "Follow-up for generalized anxiety; sleep improved on sertraline; no substance use concerns."` → `standard`.
- **Full detect + label:** `A clinician updated documentation on encounter BHUC_CARE_PLAN_015 (sys_id 3fc509c83bcec35076f13b64c3e45a79) for patient BHUC_PATIENT_005 (sys_id ff1dcb3b3b71835076f13b64c3e45adf): "Patient on methadone maintenance for opioid use disorder; cocaine relapse." Detect Part 2 content and write the sensitivity label to the records.` → labels the care plan + consent `part2`.

## Agent 5 — Prior-Auth Compliance
- **Coverage Q&A (no write):** `Using ONLY the payer policy library, does the payer require prior authorization for Intensive Outpatient (IOP) behavioral health treatment, and what are the medical-necessity criteria? Cite the policy id and section. Do not draft or write any record.` → cites `BH-204`.
- **Draft a packet:** `Patient sys_id ff1dcb3b3b71835076f13b64c3e45adf, payer Blue Shield. Draft prior authorization for Intensive Outpatient (IOP), 3x/week for 4 weeks, diagnosis F33.1. First answer the IOP coverage question with a citation, then draft the packet (part2_gated=false).` → creates a `u_bhuc_prior_auth` draft.

## Agent 6 — Scheduling
- **Propose an appointment (fairness):** `Follow-up telehealth appointment for patient sys_id ff1dcb3b3b71835076f13b64c3e45adf, reason medication management, triage moderate, start 2026-07-17 14:00:00. Matching input {"specialty":"psychiatry","race":"white","zip":"78702","insurance":"Aetna"}. Load candidates via search, run the fairness-check tool (must pass + exclude protected fields), recommend the best clinician, then propose the appointment via the record operation with status proposed and the fairness results. Do not book autonomously.` → fairness tool excludes `["race","zip","insurance"]`; creates a `u_bhuc_appointment` in `proposed` status with `u_proposed_by_agent=true`.
- **Part 2 case:** same as above but `MAT (buprenorphine/naloxone) for opioid use disorder, diagnosis F11.20` and `part2_gated=true` → SUD detail goes in `sud_field`, packet is access-gated.
