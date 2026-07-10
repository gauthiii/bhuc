# BHUC Knowledge Bases (DATA-3)

Source-of-truth mirrors of every BHUC RAG knowledge base. Each `.md` file here mirrors
one `kb_knowledge_base` on `ven04690`. **If you edit a value, update both the article in
ServiceNow and the mirror here** (same rule as `frontend/src/lib/facility.ts`).

Built per the verified as-built procedure in `plan.md` **§4.6.2**. KB records + articles
were created live via REST on **2026-07-07**; articles land in **Draft** — the publish +
AI Search source + profile steps below are **UI-only** (REST is business-rule-blocked).

## What exists now (all KBs Published; sources + profiles built & Published, verified 2026-07-07)

| KB (title) | Agent | `kb_knowledge_base` sys_id | Articles | Mirror file |
| --- | --- | --- | --- | --- |
| BHUC Facility Information | 1 (Front-Door) | `11c6b5a73bf90f1076f13b64c3e45a0b` | 11 (Published) | `bhuc-facility-information.md` |
| BHUC Screening Scoring Rules | 2 (Risk ID) | `532b483f3b71cf1076f13b64c3e45a68` | 12 (5 Published + 7 Draft) | `bhuc-screening-scoring-rules.md` |
| BHUC Clinical Coding and Documentation | 3 (Clinical Doc) | `103b883f3b71cf1076f13b64c3e45afa` | 5 (Published) | `bhuc-clinical-coding-and-documentation.md` |
| BHUC Payer Policy Library | 5 (Prior-Auth) | `c93bc83f3b71cf1076f13b64c3e45af7` | 6 (Published) | `bhuc-payer-policy-library.md` |
| BHUC Clinician Directory | 6 (Scheduling) | `c23b8c3f3b71cf1076f13b64c3e45adb` | 6 (Published) | `bhuc-clinician-directory.md` |
| BHUC Consent and 42 CFR Part 2 Reference | 4 (Consent) — reference only | `fa3b4cb33b3d4f105551369693e45ae1` | 5 (Published) | `bhuc-consent-and-42-cfr-part-2-reference.md` |

### AI Search sources + profiles (as-built, verified)
Each profile maps to exactly its own KB-filtered source (`ais_search_source`) — no stock Knowledge/Catalog sources.

| KB | Source (`ais_search_source`) | Source sys_id | Profile (`ais_search_profile`, Published) | Profile sys_id |
| --- | --- | --- | --- | --- |
| Facility Information | BHUC Facility - Knowledge | `78dbcf273b3d0f105551369693e45a29` | BHUC Facility Search (`bhuc_facility_search`) | `63bc872b3b3d0f105551369693e45a94` |
| Screening Scoring Rules | BHUC Screening - Knowledge | `ca209cb33bf1cf1076f13b64c3e45ac7` | BHUC Screening Search (`bhuc_screening_search`) | `ba29d8773b75cf1076f13b64c3e45ac0` |
| Clinical Coding and Documentation | BHUC Clinical Coding - Knowledge | `257090373bf1cf1076f13b64c3e45a95` | BHUC Clinical Coding Search (`bhuc_clinical_coding_search`) | `953b90733bb5cf1076f13b64c3e45ab2` |
| Payer Policy Library | BHUC Payer Policy - Knowledge | `e5c714bf3b35cf1076f13b64c3e45a6d` | BHUC Payer Policy Search (`bhuc_payer_policy_search`) | `52ab98b33bb5cf1076f13b64c3e45a23` |
| Clinician Directory | BHUC Clinician Directory - Knowledge | `fbd75cbf3b35cf1076f13b64c3e45aab` | BHUC Clinician Directory Search (`bhuc_clinician_directory_search`) | `b34cd4773bb5cf1076f13b64c3e45a9e` |
| Consent & 42 CFR Part 2 Reference | BHUC Consent - Knowledge | `d06894733b75cf1076f13b64c3e45a74` | BHUC Consent Search (`bhuc_consent_search`) | `639c9c373bb5cf1076f13b64c3e45a87` |

### Status
- ✅ **Step A — KBs + articles built and Published** (all 6).
- ✅ **Step B — AI Search sources built** (KB-filtered, one per KB).
- ✅ **Step C — Search profiles built & Published** (one per KB, one source each).
- ⏳ **Step D — wire each agent's Search Retrieval tool** — pending, done per-agent during the AG-2/3/5/6 builds (settings table below).
- 🧹 **Cleanup** — retire stray `KB0010011` placeholder from the Facility KB (see bottom).

Content policy: **real standards** for PHQ-9/GAD-7/C-SSRS scoring, ICD-10-CM F-codes, CPT
psych codes, and 42 CFR Part 2; **demo-but-consistent** (labelled "sample") for the payer
policy library and clinician directory, aligned with `facility.ts` insurers and the app's
mock clinicians/policy references.

## Where to find them (ServiceNow)
- KB records: **All → Knowledge Bases** (or `kb_knowledge_base_list.do`).
- Articles in a KB: `kb_knowledge_list.do?sysparm_query=kb_knowledge_base=<KB sys_id>`.

---

## Step 1 — Publish each KB's articles (UI-only, per §4.6.2 Step A)
The Knowledge state-flow reverts REST publishes to Draft, so publish in the UI. For each KB,
open the list link, select all articles, and click **Publish** (instant, no approval).
Confirm `workflow_state = published`.

- Screening: `kb_knowledge_list.do?sysparm_query=kb_knowledge_base=532b483f3b71cf1076f13b64c3e45a68`

> **SUD battery update (2026-07-09).** Added the substance-use screening battery to the Screening
> KB via REST (`scratchpad/push_kb.py`, re-runnable from the mirror). **2 existing articles PATCHed
> in place (stayed Published):** KB0010015 (risk banding — now folds in AUDIT/DAST-10/SOWS/craving
> acuity) and KB0010016 (administration order — now the full SBIRT adaptive order). **7 new articles
> created as Draft — publish these in the UI:** KB0010039 NIDA Quick Screen · KB0010040 AUDIT ·
> KB0010041 DAST-10 · KB0010042 Craving & Triggers (custom) · KB0010043 SOWS · KB0010044 BAM ·
> KB0010045 SOCRATES. The AI Search source + profile (`bhuc_screening_search`) already cover the KB,
> so no source/profile change is needed — published articles appear in retrieval within minutes.
- Clinical Coding: `kb_knowledge_list.do?sysparm_query=kb_knowledge_base=103b883f3b71cf1076f13b64c3e45afa`
- Payer Policy: `kb_knowledge_list.do?sysparm_query=kb_knowledge_base=c93bc83f3b71cf1076f13b64c3e45af7`
- Clinician Directory: `kb_knowledge_list.do?sysparm_query=kb_knowledge_base=c23b8c3f3b71cf1076f13b64c3e45adb`
- Consent/Part 2: `kb_knowledge_list.do?sysparm_query=kb_knowledge_base=fa3b4cb33b3d4f105551369693e45ae1`

## Step 2 — Create one KB-filtered AI Search **Source** per KB (UI-only, §4.6.2 Step B)
**All → AI Search → Search Sources → New**, one per KB:
- **Indexed Source:** `Knowledge Table` (already indexes published `kb_knowledge` — no re-index).
- **Conditions:** `Workflow state = Published` **AND** `Active = true` **AND** `Valid to > Today` **AND** `Knowledge base = <this KB>` (encoded `kb_knowledge_base=<KB sys_id>`).

Suggested names (matches the `BHUC Facility - Knowledge` pattern):

| KB | Source name |
| --- | --- |
| Screening Scoring Rules | `BHUC Screening - Knowledge` |
| Clinical Coding and Documentation | `BHUC Clinical Coding - Knowledge` |
| Payer Policy Library | `BHUC Payer Policy - Knowledge` |
| Clinician Directory | `BHUC Clinician Directory - Knowledge` |
| Consent and 42 CFR Part 2 Reference | `BHUC Consent - Knowledge` |

## Step 3 — Create one Search **Profile** per KB (UI-only, §4.6.2 Step C)
1. **All → AI Search → Search Profiles →** open `[AI Search Assist] - KB and Catalog` → **Clone**; rename per table below.
2. In **Search Sources**, remove the stock Knowledge + Catalog sources; add **only** this KB's source from Step 2.
3. **Publish the linked dictionaries first** (spell-check dictionary starts Draft, stop-word may be "New") via the AI Search admin experience, then **Publish** the profile → state = Published.

| KB | Profile name |
| --- | --- |
| Screening Scoring Rules | `BHUC Screening Search` |
| Clinical Coding and Documentation | `BHUC Clinical Coding Search` |
| Payer Policy Library | `BHUC Payer Policy Search` |
| Clinician Directory | `BHUC Clinician Directory Search` |
| Consent and 42 CFR Part 2 Reference | `BHUC Consent Search` |

## Step 4 — Wire each agent's Search Retrieval tool (Agent Studio → Add tools, §4.6.2 Step D)
Set **Search profile** = the profile above; **Search sources** = that KB's source only
(remove `Catalog Item Table`); **Hybrid**; require citations; **Autonomous**. Per-agent
limits/thresholds come from `plan.md` §4.4:

| Agent | Tool | Results limit | Threshold |
| --- | --- | --- | --- |
| 2 · Risk Identification | Search retrieval (scoring rules) | 10 | 0.3 |
| 3 · Clinical Documentation | Search retrieval (coding/clinical ref) | 8 | 0.3 |
| 5 · Prior-Auth Compliance | Search retrieval (payer policy) | 8 | 0.4 |
| 6 · Scheduling | Search retrieval (clinician directory) | 10 | 0.3 |

> Agent 4 (Consent) has **no Search Retrieval tool** by design (deterministic `bhuc_part2_labeler`
> Script + record op). Its KB is reference/citation material; only build a source+profile for it
> if you later add a Search tool to that agent.

> Newly published articles can take a few minutes to appear in AI Search results (§4.6.2).

## Cleanup note
A stray placeholder article **`KB0010011` "BHUC Screening — Instrument Scoring Rules (TESTING
PLACEHOLDER…)"** currently lives inside the **Facility** KB. Its real content now lives in the
**Screening Scoring Rules** KB, so retire/delete `KB0010011` from the Facility KB to keep Agent
1's facility retrieval clean.
