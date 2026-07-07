# BHUC Knowledge Bases (DATA-3)

Source-of-truth mirrors of every BHUC RAG knowledge base. Each `.md` file here mirrors
one `kb_knowledge_base` on `ven04690`. **If you edit a value, update both the article in
ServiceNow and the mirror here** (same rule as `frontend/src/lib/facility.ts`).

Built per the verified as-built procedure in `plan.md` **§4.6.2**. KB records + articles
were created live via REST on **2026-07-07**; articles land in **Draft** — the publish +
AI Search source + profile steps below are **UI-only** (REST is business-rule-blocked).

## What exists now

| KB (title) | Agent | `kb_knowledge_base` sys_id | Articles | Mirror file |
| --- | --- | --- | --- | --- |
| BHUC Facility Information | 1 (Front-Door) | `11c6b5a73bf90f1076f13b64c3e45a0b` | 11 (Published) | — (facts in `facility.ts`) |
| BHUC Screening Scoring Rules | 2 (Risk ID) | `532b483f3b71cf1076f13b64c3e45a68` | 5 (Draft) | `bhuc-screening-scoring-rules.md` |
| BHUC Clinical Coding and Documentation | 3 (Clinical Doc) | `103b883f3b71cf1076f13b64c3e45afa` | 5 (Draft) | `bhuc-clinical-coding-and-documentation.md` |
| BHUC Payer Policy Library | 5 (Prior-Auth) | `c93bc83f3b71cf1076f13b64c3e45af7` | 6 (Draft) | `bhuc-payer-policy-library.md` |
| BHUC Clinician Directory | 6 (Scheduling) | `c23b8c3f3b71cf1076f13b64c3e45adb` | 6 (Draft) | `bhuc-clinician-directory.md` |
| BHUC Consent and 42 CFR Part 2 Reference | 4 (Consent) — reference only | `fa3b4cb33b3d4f105551369693e45ae1` | 5 (Draft) | `bhuc-consent-and-42-cfr-part-2-reference.md` |

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
