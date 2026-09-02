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

## Phase 1 — Interactive future-state simulation (`/prior/simulate`)

Bring slide 14 to life: watch a case travel through the AI-enabled flow.

- **Case picker:** 3 mock cases — (a) clean rule-match → auto-approved, (b) complex → HITL → clinician approves, (c) likely-to-deny → HITL → denied.
- **Animated walkthrough:** reuse `Swimlane` with an `activeNodeId` highlight; Next/Back stepper (or auto-play) advances the case node-by-node along its path.
- **Narration panel:** beside the diagram, a step card explaining what the AI agent did at that node (codes read, policy matched, confidence, why flagged for HITL).
- **HITL moment:** for cases (b)/(c), a clinician-review card (approve/deny buttons) so the audience sees the human decision point.
- **Denial letter:** for case (c), show the AI-drafted plain-language denial letter citing exact clinical criteria and missing requirements (mock content).
- Mock data in `frontend/src/lib/priorAuthDemo.ts`.

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

## Open questions (for review)

1. **Entry point:** should `/prior` stay a hidden URL, or get a card on the RolePicker home page? *(Options: hidden URL / RolePicker card / link from governance portal)*
2. **Phase 1 walkthrough style:** manual stepper, auto-play with pause, or both? *(Recommend: stepper with an optional auto-play button)*
3. **Scope order:** proceed Phase 1 → 2 → 3, or is Phase 3 (governance chain) higher priority for the audience?
4. **Existing `PriorAuthDemo` clinician page:** reuse any of its content/components in Phase 1, or keep `/prior` fully independent? *(Recommend: independent; it's a different narrative)*
