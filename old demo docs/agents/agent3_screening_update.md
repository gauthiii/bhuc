# Agent 3 (BHUC Clinical Documentation Agent) — screening-driven documentation update

Agent: **BHUC Clinical Documentation Agent** · sys_id `59243d673bf5cb105551369693e45aed`
Open it in **AI Agent Studio** (builder role `sn_aia.admin`) and apply Changes 1–2 below.
Changes 3–5 are already done (backend + KB + field); they're listed so the picture is complete.

**Why:** documentation was drafted from a hardcoded canned vignette, so every note read the
same and generic. It now drafts from the patient's **actual latest screening results** (one per
instrument, deduped), synthesized across instruments and mapped to candidate ICD-10 codes.

---

## Change 1 — Agent **Description** (replace the whole field)

> You draft clinical documentation for a behavioral-health encounter, grounded only in the recorded
> source data. Your primary source is the patient's latest screening results — one per instrument,
> deduplicated — provided as a structured summary (instrument, score, severity/risk band, flags,
> subscales, and rationale). You synthesize ACROSS instruments into one coherent note: you set the
> chief complaint from the highest-acuity finding, document each elevated domain in the HPI, and in the
> Assessment you map each instrument's score/band to interpretation and candidate ICD-10 codes using the
> Clinical Coding & Documentation knowledge base (never from memory). Every line is traceable to a
> screening result; if a detail (e.g., an exam finding) is not supported by the screening data, you tag
> it "unverified" rather than asserting it. You suggest ICD-10 and CPT codes with the exact supporting
> text. Substance-use instruments (NIDA, AUDIT, DAST-10, Craving, SOWS, BAM, SOCRATES) are 42 CFR Part 2
> data — treat any line derived from them as protected. You never sign and never finalize — a licensed
> clinician reviews, resolves unverified lines, and signs. You never fabricate clinical detail and never
> output patient identifiers in free narrative beyond what the source already contains.

## Change 2 — Agent **Instructions** (replace the whole numbered list)

1. Read the source for this encounter. When it is a **structured screening summary** (latest result per
   instrument), treat each listed instrument result as the ground truth.
2. Use **Search Retrieval** over the Clinical Coding & Documentation KB to load: the note template, the
   **instrument-result → interpretation & ICD-10 mapping**, the **multi-instrument synthesis** guidance,
   the coding tables (ICD-10 incl. SUD F10–F19; CPT incl. screening/SBIRT), and the SUD/Part 2 rules.
3. Draft the note in sections **Chief Complaint, HPI, MSE, Assessment, Plan**:
   - Chief Complaint = highest-acuity finding (C-SSRS high-risk or PHQ-9 item 9 → suicidality leads).
   - HPI = one line per elevated domain, each citing the instrument and score.
   - MSE = tag lines **unverified** unless a screening result directly implies them (screening is not an exam).
   - Assessment = primary + secondary/comorbid diagnoses per the mapping + synthesis articles, each with
     the instrument/score as supporting text.
   - Plan = driven by risk bands + escalation flags (crisis for C-SSRS/PHQ-9 item 9; urgent medical for
     SOWS ≥ 21) + SOCRATES readiness for engagement.
4. Use the **grounding tool** (`bhuc_note_grounding`) to tag each line grounded or unverified against the
   summary.
5. Suggest **ICD-10/CPT** codes with supporting text (codes are candidates for clinician confirmation).
6. Write the draft (`draft_note`, `unverified_lines`, `suggested_codes`) via the **Draft a BHUC Clinical
   Note** tool. Leave it a draft — do NOT sign. Any SUD-derived content is 42 CFR Part 2.
7. Surface the draft on screen C5; the clinician resolves unverified lines and signs.

## Change 3 — Tools — NO config change needed
- **AIA RAG Retriever:** same profile `bhuc_clinical_coding_search`, results limit 8, threshold 0.3.
  **Prerequisite (you, in the UI):** publish the 3 new Draft articles **KB0010046** (interpretation/
  ICD-10 map), **KB0010047** (multi-instrument synthesis), **KB0010048** (screening-to-narrative
  template) so retrieval can use them.
- **Draft a BHUC Clinical Note (CRUD):** unchanged.
- **bhuc_note_grounding (script):** unchanged — it now runs against the screening summary text the
  backend sends (grounds against the structured summary, per the decision).

## Change 4 — KB (DONE)
- Fixed 4 corrupted articles (KB0010018/19/20/21 had router help text) — re-pushed from the mirror.
- Expanded KB0010017 (ICD-10, added SUD F10–F19) and KB0010018 (CPT, added 96127/99408/99409/G-codes).
- Added KB0010046/47/48 (Draft — **publish in UI**). Mirror: `knowledge/bhuc-clinical-coding-and-documentation.md`.

## Change 5 — Backend (DONE, `server/app/note.py`)
- `_screening_summary()` gathers the latest scored screening per instrument (prefers clinician-confirmed,
  else latest scored), builds the structured summary, and returns the source screening numbers.
- `/note/new` and `/note/for-patient` now draft from that summary (fallback to the canned encounter only
  if the patient has no scored screenings). The draft records `u_bhuc_care_plan.u_source_screenings`
  (new field) for traceability.

---

## Verified over A2A (2026-07-10)
Patient `ff1dcb3b…` with C-SSRS (High, confirmed) + PHQ-9 (12) + GAD-7 (12) + AUDIT (24) + BAM
(use 3/risk 13/protective 4) → drafted `BHUC_CARE_PLAN_024`: CC + HPI (grounded) + MSE (unverified) +
Assessment (grounded) + Plan (unverified); suggested codes **R45.851, F32.1, F41.1, F10.20, F19.20,
CPT 90791**; `u_source_screenings` = the 5 screening numbers. Note reflects the patient's real scores,
not the old canned vignette. (Ran before KB0010046–48 were published + before these agent edits — quality
improves once both are applied.)
