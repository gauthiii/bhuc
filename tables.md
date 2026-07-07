# BHUC Data Model — Table & Field Specification (6 Core Tables)

**Status:** SPEC — awaiting approval before live creation via curl.
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

## Table 2 — `u_bhuc_screening` (Intake Screening & Instrument Scores)

**Label:** BHUC Screening · **Number prefix:** `BHUC_SCREENING_` → `BHUC_SCREENING_001` · **Purpose:** one row per submitted instrument (C-SSRS/PHQ-9/GAD-7); the Risk Identification Agent scores it (draft) and a clinician confirms (§4.4 Agent 2, §3.2 P4, §3.3 C4). Backs the `/intake/screening` + `/risk/confirm` endpoints.

| # | Field (column) | Label | Type | Len | Mand. | Default | Choices / Reference | Sens. |
|---|---|---|---|---|---|---|---|---|
| 1 | `u_number` | Number | string | 40 | Y | auto | prefix `BHUC_SCREENING_` | — |
| 2 | `u_patient` | Patient | reference | — | Y | — | → `u_bhuc_patient` | PII |
| 3 | `u_instrument` | Instrument | choice | 20 | Y | — | c_ssrs, phq9, gad7 | — |
| 4 | `u_session_id` | Session ID | string | 64 | N | — | client correlation id | — |
| 5 | `u_responses` | Raw responses (JSON) | string | 4000 | N | — | structured answers | Part2 |
| 6 | `u_state` | State | choice | 20 | Y | draft | draft, submitted, scored, confirmed | — |
| 7 | `u_raw_score` | Raw score | integer | — | N | — | instrument total | — |
| 8 | `u_severity` | Severity | choice | 30 | N | — | minimal, mild, moderate, moderately_severe, severe, na | — |
| 9 | `u_risk_band` | Risk band (agent) | choice | 20 | N | — | low, moderate, high | — |
| 10 | `u_confidence` | Confidence | integer | — | N | — | 0–100 | — |
| 11 | `u_rationale` | Agent rationale | string | 4000 | N | — | grounded rationale | Part2 |
| 12 | `u_flags` | Flags | string | 1000 | N | — | e.g. item9_positive, cssrs_positive | — |
| 13 | `u_escalate` | Escalate | boolean | — | N | false | — | — |
| 14 | `u_agent_execution_id` | A2A execution id | string | 64 | N | — | links A2A request_id | — |
| 15 | `u_scored_by_agent` | Scored by agent | boolean | — | N | false | — | — |
| 16 | `u_clinician_action` | Clinician action | choice | 20 | Y | pending | pending, confirmed, adjusted, rejected | — |
| 17 | `u_clinician` | Confirming clinician | reference | — | N | — | → `sys_user` | — |
| 18 | `u_clinician_rationale` | Clinician rationale | string | 1000 | N | — | — | — |
| 19 | `u_contains_part2` | Contains Part 2 data | boolean | — | N | false | set by Consent agent | Part2 |
| 20 | `u_completed_at` | Completed at | glide_date_time | — | N | — | — | — |

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

> **Added 2026-07-07 (Agent 4 record-op alignment):** `u_sensitivity` mirrors `u_bhuc_consent.u_sensitivity` so the **Consent & Data Protection Agent** (§4.4 Agent 4) can write its `standard\|part2` label to the note table, not just a boolean. `u_contains_part2` is retained as the quick boolean flag used by DLP/masking on C3/C6.

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

## Relationship map

```
u_bhuc_patient (1) ──< (M) u_bhuc_screening      [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_consent        [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_appointment    [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_message        [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_care_plan      [u_patient]
u_bhuc_patient (1) ──< (M) u_bhuc_prior_auth     [u_patient]
u_bhuc_appointment (1) ──< (M) u_bhuc_care_plan  [u_appointment]
u_bhuc_appointment (1) ──< (M) u_bhuc_prior_auth [u_appointment]
sys_user (clinician) referenced by screening/appointment/message/care_plan/prior_auth
```

## Field-count summary

| Table | Business fields (excl. sys_*) | PII fields | Part2 fields |
|---|---|---|---|
| `u_bhuc_patient` | 30 | 11 | 1 |
| `u_bhuc_screening` | 20 | 1 (ref) | 3 |
| `u_bhuc_consent` | 14 | 3 | 2 |
| `u_bhuc_appointment` | 18 | 1 (ref) | 0 |
| `u_bhuc_message` | 14 | 2 | 1 |
| `u_bhuc_care_plan` | 19 | 1 (ref) | 3 |
| `u_bhuc_prior_auth` | 19 | 1 (ref) | 2 |
| **Total** | **134** | — | — |

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
