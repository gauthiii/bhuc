# Privacy & Compliance (Use Case 3) — 42 CFR Part 2 / SUD Enforcement Plan

**Governed risk:** *Privacy & Compliance* — **SUD-protected data (42 CFR Part 2) leaking into an
unapproved Gen AI tool at documentation time, or being exposed without proper role-based access
when referenced again during prior-authorization.** UC3 is governed as a **pair**: the **Consent &
Data Protection Agent (Agent 4)** labels the sensitive content at documentation time, and the
**Prior-Auth Compliance Agent (Agent 5)** respects that label downstream (`plan.md` §4.4 Agents 4/5).

This document is the **enforcement plan** — what to do on the **ServiceNow side** (roles, ACLs, AICT
guardrails), the **React app** changes, and **how to verify**. `[Doc]` = ServiceNow Enable AI /
platform docs; `[Verified]` = confirmed on `ven04690` during this build.

> **Decision (2026-07-08):** app-side role enforcement uses **SN role lookup by email** — the FastAPI
> backend resolves the clinician's `sys_user` by their email and checks whether they hold
> `u_bhuc_part2_access`. No Cognito change; the role definition lives entirely in ServiceNow.

---

## 1. The risk has two halves

| Half | The threat | The mechanism that stops it |
|---|---|---|
| **A. Leakage at documentation time** | SUD text gets pasted/sent into an **unapproved** Gen AI tool/model while a note is written | Native AICT **Sensitive Data Input & Anonymization** guardrail (inbound DLP) + Agent 4 **labeling** |
| **B. Exposure without RBAC at prior-auth** | The same SUD data is **referenced again** in a prior-auth packet and shown to someone **without** the approved role | **Field-level ACLs (deny-by-default)** + the `u_bhuc_part2_access` case-manager role + Agent 5 respecting the label |

## 2. The two enforcement surfaces (why "app masking" alone isn't enough)

Masking today is decided by the **FastAPI backend**, which reads ServiceNow through **one integration
service account** (`interface_gautham`, basic auth) — *not* as the logged-in clinician. So "truly
enforced" means closing **both** surfaces:

| Surface | Who hits it | Enforced by |
|---|---|---|
| **Direct ServiceNow** — native UI, the Governance portal "Tables" links, Table API | anyone with an SN login / the integration account | **ServiceNow ACLs + roles** (Part A, Phase 2) |
| **The BHUC app** — FastAPI backend → single service account | patients / clinicians / governance in the React app | **App role-gating** (Part B) — the backend must become role-aware |

> **~~Today's gap~~ (CLOSED 2026-07-08):** the app reveal *was* gated on consent only (any clinician
> could reveal a consented patient's SUD data). **Now role-gated** — see the Part B as-built note in §5.
> The ACL gap is also closed (33 ACLs live + verified, `roles_and_acls.md`).

## 3. What is already built (do NOT rebuild)

- **Agent 4 — detect + label.** `Detect and Tag Part 2 / SUD content` (script) classifies note text;
  `Write Sensitivity Label (care plan + consent)` (script) writes `u_sensitivity=part2` /
  `u_contains_part2=true` on `u_bhuc_care_plan` **and** `u_sensitivity` / `u_labeled_by_agent` on the
  patient's `part2_sud` consent. Runs on note **Sign**. `[Verified over A2A — action.md AG-4]`
- **Agent 5 — respects the label.** Sets `u_part2_gated=true` + `u_sud_field` on SUD packets; the app
  renders the SUD field as a locked chip. `[Verified — AG-5]`
- **App masking (app-computed).** Chart C3 masks the Part 2 field / flags Part 2 history rows from
  Agent 4's labels; Prior-Auth C6 masks the SUD field. `[BE-Consent / FE-9j]`
- **Consent capture.** Registration captures a **separate** 42 CFR Part 2 consent (`u_part2_consent`
  snapshot + a `part2_sud` row in `u_bhuc_consent`). `[FE-9b / P3]`

**So the remaining work is enforcement: (Part A) roles + ACLs + the native DLP guardrail, and
(Part B) make the app role-aware.**

---

## 4. Part A — ServiceNow side

### Phase 1 — Roles + assignment (SN-13)

**Purpose:** create the "approved case-manager" role the ACLs and the app both check against.

**Where:** `All → System Security → Users and Groups → Roles` (table `sys_user_role`).
REST-writable if the account has `user_admin`/`admin`; otherwise create in the UI.

**Do:**
1. **Create two roles** (`sys_user_role`):
   - `u_bhuc_part2_access` — *"BHUC 42 CFR Part 2 access (approved case managers)."*
   - `u_bhuc_patient_pii` — *"BHUC patient PII access."*

   REST form:
   ```
   POST /api/now/table/sys_user_role
   { "name": "u_bhuc_part2_access",
     "description": "BHUC 42 CFR Part 2 access — approved case managers only" }
   ```
2. **Assign `u_bhuc_part2_access` to ONLY the approved case-manager clinician(s)** — *not* the general
   clinician/governance users. Two ways:
   - **Per user:** open the `sys_user` record → **Roles** related list → *Edit* → add the role. (Or
     `POST /api/now/table/sys_user_has_role { "user": "<sys_id>", "role": "<role sys_id>" }`.)
   - **Via a group (recommended for demo):** create a group **"BHUC Case Managers"**
     (`sys_user_group`), grant it `u_bhuc_part2_access`, and add the case-manager users to the group.
3. **Grant the app's integration account (`interface_gautham`) `u_bhuc_part2_access`.** The app does
   its **own** per-clinician gating (SN role lookup, Part B), so the backend still needs to be able to
   *fetch* Part 2 data to serve authorized clinicians. Without the role on the integration account,
   the ACLs in Phase 2 would blank the field for **everyone** through the app.

**Verify:** on a case-manager `sys_user` record, the **Roles** related list shows
`u_bhuc_part2_access` (green). On a general clinician it does not.

---

### Phase 2 — Field-level ACLs, deny-by-default (SN-4)

**Purpose:** enforce "only `u_bhuc_part2_access` can read Part 2 content" at the **platform** level, so
direct SN access (native lists, the Governance "Tables" links, the Table API) is masked regardless of
the app. This is what makes the risk **actually enforced**, not simulated.

**Where + how:** ACLs live in `sys_security_acl` and **require the `security_admin` role to create —
even for admins**. So:
1. **Elevate:** top-right user menu → **Elevate role** → tick **security_admin** → OK. `[Doc]`
2. `All → System Security → Access Control (ACL)` → **New** for each row below.
   (This is **UI-only** in practice — REST writes to `sys_security_acl` are blocked without elevation.)

**ACL settings for each:** **Type** = `record`, **Operation** = `read`, **Name** = `table.field`
(pick the table, then the specific field in the second choice box), then either add a **Requires role**
or an **Advanced** script (below). Leave **Active** on. Deny-by-default works because a field with a
matching read ACL is hidden unless the ACL passes.

**The ACLs to create** (protect the actual SUD *content*; leave the boolean label fields readable so
the app/governance can still compute masking):

| # | Table | Field | Rule |
|---|---|---|---|
| 1 | `u_bhuc_care_plan` | `u_draft_note` | **Conditional** — Advanced script (below); only gate when the note is Part 2-labeled |
| 2 | `u_bhuc_prior_auth` | `u_sud_field` | **Requires role:** `u_bhuc_part2_access` (always protected) |
| 3 | `u_bhuc_screening` | `u_responses` | Requires role: `u_bhuc_part2_access` |
| 4 | `u_bhuc_screening` | `u_rationale` | Requires role: `u_bhuc_part2_access` |
| 5 | `u_bhuc_message` | `u_body` | **Conditional** on `u_contains_part2` (same script shape as #1) |

**Advanced script for the conditional ones (#1, #5)** — allow normally, deny only when the record is
Part 2-labeled and the user lacks the role:
```javascript
answer = true;
if (current.u_contains_part2 == true &&
    !gs.hasRole('u_bhuc_part2_access') && !gs.hasRole('admin')) {
    answer = false;   // deny this field to non-case-managers on Part 2 records
}
```
For the always-protected ones (#2–#4), skip the script and just set **Requires role =
`u_bhuc_part2_access`** (add `admin` too if you want admins to always see it).

**PII (optional, same pattern):** to also lock the patient PII fields, create `read` ACLs on
`u_bhuc_patient` fields (`u_first_name`, `u_last_name`, `u_date_of_birth`, `u_email`, `u_phone`,
`u_address_line1/2`, `u_insurance_member_id`, `u_cognito_sub`) requiring `u_bhuc_patient_pii`.

**Verify:**
- Impersonate a **non-case-manager** (top-right → **Impersonate user**) → open the `u_bhuc_care_plan`
  list on a Part 2 note → `u_draft_note` shows blank/`********`. Open `u_bhuc_prior_auth` → `u_sud_field`
  is hidden.
- Impersonate a **case manager** → the same fields are visible.
- End impersonation.

---

### Phase 3 — Native DLP guardrail (GOV-2) — Half A

**Purpose:** stop SUD/PII from leaking into an unapproved Gen AI tool at documentation time, and
anonymize/flag sensitive input to any agent. **UI-only** (AICT UXF workspace, not a REST table).

**Where:** `Workspaces → AI Control Tower → Configurations → Data → Security & Privacy`. Requires the
**`sn_ai_governance.ai_steward`** role (admin has it). `[Doc: Security & Privacy Guardrail Configuration]`

**Do (set to Active for the BHUC agents):**
1. **Sensitive Data Input & Anonymization → Active** — catches SUD/PII entering any agent prompt
   (inbound) and anonymizes it before it reaches the model. This is the core Half-A control.
2. **Output PII Violation → Active** — flags PHI/PII in agent output (mandatory: PHI in an LLM
   response is a HIPAA breach).
3. **Output Extended PII → Active** (passport / driver's-license / VIN).
4. *(Sampling)* 100% for clinical-safety stakes; leave score weight default.

**Verify:** `Configurations → View audit logs` (top-right) shows each guardrail change (Timestamp /
User / Setting / Before / After). After running the agents, the **Security & Privacy** tab shows
sensitive-data-input / anonymization occurrences.

> **As-built (2026-07-09):** the **detection layer is Active** — Data Integrity Incident Detection (100%),
> Agent goal deviation (100%), Output screening (Output Security Vulnerability + Output Extended PII +
> Output PII Violation), and Sensitive data input & anonymization. **BUT native redaction is license-gated:**
> the actual anonymization runs via **Data Privacy → Anonymization** policies (Data Kit / Data
> Extraction-global) which need a **Data Privacy / Data Discovery license** ("No license — Start Trial") +
> **Active Data Patterns** selection — unavailable on `ven04690`. So GOV-2 = **detection on, redaction
> pending license**. Accepted as a gap; **compensating controls = the role+consent app masking + 42 ACLs
> (Half B) + Agent 4 SUD labeling**. Also: the built-in patterns are generic PII (SSN/DOB/email/card) — there
> is **no SUD-term pattern** OOB, so SUD-content detection stays Agent 4's job. `AG-8`/`GOV-2` in `action.md`.

---

## 5. Part B — React app (make it role-aware)

Chosen model: **SN role lookup by email.** The app is the gate for **app users**; the Phase-2 ACLs are
the gate for **direct-SN** users.

> **As-built (BUILT 2026-07-08 — B1/B2 done):** `server/app/access.py` implements
> `has_part2_access(email)` (queries `sys_user` → `sys_user_has_role` for `u_bhuc_part2_access`),
> `patient_has_part2_consent(patient_sys_id)` (reads `u_bhuc_patient.u_part2_consent`), and
> `clinician_email(authorization, override)` (explicit `?clinicianEmail=` param wins, else decode the
> Cognito access-token `username` claim from the `Authorization: Bearer` header — falls back to
> deny-by-default for the `demo.*` token). Frontend passes `user.username` from `useClinicianAuth`.
> B3 (governance "Tables" links) not done — covered by the ACLs regardless.
>
> **Consistent gate = role AND consent, applied on ALL THREE surfaces (2026-07-08):**
> - **C3 chart** (`patient.py`): `can_see_part2 = reveal AND part2_consent AND part2_role`; returns
>   `part2Role`/`part2Consent` so `Chart.tsx` shows distinct **"Consent required"** vs **"Case-manager
>   role required"** modals. On reveal it now returns **`part2Content[]`** — the *actual* SUD content
>   (`u_summary` + `u_draft_note`) of **every** flagged note (scan bumped from 5→50, so no flagged note
>   is missed), rendered in a dedicated unmasked panel. Previously it showed only a "N note(s) flagged"
>   summary sentence — that was the reported bug.
> - **C5 ambient documentation** (`note.py`): `get_note`/`latest_note` **mask the body of a SIGNED note
>   that Agent 4 flagged Part 2** unless the viewer has role+consent (`_part2_masked`); drafts / non-Part2
>   notes stay open so the author can write & sign. `Documentation.tsx` renders a locked "Protected note"
>   banner (`part2Masked`). `notes_summary` now returns `containsPart2` per note.
> - **C6 prior-auth** (`priorauth.py`): on a Part2-gated packet, **ALL SUD-revealing fields** un-mask only
>   for role **AND** consent — the SUD detail, **Diagnosis, Coverage determination, Citation, and the
>   service/treatment name** (title + history list row via `serviceMasked`); only Payer + Requested units
>   stay visible; masked values are not sent to the client. **Backend safety-net:** since Agent 5's record-op
>   maps `u_sud_field ← {{sud_field}}` but the model doesn't reliably fill it, `draft_priorauth` populates
>   `u_sud_field`+`u_part2_gated` when `_looks_sud` and the agent left them empty. Also **multi-prior-auth**:
>   `/priorauth/all` (list) + create + `DELETE /priorauth/{id}` (drafts only) + an AgentChat coverage
>   assistant. Seeded demo packet **`BHUC_PRIOR_AUTH_008`** for Daniel Rivera (`BHUC_PATIENT_005`).
> - **Fixed** `patient_has_part2_consent` being passed the Table-API `{link,value}` reference object (not a
>   bare sys_id) on `get_priorauth`/`draft_priorauth` — it now normalizes both shapes.
>
> **Verified live** for `doctor@doctor.com` (role) vs `dr.finch@bhuc.example` (no role) against Daniel Rivera
> (consented): C3 reveals the real note text vs masked; C5 note body visible vs masked; C6 all SUD fields
> visible vs locked. **Committed + pushed to main (`e0f4bb1`, `9caf89c`, `6019d46`) → auto-deployed.** Demo
> case-manager `doctor@doctor.com` also has a Cognito clinician account. The agents themselves are least-
> privilege-wired (AG-8): they run as `svc-bhuc-*-ai` + `GlideRecordSecure`, so even agent writes are
> ACL-gated (see `roles_and_acls.md` §5).

### B1 — Backend (FastAPI)
1. **Role check helper** — resolve the clinician and test the role:
   ```python
   def has_part2_access(email: str) -> bool:
       users = table.list("sys_user", f"email={email}", fields="sys_id", limit=1)
       if not users:
           return False
       uid = users[0]["sys_id"]
       hit = table.list("sys_user_has_role",
                        f"user={uid}^role.name=u_bhuc_part2_access", fields="sys_id", limit=1)
       return bool(hit)
   ```
   *(`sys_user_has_role` includes inherited roles, so group-granted roles resolve too.)* Cache per
   email for the request/short TTL to avoid a lookup on every field.
2. **Get the clinician's email** from the request `Authorization: Bearer <token>` — the Cognito
   access token's `username` claim is the email in this setup (validate via `aws_auth` or decode the
   claim). Add it to the Part 2-serving endpoints.
3. **Gate the Chart reveal** in `patient.py → patient_chart`: change
   `can_see_part2 = bool(reveal) and part2_consent`
   → `can_see_part2 = bool(reveal) and part2_consent and has_part2_access(clinician_email)`.
   Return a distinct reason so the UI can tell **"consent required"** from **"role required"**
   (e.g. add `"part2Role": has_part2_access(...)` to the chart payload).
4. **Prior-Auth (C6)** — same gate before returning `u_sud_field` unmasked; keep it masked by default.
5. *(Optional)* have the backend **impersonate** the clinician on the Table API later if you want the
   ACLs to be the single enforcement point (bigger change — not needed for this model).

### B2 — Frontend (clinician)
- **Chart (C3):** when the backend returns `part2Role=false`, the **Reveal** action shows a
  **"Case-manager role required"** modal (mirror the existing "Consent required" modal in
  `Chart.tsx`), instead of unmasking. When `true` + consent, reveal works as today.
- **Prior-Auth (C6):** unchanged — SUD field stays a locked chip unless the backend unmasks it.

### B3 — Governance portal (close the leak surface)
- The Governance sidebar **"Tables"** links open raw `u_bhuc_*` ServiceNow list views. Once Phase-2
  ACLs exist, those views are **masked by ServiceNow** for a non-case-manager — so they're safe. For
  belt-and-suspenders, hide/guard the links for the Part 2 tables (`u_bhuc_care_plan`,
  `u_bhuc_prior_auth`, `u_bhuc_consent`) unless the governance user is a case manager.

---

## 6. Part C — How to verify the whole chain

### C1 — Platform enforcement (direct SN)
1. **Impersonate a non-case-manager** → open `u_bhuc_care_plan` (a Part 2 note) → `u_draft_note` is
   **masked**; open `u_bhuc_prior_auth` → `u_sud_field` is **hidden**. `GET` the same records via the
   Table API as that user → the fields are **absent**. ✅ deny-by-default works.
2. **Impersonate a case manager** → the same fields are **visible**. ✅ role grants access.

### C2 — App enforcement (React)
1. Sign in as a **case-manager clinician** → open a Part 2 patient's **Chart** → **Reveal (role +
   consent)** → the SUD field un-masks. ✅
2. Sign in as a **non-case-manager clinician** → same patient → **Reveal** → **"Case-manager role
   required"** modal; the field stays masked. ✅ (This is the app gate that the old consent-only build
   was missing.)
3. **Prior-Auth (C6):** the `SUD detail (42 CFR Part 2)` packet field is a locked chip for the
   non-case-manager, visible for the case manager.

### C3 — Half A (DLP / leakage at documentation time)
1. In the **Agents Inventory** chat for a governed agent, submit a message containing SUD text →
   confirm the **Security & Privacy** tab records a **Sensitive Data Input / Anonymization** event.
2. Prompt an agent to output a fake SSN/phone → expect an **Output PII Violation**.

### C4 — Labeling still works (Agent 4)
- Sign a note with SUD content → the C5 **Part 2 check modal** shows *"42 CFR Part 2 detected →
  access-gated"* and `u_bhuc_care_plan.u_contains_part2=true`. This is the label the ACLs + app both
  key off.

### C5 — Before/After demo (`plan.md` §6)
- **Remove** `u_bhuc_part2_access` from the demo clinician (or toggle the guardrail off) → the app
  reveal is denied and the guardrail no longer flags input ("ungoverned").
- **Add** it back / guardrail on → reveal works for the case manager, SUD input is anonymized, and
  everyone else is denied by default ("governed"). This is the UC3 money shot.

---

## 7. What's REST-doable vs UI-only

| Item | REST? | Notes |
|---|---|---|
| Roles (`sys_user_role`) + assignment (`sys_user_has_role`) | ⚠️ maybe | Works if the account has `user_admin`/`admin`; else UI |
| Field ACLs (`sys_security_acl`) | ❌ UI-only | Requires **security_admin elevation**; REST writes blocked |
| Role membership read (`sys_user_has_role`) | ✅ read | This is what the app's `has_part2_access` queries |
| AICT Security & Privacy guardrails | ❌ UI-only | AICT UXF workspace, `ai_steward` role |
| App role-gating (backend/frontend) | ✅ code | Part B — the only code work |

**Net:** Phase 1 (roles) is quick UI/REST; **Phase 2 (ACLs) is the core UI-only work** and the real
enforcement; Phase 3 (guardrail) is UI-only in AICT; **Part B is the only app code**.

---

## 8. Does this actually enforce it? (defense in depth)

**Yes — with two independent gates plus a preventive DLP layer:**

1. **Platform gate (ACLs + role)** — the authoritative, can't-be-bypassed control: any read of a Part 2
   field (native UI, Table API, governance links, or the app's own service account if it lacked the
   role) is **denied unless the user holds `u_bhuc_part2_access`.** This is deny-by-default and applies
   regardless of which client is used.
2. **App gate (role lookup)** — because the app deliberately reads through one service account (which
   *has* the role so it can serve authorized clinicians), the backend re-checks the **specific
   clinician's** role by email before un-masking. So the app can't leak Part 2 to a non-case-manager
   even though its service account can technically read the field.
3. **Preventive DLP (guardrail)** — the Sensitive-Data-Input/Anonymization guardrail stops SUD from
   flowing into an unapproved model in the first place (Half A), before any record is even written.

**Reviewer framing:** *"SUD content is detected and labeled at documentation time (Agent 4). Access is
deny-by-default at the platform (field ACLs keyed to a case-manager role) and re-checked per-clinician
in the app; the prior-auth agent respects the same label. Inbound SUD is anonymized by the native
guardrail before it reaches a model. Only an approved case manager — never a general clinician,
governance user, or the raw table view — can see Part 2 data."*

**Who can see SUD data (target state):** only users/clinicians holding **`u_bhuc_part2_access`**
(approved case managers) **and**, in the app, only when the patient's Part 2 **consent** is on file.
**Everyone else is denied by default** — including via direct ServiceNow access and the Table API.
