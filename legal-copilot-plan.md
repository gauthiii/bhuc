# Legal Research Copilot Demo Plan (`/prior/legal`)

**Goal:** a frontend-only demo of the Legal Department's Microsoft Copilot (BeccaBot) use case, living under `/prior/legal` next to the prior-auth demo. It shows today's manual research process, the Copilot-assisted future state, and three simulated requests run both ways. No backend calls, no auth guard, no PHI. All case data is fictitious.

**Source:** `CoPilot_CPRM_Sprint2_Master_Workbook.xlsx` (sheets 01 Use Case Overview, 02 Process Discovery, 03 Opportunity Assessment, 09 AI Intake Form). Governance and security sheets (04 to 08) are not surfaced beyond the four safeguards below, by design.

---

## The use case in one paragraph

About 6 attorneys answer roughly 50 legal research requests a month from business units, using material on the Z: legal drive. Finding and reusing that material is slow, research is manual, and a researched answer takes 1 to 3 business days. Copilot, licensed to Legal only, retrieves and summarizes material from the Z: drive with citations and helps draft work product. An attorney reviews every output. The Chief Legal Officer approves any Copilot-assisted work product released outside BCBSVT. Target: 2 hours saved per attorney per week; $15,000 investment, $55,000 expected annual benefit, $150,000 three-year net value.

## Phase 1: Overview page (`/prior/legal`) ✅ DONE

- **Today / Business case figures:** all taken from the workbook (sheets 02 and 03).
- **Current state swimlane** (Business Unit, Attorney, Z: Legal Drive): question in, manual scoping, folder-by-folder search, reading and outside research, drafting, answer in 1 to 3 business days.
- **Future state swimlane** (Business Unit, Attorney, Copilot, Chief Legal Officer): attorney prompts Copilot, Copilot searches the Z: drive within the attorney's permissions, summarizes with citations, attorney verifies each citation, Copilot helps draft, attorney finalizes, then internal answer or CLO approval for external release. Dashed boxes are Copilot steps.
- **Safeguards (4):** citations on every answer; attorney reviews every output; scope limited to the Z: drive and existing permissions with web search and plugins off; CLO approves external release.

## Phase 2: Case simulation (`/prior/legal/simulate`) ✅ DONE

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

## Files

| File | Purpose |
|---|---|
| `frontend/src/lib/legalCopilotFlows.ts` | Current and future swimlane data (reuses the `Flow` type from `priorAuthFlows.ts`) |
| `frontend/src/lib/legalCopilotDemo.ts` | The three cases: manual steps, Copilot steps, citations, work product, CLO decision |
| `frontend/src/pages/prior/legal/Layout.tsx` | Header and tabs (Overview, Case Simulation) |
| `frontend/src/pages/prior/legal/Home.tsx` | Overview page |
| `frontend/src/pages/prior/legal/Simulate.tsx` | Case picker and run view |
| `frontend/src/App.tsx` | Two routes added: `/prior/legal`, `/prior/legal/simulate` |
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
