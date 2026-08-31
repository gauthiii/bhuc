// ─────────────────────────────────────────────────────────────────────────────────────────
// Fairness-monitoring fixture for the prior-authorization screen.
//
// The question this answers is not "who got approved" but "who got a packet raised for them
// at all". For every patient who was clinically ELIGIBLE for a prior authorization, did a
// packet actually get SUBMITTED? A gap between those two numbers, concentrated in one
// demographic group, is a process problem that never reaches the payer to be appealed.
//
// Parity is the disparate-impact ratio — the lowest group's submission rate divided by the
// highest group's — and 80% is the four-fifths rule used in US adverse-impact analysis.
//
// Every dimension partitions the SAME cohort, so all four must total the same eligible and
// submitted counts. `assertCohortConsistent` below enforces that.
// ─────────────────────────────────────────────────────────────────────────────────────────

export interface FairnessGroupRow { group: string; eligible: number; submitted: number }
export interface FairnessDimension {
  id: string
  title: string
  help: string
  groups: FairnessGroupRow[]
}

export const PARITY_THRESHOLD = 80        // four-fifths rule

export const FAIRNESS_DIMENSIONS: FairnessDimension[] = [
  {
    id: 'age',
    title: 'By age band',
    help: 'Age parity compares how often an eligible patient in each age band actually has a prior authorization submitted for them. A low figure means one age group’s requests are being dropped, delayed, or never raised at all — commonly older patients whose substance use goes under-recognised, or young adults who disengage between assessment and submission. Age is not a protected class under the four-fifths rule in every context, but a persistent gap still points at a process problem worth tracing: start by checking whether one band is concentrated at sites with fewer authorisation staff.',
    groups: [
      { group: '18–25', eligible: 22, submitted: 16 },
      { group: '26–40', eligible: 48, submitted: 38 },
      { group: '41–55', eligible: 34, submitted: 27 },
      { group: '56+', eligible: 23, submitted: 17 },
    ],
  },
  {
    id: 'gender',
    title: 'By gender',
    help: 'Gender parity compares submission rates across recorded gender. A gap here usually reflects referral and documentation patterns upstream rather than the authorisation step itself — for example women being screened into mental-health pathways and men into substance-use pathways for similar presentations, or non-binary patients falling out of a workflow that assumes a binary field. Group sizes are small on this axis, so a single patient moves the number several points: always read the parity figure next to the eligible counts before acting on it.',
    groups: [
      { group: 'Female', eligible: 61, submitted: 46 },
      { group: 'Male', eligible: 62, submitted: 49 },
      { group: 'Non-binary', eligible: 4, submitted: 3 },
    ],
  },
  {
    id: 'race',
    title: 'By race',
    help: 'Race parity compares submission rates across recorded race, and this is the axis regulators scrutinise most closely. A sustained figure below 80% is the classic adverse-impact signal: eligible patients of one race are having authorisations raised for them less often than the best-served group. Treat it as a prompt to investigate, not as proof of discrimination — check whether the gap survives controlling for site, payer, and requested level of care, and whether the smaller groups are large enough for the ratio to mean anything.',
    groups: [
      { group: 'White', eligible: 62, submitted: 51 },
      { group: 'Black or African American', eligible: 41, submitted: 28 },
      { group: 'Asian', eligible: 11, submitted: 9 },
      { group: 'American Indian or Alaska Native', eligible: 4, submitted: 3 },
      { group: 'Two or more races', eligible: 9, submitted: 7 },
    ],
  },
  {
    id: 'ethnicity',
    title: 'By ethnicity',
    help: 'Ethnicity parity compares submission rates for Hispanic or Latino patients against the other ethnicity groups. Gaps on this axis frequently track language access rather than clinical judgement: where consent, screening, and the prior-authorization conversation only happen fluently in English, eligible patients drop out before a packet is ever drafted. Check interpreter availability at the point of assessment, and whether the 42 CFR Part 2 consent form is offered in the patient’s own language — without that consent the SUD sections cannot be sent, so the packet stalls.',
    groups: [
      { group: 'Hispanic or Latino', eligible: 31, submitted: 18 },
      { group: 'Not Hispanic or Latino', eligible: 87, submitted: 73 },
      { group: 'Unknown / declined', eligible: 9, submitted: 7 },
    ],
  },
]

// ── Help text for the metrics themselves ─────────────────────────────────────────────────
export const FAIRNESS_HELP = {
  parity:
    'Parity here is the disparate-impact ratio: the lowest group’s submission rate divided by the highest group’s, as a percentage. 100% means every group’s eligible patients get a packet submitted at the same rate. 80% is the four-fifths rule, the threshold used in US adverse-impact analysis — below it, the difference is treated as a signal of disparate impact that has to be investigated, not as a finding of discrimination on its own. Because it compares only the two extremes, one small group can move the number sharply, so read it together with the eligible counts.',
  overall:
    'The overall figure is the lowest parity across all four demographic axes, not an average. Averaging would let a strong result on one axis mask a failing one, which is exactly the case this monitoring exists to catch. The percentage next to it is the plain submission rate across the whole cohort, which tells you how much room there is to improve in absolute terms.',
  eligible:
    'Eligible candidates are the patients who met the clinical criteria for the level of care in question and had a documented diagnosis on a signed note — everyone for whom a prior authorization could legitimately have been raised. This is the denominator, and getting it wrong is the most common way a fairness metric misleads: too broad and every group looks under-served, too narrow and a real gap disappears.',
  submitted:
    'Submitted packets are the eligible patients for whom a prior-auth packet was actually completed and sent to the payer. Drafts that were started but never submitted deliberately do not count, because an unsubmitted draft delivers nothing to the patient and cannot be appealed.',
  rate:
    'The submission rate is submitted ÷ eligible for that group — the share of patients who could have had a prior authorization raised for them and actually did. Parity compares these rates across groups; the rate itself tells you the absolute level, which can be poor even when parity is perfect.',
}

// ── Derived metrics ──────────────────────────────────────────────────────────────────────
export const rateOf = (g: FairnessGroupRow): number => (g.eligible ? (g.submitted / g.eligible) * 100 : 0)

export interface Parity { parity: number; lowest: FairnessGroupRow; highest: FairnessGroupRow }

/** Disparate-impact ratio for one dimension: lowest group rate ÷ highest group rate. */
export function parityOf(groups: FairnessGroupRow[]): Parity {
  const sorted = [...groups].sort((a, b) => rateOf(a) - rateOf(b))
  const lowest = sorted[0]
  const highest = sorted[sorted.length - 1]
  const hi = rateOf(highest)
  return { parity: hi ? Math.round((rateOf(lowest) / hi) * 100) : 100, lowest, highest }
}

export interface FairnessSummary {
  eligible: number
  submitted: number
  overallRate: number            // submitted ÷ eligible across the whole cohort
  overallParity: number          // the lowest parity across all dimensions
  worst: FairnessDimension
  perDimension: { dim: FairnessDimension; parity: Parity }[]
}

export function fairnessSummary(dims: FairnessDimension[] = FAIRNESS_DIMENSIONS): FairnessSummary {
  const perDimension = dims.map((dim) => ({ dim, parity: parityOf(dim.groups) }))
  const first = dims[0].groups
  const eligible = first.reduce((n, g) => n + g.eligible, 0)
  const submitted = first.reduce((n, g) => n + g.submitted, 0)
  const worstEntry = perDimension.reduce((a, b) => (b.parity.parity < a.parity.parity ? b : a))
  return {
    eligible,
    submitted,
    overallRate: eligible ? (submitted / eligible) * 100 : 0,
    overallParity: worstEntry.parity.parity,
    worst: worstEntry.dim,
    perDimension,
  }
}

/** Every dimension partitions the same cohort, so the totals must agree. Returns the
 *  dimensions whose totals disagree with the first dimension's — empty when consistent. */
export function cohortInconsistencies(dims: FairnessDimension[] = FAIRNESS_DIMENSIONS): string[] {
  const total = (gs: FairnessGroupRow[]) => [
    gs.reduce((n, g) => n + g.eligible, 0),
    gs.reduce((n, g) => n + g.submitted, 0),
  ]
  const [e0, s0] = total(dims[0].groups)
  return dims
    .filter((d) => { const [e, s] = total(d.groups); return e !== e0 || s !== s0 })
    .map((d) => d.id)
}
