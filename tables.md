# BHUC Data Model — Table & Field Specification (12 Tables)

**Status:** LIVE — all 12 tables created on `ven04690`. Tables 1–8 built 2026-07-06; **Tables 9–12 (eligibility, check-in, disposition, order) created 2026-07-09 (DATA-2 completion)** and functionally verified (auto-numbering `BHUC_<TABLE>_001`, references + choices accepted, test records deleted).
**Scope decision:** global-scope tables, `u_bhuc_*` prefix (curl-creatable, mirrors the verified careatlas `u_*` pattern). `plan.md` and `action.md` have been aligned to `u_bhuc_*` for all ServiceNow objects (tables + roles + SP pages/widgets); the FastAPI URL namespace `/api/x_bhuc/` and the bare `x_bhuc` product identifier are intentionally kept.
**Record-ID convention:** every table has a friendly **Number** field (`u_number`) that auto-generates `BHUC_<TABLE>_001`, `BHUC_<TABLE>_002`, … via a per-table Number Maintenance prefix, alongside ServiceNow's internal `sys_id`.
**Instance:** `ven04690.service-now.com` · **Derived from:** `plan.md` v3.0 §8.1 SN-Step 1, §4.4 (agent record-ops), §3.2/§3.3 (screen endpoints).

---

## Conventions used in every table

- **System audit fields are NOT redefined** — ServiceNow auto-provides `sys_id`, `sys_created_on`, `sys_created_by`, `sys_updated_on`, `sys_updated_by`, `sys_mod_count` on every table. They are assumed present and used for timestamps/audit.
- **Type** = ServiceNow dictionary `internal_type`: `string`, `integer`, `boolean`, `glide_date`, `glide_date_time`, `reference`, `choice` (string column with a choice list), `url`.
- **Mand.** = mandatory. **Sens.** = data sensitivity: `PII` (protected health/identity), `Part2` (42 CFR Part 2 / SUD — highest restriction), `—` (non-sensitive).
- **Sensitivity → ACL roles** (from `plan.md` §8.1 SN-Step 13): `PII` fields require `u_bhuc_patient_pii`; `Part2` fields require `u_bhuc_part2_access` (roles created in SN-13).
- **Number field** (`u_number`): `internal_type=string`, `max_length=40`, read-only, auto-populated from a `sys_number` record whose `prefix` is set per table below.

---

## Table 1 — `u_bhuc_patient` (Patient Master)

**Label:** BHUC Patient · **Number prefix:** `BHUC_PATIENT_` → `BHUC_PATIENT_001` · **Purpose:** patient demographics, insurance, consent snapshot, registration/account status, and the denormalized latest risk band for the clinician worklist. One row per patient.

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_PATIENT_` | — |
| 2 | `u_cognito_sub` | Cognito subject | string | 255 | Y | — | unique; links Cognito identity | PII |
| 3 | `u_first_name` | First name | string | 100 | Y | — | — | PII |
| 4 | `u_last_name` | Last name | string | 100 | Y | — | — | PII |
| 5 | `u_preferred_name` | Preferred name | string | 100 | N | — | — | PII |
| 6 | `u_date_of_birth` | Date of birth | glide_date | — | Y | — | — | PII |
| 7 | `u_gender` | Gender | choice | 40 | N | — | female, male, nonbinary, other, prefer_not_to_say | PII |
| 8 | `u_pronouns` | Pronouns | string | 40 | N | — | — | — |
| 9 | `u_email` | Email | string | 200 | Y | — | unique | PII |
| 10 | `u_phone` | Mobile phone | string | 40 | Y | — | E.164 | PII |
| 11 | `u_address_line1` | Address line 1 | string | 200 | N | — | — | PII |
| 12 | `u_address_line2` | Address line 2 | string | 200 | N | — | — | PII |
| 13 | `u_city` | City | string | 100 | N | — | — | — |
| 14 | `u_state` | State/Region | string | 60 | N | — | — | — |
| 15 | `u_postcode` | Postcode/ZIP | string | 20 | N | — | — | — |
| 16 | `u_country` | Country | string | 60 | N | US | — | — |
| 17 | `u_insurance_provider` | Insurance carrier | string | 120 | N | — | — | — |
| 18 | `u_insurance_member_id` | Member ID | string | 80 | N | — | — | PII |
| 19 | `u_insurance_group` | Group number | string | 80 | N | — | — | — |
| 20 | `u_self_pay` | Self-pay | boolean | — | N | false | — | — |
| 21 | `u_registration_status` | Registration status | choice | 40 | Y | draft | draft, pending, verified, rejected | — |
| 22 | `u_account_status` | Account status | choice | 40 | Y | active | active, suspended, closed | — |
| 23 | `u_email_verified` | Email verified | boolean | — | N | false | — | — |
| 24 | `u_profile_complete` | Profile complete | boolean | — | N | false | — | — |
| 25 | `u_hipaa_consent` | HIPAA consent (snapshot) | boolean | — | N | false | — | — |
| 26 | `u_part2_consent` | 42 CFR Part 2 consent (snapshot) | boolean | — | N | false | — | Part2 |
| 27 | `u_tcpa_sms_consent` | TCPA SMS consent | boolean | — | N | false | — | — |
| 28 | `u_privacy_notice_version` | Privacy notice version | string | 20 | N | v1 | — | — |
| 29 | `u_risk_band` | Latest confirmed risk band | choice | 20 | N | unknown | low, moderate, high, unknown | — |
| 30 | `u_confidence_score` | Latest confidence | integer | — | N | — | 0–100 | — |
| 31 | `u_race` | Race | choice | 40 | N | — | white, black_or_african_american, asian, american_indian_or_alaska_native, native_hawaiian_or_pacific_islander, two_or_more, other, prefer_not_to_say | PII |
| 32 | `u_ethnicity` | Ethnicity | choice | 40 | N | — | hispanic_or_latino, not_hispanic_or_latino, prefer_not_to_say | PII |

> **Added 2026-07-09 (Agent 6 fairness demo):** `u_race` + `u_ethnicity` so the Scheduling Agent's fairness check excludes **real** protected attributes (not just gender/zip/insurance). Populated on the 12 diverse demo patients (`BHUC_PATIENT_007`–`018`).

## Table 2 — `u_bhuc_screening` (Intake Screening & Instrument Scores)

**Label:** BHUC Screening · **Number prefix:** `BHUC_SCREENING_` → `BHUC_SCREENING_001` · **Purpose:** one row per submitted instrument; the Risk Identification Agent scores it (draft) and a clinician confirms (§4.4 Agent 2, §3.2 P4, §3.3 C4). Backs the `/intake/screening` + `/risk/confirm` endpoints. **Instruments (2026-07-09):** mental-health spine (C-SSRS, PHQ-9, GAD-7) + SUD battery (NIDA Quick Screen, AUDIT, DAST-10, Craving & Triggers, SOWS, BAM, SOCRATES). SUD rows carry the `part2_sud` flag (42 CFR Part 2).

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_SCREENING_` | — |
| 2 | `u_patient` | Patient | reference | — | Y | — | → `u_bhuc_patient` | PII |
| 3 | `u_instrument` | Instrument | choice | 20 | Y | — | c_ssrs, phq9, gad7, nida_qs, audit, dast10, craving, sows, bam, socrates8 | — |

<!-- u_instrument is a RESTRICTED choice field: ServiceNow blanks any value not in sys_choice on write.
     All 10 choices are provisioned (sys_choice, name=u_bhuc_screening element=u_instrument, en):
     c_ssrs(0) phq9(1) gad7(2) nida_qs(3) audit(4) dast10(5) craving(6) sows(7) bam(8) socrates8(9).
     The 7 SUD choices were added 2026-07-10 — before that, new-instrument rows stored an empty
     u_instrument. Any rebuild/clone must recreate these choices or the SUD battery won't persist. -->

| 4 | `u_session_id` | Session ID | string | 64 | N | — | client correlation id | — |
| 5 | `u_responses` | Raw responses (JSON) | string | 4000 | N | — | structured answers | Part2 |
| 6 | `u_state` | State | choice | 20 | Y | draft | draft, submitted, scored, confirmed | — |
| 7 | `u_raw_score` | Raw score | integer | — | N | — | instrument total | — |
| 8 | `u_severity` | Severity | choice | 30 | N | — | minimal, mild, moderate, moderately_severe, severe, na | — |
| 9 | `u_risk_band` | Risk band (agent) | choice | 20 | N | — | low, moderate, high | — |
| 10 | `u_confidence` | Confidence | integer | — | N | — | 0–100 | — |
| 11 | `u_rationale` | Agent rationale | string | 4000 | N | — | grounded rationale | Part2 |
| 12 | `u_flags` | Flags | string | 1000 | N | — | e.g. item9_positive, cssrs_positive, part2_sud, audit_positive, dast_positive, dast_severe, severe_withdrawal, high_craving | — |
| 13 | `u_escalate` | Escalate | boolean | — | N | false | — | — |
| 14 | `u_agent_execution_id` | A2A execution id | string | 64 | N | — | links A2A request_id | — |
| 15 | `u_scored_by_agent` | Scored by agent | boolean | — | N | false | — | — |
| 16 | `u_clinician_action` | Clinician action | choice | 20 | Y | pending | pending, confirmed, adjusted, rejected | — |
| 17 | `u_clinician` | Confirming clinician | reference | — | N | — | → `sys_user` | — |
| 18 | `u_clinician_rationale` | Clinician rationale | string | 1000 | N | — | — | — |
| 19 | `u_contains_part2` | Contains Part 2 data | boolean | — | N | false | set by Consent agent | Part2 |
| 20 | `u_completed_at` | Completed at | glide_date_time | — | N | — | — | — |
| 21 | `u_subscores` | Subscores | string | 1000 | N | — | JSON per-subscale scores for BAM/SOCRATES (computed server-side; empty for single-band instruments) | Part2 |

> **Added 2026-07-09 (`u_subscores`):** BAM and SOCRATES have no single total — only subscales (BAM: use/risk/protective; SOCRATES: recognition/ambivalence/taking_steps). `risk.py compute_subscores` calculates them deterministically at record creation and passes them to Agent 2 as an authoritative block; the agent persists them verbatim via the Write-risk-score tool's `subscores` input (never recomputes). Field sys_id `4a6e36603b8a4f5076f13b64c3e45a84`.

## Table 3 — `u_bhuc_consent` (Consent Records)

**Label:** BHUC Consent · **Number prefix:** `BHUC_CONSENT_` → `BHUC_CONSENT_001` · **Purpose:** one discrete record per consent type per patient (HIPAA, 42 CFR Part 2 SUD, TCPA) — never bundled (§3.2 P3). Labeled/enforced by the Consent & Data Protection Agent (§4.4 Agent 4). Backs `/consent` + `/consent/classify`.

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_CONSENT_` | — |
| 2 | `u_patient` | Patient | reference | — | Y | — | → `u_bhuc_patient` | PII |
| 3 | `u_consent_type` | Consent type | choice | 20 | Y | — | hipaa, part2_sud, tcpa_sms | — |
| 4 | `u_granted` | Granted | boolean | — | Y | false | — | — |
| 5 | `u_version` | Consent version | string | 20 | N | — | — | — |
| 6 | `u_scope` | Scope | string | 200 | N | — | e.g. treatment_coordination | — |
| 7 | `u_signature` | Signature (typed name) | string | 200 | N | — | — | PII |
| 8 | `u_signed_at` | Signed at | glide_date_time | — | N | — | — | — |
| 9 | `u_phone` | Phone (TCPA) | string | 40 | N | — | — | PII |
| 10 | `u_revoked` | Revoked | boolean | — | N | false | — | — |
| 11 | `u_revoked_at` | Revoked at | glide_date_time | — | N | — | — | — |
| 12 | `u_sensitivity` | Sensitivity label | choice | 20 | N | standard | standard, part2 | Part2 |
| 13 | `u_labeled_by_agent` | Labeled by agent | boolean | — | N | false | — | — |
| 14 | `u_source` | Source | choice | 30 | N | patient_portal | patient_portal, clinician, import | — |

## Table 4 — `u_bhuc_appointment` (Appointments / Scheduling)

**Label:** BHUC Appointment · **Number prefix:** `BHUC_APPOINTMENT_` → `BHUC_APPOINTMENT_001` · **Purpose:** appointments and Scheduling-Agent proposals with the fairness-check result (§4.4 Agent 6, §3.2 P6, §3.3 C8). Backs `/appointments*`.

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_APPOINTMENT_` | — |
| 2 | `u_patient` | Patient | reference | — | Y | — | → `u_bhuc_patient` | PII |
| 3 | `u_clinician` | Clinician | reference | — | N | — | → `sys_user` | — |
| 4 | `u_visit_type` | Visit type | choice | 40 | N | — | urgent_behavioral, follow_up, intake, telehealth_consult | — |
| 5 | `u_modality` | Modality | choice | 20 | N | telehealth | in_person, telehealth | — |
| 6 | `u_start` | Start | glide_date_time | — | Y | — | — | — |
| 7 | `u_end` | End | glide_date_time | — | N | — | — | — |
| 8 | `u_status` | Status | choice | 20 | Y | proposed | proposed, confirmed, pending, cancelled, completed, no_show | — |
| 9 | `u_location` | Location | string | 200 | N | — | — | — |
| 10 | `u_telehealth_url` | Telehealth URL | url | 500 | N | — | — | — |
| 11 | `u_reason_category` | Reason category | choice | 40 | N | — | crisis, medication, therapy, intake, other | — |
| 12 | `u_reason_text` | Reason text | string | 1000 | N | — | — | — |
| 13 | `u_triage_priority` | Triage priority | choice | 20 | N | — | low, moderate, high | — |
| 14 | `u_proposed_by_agent` | Proposed by agent | boolean | — | N | false | — | — |
| 15 | `u_fairness_pass` | Fairness check passed | boolean | — | N | — | Scheduling-Agent result | — |
| 16 | `u_fairness_excluded_fields` | Fairness excluded fields | string | 500 | N | — | audit of excluded inputs | — |
| 17 | `u_cancel_reason` | Cancel reason | choice | 40 | N | — | no_longer_needed, conflict, feeling_better, other | — |
| 18 | `u_cancel_note` | Cancel note | string | 500 | N | — | — | — |
| 19 | `u_requested_start` | Requested start | glide_date_time | — | N | — | patient's originally-requested time (agent may move `u_start`); drives wait-time fairness | — |

> **Added 2026-07-09 (scheduling v2):** `u_requested_start` preserves the patient's requested time when the Scheduling Agent assigns a different suggested slot. Wait-time = `u_start − u_requested_start`, the governance Scheduling-Fairness metric. New status flow: patient books → `pending` → agent → `proposed` → clinician accept `confirmed` / reject → `pending`.

## Table 5 — `u_bhuc_message` (Secure Messaging)

**Label:** BHUC Message · **Number prefix:** `BHUC_MESSAGE_` → `BHUC_MESSAGE_001` · **Purpose:** threaded secure messages with server-side distress classification (§3.2 P8). Backs `/message` + `/messages/threads*`.

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_MESSAGE_` | — |
| 2 | `u_thread_id` | Thread ID | string | 64 | Y | — | groups a conversation | — |
| 3 | `u_patient` | Patient | reference | — | Y | — | → `u_bhuc_patient` | PII |
| 4 | `u_subject` | Subject | string | 160 | N | — | — | — |
| 5 | `u_body` | Body | string | 4000 | Y | — | — | PII |
| 6 | `u_sender_type` | Sender type | choice | 20 | Y | — | patient, care_team | — |
| 7 | `u_sender` | Sender | reference | — | N | — | → `sys_user` | — |
| 8 | `u_direction` | Direction | choice | 20 | N | — | inbound, outbound | — |
| 9 | `u_status` | Status | choice | 20 | Y | sent | sent, read, failed | — |
| 10 | `u_read_at` | Read at | glide_date_time | — | N | — | — | — |
| 11 | `u_distress_level` | Distress level | choice | 20 | N | none | none, elevated, crisis | — |
| 12 | `u_distress_flagged` | Distress flagged | boolean | — | N | false | — | — |
| 13 | `u_attachment_count` | Attachment count | integer | — | N | 0 | — | — |
| 14 | `u_contains_part2` | Contains Part 2 data | boolean | — | N | false | — | Part2 |

## Table 6 — `u_bhuc_care_plan` (Care Plan, Discharge & Clinical Documentation)

**Label:** BHUC Care Plan · **Number prefix:** `BHUC_CARE_PLAN_` → `BHUC_CARE_PLAN_001` · **Purpose:** dual-duty — the patient-facing care plan / discharge / safety plan (§3.2 P7) AND the clinician ambient-documentation draft that the Clinical Documentation Agent writes and the clinician signs (§4.4 Agent 3, §3.3 C5). Backs `/careplan*`, `/note/*`.

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_CARE_PLAN_` | — |
| 2 | `u_patient` | Patient | reference | — | Y | — | → `u_bhuc_patient` | PII |
| 3 | `u_appointment` | Appointment | reference | — | N | — | → `u_bhuc_appointment` | — |
| 4 | `u_clinician` | Clinician | reference | — | N | — | → `sys_user` | — |
| 5 | `u_state` | State | choice | 30 | Y | draft | draft, assessment_in_progress, finalized | — |
| 6 | `u_summary` | Care-plan summary | string | 4000 | N | — | plain-language | — |
| 7 | `u_safety_plan` | Safety plan (JSON) | string | 4000 | N | — | warning signs/coping/contacts | — |
| 8 | `u_medications` | Medications (JSON) | string | 4000 | N | — | list | — |
| 9 | `u_next_steps` | Next steps (JSON) | string | 4000 | N | — | task list | — |
| 10 | `u_draft_note` | Ambient draft note | string | 8000 | N | — | Clinical-Doc agent output | Part2 |
| 11 | `u_unverified_lines` | Unverified lines | string | 4000 | N | — | flagged lines | — |
| 12 | `u_suggested_codes` | Suggested ICD-10/CPT | string | 1000 | N | — | code suggestions | — |
| 13 | `u_signed` | Signed | boolean | — | N | false | — | — |
| 14 | `u_signed_by` | Signed by | reference | — | N | — | → `sys_user` | — |
| 15 | `u_signed_at` | Signed at | glide_date_time | — | N | — | — | — |
| 16 | `u_finalized_at` | Finalized at | glide_date_time | — | N | — | — | — |
| 17 | `u_pdf_generated` | PDF generated | boolean | — | N | false | — | — |
| 18 | `u_contains_part2` | Contains Part 2 data | boolean | — | N | false | — | Part2 |
| 19 | `u_sensitivity` | Sensitivity label | choice | 20 | N | standard | standard, part2 | Part2 |
| 20 | `u_screening` | Screening ID | reference | — | N | — | → `u_bhuc_screening` | — |
| 21 | `u_source_screenings` | Source screenings | string | 1000 | N | — | JSON array of screening numbers the draft was synthesized from | — |

> **Added 2026-07-10 (`u_source_screenings`):** traceability for screening-driven documentation — the JSON list of screening numbers (latest-per-instrument) the Clinical Documentation Agent (§4.4 Agent 3) synthesized the draft from. Written by the backend after the agent creates the note (`note.py` `_screening_summary`/`_draft_from_screenings`). Field sys_id `e5b7fb643b0a8f5076f13b64c3e45afd`.
> **Added 2026-07-07 (Agent 4 record-op alignment):** `u_sensitivity` mirrors `u_bhuc_consent.u_sensitivity` so the **Consent & Data Protection Agent** (§4.4 Agent 4) can write its `standard\|part2` label to the note table, not just a boolean. `u_contains_part2` is retained as the quick boolean flag used by DLP/masking on C3/C6.
> **Added 2026-07-07 (`u_screening`):** links a documentation note to the screening it stems from (`→ u_bhuc_screening`). Set by the backend on note creation (`POST /note/new/{patientId}?screening=…` from Risk Confirm, else defaults to the patient's most recent screening). Existing notes backfilled with the most-recent-screening-before-the-note rule.

## Table 7 — `u_bhuc_prior_auth` (Prior-Authorization Draft)

**Label:** BHUC Prior Authorization · **Number prefix:** `BHUC_PRIOR_AUTH_` → `BHUC_PRIOR_AUTH_001` · **Purpose:** the prior-authorization packet the **Prior-Auth Compliance Agent** (§4.4 Agent 5, UC3/P5) drafts with cited coverage answers, with SUD/Part 2 fields access-gated; the human submits (agent never submits). Backs `/priorauth*`. **Created via curl 2026-07-06.**

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_PRIOR_AUTH_` | — |
| 2 | `u_patient` | Patient | reference | — | Y | — | → `u_bhuc_patient` | PII |
| 3 | `u_appointment` | Appointment | reference | — | N | — | → `u_bhuc_appointment` | — |
| 4 | `u_clinician` | Clinician | reference | — | N | — | → `sys_user` | — |
| 5 | `u_service` | Requested service | string | 200 | N | — | e.g. IOP | — |
| 6 | `u_diagnosis` | Diagnosis | string | 200 | N | — | e.g. F32.1 | — |
| 7 | `u_requested_units` | Requested units/frequency | string | 200 | N | — | e.g. 3x/week, 4 weeks | — |
| 8 | `u_status` | Status | choice | 20 | N | draft | draft, submitted, approved, denied, pending | — |
| 9 | `u_payer` | Payer | string | 120 | N | — | — | — |
| 10 | `u_coverage_answer` | Coverage answer (cited) | string | 4000 | N | — | agent answer | — |
| 11 | `u_citation_policy` | Citation policy | string | 200 | N | — | payer policy id | — |
| 12 | `u_citation_section` | Citation section | string | 200 | N | — | policy section | — |
| 13 | `u_packet` | Drafted packet | string | 8000 | N | — | JSON/text | — |
| 14 | `u_part2_gated` | Part 2 gated | boolean | — | N | false | — | Part2 |
| 15 | `u_sud_field` | SUD field (Part 2) | string | 4000 | N | — | access-gated | Part2 |
| 16 | `u_drafted_by_agent` | Drafted by agent | boolean | — | N | false | — | — |
| 17 | `u_submitted_by` | Submitted by (human) | reference | — | N | — | → `sys_user` | — |
| 18 | `u_submitted_at` | Submitted at | glide_date_time | — | N | — | — | — |
| 19 | `u_agent_execution_id` | A2A execution id | string | 64 | N | — | links A2A request_id | — |
| 20 | `u_packet_json` | Packet document (JSON) | string | 8000 | N | — | clinician-edited packet-document field values `{field_id: value}` | Part2* |

> **Added 2026-07-10 (`u_packet_json`):** holds the clinician's edits to the sample-style prior-auth **document** (C6). The backend builds a sectioned document (Request Summary, Member, Provider, Clinical Justification, Coverage, Treatment Plan, SUD Detail, Payer Use Only) from the record + patient chart + eligibility + auto-attached screenings/notes; editable-field edits persist here (merged by field id, never storing SUD-field edits from an unauthorized viewer). Field sys_id `b8b95c783b02cf5076f13b64c3e45aa3`. *Part2\* = SUD-revealing fields inside are redacted (black bars) without role + consent.

## Table 8 — `u_bhuc_escalation` (Crisis Escalation Log)

**Label:** BHUC Escalation · **Number prefix:** `BHUC_ESCALATION_` → `BHUC_ESCALATION_001` · **Purpose:** logs a 988 / crisis escalation raised by the **Front-Door Security Agent** (Tool C flow) or any agent's crisis detection. Patient-optional so anonymous front-door escalations work. On-call staff are notified. **Created via curl 2026-07-06.**

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_ESCALATION_` | — |
| 2 | `u_source` | Source | choice | 30 | N | front_door | front_door, secure_message, check_in, screening | — |
| 3 | `u_channel` | Channel | choice | 20 | N | 988 | 988, 911, human | — |
| 4 | `u_message` | Trigger message | string | 4000 | N | — | the message that triggered escalation | — |
| 5 | `u_detected_by` | Detected by | choice | 30 | N | crisis_classifier | crisis_classifier, agent_goal_deviation, manual | — |
| 6 | `u_session_id` | Session ID | string | 64 | N | — | — | — |
| 7 | `u_patient` | Patient (if known) | reference | — | N | — | → `u_bhuc_patient` | PII |
| 8 | `u_status` | Status | choice | 20 | N | open | open, acknowledged, resolved | — |
| 9 | `u_oncall_notified` | On-call notified | boolean | — | N | false | — | — |
| 10 | `u_acknowledged_by` | Acknowledged by | reference | — | N | — | → `sys_user` | — |
| 11 | `u_acknowledged_at` | Acknowledged at | glide_date_time | — | N | — | — | — |
| 12 | `u_notes` | Notes | string | 1000 | N | — | — | — |

**Related:** on-call group **BHUC On-Call** (`sys_user_group` `c1368eab3bfd0f1076f13b64c3e45a9e`) — add on-call users + a group email for notifications.

---

## Tables 9–12 — DATA-2 undeclared-table completion (created live 2026-07-09)

> These four tables back app entities that had **live frontend pages/endpoints but no ServiceNow table** (mock-only until now). Scope confirmed with the user 2026-07-09: **orders → own table** (future-proofs C6, UI not yet built); **disposition → own table** (not folded into care_plan); **referral → folded as fields on disposition** (no separate table). All created via `create_tables.py` (idempotent) with the same conventions as Tables 1–8. **Sensitivity ACLs deferred** to SN-4/AG-8 (same build-first/govern-later precedent as the other tables — deny-by-default is app-computed today).

## Table 9 — `u_bhuc_eligibility` (Insurance Eligibility & Cost Estimate)

**Label:** BHUC Eligibility · **Number prefix:** `BHUC_ELIGIBILITY_` → `BHUC_ELIGIBILITY_001` · **Purpose:** insurance eligibility verification result + per-visit cost estimate + financial-counselor request (§3.2 P5 Coverage.tsx). Backs `GET /eligibility`, `POST /eligibility/verify`, `POST /financial-counselor/request`. One row per verification (latest per patient drives the P5 card). · **sys_id `<see instance>`**

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_ELIGIBILITY_` | — |
| 2 | `u_patient` | Patient | reference | — | Y | — | → `u_bhuc_patient` | PII |
| 3 | `u_status` | Status | choice | 20 | N | pending | active, pending, self_pay, none | — |
| 4 | `u_payer` | Payer | string | 120 | N | — | — | — |
| 5 | `u_plan` | Plan | string | 120 | N | — | — | — |
| 6 | `u_effective_date` | Effective date | glide_date | — | N | — | — | — |
| 7 | `u_member_id` | Member ID | string | 80 | N | — | — | PII |
| 8 | `u_visit_type` | Visit type | choice | 40 | N | — | urgent_behavioral, follow_up, intake, telehealth_consult | — |
| 9 | `u_allowed_amount` | Estimated allowed amount | decimal | — | N | — | — | — |
| 10 | `u_patient_responsibility` | Patient responsibility | decimal | — | N | — | — | — |
| 11 | `u_currency` | Currency | string | 10 | N | USD | — | — |
| 12 | `u_estimate_as_of` | Estimate as of | glide_date | — | N | — | — | — |
| 13 | `u_verified_at` | Verified at | glide_date_time | — | N | — | — | — |
| 14 | `u_verified_by_agent` | Verified by agent | boolean | — | N | false | — | — |
| 15 | `u_counselor_requested` | Counselor requested | boolean | — | N | false | — | — |
| 16 | `u_counselor_requested_at` | Counselor requested at | glide_date_time | — | N | — | — | — |
| 17 | `u_counselor_note` | Counselor note | string | 500 | N | — | patient's optional note | — |

## Table 10 — `u_bhuc_check_in` (Post-Discharge Follow-Up Check-In)

**Label:** BHUC Check-In · **Number prefix:** `BHUC_CHECK_IN_` → `BHUC_CHECK_IN_001` · **Purpose:** post-discharge follow-up check-in prompt + patient response with distress/self-harm escalation (§3.2 P9 CheckIn.tsx). Backs `GET /checkin/{id}`, `POST /checkin/{id}`. One row per check-in instance.

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_CHECK_IN_` | — |
| 2 | `u_patient` | Patient | reference | — | Y | — | → `u_bhuc_patient` | PII |
| 3 | `u_care_plan` | Care plan | reference | — | N | — | → `u_bhuc_care_plan` (the discharge it follows) | — |
| 4 | `u_status` | Status | choice | 20 | N | pending | pending, completed, missed | — |
| 5 | `u_due_date` | Due date | glide_date | — | N | — | — | — |
| 6 | `u_questions` | Questions (JSON) | string | 4000 | N | — | prompt questions | — |
| 7 | `u_responses` | Responses (JSON) | string | 4000 | N | — | patient answers | Part2 |
| 8 | `u_wellbeing_score` | Wellbeing score | integer | — | N | — | 0–10 | — |
| 9 | `u_med_adherence` | Medication adherence | choice | 20 | N | — | yes, mostly, no, na | — |
| 10 | `u_self_harm` | Self-harm thoughts | choice | 10 | N | — | no, yes | — |
| 11 | `u_escalate` | Escalate | boolean | — | N | false | self-harm/low-wellbeing trip | — |
| 12 | `u_distress_level` | Distress level | choice | 20 | N | none | none, elevated, crisis | — |
| 13 | `u_next_check_in` | Next check-in | glide_date | — | N | — | — | — |
| 14 | `u_completed_at` | Completed at | glide_date_time | — | N | — | — | — |

## Table 11 — `u_bhuc_disposition` (Disposition & Discharge Decision)

**Label:** BHUC Disposition · **Number prefix:** `BHUC_DISPOSITION_` → `BHUC_DISPOSITION_001` · **Purpose:** the C7 disposition/discharge decision — decision, AI-drafted (clinician-edited) discharge instructions + safety plan, and **routed referrals folded in as fields** (§3.3 C7 Disposition.tsx). Backs `GET /disposition/{id}`, `POST /disposition`, `POST /referral`. Gate: finalize blocked until risk confirmed (C4) + note signed (C5).

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_DISPOSITION_` | — |
| 2 | `u_patient` | Patient | reference | — | Y | — | → `u_bhuc_patient` | PII |
| 3 | `u_care_plan` | Care plan | reference | — | N | — | → `u_bhuc_care_plan` | — |
| 4 | `u_appointment` | Appointment | reference | — | N | — | → `u_bhuc_appointment` | — |
| 5 | `u_clinician` | Clinician | reference | — | N | — | → `sys_user` | — |
| 6 | `u_screening` | Screening | reference | — | N | — | → `u_bhuc_screening` | — |
| 7 | `u_disposition` | Disposition decision | choice | 40 | N | — | discharge_home, discharge_with_referral, iop, partial_hospitalization, inpatient, transfer_ed, crisis | — |
| 8 | `u_status` | Status | choice | 20 | N | draft | draft, finalized | — |
| 9 | `u_discharge_instructions` | Discharge instructions | string | 8000 | N | — | clinician-finalized | Part2 |
| 10 | `u_ai_discharge_instructions` | AI discharge instructions (draft) | string | 8000 | N | — | original AI draft (audit) | Part2 |
| 11 | `u_safety_plan` | Safety plan | string | 8000 | N | — | clinician-finalized (Stanley-Brown) | Part2 |
| 12 | `u_ai_safety_plan_template` | AI safety plan template | string | 8000 | N | — | original AI draft | Part2 |
| 13 | `u_referrals` | Referrals (selected) | string | 1000 | N | — | routed referral ids/labels (folded referral field) | — |
| 14 | `u_referral_status` | Referral status | choice | 20 | N | none | none, routed, pending, accepted | — |
| 15 | `u_referral_urgency` | Referral urgency | choice | 20 | N | — | routine, 48h, 24h, urgent | — |
| 16 | `u_drafted_by_agent` | Drafted by agent | boolean | — | N | false | — | — |
| 17 | `u_finalized` | Finalized | boolean | — | N | false | — | — |
| 18 | `u_finalized_by` | Finalized by | reference | — | N | — | → `sys_user` | — |
| 19 | `u_finalized_at` | Finalized at | glide_date_time | — | N | — | — | — |
| 20 | `u_contains_part2` | Contains Part 2 data | boolean | — | N | false | — | Part2 |
| 21 | `u_sensitivity` | Sensitivity label | choice | 20 | N | standard | standard, part2 | Part2 |

## Table 12 — `u_bhuc_order` (Clinical Orders)

**Label:** BHUC Order · **Number prefix:** `BHUC_ORDER_` → `BHUC_ORDER_001` · **Purpose:** clinician order-entry — medication / lab / referral / level-of-care (§3.3 C6). Backs `POST /orders`. **Created for completeness (DATA-2): the C6 order-entry UI is not yet built**, so this table has no live app writer yet; it future-proofs the order workflow and links prior-auth (Agent 5) + disposition.

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_ORDER_` | — |
| 2 | `u_patient` | Patient | reference | — | Y | — | → `u_bhuc_patient` | PII |
| 3 | `u_appointment` | Appointment | reference | — | N | — | → `u_bhuc_appointment` | — |
| 4 | `u_clinician` | Clinician | reference | — | N | — | → `sys_user` | — |
| 5 | `u_disposition` | Disposition | reference | — | N | — | → `u_bhuc_disposition` | — |
| 6 | `u_order_type` | Order type | choice | 30 | N | — | medication, lab, referral, level_of_care | — |
| 7 | `u_code` | Code | string | 100 | N | — | drug/lab/CPT code | — |
| 8 | `u_description` | Description | string | 500 | N | — | — | — |
| 9 | `u_dose` | Dose | string | 100 | N | — | e.g. 150mg | — |
| 10 | `u_route` | Route | string | 60 | N | — | e.g. PO, IV | — |
| 11 | `u_frequency` | Frequency | string | 100 | N | — | e.g. daily, bid | — |
| 12 | `u_quantity` | Quantity | string | 60 | N | — | — | — |
| 13 | `u_status` | Status | choice | 20 | N | draft | draft, ordered, active, discontinued, completed | — |
| 14 | `u_priority` | Priority | choice | 20 | N | routine | routine, urgent, stat | — |
| 15 | `u_prior_auth` | Prior authorization | reference | — | N | — | → `u_bhuc_prior_auth` | — |
| 16 | `u_ordered_by` | Ordered by | reference | — | N | — | → `sys_user` | — |
| 17 | `u_ordered_at` | Ordered at | glide_date_time | — | N | — | — | — |
| 18 | `u_notes` | Notes | string | 1000 | N | — | — | — |

---

## Relationship map

```
u_bhuc_patient (1) ──< (M) u_bhuc_screening      [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_consent        [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_appointment    [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_message        [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_care_plan      [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_prior_auth     [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_eligibility    [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_check_in       [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_disposition    [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_order          [u_patient]
u_bhuc_appointment (1) ──< (M) u_bhuc_care_plan  [u_appointment]
u_bhuc_appointment (1) ──< (M) u_bhuc_prior_auth [u_appointment]
u_bhuc_screening (1) ──< (M) u_bhuc_care_plan    [u_screening]
u_bhuc_care_plan (1) ──< (M) u_bhuc_check_in     [u_care_plan]
u_bhuc_care_plan (1) ──< (M) u_bhuc_disposition  [u_care_plan]
u_bhuc_disposition (1) ──< (M) u_bhuc_order       [u_disposition]
u_bhuc_prior_auth (1) ──< (M) u_bhuc_order        [u_prior_auth]
sys_user (clinician) referenced by screening/appointment/message/care_plan/prior_auth/disposition/order
```

## Field-count summary

| Table | Business fields (excl. sys_*) | PII fields | Part2 fields |
|---|---|---|---|
| `u_bhuc_patient` | 30 | 11 | 1 |
| `u_bhuc_screening` | 21 | 1 (ref) | 3 |
| `u_bhuc_consent` | 14 | 3 | 2 |
| `u_bhuc_appointment` | 18 | 1 (ref) | 0 |
| `u_bhuc_message` | 14 | 2 | 1 |
| `u_bhuc_care_plan` | 21 | 2 (ref) | 3 |
| `u_bhuc_prior_auth` | 20 | 1 (ref) | 2 |
| `u_bhuc_eligibility` | 17 | 2 | 0 |
| `u_bhuc_check_in` | 14 | 1 (ref) | 1 |
| `u_bhuc_disposition` | 21 | 1 (ref) | 5 |
| `u_bhuc_order` | 18 | 1 (ref) | 0 |
| **Total (12 tables)** | **205** | — | — |

---

## Live creation method (curl) — run only after approval

For each table, three steps (all against `https://ven04690.service-now.com`, basic auth `interface_gautham`):

1. **Create the table** — `POST /api/now/table/sys_db_object` with `{ "name": "u_bhuc_patient", "label": "BHUC Patient", "sys_scope": "global" }` (super_class left blank = extends nothing / a base table; ServiceNow auto-creates the collection + `sys_id`/audit fields).
2. **Create the Number prefix** — `POST /api/now/table/sys_number` with `{ "prefix": "BHUC_PATIENT_", "maximum_digits": 3, "number": 1, "category": "<table sys_id or table name>" }` so `u_number` auto-fills `BHUC_PATIENT_001`.
3. **Create each field** — one `POST /api/now/table/sys_dictionary` per row above, e.g.
   `{ "name":"u_bhuc_patient", "element":"u_email", "column_label":"Email", "internal_type":"string", "max_length":200, "mandatory":"true" }`.
   - Reference fields: `"internal_type":"reference","reference":"u_bhuc_patient"`.
   - Choice fields: `"internal_type":"choice"` + a `sys_choice` POST per option (`{ "name":"u_bhuc_patient","element":"u_gender","value":"female","label":"Female" }`).
   - Booleans: `"internal_type":"boolean","default_value":"false"`.

> **Caveat to verify on first run:** table/dictionary creation via REST requires the account to hold the rights that created the careatlas `u_*` tables. If the first `sys_db_object` POST returns 403, creation must be done in **Studio/Tables UI** instead (the field spec above is identical either way). I will run one table first as a smoke test before doing all six.

---

## Naming reconciliation note (RESOLVED 2026-07-06)

The naming has been reconciled across all docs. The build uses **global-scope `u_bhuc_*`** tables (created live via curl). Per the approved rename, **all ServiceNow objects** in `plan.md`, `action.md`, and this file — tables, roles (`u_bhuc_patient`, `u_bhuc_clinician`, `u_bhuc_patient_pii`, `u_bhuc_part2_access`, `u_bhuc_ai_agent`, …), and SP pages/widgets (`u_bhuc_patient_frame`, etc.) — now use the `u_bhuc_*` prefix. Intentionally left unchanged: the **FastAPI URL namespace `/api/x_bhuc/`** and the bare **`x_bhuc`** product/app identifier (these are app URLs, not ServiceNow objects). The `.docx` implementation guide was updated in the same pass.
