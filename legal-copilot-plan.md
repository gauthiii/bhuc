# Legal Research Copilot Demo Plan (`/prior/legal`)

**Goal:** a frontend-only demo of the Legal Department's Microsoft Copilot (BeccaBot) use case, living under `/prior/legal` next to the prior-auth demo. It shows today's manual research process, the Copilot-assisted future state, and three simulated requests run both ways. No backend calls, no auth guard, no PHI. All case data is fictitious.

**Source:** `CoPilot_CPRM_Sprint2_Master_Workbook.xlsx` (sheets 01 Use Case Overview, 02 Process Discovery, 03 Opportunity Assessment, 09 AI Intake Form). Governance and security sheets (04 to 08) are not surfaced beyond the four safeguards below, by design.

---

## The use case in one paragraph

About 6 attorneys answer roughly 50 legal research requests a month from business units, using material on the Z: legal drive. Finding and reusing that material is slow, research is manual, and a researched answer takes 1 to 3 business days. Copilot, licensed to Legal only, retrieves and summarizes material from the Z: drive with citations and helps draft work product. An attorney reviews every output. The Chief Legal Officer approves any Copilot-assisted work product released outside BCBSVT. Target: 2 hours saved per attorney per week; $15,000 investment, $55,000 expected annual benefit, $150,000 three-year net value.

## Phase 1: Overview page (`/prior/legal`) ✅ DONE

- **How it works strip** (under the page title, replaces the intro paragraph): three step cards, Business unit asks, Copilot finds and summarizes (dashed blue, matching the Copilot step style), Attorney checks and decides.
- **Today / Business case figures:** all taken from the workbook (sheets 02 and 03).
- **Current state swimlane** (Business Unit, Attorney, Z: Legal Drive): question in, manual scoping, folder-by-folder search, reading and outside research, drafting, answer in 1 to 3 business days.
- **Future state swimlane** (Business Unit, Attorney, Copilot, Chief Legal Officer): attorney prompts Copilot, Copilot searches the Z: drive within the attorney's permissions, summarizes with citations, attorney verifies each citation, Copilot helps draft, attorney finalizes, then internal answer or CLO approval for external release. Dashed boxes are Copilot steps.
- **Points beside each flow:** a red "Problems today" panel next to the current state (5 points) and a green "How Copilot solves them" panel next to the future state (5 matching points, same order). These replace the one-line subtexts. Flows scale down to fit beside the panel, with no scrolling.
- **Safeguards (4):** citations on every answer; attorney reviews every output; scope limited to the Z: drive and existing permissions with web search and plugins off; CLO approves external release.

## Phase 2: Case simulation (`/prior/legal/simulate`) ✅ DONE

A case-by-case comparison table sits below the three case cards on the picker (four measures per case, Manual vs With Copilot, plus an "Across all three" summary; values match the step data and are labeled illustrative).

Three fictitious requests, each runnable as **Manual (today)** or **With Copilot (future)**. Back/Next stepper, optional auto-play, live swimlane highlight, and URL state (`?case=&mode=&s=&d=`) so any moment is deep-linkable.

| Request | Use | Manual | With Copilot | What it shows |
|---|---|---|---|---|
| LR-2026-0412 Vendor data return at contract end (Procurement) | Internal | Answer on day 2 | Answer the same afternoon | Straight answer; attorney verifies 3 citations |
| LR-2026-0419 Retention period for closed broker files (Compliance) | Internal | Answer on day 3 | Answer on the morning of day 2 | Copilot cites a superseded 2019 memo; attorney rejects it, asks a follow-up, verifies the current schedule |
| LR-2026-0427 Reply letter on a software license renewal (IT Vendor Management) | External | Letter on day 3 | CLO decision on day 2 | Audience acts as CLO: Approve release, or Return to attorney (one edit, then approved) |

Rules applied to the case content:

- Attorney pickup time is the same in both modes, so the time saved comes only from research and drafting.
- Only the 1 to 3 business day cycle time is from the workbook. All other times are illustrative, and every simulation screen says "Illustrative simulation, fictitious data".
- Documents, clauses and quotes are made-up internal files. No real statute, regulation or case law is quoted.
- People from the workbook appear by role only. Requesters and attorneys have fictitious names.
- Manual mode makes no claim about CLO approval, because the workbook only states it for Copilot-assisted work product.

## Phase 3: Security and Governance (`/prior/legal/security`) ✅ DONE

Third tab. All content is read from `frontend/src/lib/legalCopilotSecurityData.ts`, which was extracted from workbook sheets 01 and 04 to 09 by script. Text is verbatim except: people are shown by role only, workbook sheet cross-references are removed, "customer data" in one Microsoft contract term reads "BCBSVT data", and the conflicting low-severity gap counts (five in ID.RA-01, ten in RMF M-3) are dropped. The workbook itself still has that conflict.

Sections, in order:

1. **Posture tiles:** Tier 3 (27/100), 83% conformance (53 of 64), 11 in progress and 0 open, 13/13 contract controls, vendor risk Low (criticality Critical), no PHI.
2. **NIST CSF 2.0 wheel:** Govern in the center; Identify, Protect, Detect, Respond and Recover around it. Selecting a function updates the summary (closed / in progress / enterprise program / not applicable) and filters the process table (115 processes, filter chips, expandable "why it matters").
3. **Risk register:** the 4 workbook risks with mitigation, owner role, target, status and mapped controls. No per-risk severity is shown because the workbook does not rate risks individually. **Score build-up:** the 5 weighted factors adding to 27 on a 0 to 100 scale with the tier bands.
4. **Framework crosswalk tabs:** HIPAA Security Rule 14/14, NIST SP 800-53 9/9, HITRUST CSF 7/7, AI-specific (OWASP LLM) 7/8 with sustainment strategies.
5. **Vendor, data, trust:** Microsoft certifications and contract controls, the 3 data elements (confidential, stay in tenant), and the 7 NIST AI RMF characteristics as bars with the threshold at 3 (average 3.43).
6. **Approval trail:** 5 sign-offs with role and date.

The header badge on all legal tabs now reads "Legal Research Copilot". The home card title is unchanged.

## Files

| File | Purpose |
|---|---|
| `frontend/src/lib/legalCopilotFlows.ts` | Current and future swimlane data (reuses the `Flow` type from `priorAuthFlows.ts`) |
| `frontend/src/lib/legalCopilotDemo.ts` | The three cases: manual steps, Copilot steps, citations, work product, CLO decision |
| `frontend/src/pages/prior/legal/Layout.tsx` | Header and tabs (Overview, Case Simulation) |
| `frontend/src/pages/prior/legal/Home.tsx` | Overview page |
| `frontend/src/pages/prior/legal/Simulate.tsx` | Case picker and run view |
| `frontend/src/pages/prior/legal/ComparisonTable.tsx` | Case comparison table shown on the picker |
| `frontend/src/pages/prior/legal/Security.tsx` | Security and Governance page |
| `frontend/src/lib/legalCopilotSecurityData.ts` | Workbook data behind the Security and Governance page |
| `frontend/src/App.tsx` | Three routes added: `/prior/legal`, `/prior/legal/simulate`, `/prior/legal/security` |
| `frontend/src/pages/RolePicker.tsx` | One home card added: "Legal Research Copilot Demo" |

No existing prior-auth file was changed. The shared `Swimlane.tsx` renderer is imported as is.

## Suggested demo script (about 8 minutes)

1. Home page, open **Legal Research Copilot Demo**.
2. Overview: read the Today and Business case figures, walk the current-state swimlane, then the future-state swimlane. Point to the four safeguards.
3. Simulation, **Manual (today)**, run LR-2026-0412 to show the day-2 answer.
4. Switch to **With Copilot (future)** on the same request and show the same answer the same afternoon, with the citation check.
5. Run LR-2026-0419 with Copilot and stop at step 5 (outdated source flagged). This is the point that shows why attorney review stays in the process.
6. Run LR-2026-0427 with Copilot to the CLO decision. Let the audience choose Approve or Return.

## Verification

- `tsc -b` clean.
- Rendered and screenshotted at 1440px: overview, case picker, case 2 flag step, case 3 CLO decision, case 3 return path, case 1 manual end, home card.

## Decisions (2026-09-23)

1. Route: `/prior/legal` plus a home card; old `/prior` files untouched.
2. Scope: overview plus simulation (no slides yet).
3. Cases: answer / catch an outdated source / external release with CLO approval.
4. Names: roles only.
5. Flow text: as drafted from the workbook.
6. Timings: illustrative and labeled; workbook figures only on the overview.
7. Content: fictitious internal documents; no real legal citations.
8. Delivery: plan doc, changes left uncommitted for review.
