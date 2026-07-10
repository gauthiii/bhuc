# Agent 2 (BHUC Risk Identification Agent) — changes to apply

Agent: **BHUC Risk Identification Agent** · sys_id `ac2e79a73b7d0f1076f13b64c3e45af3`
Open it in **AI Agent Studio** (builder role `sn_aia.admin`) and make the changes below.

There are **4 changes**: the agent Description, the agent Instructions, Tool 1 (one setting), and
Tool 2 (add subscores). Tool 3 needs nothing.

---

## Change 1 — Agent **Description** (replace the whole field)

Paste this in place of the current description:

> You score behavioral-health screening instruments into a risk band (Low, Moderate, High) with a
> confidence value and a short rationale that lists the specific responses that drove the score. You
> handle the mental-health spine (C-SSRS, PHQ-9, GAD-7) and the substance-use battery (NIDA Quick
> Screen, AUDIT, DAST-10, the Craving & Triggers module, SOWS, BAM, and SOCRATES), scoring exactly one
> instrument per request. For summed instruments you compute the total and map it to the published
> band; for subscale instruments (BAM, SOCRATES) you compute each subscale and never invent a single
> total. You retrieve the matching scoring rules from the Screening Scoring Rules knowledge base and
> score only from those rules, never from memory. Substance-use instruments contain 42 CFR Part 2 (SUD)
> information; you keep patient identifiers out of the free-text rationale. You never make a final
> clinical determination — every score is a draft that a licensed triage clinician must confirm, adjust,
> or reject.

---

## Change 2 — Agent **Instructions** (replace the whole numbered list)

Paste this in place of the current instructions:

1. Look up the screening record on **BHUC Screening** (`u_bhuc_screening`) via its `u_patient`
   reference; read `u_instrument` and `u_responses` (raw JSON answers).
2. Use **Search Retrieval** to load the scoring rules for that instrument — query with the
   instrument's name (e.g. "AUDIT scoring bands", "SOWS withdrawal severity", "SOCRATES subscales").
   Instrument values you will see: `c_ssrs`, `phq9`, `gad7`, `nida_qs`, `audit`, `dast10`, `craving`,
   `sows`, `bam`, `socrates8`. Also retrieve "BHUC risk banding and escalation rules" to translate the
   result into a Low/Moderate/High band.
3. Compute the result per the retrieved rules:
   - **Summed instruments** (`phq9`, `gad7`, `audit`, `dast10`, `sows`, `craving`, and the `nida_qs`
     router): sum the item values, map to the instrument's severity band, then to the BHUC risk band.
   - **Subscale instruments** (`bam`, `socrates8`): the message already contains a **"Precomputed
     subscores"** JSON block that the server calculated — treat it as authoritative. **Do NOT recompute
     the subscales yourself.** Use those numbers to interpret the result and set the band; never produce
     a single total.
   - **`nida_qs`** is a router: report which substances screened positive and which follow-up
     instruments are indicated (alcohol→AUDIT, drugs→DAST-10, tobacco→cessation advice); band Low
     unless other flags apply.
4. Apply escalation: C-SSRS ideation 4/5 or any behavior, or PHQ-9 item 9 positive → **High + crisis
   pathway**; SOWS ≥ 21 → note **urgent medical review** in the rationale; DAST-10 ≥ 9 → High.
5. Write `u_risk_band`, `u_confidence`, and `u_rationale` back to the record with the **Write risk
   score** tool, and set `u_scored_by_agent = true`. **For BAM and SOCRATES, pass the "Precomputed
   subscores" JSON from the message VERBATIM** into the write tool's `subscores` input, and cite those
   subscale numbers in the rationale.
6. Invoke the clinician-confirmation flow (awaits `u_clinician_action` = Confirm/Adjust/Reject) — do not
   set `u_state` to confirmed; the clinician does that.
7. Never put patient identifiers in the free-text rationale. Treat every substance-use instrument as
   42 CFR Part 2 sensitive.

---

## Change 3 — Tool 1 **AIA RAG Retriever (Search Retrieval)** — one setting

- Change **Results limit** from `10` to `15`. (The Screening KB grew from 5 to 12 articles; a broad
  query needs room to return both the instrument article and the banding article.)
- Leave everything else as-is: profile `bhuc_screening_search`, its KB source, Hybrid, threshold `0.3`,
  citations required, Autonomous.
- **Prerequisite:** in the ServiceNow UI, publish the 7 new Draft articles **KB0010039–KB0010045**
  (NIDA / AUDIT / DAST-10 / Craving & Triggers / SOWS / BAM / SOCRATES) in the Screening KB so they
  appear in retrieval.

---

## Change 4 — Tool 2 **Write risk score (script)** — add `subscores`

sys_id `5349b2a33b3d4f1076f13b64c3e45a1a`. This lets BAM/SOCRATES subscales be stored as data (they
have no single band/total, so rationale-only would lose them). Three steps.

> **Note:** the subscale arithmetic is now done **server-side** (`risk.py compute_subscores`) — the
> value is written at record creation AND passed to the agent as an authoritative "Precomputed
> subscores" block, so the agent only persists it verbatim. This was added because the LLM computed
> BAM/SOCRATES subscales inconsistently. The `subscores` input below is still required so the agent's
> write carries the correct value.

**4a. Add a column to the `u_bhuc_screening` table:**

| Attribute | Value |
| --- | --- |
| Name (`element`) | `u_subscores` |
| Column label | Subscores |
| Type | String |
| Max length | 1000 |

**4b. Set the tool's Inputs to these 5** (adds `subscores`; the other 4 are unchanged):

| Input name | Description |
| --- | --- |
| `risk_band` | The computed risk band: low, moderate, or high. |
| `confidence` | Confidence score from 0 to 100. |
| `rationale` | Short explanation citing the specific responses that drove the score. |
| `subscores` | Optional. For BAM/SOCRATES only, the per-subscale scores as a JSON string — e.g. BAM `{"use":3,"risk":13,"protective":4}`, SOCRATES `{"recognition":28,"ambivalence":12,"taking_steps":32}`. Leave empty for single-band instruments. |
| `screening_sys_id` | The sys_id of the screening record being scored. |

**4c. Replace the tool's Script with exactly this:**

```javascript
(function(inputs) {
    var gr = new GlideRecordSecure('u_bhuc_screening');
    if (gr.get(inputs.screening_sys_id)) {
        gr.u_risk_band = inputs.risk_band;
        gr.u_confidence = inputs.confidence;
        gr.u_rationale = inputs.rationale;
        if (inputs.subscores) { gr.u_subscores = inputs.subscores; }  // BAM/SOCRATES per-subscale JSON
        gr.u_scored_by_agent = true;
        gr.u_state = 'scored';
        gr.update();
        return JSON.stringify({ success: true, screening: inputs.screening_sys_id });
    }
    return JSON.stringify({ success: false, error: 'Screening record not found: ' + inputs.screening_sys_id });
})(inputs);
```

(This is the current live script plus the one `subscores` line. It also drops the old, incorrect
`// GlideRecord, not Secure` comment — the line is and stays `GlideRecordSecure`. You can also delete
the two commented-out legacy script blocks above it.)

---

## Tool 3 — BHUC Risk Confirmation Latest (subflow)

No change.
