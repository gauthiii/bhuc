# Fairness & Non-Discrimination (Use Case 4) — Scheduling Fairness Plan

**Governed risk:** *Fairness / Discrimination* — **a patient's protected or proxy attributes (race,
ethnicity, gender, ZIP, insurance, age) influencing when and with whom they get scheduled**, producing
unequal access to care. UC4 is a **single agent** — the **BHUC Scheduling Agent (Agent 6)** — governed
under the AICT **Fairness / Discrimination** risk category (`plan.md` §4.1, §4.4 Agent 6).

This document is the **as-built plan**: the end-to-end flow, what runs on the **ServiceNow side** (the
agent + its script tools), the **React app** changes, the **governance monitoring** surface, and **how
to verify**. `[Doc]` = ServiceNow / platform docs; `[Verified]` = confirmed on `ven04690` in this build.

> **Design decisions (2026-07-09, all owner-confirmed):** reject → back to **`pending`**; availability =
> **business hours in the script** (Mon–Fri 9–17); fairness metric = **wait-time parity**; agent tools =
> **2 scripts + the Search-Retrieval RAG**. Race/ethnicity added as **real fields** on `u_bhuc_patient`.

---

## 1. What "fairness" means here (two halves)

| Half | The threat | The mechanism that stops it |
|---|---|---|
| **A. Biased decision** | A protected/proxy attribute (race, ethnicity, gender, ZIP, insurance, age) sways *who* is scheduled or *how soon* | The agent's **fairness strip** — protected fields are removed from the matching input **before** any slot is suggested, and the exclusion is `gs.info`-logged as compliance evidence |
| **B. Biased outcome (drift)** | Even a "blind" system can drift so one group waits longer in aggregate | The **Governance → Scheduling Fairness** page monitors **wait-time parity** across age/gender/ethnicity over actual confirmed/completed appointments |

**A blinds the decision; B watches the outcome.** Both are required — blinding the inputs doesn't prove
the outcomes stayed equitable, and monitoring outcomes doesn't prevent a biased decision.

## 2. The end-to-end flow (status model)

```
Patient books (date + time + REASON)  ->  u_bhuc_appointment  status = pending
                                                   |
Clinician: "Run scheduling agent"  --A2A-->  Agent 6 (svc-bhuc-scheduling-ai)
   1. Get pending scheduling queue   (reads pending + demographics, FAIRNESS STRIP, audit log)
   2. triage urgency from reason     (crisis > medication > therapy/intake > other)
   3. Assign & write suggested slots (business hours, conflict-free, urgency-ordered)
                                                   |
                                          status = proposed   (u_start = suggested,
                                                               u_requested_start = original)
                                                   |
Clinician reviews  ->  Accept  = confirmed   |   Reject  = back to pending (re-run re-suggests)
                                                   |
Governance -> Scheduling Fairness  (wait-time parity over confirmed/completed)
```

Only **`pending`** rows enter the agent. `proposed` / `confirmed` / `completed` are ignored (already
scheduled). **The agent never books autonomously** — every suggestion is a `proposed` draft a human
accepts or rejects. `[Verified]`

## 3. Data model (`u_bhuc_appointment`)

| Field | Set by | Role in UC4 |
|---|---|---|
| `u_reason_category` | patient (P6) | `crisis / medication / therapy / intake / other` — the **only** clinical input to urgency |
| `u_reason_text` | patient (P6) | free-text detail (optional) |
| `u_start` | patient → agent | patient's requested time; the agent **overwrites** it with the suggested slot |
| `u_requested_start` | agent (from booking) | **preserves** the patient's original requested time (added 2026-07-09) — drives wait-time |
| `u_status` | flow | `pending → proposed → confirmed` / `→ pending` on reject |
| `u_triage_priority` | agent | `high / moderate / low` from the reason (fairness-blind) |
| `u_proposed_by_agent` | agent | audit flag |
| `u_patient.u_race` / `u_ethnicity` / `u_gender` / `u_date_of_birth` | patient record | **excluded** from the decision; used **only** by the governance monitor |

> `u_race` + `u_ethnicity` were **added to `u_bhuc_patient` 2026-07-09** so the fairness strip excludes
> *real* protected data (not just gender/zip/insurance). Populated on the 12 diverse demo patients
> `BHUC_PATIENT_007`–`018` + backfilled on `002`–`006`. `tables.md` Tables 1 & 4.

---

## 4. Part A — ServiceNow side (the Scheduling Agent v2)

Agent `2105c6673bf9cb105551369693e45a72`, runs as **`svc-bhuc-scheduling-ai`** (`u_bhuc_ai_agent` +
`u_bhuc_schedule_write`; needs the `u_bhuc_appointment` create/write/read ACLs keyed to `schedule_write`).
**3 tools = the RAG + 2 scripts.** Full scripts + Agent Studio rebuild steps + test prompt live in
**`agents/scheduling_agent_v2.md`** (copy-paste ready). `[Verified over A2A 2026-07-09]`

| Tool | Type | What it does |
|---|---|---|
| **Get pending scheduling queue** (`20c9b1ac…`) | Script | Reads all `pending` appts + patient demographics, assembles the matching input (incl. protected attrs so the strip is *provable*), **removes the PROTECTED set**, `gs.info`-logs the excluded fields, returns the queue JSON. No inputs. |
| **Assign & write suggested slots** (`64c9b1ac…`) | Script | Re-reads `pending`, orders by urgency (from `reason_category`) then requested time, assigns the nearest conflict-free **business-hours** slot (honouring the requested time when free), writes `u_start` (suggested) + `u_requested_start` (original) + `u_status=proposed` + `u_triage_priority`. Optional `urgency_overrides` (JSON string) lets the LLM override urgency. |
| **Clinician Directory Search** (AIA RAG Retriever) | Search Retrieval (RAG) | Optional clinician context. Kept per design; not load-bearing in v2 (availability is business-hours-in-script). |

**Removed in the v2 rebuild:** the old `Fairness-check Script` (`2fb5062b…`, redundant — the strip now
lives inside *Get pending scheduling queue*) and `Record Operation (propose appointment)` (`f1170e2f…`,
superseded — *Assign & write suggested slots* writes the rows).

**The fairness strip (in *Get pending scheduling queue*)** removes any field whose lowercased name is in:
```
race, ethnicity, gender, gender_identity, sex, sexual_orientation, zip, zip_code, postal_code,
postcode, address, insurance, insurance_type, insurance_provider, payer, religion, national_origin,
age, date_of_birth, language
```
and logs, e.g., `[BHUC][fairness] Pending appt <id> — excluded protected/proxy fields: ["gender","race","ethnicity","zip","insurance","date_of_birth"]`.

**Availability & urgency (in *Assign & write suggested slots*):** slots **Mon–Fri, 9–11 & 13–16** (skip
12:00 lunch), hourly; earliest = tomorrow 09:00; conflicts avoided against existing `confirmed`/`proposed`
rows. Urgency: `crisis→high(3) > medication→moderate(2) > therapy/intake→low(1) > other→low(0)`; higher
urgency is assigned earlier slots. Tweak the `HOURS` / `URGENCY` maps at the top of the script.

---

## 5. Part B — React app

### B1 — Patient (P6, `Appointments.tsx`)
"Request a visit" now captures a **reason** (`u_reason_category` + optional `u_reason_text`) and a
preferred time, and submits a **request** (`POST /api/x_bhuc/appointments` → `pending`, `u_start` =
`u_requested_start` = requested). Copy makes clear the care team confirms the final slot. `[Verified]`

### B2 — Clinician (C8, `Scheduling.tsx`) — the review queue
Replaces the old single-patient "match cards" (`plan.md` §3.3 C8) with a **queue board**:
- **"Run scheduling agent"** → `POST /scheduling/run` invokes Agent 6 over A2A, shown behind the shared
  **`AgentRunProgress`** animation ("Removing protected attributes… Running the fairness check…
  Assigning fair, conflict-free slots…").
- **Suggested slots — review:** each `proposed` row shows patient, reason + urgency chip, and
  **requested → suggested** time, with **Accept** (`/scheduling/accept` → `confirmed`) / **Reject**
  (`/scheduling/reject` → back to `pending`, restores the requested time).
- **Pending requests** list shows what's still awaiting the agent. `[Verified]`

### B3 — Backend endpoints (`server/app/appointments.py`)
| Endpoint | Purpose |
|---|---|
| `POST /appointments` | patient books → `pending` (+ reason, `u_requested_start`) |
| `GET  /scheduling/queue` | board: `pendingCount` + `proposed[]` (review) + `pending[]` |
| `POST /scheduling/run` | invoke Agent 6; returns the refreshed board + `newProposals` |
| `POST /scheduling/accept` | `proposed → confirmed` |
| `POST /scheduling/reject` | `proposed → pending` (restores `u_requested_start`) |

---

## 6. Part C — Governance monitoring (the fairness metric)

**Page:** `Governance → Scheduling Fairness` (`Fairness.tsx`, nav + route added). **Endpoint:**
`GET /api/x_bhuc/governance/fairness` (`server/app/governance.py`).

**Metric = wait-time parity.** For every **confirmed / completed** appointment with complete data
(a preserved request time **and** a patient with gender + ethnicity on file — incomplete rows are
data-quality gaps, excluded so no phantom "Unknown" group skews the result):

- `wait_days = u_start − u_requested_start` (≥ 0).
- Group by **gender**, **ethnicity**, and **age band** (`18–29 / 30–44 / 45–59 / 60+` from DOB).
- Per group: **count** + **average wait (days)** → the distribution bar charts.
- **Parity per axis** `= 1 − (maxAvg − minAvg) / maxAvg` (as %) — **100 %** = every group waits equally;
  it drops when one group is pushed further from its requested time. **Overall** = mean of the three.

The page shows the overall parity meter + a per-axis bar chart (count) with the avg-wait and the
axis parity %. **The Scheduling Agent blinds the *decision* to these attributes; this page verifies the
*outcome* stays equitable** — the two halves of §1. `[Verified: 18 complete rows, overall ≈ 76%, ethnicity 94%]`

---

## 7. Part D — How to verify the whole chain

### D1 — Agent decision is blind + correct (Part A)
1. Ensure ≥1 `pending` appointment (book one in P6, or seed one).
2. Run the agent (C8 "Run scheduling agent", or the **test prompt** in `agents/scheduling_agent_v2.md`,
   or `POST /scheduling/run`).
3. **Expect:** each `pending` → `proposed`; `u_start` = a business-hours slot; `u_requested_start`
   preserved; `u_triage_priority` matches the reason; the **crisis** case gets the **earliest** slot;
   `sys_updated_by = svc-bhuc-scheduling-ai`. **Audit:** the syslog holds a `[BHUC][fairness] … excluded
   protected/proxy fields: […]` line per row. `[Verified 2026-07-09: 5 pending → 5 proposed, 26s]`

### D2 — Human-in-the-loop (Part B)
- In C8, **Accept** a suggestion → it becomes `confirmed` and drops out of the queue. **Reject** another
  → it returns to `pending` (re-running the agent re-suggests it). The agent never confirms. `[Verified]`

### D3 — Outcome monitoring (Part C)
- Open **Governance → Scheduling Fairness** → the distribution charts + parity % render over
  confirmed/completed appointments. A group with a materially higher avg wait drops that axis's parity —
  the signal a governance officer investigates.

### D4 — Before/After demo (`plan.md` §6)
- **"Before":** point out that a naïve scheduler could let ZIP/insurance/ethnicity influence who gets the
  soonest slot.
- **"After":** run the agent → show the `[BHUC][fairness]` exclusion log + the fairness progress
  animation, then the Governance parity page proving outcomes stayed equitable. This is the UC4 money shot.

---

## 8. What's REST-doable vs UI-only

| Item | REST? | Notes |
|---|---|---|
| `u_requested_start` / `u_race` / `u_ethnicity` fields | ✅ | created via Table API (`sys_dictionary` + `sys_choice`) |
| Appointment CRUD + status transitions | ✅ | the app's `/scheduling/*` endpoints (integration account) |
| Agent tools (scripts) + wiring + publish | ❌ UI-only | authored as scripts, pasted into Agent Studio; the **scripts** are in `agents/scheduling_agent_v2.md` |
| Agent run-as identity (`svc-bhuc-scheduling-ai`) | ❌ UI-only | set in Agent Studio (identity_type=AI); ACLs via API (`schedule_write`) |
| Fairness monitoring page + metric | ✅ code | `governance.py` + `Fairness.tsx` |

**Net:** schema + app + monitoring are code/REST; **the agent rebuild is the only UI-only step**, and it
is **done + verified** (`agents/scheduling_agent_v2.md`).

---

## 9. Does this actually enforce fairness? (defense in depth)

**Yes — a blinded decision plus an audited, monitored outcome:**

1. **Blind decision (agent):** protected/proxy attributes are stripped from the matching input **before**
   any slot is suggested; the agent triages purely on **clinical reason** and schedules within neutral
   **business-hours** availability. The strip is **logged** as compliance evidence on every run.
2. **Human-in-the-loop:** the agent only ever writes **`proposed`** drafts; a clinician **accepts or
   rejects** each one. The agent cannot book.
3. **Outcome monitoring (governance):** **wait-time parity** across age/gender/ethnicity is computed over
   real confirmed/completed appointments, so drift — a group systematically waiting longer despite the
   blind decision — is **surfaced** for investigation, not assumed away.
4. **Least-privilege execution:** the agent runs as `svc-bhuc-scheduling-ai` (not admin), so its writes
   are ACL-gated (`schedule_write`), and every proposed row is attributed to that identity for audit.

**Reviewer framing:** *"Scheduling decisions are blind by construction — race, ethnicity, gender, ZIP,
insurance, and age are stripped from the agent's inputs before any slot is proposed, and the exclusion is
logged. The agent only drafts `proposed` slots that a clinician must accept or reject; it never books.
Governance independently monitors wait-time parity across demographics over actual outcomes, so bias
drift is detected even though the decision itself is blind. The agent runs under a least-privilege
non-human identity."*

**Who/what the fairness controls cover:** every patient booking request flows through the same blind,
audited, human-confirmed pipeline; the outcome is monitored across **age, gender, and ethnicity** on the
Governance Scheduling-Fairness page.
