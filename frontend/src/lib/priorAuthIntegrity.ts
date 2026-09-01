// ─────────────────────────────────────────────────────────────────────────────────────────
// Output integrity for a drafted prior-authorization packet.
//
// Same control as the grounding check on /governance/agents: every substantive claim in the
// generated output is scored against the source it should have come from — the payer policy
// library, the patient's scored screenings, the signed clinical notes, the eligibility and
// consent records — and anything with no supporting passage is flagged.
//
// Two results are available per packet. `verified` is the packet as drafted. `flagged` is a
// worked example of the failure this control exists to catch: an output that reads perfectly
// well but cites a payer policy section that does not exist. Both are computed here, never
// fetched, so the panel works with no backend.
// ─────────────────────────────────────────────────────────────────────────────────────────

import type { DemoPacket } from './priorAuthDemoData'

export type IntegrityMode = 'verified' | 'flagged'

export interface IntegrityClaim {
  text: string
  score: number          // 0–100 support for this individual claim
  source: string         // supporting passage, or '' when nothing was found
}

export interface IntegrityResult {
  mode: IntegrityMode
  score: number          // 0–100 output integrity
  hallucinationRisk: number
  threshold: number      // pass bar for the overall score
  claimFloor: number     // a claim below this is flagged
  verdict: 'verified' | 'flagged'
  claims: IntegrityClaim[]
  claimCount: number
  flaggedCount: number
  sources: string        // the corpus the output was checked against
  reason: string
  algorithm: string
}

export const INTEGRITY_THRESHOLD = 85
export const CLAIM_FLOOR = 60

const ALGORITHM =
  'Claim extraction over the generated packet, then per-claim semantic match against the payer policy library, the patient’s scored screenings, signed clinical notes, and the eligibility and consent records. Output integrity is the mean per-claim support.'

const val = (p: DemoPacket, id: string): string =>
  p.sections.flatMap((s) => s.fields).find((f) => f.id === id)?.value ?? ''

const short = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s)

// ── The packet as drafted ────────────────────────────────────────────────────────────────
// Per-claim support is not uniform across levels of care, because the evidence behind a claim
// genuinely differs. A residential request leans on ASAM Dimension 6, which comes from a
// clinical assessment rather than a scored instrument; a MAT request pairs H0033 with a drug-
// rehabilitation revenue code, which is a looser match than IOP's H0015/0906; an outpatient
// request has no prior professional treatment episode to point at. Those differences are what
// make one packet score higher than another.
type ClaimId = 'pa' | 'criteria' | 'loc' | 'coding' | 'revenue' | 'screenings' | 'asam'
  | 'prior' | 'risk' | 'auth' | 'discharge' | 'eligibility' | 'provider' | 'consent'

const BASE_SUPPORT: Record<ClaimId, number> = {
  pa: 96, criteria: 93, loc: 95, coding: 92, revenue: 87, screenings: 98, asam: 89,
  prior: 88, risk: 92, auth: 84, discharge: 82, eligibility: 99, provider: 91, consent: 96,
}

interface Override { score: number; note?: string }

const SUPPORT_BY_LOC: Record<string, Partial<Record<ClaimId, Override>>> = {
  outpatient: {
    prior: { score: 72, note: 'Weak: the prior episode on record is community peer-support attendance, not a professional treatment episode, so the failure-of-lower-care argument rests on self-report' },
    asam: { score: 87 },
    discharge: { score: 86 },
  },
  iop: {},
  php: {
    prior: { score: 93, note: 'Strong: the prior IOP episode is recorded with dates and a session-attendance count (5 of 15)' },
    asam: { score: 91 },
    discharge: { score: 86 },
    auth: { score: 88 },
  },
  residential: {
    prior: { score: 91 },
    asam: { score: 81, note: 'Partial: Dimension 6 rests on a clinical assessment of the recovery environment, which no scored instrument covers' },
    discharge: { score: 76, note: 'Partial: discharge depends on identifying safe post-discharge housing, which is not yet documented' },
    auth: { score: 79 },
    revenue: { score: 83 },
  },
  mat: {
    revenue: { score: 74, note: 'Weak: H0033 is paired with revenue code 0944 (drug rehabilitation), a looser match than the level-of-care-specific codes' },
    coding: { score: 96 },
    asam: { score: 85 },
    discharge: { score: 88 },
    auth: { score: 90 },
  },
}

/** Level-of-care key, read back off the packet's own Level of Care field. */
function locKey(p: DemoPacket): string {
  const loc = val(p, 'level_of_care')
  if (loc.includes('2.1')) return 'iop'
  if (loc.includes('2.5')) return 'php'
  if (loc.includes('3.5')) return 'residential'
  if (loc.includes('OTP') || loc.includes('MAT')) return 'mat'
  return 'outpatient'
}

function verifiedClaims(p: DemoPacket): IntegrityClaim[] {
  const policy = `${val(p, 'policy_id')} ${val(p, 'policy_section')}`.trim()
  const over = SUPPORT_BY_LOC[locKey(p)] ?? {}
  const sc = (id: ClaimId) => over[id]?.score ?? BASE_SUPPORT[id]
  const src = (id: ClaimId, fallback: string) => over[id]?.note ?? fallback

  const claims: IntegrityClaim[] = [
    { text: `Prior-authorization requirement: ${short(val(p, 'pa_required'), 70)}`, score: sc('pa'),
      source: src('pa', `Payer policy library — ${policy}`) },
    { text: 'Medical-necessity criteria as stated for this service', score: sc('criteria'),
      source: src('criteria', `${policy}: “${short(val(p, 'criteria_summary'), 70)}”`) },
    { text: `Level of care requested: ${val(p, 'level_of_care')}`, score: sc('loc'),
      source: src('loc', `${policy} names this level and its Dimension criteria`) },
    { text: `Procedure coding: ${short(val(p, 'cpt_hcpcs'), 60)}`, score: sc('coding'),
      source: src('coding', 'HCPCS Level II descriptor for the requested level of care') },
    { text: `Revenue code ${short(val(p, 'revenue_code'), 45)}`, score: sc('revenue'),
      source: src('revenue', 'UB-04 revenue code set, matched to the place of service') },
    { text: 'Screening scores cited in the justification (PHQ-9 16, GAD-7 12, AUDIT 18, DAST-10 7, C-SSRS 1)', score: sc('screenings'),
      source: src('screenings', 'Scored screening records BHUC_SCREENING_104 to BHUC_SCREENING_109') },
    { text: 'ASAM Dimension 1–6 findings', score: sc('asam'),
      source: src('asam', 'Dimension statements traced to the scored screenings and the signed note') },
    { text: 'Documented course and outcome of prior treatment, with dates', score: sc('prior'),
      source: src('prior', `Signed clinical notes BHUC_CARE_PLAN_298 and BHUC_CARE_PLAN_311: “${short(val(p, 'prior_treatment'), 60)}”`) },
    { text: 'Suicide-risk assessment and safety plan', score: sc('risk'),
      source: src('risk', 'C-SSRS record BHUC_SCREENING_108 and the safety plan dated 2026-08-24') },
    { text: `Authorization period ${val(p, 'auth_period')}`, score: sc('auth'),
      source: src('auth', `Derived from the requested units “${val(p, 'units')}” and the requested start date`) },
    { text: 'Discharge criteria for the requested level of care', score: sc('discharge'),
      source: src('discharge', 'Level-of-care definition; the cited policy requires stated discharge criteria') },
    { text: 'Member eligibility active on the date of request', score: sc('eligibility'),
      source: src('eligibility', 'Eligibility verification BHUC_ELIGIBILITY_077') },
    { text: 'Provider and facility identifiers (NPI, TIN, taxonomy)', score: sc('provider'),
      source: src('provider', 'NPPES registry entry and the payer contract record') },
  ]
  if (p.part2Gated) {
    claims.push({
      text: '42 CFR Part 2 consent authorising disclosure to the payer',
      score: sc('consent'),
      source: src('consent', 'Consent record BHUC_CONSENT_219, signed 2026-08-24, expires 2027-08-24'),
    })
  }
  return claims
}

// ── A worked example of the failure this control catches ─────────────────────────────────
// The scores are chosen so the result lands on 42: grounded administrative claims pull it up,
// fabricated policy and guarantee claims pull it down.
function flaggedClaims(p: DemoPacket): IntegrityClaim[] {
  return [
    { text: 'Blue Shield policy § 9.7 waives prior authorization for all behavioral health levels of care.', score: 8, source: '' },
    { text: 'Approval is guaranteed within 24 hours under the payer’s behavioral health fast-track rule.', score: 5, source: '' },
    { text: 'ASAM Level 2.3 criteria are met for this request.', score: 11, source: '' },
    { text: 'The member’s plan carries no deductible for residential or partial hospitalization services.', score: 14, source: '' },
    { text: 'The packet is auto-approved once the screening battery is attached, with no clinical review.', score: 6, source: '' },
    { text: 'The member has met 14 of the 20 outpatient visits allowed this plan year.', score: 51,
      source: 'Partially supported: a visit count exists on the eligibility record, but not this figure' },
    { text: `Level of care requested: ${val(p, 'level_of_care')}`, score: 94,
      source: 'Payer policy library names this level and its Dimension criteria' },
    { text: `Procedure coding: ${short(val(p, 'cpt_hcpcs'), 60)}`, score: 92,
      source: 'HCPCS Level II descriptor for the requested level of care' },
    { text: 'Member eligibility active on the date of request', score: 97,
      source: 'Eligibility verification BHUC_ELIGIBILITY_077' },
  ]
}

function assemble(mode: IntegrityMode, claims: IntegrityClaim[], p: DemoPacket): IntegrityResult {
  const score = Math.round(claims.reduce((n, c) => n + c.score, 0) / claims.length)
  const flagged = claims.filter((c) => c.score < CLAIM_FLOOR)
  const policy = `${val(p, 'policy_id')} ${val(p, 'policy_section')}`.trim()
  const reason = mode === 'verified'
    ? `Every substantive claim in this packet traces to a source. The coverage answer and its criteria resolve to ${policy || 'the cited payer policy'} in the payer policy library; the ASAM Dimension findings and severity statements resolve to the patient’s scored screenings; the level-of-care coding follows from the service requested; and the prior-treatment history resolves to signed clinical notes with matching dates. No statement was found that lacks a supporting passage. The packet is safe to review and sign — the clinician still attests to its accuracy.`
    : `${flagged.length} of ${claims.length} claims could not be traced to any source. The packet asserts a payer policy section (§ 9.7) that does not exist in the policy library, guarantees a 24-hour approval the payer has never published, and cites an ASAM level (2.3) that is not part of the ASAM criteria. A fabricated citation is the most dangerous failure mode here, because it reads as authoritative and a reviewer who trusts it will not go and check. Do not sign this packet — regenerate it and re-run the check.`
  return {
    mode,
    score,
    hallucinationRisk: 100 - score,
    threshold: INTEGRITY_THRESHOLD,
    claimFloor: CLAIM_FLOOR,
    verdict: score >= INTEGRITY_THRESHOLD ? 'verified' : 'flagged',
    claims,
    claimCount: claims.length,
    flaggedCount: flagged.length,
    sources: `Payer policy library${policy ? ` · ${policy}` : ''} · scored screenings · signed clinical notes`,
    reason,
    algorithm: ALGORITHM,
  }
}

export function integrityFor(packet: DemoPacket, mode: IntegrityMode): IntegrityResult {
  return assemble(mode, mode === 'verified' ? verifiedClaims(packet) : flaggedClaims(packet), packet)
}

// ── Help text for the panel's tooltips ───────────────────────────────────────────────────
export const INTEGRITY_HELP = {
  score:
    'Output integrity is the mean per-claim support across every substantive statement in the drafted packet. Each claim is matched against the source it should have come from — the payer policy library, the patient’s scored screenings, the signed clinical notes, the eligibility and consent records — and scored on how well a supporting passage backs it. 85% is the pass bar for a packet that is going to a payer; below that, something in the document is asserted without a source behind it.',
  risk:
    'Hallucination risk is the inverse of output integrity: the share of the packet’s content that no source supports. It is not a probability that the packet is wrong, but a measure of how much of it a reviewer would have to verify by hand before signing.',
  claims:
    'Each claim is one checkable statement pulled out of the packet. The percentage is how strongly a source supports it, and the line beneath shows the passage that was matched. A claim below 60% is flagged; a claim with no passage at all is the signature of fabricated content, and matters far more than a merely low score.',
}
