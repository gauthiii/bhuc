# BHUC — Roles, Service Accounts & ACLs (complete checklist)

The full least-privilege identity model for the **entire** project, so there are no role/ACL
dependencies later. Grounded in `plan.md` §8.1 SN-Steps 3/4/13, `tables.md` (field sensitivity),
and `sud_usecase.md` (UC3 enforcement). `[Verified]` = the careatlas analog is confirmed on
`ven04690`; ✅ = already created; ☐ = to do.

> **STATUS — 2026-07-08 (roles/ACLs COMPLETE):** All **9 roles**, **6 service accounts** (passwords
> set), and **33 ACLs** (**25 field-level read** + **8 record-level read**) are done ✅ — verified
> present with correct roles, none missing/extra, and **verified enforcing** via API (Part 2 →
> `u_bhuc_part2_access`, PII → `u_bhuc_patient_pii`, deny-by-default, admin bypasses). **Nothing
> role/ACL-related is pending.** Remaining (NOT roles/ACLs): the **wiring** (§5) — bind agents to their
> `svc-bhuc-*` + `GlideRecordSecure` — and the **GOV-2 DLP guardrail** (`sud_usecase.md` §4 Phase 3).

## TL;DR — are the 2 roles enough?
**No.** `u_bhuc_part2_access` ✅ and `u_bhuc_patient_pii` ✅ are the **data-sensitivity** roles (UC3).
The complete model is:

| Bucket | Count | Status |
|---|---|---|
| Application / persona roles | 2 (+1 reused) | ✅ created |
| Data-access (composable) roles | 7 | ✅ 7 created |
| Service accounts (agent identities) | 6 | ✅ created (set passwords) |
| Field-level ACLs | 25 field + 8 record read ACLs (all incl. optional) | ✅ created + verified enforcing |
| Wiring (bind + GlideRecordSecure + integration-acct roles) | — | ◐ integration-acct roles ✅; bind/GlideRecordSecure ☐ |
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

**Create:** `User Administration → Roles → New`, or `POST /api/now/table/sys_user_role {name, description}`.

## 3. Service accounts (non-human agent identities) — `plan.md` SN-Step 13b

Create as **integration users** (`User Administration → Users → New`, "Web service access only", no
interactive password). Each active. Least-privilege role set per agent:

| Agent | Service account | Roles | Status |
|---|---|---|---|
| 1 Front-Door | `svc-bhuc-frontdoor` | `u_bhuc_ai_agent` **only** (no patient data) | ✅ created |
| 2 Risk Identification | `svc-bhuc-risk` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_screening_write` — **no PII** | ✅ created |
| 3 Clinical Documentation | `svc-bhuc-clinicaldoc` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_doc_write` | ✅ created |
| 4 Consent & Data Protection | `svc-bhuc-consent` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_part2_access` | ✅ created |
| 5 Prior-Auth Compliance | `svc-bhuc-priorauth` | `u_bhuc_ai_agent`, `u_bhuc_patient_read`, `u_bhuc_part2_access` (read) | ✅ created |
| 6 Scheduling | `svc-bhuc-scheduling` | `u_bhuc_ai_agent`, `u_bhuc_schedule_write` — **no demographic/PII (fairness)** | ✅ created |

> **Created 2026-07-08 (API):** all 6 as **active password users** (`web_service_access_only=false`,
> mirroring `interface_gautham`) with the role grants above. **Set a password on each** (you said you'll
> reuse the interface-account password). No password was set by the API.

> The contrast is the demo: `svc-bhuc-risk` lacks `u_bhuc_patient_pii`, so its reads are auto-stripped
> of PII, while `svc-bhuc-clinicaldoc`/`consent` can read what they need. That IS UC5.

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

Test each with **Test access** (Access Analyzer) and by impersonating an account with/without the role.

## 5. Wiring — so the roles/ACLs actually ENFORCE (not just exist)

Creating roles/ACLs is not enough; today the agents and the app **bypass** them. To close that:

- **5a — Bind each agent to its service account (SN-13c).** In each agent → *Define security controls →
  data access* → **AI user** → select its `svc-bhuc-*`. (Currently agents don't run under these scoped
  identities.)
- **5b — Switch agent write tools `GlideRecord` → `GlideRecordSecure`.** The as-built Script/CRUD write
  tools use `GlideRecord` to bypass ACLs during pre-governance testing (see Agent 2 "Write risk score",
  Agent 4 "Write Sensitivity Label" — both note this). Until they use `GlideRecordSecure`, ACLs don't
  apply to agent writes.
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

1. ✅ **Roles** — all 9 created (7 via API 2026-07-08 + the 2 you made earlier).
2. ✅ **Service accounts** — the 6 `svc-bhuc-*` created + passwords set.
3. ✅ **ACLs** — 9 field-read + 4 record-read (`u_bhuc_patient`/`_screening`/`_care_plan`/`_prior_auth`,
   requiring `u_bhuc_clinician` + `u_bhuc_patient_read`). **Verified enforcing** (Part 2 → `part2_access`,
   PII → `patient_pii`, deny-by-default, admin bypasses). *(Optional: more field ACLs per §4.)*
4. ☐ **Wiring** — §5: bind agents to `svc-bhuc-*` (13c) + `GlideRecordSecure`; map Cognito→SN roles.
   *(Integration-account roles already granted.)* Plus **GOV-2** DLP guardrail (`sud_usecase.md` §4 Phase 3).
5. ◐ **Verify** — API test done ✅; still worth an in-UI impersonation + the app's C3 reveal (case-manager vs not).

Everything role/ACL-related for all 6 agents / 4 use cases / 3 portals is on this page — build these and
you won't hit a role/ACL dependency later.
