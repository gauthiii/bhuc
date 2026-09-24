# Prior-Authorization Demo Plan (`/prior`)

**Goal:** a frontend-only demo of the prior-authorization use case from the 507/510 kickoff deck ([507-510-project-kickoff.md](507-510-project-kickoff.md), slides 13–15), living entirely under the `/prior` route. No backend calls, no auth guard, no PHI — all mock data.

---

## Phase 0 — Process comparison home page ✅ DONE

Route `/prior` renders both swimlane flows for side-by-side (stacked) comparison:

- **Present state** — manual prior authorization (slide 13, verbatim step text).
- **Future state** — AI-enabled prior authorization (slide 14, verbatim step text), with dashed-blue AI-agent boxes, green **Approved** / red **Rejected** paths, and capability chips (auto-approval, HITL, plain-language denials, discharge prediction, bill-code cross-checks).

Files:

| File | Purpose |
|---|---|
| `frontend/src/lib/priorAuthFlows.ts` | Flow data (lanes, nodes, edges) transcribed from slides 13–14 |
| `frontend/src/pages/prior/Swimlane.tsx` | Reusable data-driven SVG swimlane renderer (lanes, orthogonal arrows, labels) |
| `frontend/src/pages/prior/Home.tsx` | `/prior` home page — comparison of both states |
| `frontend/src/App.tsx` | Route registration (`/prior`, unguarded) |

Verified: `tsc -b` clean; rendered and screenshotted at `/prior` — both diagrams fit their cards without horizontal scrolling at desktop width.

---

## Phase 1 — Interactive future-state simulation (`/prior/simulate`) ✅ DONE

Slide 14 brought to life as a market-standard UM walkthrough:

- **Case picker (auth queue):** 3 fictitious behavioral-health cases with request IDs, urgency chips and expected-path badges — (a) IOP continuation `S9480` → auto-approved, (b) expedited inpatient psych admission → HITL → reviewer decides, (c) residential SUD `H0017` with documentation gaps → HITL → likely denial.
- **Stepper + auto-play:** Back/Next stepper with an optional auto-play toggle; auto-play pauses automatically at the human-review decision point. State lives in the URL (`?case=&s=&d=`) so any moment is deep-linkable.
- **Live swimlane:** the future-state diagram highlights the active node and tints visited ones.
- **Narration panel:** per-step agent card (Provider EHR Agent, Intake & Eligibility, Clinical Criteria, Determination & Notification, Care Progression, Payment Integrity) with facts — X12 278 transactions, eligibility results, criteria sets, confidence vs auto-approval threshold, TAT clocks (72h standard / 24h expedited).
- **HITL moment:** reviewer worksheet with met/unmet criteria (ASAM, level-of-care), agent recommendation, and Approve / Issue-adverse-determination buttons — the audience acts as the licensed reviewer and the flow branches on their choice. AI never auto-denies (stated on-page).
- **Determinations:** formal approval notice (auth number, units, validity, concurrent-review notes) and a plain-language Notice of Adverse Benefit Determination (criteria cited, missing documentation, appeal rights, peer-to-peer line).
- **Manual (traditional) mode:** a "Manual (today) / AI-enabled (future)" toggle on the picker and in the run view (`?mode=manual`). Each case also has a linear manual walkthrough over the slide-13 current-state swimlane — fax intake, hand keying, nurse review queues, additional-information requests with clock extensions, peer-to-peer phone tag, mailed letters — with elapsed-time facts for contrast (day 6 vs 3m42s; hour 23 of 24; denial on day 7 with a vague template letter vs the AI's plain-language notice).
- Files: `frontend/src/lib/priorAuthDemo.ts` (cases), `frontend/src/pages/prior/Simulate.tsx`, `frontend/src/pages/prior/Layout.tsx` (shared header + tabs).

## Phase 2 — Post-care AI operations (`/prior/post-care`)

The two right-most future-state capabilities as small mock dashboards:

- **Discharge readiness:** table of admitted members with predicted discharge dates and suggested post-acute placements.
- **Bill-code cross-check:** claims lines vs. physician documentation with flagged discrepancies.

## Phase 3 — Risk-to-governance tie-in (`/prior/governance`)

Slide 15 as an interactive chain: Platform capabilities → CPRM risk register (R-AI-8/9/12, R-DP-1, R-SC-1) → 36 controls (GOVERN/MAP/MEASURE/MANAGE/AI-SEC) → evidence pack → BCBS governance decision → continuous improvement. Cross-link to the existing governance portal demos (fairness, output integrity) where relevant.

## Phase 4 — Polish (optional)

- Landing nav within `/prior` (tab bar or cards linking the sub-pages).
- PNG export of the diagrams (`html-to-image` is already a dependency; the governance Workflow page has a pattern to reuse).
- Present/Future toggle or slider view on the home page as an alternative to stacked cards.

---

## Conventions

- All demo code stays under `frontend/src/pages/prior/` + `frontend/src/lib/priorAuth*.ts`.
- BHUC design system: teal accent, amber = pending, red reserved for risk/denial; `font-display` serif titles.
- Everything is client-side and deterministic — no `services/` calls, safe to demo offline.

## Decisions (reviewed 2026-09-01)

1. **Entry point:** RolePicker home page card → ✅ added ("Prior Authorization Demo").
2. **Walkthrough style:** stepper with optional auto-play → ✅ implemented.
3. **Scope order:** Phase 1 → 2 → 3.
4. **Independence:** `/prior` is fully independent of the clinician `PriorAuthDemo` page — built to market standards (X12 278 intake, TAT clocks, level-of-care criteria, clinician-only adverse determinations, formal notices).

## Presentation source

- `prior-auth-slides.md` (added 2026-09-02) — slide-by-slide markdown of the prior-auth demo deck (EPM 5.5 → current/future flows → 3-case before/after → risks → risk-to-control mapping), written for later conversion to PPT.
