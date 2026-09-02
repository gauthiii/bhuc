# Scheduling Agent (Agent 6) — v2 Redesign

> **STATUS: BUILT + VERIFIED over A2A (2026-07-09).** The agent was rebuilt in Agent Studio per this
> doc (2 scripts + RAG; old Fairness-check Script + Record-Operation tools removed; instructions/role/
> description updated to the queue model; runs as `svc-bhuc-scheduling-ai`). Test run via
> `POST /scheduling/run`: **5 pending → 5 proposed** in 26s — each got a business-hours slot, urgency
> triaged by reason (crisis→high, medication→moderate, else low), the crisis case got the earliest
> slot, `u_requested_start` preserved, `sys_updated_by = svc-bhuc-scheduling-ai`. See the **Test prompt**
> section below and `fairness_usecase.md`.

**Goal:** the agent processes the **pending** appointment queue (patient-booked requests),
applies the fairness check, and writes back **suggested** slots (`status = proposed`) based on
the clinician's availability — for the clinician to accept/reject.

**New status flow:** patient books → `pending` → *Run scheduling agent* → `proposed` (suggested)
→ clinician **Accept** → `confirmed` / **Reject** → back to `pending`.

Only `pending` rows are processed. `proposed` / `confirmed` / `completed` are ignored.

---

## Tools (3): keep the RAG, replace the rest with 2 scripts

| # | Tool | Type | Action |
|---|------|------|--------|
| A | **Get pending scheduling queue** | **Script** | reads `pending` appts + patient demographics, runs the **fairness strip**, logs the audit, returns the queue JSON |
| B | **Assign & write suggested slots** | **Script** | assigns conflict-free business-hours slots by urgency, writes `status=proposed` + `u_requested_start` |
| C | **Clinician Directory Search** | **Search Retrieval (RAG)** | keep as-is (unchanged) |

**Remove** the old single-record tools: `Record Operation (propose appointment)` /
`Create Appointment Records` (the old model created one appointment per run — no longer used).

---

## Tool A — "Get pending scheduling queue"  (Script, Run as = System User)

**Inputs:** none.
**Output:** JSON `{ pending_count, queue:[…], fairness_pass }`.

```javascript
(function (inputs) {
    // Protected + proxy attributes that must NEVER influence a scheduling decision.
    var PROTECTED = ['race','ethnicity','gender','gender_identity','sex','sexual_orientation',
                     'zip','zip_code','postal_code','postcode','address','insurance',
                     'insurance_type','insurance_provider','payer','religion','national_origin',
                     'age','date_of_birth','language'];

    var queue = [];
    var gr = new GlideRecord('u_bhuc_appointment');
    gr.addQuery('u_status', 'pending');
    gr.orderBy('u_start');
    gr.query();
    while (gr.next()) {
        var p = gr.u_patient.getRefRecord();
        // Assemble the raw matching input — INCLUDES protected attrs so the strip is provable.
        var raw = {
            appointment: gr.getUniqueValue(),
            reason_category: gr.getValue('u_reason_category') || 'other',
            reason_text: gr.getValue('u_reason_text') || '',
            requested_start: gr.getValue('u_start') || '',
            gender: p ? p.getValue('u_gender') : '',
            race: p ? p.getValue('u_race') : '',
            ethnicity: p ? p.getValue('u_ethnicity') : '',
            zip: p ? p.getValue('u_postcode') : '',
            insurance: p ? p.getValue('u_insurance_provider') : '',
            date_of_birth: p ? p.getValue('u_date_of_birth') : ''
        };
        var excluded = [], clean = {};
        for (var k in raw) {
            if (PROTECTED.indexOf(('' + k).toLowerCase()) > -1) excluded.push(k);
            else clean[k] = raw[k];
        }
        // Compliance evidence — logged BEFORE any suggestion is produced.
        gs.info('[BHUC][fairness] Pending appt ' + raw.appointment +
                ' — excluded protected/proxy fields: ' + JSON.stringify(excluded));
        queue.push({
            appointment: raw.appointment,
            patient: gr.getValue('u_patient'),
            reason_category: raw.reason_category,
            reason_text: raw.reason_text,
            requested_start: raw.requested_start,
            clean_input: clean,
            excluded_fields: excluded
        });
    }
    return JSON.stringify({ pending_count: queue.length, queue: queue, fairness_pass: true });
})(inputs);
```

---

## Tool B — "Assign & write suggested slots"  (Script, Run as = System User)

**Inputs:** none (self-contained — re-reads `pending` so it never depends on the LLM threading data).
Optional input `urgency_overrides` (JSON map `appointment_sys_id → high|moderate|low`) if you want
the LLM's reason-triage to influence ordering; otherwise urgency is derived from `reason_category`.
**Output:** JSON `{ proposed_count, proposals:[…] }`.

```javascript
(function (inputs) {
    // Availability: Mon–Fri, hourly slots 9–11 & 13–16 (skip 12:00 lunch). Tweak here.
    var HOURS = [9, 10, 11, 13, 14, 15, 16];
    var URGENCY = { crisis: 3, medication: 2, therapy: 1, intake: 1, other: 0 };
    var BAND = { 3: 'high', 2: 'moderate', 1: 'low', 0: 'low' };

    var overrides = {};
    try { overrides = JSON.parse(inputs.urgency_overrides || '{}'); } catch (e) { overrides = {}; }
    var OBAND = { high: 3, moderate: 2, low: 1 };

    function p2(n) { return (n < 10 ? '0' : '') + n; }
    function fmt(d) {
        return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()) +
               ' ' + p2(d.getUTCHours()) + ':00:00';
    }
    function isWeekday(d) { var w = d.getUTCDay(); return w >= 1 && w <= 5; }

    // Slots already taken by confirmed/proposed appts — avoid double-booking.
    var taken = {};
    var ex = new GlideRecord('u_bhuc_appointment');
    ex.addQuery('u_status', 'IN', 'confirmed,proposed');
    ex.query();
    while (ex.next()) { taken[ex.getValue('u_start')] = true; }

    // Pending queue, ordered by urgency desc then requested time asc.
    var pend = [];
    var gr = new GlideRecord('u_bhuc_appointment');
    gr.addQuery('u_status', 'pending');
    gr.query();
    while (gr.next()) {
        var id = gr.getUniqueValue();
        var cat = gr.getValue('u_reason_category') || 'other';
        var urg = overrides[id] ? OBAND[overrides[id]] : (URGENCY[cat] != null ? URGENCY[cat] : 0);
        pend.push({ id: id, cat: cat, urg: urg, req: gr.getValue('u_start') || '' });
    }
    pend.sort(function (a, b) { return (b.urg - a.urg) || (a.req < b.req ? -1 : 1); });

    // Earliest schedulable slot = tomorrow 09:00 GMT.
    var base = new Date();
    base.setUTCDate(base.getUTCDate() + 1);
    base.setUTCHours(9, 0, 0, 0);

    function nextSlot(fromDate) {
        var d = new Date(fromDate.getTime());
        for (var i = 0; i < 200; i++) {           // up to ~28 business days out
            if (isWeekday(d)) {
                for (var h = 0; h < HOURS.length; h++) {
                    var cand = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(),
                                                 d.getUTCDate(), HOURS[h], 0, 0));
                    if (cand.getTime() < fromDate.getTime()) continue;
                    if (!taken[fmt(cand)]) return cand;
                }
            }
            d.setUTCDate(d.getUTCDate() + 1);
            d.setUTCHours(9, 0, 0, 0);
        }
        return null;
    }

    var results = [];
    for (var i = 0; i < pend.length; i++) {
        var it = pend[i];
        var from = base;
        if (it.req) {                              // honor the requested time if it's later than base
            var rd = new Date(it.req.replace(' ', 'T') + 'Z');
            if (!isNaN(rd.getTime()) && rd.getTime() > base.getTime()) from = rd;
        }
        var slot = nextSlot(from);
        if (!slot) continue;
        var key = fmt(slot);
        taken[key] = true;

        var rec = new GlideRecord('u_bhuc_appointment');
        if (rec.get(it.id)) {
            rec.setValue('u_requested_start', it.req || key);   // preserve what the patient asked for
            rec.setValue('u_start', key);                       // the suggested slot
            rec.setValue('u_status', 'proposed');
            rec.setValue('u_triage_priority', BAND[it.urg]);
            rec.setValue('u_proposed_by_agent', true);
            rec.update();
            results.push({ appointment: it.id, reason: it.cat, urgency: BAND[it.urg],
                           requested: it.req, suggested: key });
        }
    }
    gs.info('[BHUC][scheduling] Proposed ' + results.length + ' slot(s) from the pending queue.');
    return JSON.stringify({ proposed_count: results.length, proposals: results });
})(inputs);
```

---

## Agent instructions (orchestration) — paste into the agent's Instructions

> You are the BHUC Scheduling Agent. When asked to run scheduling:
> 1. Call **Get pending scheduling queue** to load the pending appointment requests and confirm the
>    fairness check stripped protected attributes (race, ethnicity, gender, ZIP, insurance, age).
> 2. For each request, read `reason_category` / `reason_text` and judge clinical urgency
>    (crisis > medication > therapy/intake > other). You may consult **Clinician Directory Search**
>    for context. NEVER use any demographic/protected attribute in your reasoning.
> 3. Call **Assign & write suggested slots** to write fair, conflict-free suggested slots
>    (`status = proposed`) for the whole queue. Optionally pass `urgency_overrides`.
> 4. Report how many suggestions you wrote and the fairness result. Never confirm an appointment —
>    the clinician accepts or rejects each suggestion in the app.

---

## Agent Studio — exact steps to rebuild

1. Open **AI Agent Studio → Agents → BHUC Scheduling Agent** (`2105c6673bf9cb105551369693e45a72`).
2. **Tools → Remove** the old `Record Operation (propose appointment)` / `Create Appointment Records`.
3. **Add tool → Script** → name **Get pending scheduling queue** → paste Tool A → **Run as = System User** → no inputs → save.
4. **Add tool → Script** → name **Assign & write suggested slots** → paste Tool B → **Run as = System User** → (optional input `urgency_overrides`, string) → save.
5. Keep the **Clinician Directory** Search Retrieval tool.
6. Paste the **Agent instructions** above.
7. **Publish**. Keep **Run as → svc-bhuc-scheduling-ai** (needs write on `u_bhuc_appointment` — already granted via `schedule_write`).
8. Test from the app: **Clinician → Scheduling → Run scheduling agent** (or use the Test prompt below).

> The FastAPI `POST /scheduling/run` invokes this agent over A2A. **Rebuild complete + verified
> 2026-07-09** — the button now processes the pending queue for real.

---

## Test prompt

Paste into **Governance → Agents Inventory → BHUC Scheduling Agent** (or the Agent Studio test panel).
Needs at least one `pending` appointment in `u_bhuc_appointment` (a patient booking, P6) to have work.

```
Process the pending scheduling queue. First call "Get pending scheduling queue" to load the
pending appointment requests and confirm the fairness check excluded the protected attributes.
Then call "Assign & write suggested slots" to assign fair, conflict-free slots within
availability, prioritising by clinical urgency. Report how many appointments you scheduled,
which protected fields were excluded, and the requested-vs-suggested time for each.
```

Shorter trigger:
```
Run scheduling: process all pending appointment requests, apply the fairness check, and assign suggested slots for clinician review.
```

**Expected:** the agent calls both script tools, moves the pending rows to `proposed` with assigned
business-hours slots, reports the excluded fields (`race, ethnicity, gender, zip, insurance, date_of_birth`),
and the crisis case gets the earliest slot. **Verify** in **Clinician → Scheduling** (the rows appear in
the review queue, requested → suggested, Accept/Reject) or re-query `/scheduling/queue` (pending drops,
proposed rises). The one-click equivalent is the **"Run scheduling agent"** button on that screen.

**Verified run (2026-07-09):** 5 pending → proposed; crisis (Tyrone) earliest slot at 11:00, then
moderate (13:00), then lows; `sys_updated_by = svc-bhuc-scheduling-ai`.
