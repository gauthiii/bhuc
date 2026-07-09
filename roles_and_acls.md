# BHUC — Roles, Service Accounts & ACLs (complete checklist)

The full least-privilege identity model for the **entire** project, so there are no role/ACL
dependencies later. Grounded in `plan.md` §8.1 SN-Steps 3/4/13, `tables.md` (field sensitivity),
and `sud_usecase.md` (UC3 enforcement). `[Verified]` = the careatlas analog is confirmed on
`ven04690`; ✅ = already created; ☐ = to do.

> **STATUS — 2026-07-09 (roles + ACLs + agent least-privilege wiring COMPLETE + A2A-verified):**
> **12 roles**, **12 service accounts** (6 original `svc-bhuc-*` + **6 `svc-bhuc-*-ai` AI-user identities**),
> and **42 ACLs** — **33 read** (25 field + 8 record) plus **5 write + 4 create** (on
> `screening`/`care_plan`/`consent`/`prior_auth`/`escalation`/`appointment` → the `*_write` roles). All
> verified enforcing via API (deny-by-default, admin bypasses). **Wiring DONE (§5):** every agent (1–6) now
> runs as its `svc-bhuc-*-ai` identity with `GlideRecordSecure` — verified over A2A that writes land only
> via the granted roles (`sys_created_by`/`updated_by` = the AI identity, NOT admin). **GOV-2 DLP guardrail:**
> detection layer active; native anonymization/redaction is license-gated (accepted gap). Nothing
> role/ACL/wiring-related is pending. Detail: `action.md` AG-8, `sud_usecase.md`.

## TL;DR — are the 2 roles enough?
**No.** `u_bhuc_part2_access` ✅ and `u_bhuc_patient_pii` ✅ are the **data-sensitivity** roles (UC3).
The complete model is:

| Bucket | Count | Status |
|---|---|---|
| Application / persona roles | 2 (+1 reused) | ✅ created |
| Data-access (composable) roles | 10 | ✅ created (7 + 3 write roles added 2026-07-09) |
| Service accounts (agent identities) | 6 `svc-bhuc-*` + 6 `svc-bhuc-*-ai` (AI-user) | ✅ created |
| ACLs | 42 (33 read + 5 write + 4 create) | ✅ created + verified enforcing |
| Wiring (bind AI-user + GlideRecordSecure + integration-acct roles) | — | ✅ **DONE + A2A-verified 2026-07-09** |
| Governance / builder roles | 3 | ✅ already present |

Which use case each serves: **UC3 Privacy** → `u_bhuc_part2_access` + PII ACLs. **UC5 Excessive
Privileges** → the 6 scoped service accounts + composable roles (the PII-denial demo). **UC4
Scheduling fairness** → `svc-bhuc-scheduling` holds *no* PII/demographic role.

---

## 1. Application / persona roles — `plan.md` SN-Step 3

| Role | Purpose | Status |
|---|---|---|
| `u_bhuc_patient` | Patient-portal persona | ✅ created |
| `u_bhuc_clinician` | Clinician-portal persona; also the base for "approved case manager" | ✅ created |
| `sn_ai_governance.ai_steward` | Governance persona — **reuse the platform role, do NOT create a new one** | ✅ exists |

> Note: the app authenticates via **Cognito** (`bhuc-patient` / `bhuc-clinician` / `bhuc-governance`
> groups). These SN roles are the ServiceNow-side counterparts; map the Cognito groups to them
> (SN-Step 11). The "approved case manager" for UC3 is a `u_bhuc_clinician` who **also** holds
> `u_bhuc_part2_access`.

## 2. Data-access (composable, least-privilege) roles — `plan.md` SN-Step 13a

| Role | Grants | Primary use case | Status |
|---|---|---|---|
| `u_bhuc_ai_agent` | Base marker every BHUC agent identity holds (≈ careatlas `u_careatlas_ai_agent` `[Verified]`) | all agents | ✅ created |
| `u_bhuc_patient_read` | Read **non-PII** patient/clinical fields (≈ `u_patients_user` `[Verified]`) | all agents | ✅ created |
| `u_bhuc_patient_pii` | Read PII (name/DOB/email/phone/insurance) — grant/withhold drives the **PII-denial demo** | UC5 | ✅ created |
| `u_bhuc_part2_access` | Read/write 42 CFR Part 2 / SUD-labeled fields (approved case-manager scope) | UC3 | ✅ created |
| `u_bhuc_screening_write` | Narrow write to `u_bhuc_screening` scores | Agent 2 | ✅ created |
| `u_bhuc_doc_write` | Narrow write to `u_bhuc_care_plan` documentation | Agent 3 | ✅ created |
| `u_bhuc_schedule_write` | Narrow write to `u_bhuc_appointment` | Agent 6 | ✅ created |
| `u_bhuc_consent_write` | Narrow write to `u_bhuc_consent` labels | Agent 4 | ✅ created 2026-07-09 |
| `u_bhuc_priorauth_write` | Narrow write to `u_bhuc_prior_auth` | Agent 5 | ✅ created 2026-07-09 |
| `u_bhuc_escalation_write` | Narrow write to `u_bhuc_escalation` | Agent 1 | ✅ created 2026-07-09 |

> **Added 2026-07-09** (for the agent least-privilege wiring / write ACLs, §5): the 3 `*_write` roles above.
> `screening_write`/`doc_write`/`schedule_write` existed already. These make the write/create ACLs (§4C)
> keyed to a per-table role.

**Create:** `User Administration → Roles → New`, or `POST /api/now/table/sys_user_role {name, description}`.

## 3. Service accounts (non-human agent identities) — `plan.md` SN-Step 13b

Create as **integration users** (`User Administration → Users → New`, "Web service access only", no
interactive password). Each active. Least-privilege role set per agent:

**The bound identities are the `svc-bhuc-*-ai` accounts** (created 2026-07-09) — the Agent Studio "Run as →
AI user" picker only lists users with **`sys_user.identity_type='ai_agent'`**, and that field is **403 on
UPDATE but settable at CREATE**, so the original `svc-bhuc-*` (unclassified) were re-created as AI-user
identities. Final least-privilege role sets (each agent bound to its row → verified over A2A):

| Agent | AI-user identity (bound) | Roles | Status |
|---|---|---|---|
| 1 Front-Door | `svc-bhuc-frontdoor-ai` | `u_bhuc_ai_agent`, `u_bhuc_escalation_write` | ✅ bound + tested |
| 2 Risk Identification | `svc-bhuc-risk-ai` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_screening_write`, `u_bhuc_part2_access`¹ — **no PII** | ✅ bound + tested |
| 3 Clinical Documentation | `svc-bhuc-clinicaldoc-ai` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_doc_write` | ✅ bound + tested |
| 4 Consent & Data Protection | `svc-bhuc-consent-ai` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_part2_access`, `u_bhuc_doc_write`, `u_bhuc_consent_write` | ✅ bound + tested |
| 5 Prior-Auth Compliance | `svc-bhuc-priorauth-ai` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_part2_access`, `u_bhuc_priorauth_write` | ✅ bound + tested |
| 6 Scheduling | `svc-bhuc-scheduling-ai` | `u_bhuc_ai_agent`, `u_bhuc_schedule_write` — **no demographic/PII (fairness)** | ✅ bound + tested |

> ¹ `svc-bhuc-risk-ai` was granted `u_bhuc_part2_access` so it can write the Part 2-classified `u_rationale`
> field (its own scoring rationale); it still holds **no PII** role (fairness/UC5 intact).
> The original **`svc-bhuc-*`** (unclassified, password users created 2026-07-08) are now **redundant** — nothing
> binds to them; safe to delete. The contrast that IS UC5: `risk`/`scheduling` hold no `u_bhuc_patient_pii`,
> so their reads are auto-stripped of PII, while `clinicaldoc`/`consent` read what they need.

## 4. Field-level ACLs — `plan.md` SN-Step 4 + 13d (needs `security_admin` elevation; UI-only)

Deny-by-default **read** ACLs (`sys_security_acl`, type `record`, op `read`). Leave the boolean label
fields readable; gate the actual content.

**A. Part 2 / SUD content → require `u_bhuc_part2_access`** (details + condition scripts in
`sud_usecase.md` §4 Phase 2):

| Table | Field(s) | Rule |
|---|---|---|
| `u_bhuc_care_plan` | `u_draft_note` | conditional — gate only when `u_contains_part2` |
| `u_bhuc_prior_auth` | `u_sud_field` | require role |
| `u_bhuc_screening` | `u_responses`, `u_rationale` | require role |
| `u_bhuc_message` | `u_body` | conditional on `u_contains_part2` |
| `u_bhuc_consent` | `u_sensitivity` (+ the `part2_sud` rows) | require role |

**B. Patient PII → require `u_bhuc_patient_pii`:**

| Table | Field(s) |
|---|---|
| `u_bhuc_patient` | `u_first_name`, `u_last_name`, `u_preferred_name`, `u_date_of_birth`, `u_gender`, `u_email`, `u_phone`, `u_address_line1/2`, `u_insurance_member_id`, `u_cognito_sub` |
| `u_bhuc_consent` | `u_signature`, `u_phone` |

**C. Write / create ACLs → the per-table `*_write` role** (added 2026-07-09 for the agent least-privilege
wiring; type `record`, ops `create`/`write`, `admin_overrides` on). Without these, an agent running as a
non-admin `svc-bhuc-*-ai` gets *"Cannot create record due to security constraints."*

| Table | Ops | Requires role |
|---|---|---|
| `u_bhuc_screening` | write | `u_bhuc_screening_write` |
| `u_bhuc_care_plan` | create + write | `u_bhuc_doc_write` |
| `u_bhuc_consent` | write | `u_bhuc_consent_write` |
| `u_bhuc_prior_auth` | create + write | `u_bhuc_priorauth_write` |
| `u_bhuc_escalation` | create | `u_bhuc_escalation_write` |
| `u_bhuc_appointment` | create + write (+ `schedule_write` added to its record **read** ACL) | `u_bhuc_schedule_write` |

> `GlideRecordSecure` enforces **reads** too, so an agent must be able to read the record it writes: the
> 8 record-level read ACLs are `clinician` **OR** `patient_read` (OR'd); `u_bhuc_appointment`'s read ACL also
> got `schedule_write` so `svc-bhuc-scheduling-ai` (no `patient_read`) can read its own proposed appointment.

Test each with **Test access** (Access Analyzer) and by impersonating an account with/without the role.

## 5. Wiring — so the roles/ACLs actually ENFORCE (5a/5b DONE + A2A-verified 2026-07-09)

- **5a — Bind each agent to its AI-user identity (SN-13c). ✅ DONE.** Each agent → *Define security controls
  → Define data access → Run as → AI user →* its `svc-bhuc-*-ai` → re-publish. **Gotcha:** the picker only
  lists users with `sys_user.identity_type='ai_agent'`; that field is **403 on UPDATE but settable at
  CREATE**, so the AI-user accounts were created fresh (the original `svc-bhuc-*` couldn't be converted).
- **5b — Switch agent write tools `GlideRecord` → `GlideRecordSecure`. ✅ DONE.** The two Script tools
  (Agent 2 "Write risk score", Agent 4 "Write Sensitivity Label") were swapped; the CRUD Record-Operation
  tools (Agents 3/5/6) already run `GlideRecordSecure` under the bound user. **Verified over A2A:** all 6
  agents' writes land and `sys_created_by`/`updated_by` = the `svc-bhuc-*-ai` identity (not admin) → ACLs
  enforce. *(Agent 6 CRUD boolean gotcha: `u_proposed_by_agent` checkbox saved `t`→false; stamped via
  before-insert business rule `BHUC - stamp proposed_by_agent` `bec44b1c…`.)*
- **5c — Grant the FastAPI integration account (`interface_gautham`) the roles it needs.** The app reads
  ServiceNow through this single account and gates per-clinician in code (UC3 "SN role lookup by email").
  Give it `u_bhuc_patient_read`, `u_bhuc_patient_pii`, `u_bhuc_part2_access` so it can *fetch* data to
  serve authorized users — the app is the per-user gate; the ACLs gate direct-SN access. (Alternative:
  per-user impersonation — bigger change, see `sud_usecase.md` §5.)
- **5d — Map Cognito groups → SN roles (SN-11):** `bhuc-governance` → `sn_ai_governance.ai_steward`;
  `bhuc-clinician` → `u_bhuc_clinician`; assign `u_bhuc_part2_access` only to approved case managers.

## 6. Governance / builder roles — already present, reuse (do NOT create)

| Role | For | Status |
|---|---|---|
| `sn_aia.admin` | Build/edit agents in AI Agent Studio | ✅ |
| `sn_ai_governance.ai_steward` | Govern assets in AICT | ✅ |
| `sn_grc_ai_gov.ai_risk_and_compliance_admin` | AIRC risk/compliance | ✅ |
| `security_admin` (elevate) | Create the ACLs in §4 | ✅ (elevate when needed) |

## 7. Recommended order (no dependency surprises)

1. ✅ **Roles** — all **12** created (9 + 3 `*_write` roles added 2026-07-09).
2. ✅ **Service accounts** — 6 `svc-bhuc-*` + **6 `svc-bhuc-*-ai` AI-user identities** (the bound ones).
3. ✅ **ACLs** — **42**: 33 read (25 field + 8 record) + 5 write + 4 create (the `*_write`-keyed write/create
   ACLs of §4C). **Verified enforcing** (deny-by-default, admin bypasses).
4. ✅ **Wiring** — §5: agents bound to their `svc-bhuc-*-ai` + `GlideRecordSecure`, **A2A-verified** (writes
   attributed to the AI identity, not admin). *(Integration-account roles already granted.)* **GOV-2** DLP
   guardrail = detection active; redaction license-gated (`sud_usecase.md` §4 Phase 3). Cognito→SN role
   mapping (5d) remains for the app-auth pass.
5. ✅ **Verify** — API + **A2A end-to-end** done for all 6 agents (least-privilege writes land; admin-bypass
   ruled out). In-UI impersonation + the app's C3 reveal remain a nice belt-and-suspenders check.

Everything role/ACL-related for all 6 agents / 4 use cases / 3 portals is on this page — build these and
you won't hit a role/ACL dependency later.
