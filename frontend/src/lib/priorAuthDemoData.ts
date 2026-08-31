// ─────────────────────────────────────────────────────────────────────────────────────────
// MOCK DATA for the /clinician/prior-auth2 demo page. Nothing here touches ServiceNow, the
// backend, or any agent — every value is fictional and hardcoded. The real, agent-driven
// page lives at /clinician/prior-auth/:patientId and is unaffected by this file.
//
// This module builds the CORRECTED prior-auth document, which differs from the live one by:
//   1. an Attestation & Signature block inside the document (signer, credentials, license,
//      NPI, typed signature, date signed)
//   2. full provider + servicing-facility identifiers (NPI, TIN, taxonomy, fax, peer-to-peer)
//   3. the 42 CFR §2.32 Notice Prohibiting Redisclosure whenever SUD content is disclosed
//   4. a Date of Request frozen at draft time (never recomputed at render)
//   5. "Policy Criteria Referenced" instead of "Coverage Determination" (the payer, not the
//      requester, determines coverage — that stays in Payer Use Only)
//   6. a Clinical History section (current medications, allergies, prior level-of-care)
// plus member group #/address/subscriber relationship, place of service, revenue code, and a
// payer submission header.
//
// The clinical narrative is written PER LEVEL OF CARE, so the packet stays internally
// consistent whichever service is requested: the prior-treatment history documents failure of
// the level directly below, the "why not lower / higher" rationale names the adjacent levels,
// and ASAM Dimension 6 matches. The primary diagnosis list is SUD-only by design, so every
// packet this page drafts is genuinely 42 CFR Part 2 gated.
// ─────────────────────────────────────────────────────────────────────────────────────────

// A document field. `sensitive` marks 42 CFR Part 2 (SUD-revealing) content: the renderer
// black-bars it when the packet is Part 2-gated and the viewer lacks access. Redaction is
// applied at RENDER time from this flag, so toggling access never rebuilds (or re-dates) the
// packet.
export interface DemoField {
  id: string
  label: string
  value: string
  editable: boolean
  multiline?: boolean
  sensitive?: boolean
  hint?: string
}
export interface DemoSection { id: string; title: string; fields: DemoField[] }
export interface DemoPacket {
  id: string
  service: string
  status: 'draft' | 'submitted'
  part2Gated: boolean
  draftedByAgent: boolean
  dateOfRequest: string        // frozen at draft time — correction #4
  sections: DemoSection[]
  attachments: string[]
}
export interface DemoForm {
  service: string
  payer: string
  primaryDx: string
  secondaryDx: string[]
  requestedUnits: string
}

// ── Fictional identities (format-valid, clearly not real people) ─────────────────────────
export const DEMO_MEMBER = {
  name: 'Jordan A. Rivera',
  memberId: 'BS-MOCK-4471928',
  group: 'GRP-778120',
  dob: '1991-03-14',
  mrn: 'MRN-DEMO-0042',
  address: '88 Cypress Lane, Apt 4B, Austin, TX 78745',
  phone: '(512) 555-0142',
  relationship: 'Self (subscriber)',
}

// The NPIs below carry valid Luhn check digits over the 80840 prefix but are reserved test
// values — they identify no real provider or facility.
export const DEMO_PROVIDER = {
  name: 'Dana M. Okafor, MD',
  credentials: 'MD · Board-certified, Addiction Psychiatry',
  npi: '1234567893',
  tin: '99-0000123',
  taxonomy: '2084P0800X — Psychiatry & Neurology / Psychiatry',
  license: 'TX-MD-DEMO-55219',
  practice: 'Behavioral Health Urgent Care — Outpatient Behavioral Health',
  address: '1420 Riverside Drive, Suite 200, Austin, TX 78704',
  phone: '(512) 555-0100',
  fax: '(512) 555-0101',
  p2pContact: 'Priya N. Raghavan, LCSW — Utilization Review',
  p2pPhone: '(512) 555-0118, Mon–Fri 8:00 AM – 5:00 PM CT',
}

export const DEMO_FACILITY = {
  name: 'Behavioral Health Urgent Care',
  npi: '1945263188',
  tin: '99-0000456',
  address: '1420 Riverside Drive, Suite 200, Austin, TX 78704',
}

export const DEMO_PAYER = {
  name: 'Blue Shield',
  paFax: '(800) 555-0177',
  paPhone: '(800) 555-0166',
  formId: 'BH-PA-2026 · Behavioral Health Prior Authorization Request',
  portal: 'provider.blueshield-demo.example',
}

// Primary diagnosis options are SUD codes only: this demo exists to show the 42 CFR Part 2
// handling, and a non-SUD primary would make the Part 2 sections and the redisclosure notice
// inapplicable.
export const DEMO_PRIMARY_DX_OPTIONS = [
  { code: 'F11.20', label: 'Opioid use disorder, moderate to severe, uncomplicated' },
  { code: 'F10.20', label: 'Alcohol use disorder, moderate' },
]
// Co-occurring conditions, selectable as secondary.
export const DEMO_SECONDARY_DX_OPTIONS = [
  { code: 'F11.20', label: 'Opioid use disorder, moderate to severe, uncomplicated' },
  { code: 'F10.20', label: 'Alcohol use disorder, moderate' },
  { code: 'F32.1', label: 'Major depressive disorder, single episode, moderate' },
  { code: 'F41.1', label: 'Generalized anxiety disorder' },
  { code: 'G47.00', label: 'Insomnia, unspecified' },
]
const ALL_DX = [...DEMO_SECONDARY_DX_OPTIONS]
function dxLabel(code: string): string {
  const o = ALL_DX.find((x) => x.code === code)
  return o ? `${o.code} — ${o.label}` : code
}

export const DEMO_PAYER_OPTIONS = ['Blue Shield', 'Aetna', 'UnitedHealthcare', 'Cigna', 'Texas Medicaid (STAR)']
export const DEMO_SERVICE_OPTIONS = [
  'Intensive Outpatient (IOP)',
  'Partial Hospitalization (PHP)',
  'Clinically Managed Residential',
  'Medication-Assisted Treatment (MAT)',
  'Standard Outpatient',
]

// Mock screening results — the source for the ASAM summary and the attachment list.
const BANDS = {
  audit: { score: '18', band: 'moderate' },
  dast10: { score: '7', band: 'substantial' },
  phq9: { score: '16', band: 'moderately severe' },
  gad7: { score: '12', band: 'moderate' },
  cssrs: { score: '1', band: 'low risk' },
  socrates: { score: '31', band: 'high readiness' },
}

export const DEMO_ATTACHMENTS = [
  'AUDIT screening (SCR-DEMO-0104) — 18, moderate',
  'DAST-10 screening (SCR-DEMO-0105) — 7, substantial',
  'PHQ-9 screening (SCR-DEMO-0106) — 16, moderately severe',
  'GAD-7 screening (SCR-DEMO-0107) — 12, moderate',
  'C-SSRS screening (SCR-DEMO-0108) — low risk',
  'SOCRATES-8 screening (SCR-DEMO-0109) — high readiness',
  'Clinical note CN-DEMO-0311 — signed 2026-08-24',
  'Clinical note CN-DEMO-0298 — signed 2026-08-11',
  'Eligibility verification ELG-DEMO-0077 — active',
]

// ── Per level-of-care bundle: coding, policy, and the clinical narrative that has to agree
//    with the requested level (prior history, why-not-lower/higher, ASAM Dimension 6). ─────
interface LocBundle {
  cpt: string; rev: string; loc: string; pos: string
  frequency: string; modalities: string; discharge: string
  priorTreatment: string
  whyNotLower: string
  whyNotHigher: string
  d6: string
  policyId: string; policySection: string; paRequired: string; criteria: string
}

const WM_EPISODE =
  '2025-11-03 to 2025-11-17 — Medically monitored withdrawal management (ASAM 3.7-WM), completed. Outcome: discharged stable, declined step-down at the time.'

const LOC: Record<string, LocBundle> = {
  outpatient: {
    cpt: 'H0004 — Behavioral health counseling and therapy, per 15 min',
    rev: '0900 — Behavioral health treatment services',
    loc: 'ASAM 1.0 — Outpatient',
    pos: '11 — Office',
    frequency: '1 session/week, 60 minutes',
    modalities: 'Weekly individual psychotherapy (CBT and relapse-prevention focus) with medication management as indicated and optional weekly recovery-support group.',
    discharge: 'Achievement of the stated treatment goals with 90 consecutive days of stable functioning and no return to use; transition to maintenance or as-needed follow-up.',
    priorTreatment: [
      '2026-05-01 to 2026-08-10 — Community peer-support attendance only, weekly; no professional treatment episode. Outcome: two returns to use.',
      WM_EPISODE,
      'No prior IOP, PHP, or residential treatment episodes.',
    ].join('\n'),
    whyNotLower: 'There is no clinically managed level of care below this one. Early intervention (ASAM 0.5) is not appropriate given an established moderate-to-severe use disorder, and self-directed peer support alone has already been tried: the patient attended weekly community groups from 2026-05-01 with two returns to use and no professional treatment in that period.',
    whyNotHigher: 'Intensive outpatient (ASAM 2.1) and above are not required: the patient is medically stable, has a supportive recovery environment, is highly motivated (SOCRATES-8 31), and has never received a structured treatment episode. Beginning at the least restrictive effective level is clinically and contractually appropriate, with a documented step-up plan if goals are not met by week 6.',
    d6: 'D6 Recovery Environment: supportive — stable housing with an engaged adult sibling, an active weekly peer-support group, and no household substance use.',
    policyId: 'BSH-BH-002 (rev. 2026-01)',
    policySection: '§ 1.5 — Routine Outpatient Behavioral Health',
    paRequired: 'Conditional — not required for the first 20 visits per plan year; required from the 21st visit. This member has used 20 visits, so this request covers visits 21 onward.',
    criteria: 'Beyond the plan-year visit limit, approval requires all of: (a) a documented DSM-5 diagnosis; (b) an active treatment plan with measurable goals; (c) documented clinical benefit or a documented plan to change approach; and (d) discharge criteria stated.',
  },
  iop: {
    cpt: 'H0015 — Alcohol and/or drug services, intensive outpatient',
    rev: '0906 — Intensive outpatient services, chemical dependency',
    loc: 'ASAM 2.1 — Intensive Outpatient (IOP)',
    pos: '57 — Non-residential substance abuse treatment facility',
    frequency: '3 sessions/week, 3 hours each (9 hours/week)',
    modalities: 'Structured group therapy (9+ hours/week), weekly individual therapy, psychoeducation, relapse-prevention skills training, and medication management as clinically indicated.',
    discharge: 'Sustained symptom reduction and functional stability at a lower intensity; step-down to standard outpatient once ASAM Dimension criteria for Level 2.1 are no longer met, with an aftercare and relapse-prevention plan in place.',
    priorTreatment: [
      '2026-06-15 to 2026-08-10 — Standard outpatient (ASAM 1.0), weekly individual counseling, 8 of 9 scheduled sessions attended. Outcome: partial response, two returns to use during the episode.',
      WM_EPISODE,
      'No prior IOP, PHP, or residential treatment episodes.',
    ].join('\n'),
    whyNotLower: 'Standard outpatient (ASAM 1.0) is insufficient and has been tried: the patient completed 8 weeks of weekly individual counseling (2026-06-15 to 2026-08-10) with two documented returns to use during that episode. Symptom severity, continued-use potential (AUDIT 18, DAST-10 7), and the need for multiple structured contact hours per week cannot be addressed at that intensity.',
    whyNotHigher: 'Partial hospitalization (ASAM 2.5) and residential care are not indicated: the patient is medically stable with no acute intoxication or withdrawal requiring medical management (CIWA/COWS not elevated at intake on 2026-08-24), has stable housing with a supportive sibling, and presents no safety need for daily or 24-hour supervision.',
    d6: 'D6 Recovery Environment: partially supportive — stable housing with a supportive sibling, but ongoing contact with using peers from the prior workplace.',
    policyId: 'BSH-BH-014 (rev. 2026-01)',
    policySection: '§ 4.2 — Intensive Outpatient, Substance Use Disorder',
    paRequired: 'Yes — prior authorization required before the first date of service',
    criteria: 'Approval requires all of: (a) a documented DSM-5 substance use disorder; (b) ASAM Dimension criteria met for Level 2.1; (c) documented failure, or clinical contraindication, of standard outpatient care; (d) a measurable treatment plan with defined discharge criteria; and (e) medical stability without need for 24-hour monitoring.',
  },
  php: {
    cpt: 'H0035 — Mental health partial hospitalization, per diem',
    rev: '0913 — Partial hospitalization, psychiatric',
    loc: 'ASAM 2.5 — Partial Hospitalization (PHP)',
    pos: '52 — Psychiatric facility, partial hospitalization',
    frequency: '5 days/week, 6 hours/day (30 hours/week)',
    modalities: 'Full-day structured programming (20+ hours/week): daily group and individual therapy, daily psychiatric medication management, nursing assessment, and coordinated ancillary services.',
    discharge: 'Stabilization sufficient for a lower level of care; step-down to IOP when daily psychiatric oversight and structured daytime programming are no longer clinically required.',
    priorTreatment: [
      '2026-07-06 to 2026-08-10 — Intensive outpatient (ASAM 2.1), 9 hours/week, 5 of 15 scheduled sessions attended. Outcome: insufficient — continued use during the episode and inability to sustain attendance without daily structure.',
      '2026-04-20 to 2026-06-29 — Standard outpatient (ASAM 1.0), weekly individual counseling. Outcome: partial response.',
      WM_EPISODE,
    ].join('\n'),
    whyNotLower: 'Intensive outpatient (ASAM 2.1) is insufficient and has been tried within the prior 30 days: the patient attended only 5 of 15 scheduled IOP sessions between 2026-07-06 and 2026-08-10 and continued to use during the episode. Standard outpatient before it (2026-04-20 to 2026-06-29) produced only a partial response. Daily structure and daily psychiatric oversight are required.',
    whyNotHigher: 'Residential treatment (ASAM 3.5) is not indicated: the patient is medically stable, has safe overnight housing with a supportive sibling, and has no acute withdrawal or safety need requiring 24-hour supervision. Daytime structure with a return home each evening is the least restrictive effective option.',
    d6: 'D6 Recovery Environment: partially supportive — safe overnight housing with a supportive sibling, but no daytime structure since job loss in 2026-07 and continued contact with using peers.',
    policyId: 'BSH-BH-016 (rev. 2026-01)',
    policySection: '§ 3.1 — Partial Hospitalization, Behavioral Health',
    paRequired: 'Yes — prior authorization required, with concurrent review every 7 days',
    criteria: 'Approval requires all of: (a) ASAM Level 2.5 Dimension criteria met; (b) a documented need for daily psychiatric oversight; (c) documented insufficiency of IOP-level care within the prior 30 days; (d) safe overnight housing; and (e) a measurable treatment plan with step-down criteria.',
  },
  residential: {
    cpt: 'H0018 — Behavioral health short-term residential, per diem',
    rev: '1002 — Residential treatment, psychiatric',
    loc: 'ASAM 3.5 — Clinically Managed High-Intensity Residential',
    pos: '55 — Residential substance abuse treatment facility',
    frequency: '24-hour residential, per diem',
    modalities: '24-hour clinically managed residential treatment: daily individual and group therapy, medication management, nursing availability, and a structured therapeutic milieu.',
    discharge: 'Resolution of the Dimension 4–6 needs requiring 24-hour support and identification of safe post-discharge housing; transition to PHP or IOP with an established aftercare and relapse-prevention plan.',
    priorTreatment: [
      '2026-07-06 to 2026-08-10 — Partial hospitalization (ASAM 2.5), 30 hours/week, completed. Outcome: insufficient — three returns to use during the episode, each following an evening return home.',
      '2026-04-20 to 2026-06-29 — Intensive outpatient (ASAM 2.1). Outcome: partial response, not sustained.',
      WM_EPISODE,
    ].join('\n'),
    whyNotLower: 'Partial hospitalization (ASAM 2.5) is insufficient and has been tried: the patient completed a full PHP episode from 2026-07-06 to 2026-08-10 with three returns to use, each occurring after the evening return home. With the recovery environment itself driving the returns to use, no level of care that sends the patient home each night can succeed.',
    whyNotHigher: 'Medically monitored intensive inpatient (ASAM 3.7) is not indicated: there is no acute withdrawal requiring medical management (COWS 3 at assessment on 2026-08-24), no unstable biomedical condition, and no psychiatric acuity requiring hospital-level care. Clinically managed 24-hour support is sufficient.',
    d6: 'D6 Recovery Environment: unsafe — a household member is actively using, no sober housing is currently available, and three returns to use during the prior PHP episode each followed an evening return home.',
    policyId: 'BSH-BH-021 (rev. 2025-11)',
    policySection: '§ 6.4 — Clinically Managed Residential Treatment',
    paRequired: 'Yes — prior authorization required, with concurrent review every 5 days',
    criteria: 'Approval requires all of: (a) ASAM Level 3.5 criteria met across Dimensions 4–6; (b) a recovery environment assessed as unsafe or unsupportive; (c) documented insufficiency of PHP or IOP; and (d) no acute medical or psychiatric need requiring Level 3.7 or hospital care.',
  },
  mat: {
    cpt: 'H0033 — Oral medication administration, direct observation',
    rev: '0944 — Drug rehabilitation',
    loc: 'ASAM OTP / Office-Based Opioid Treatment (MAT)',
    pos: '11 — Office',
    frequency: 'Weekly induction and stabilization visits ×4, then monthly maintenance',
    modalities: 'Medication for opioid use disorder (buprenorphine/naloxone) with concurrent individual counseling, recovery support, and periodic toxicology monitoring.',
    discharge: 'Sustained remission with medication stability and no return to use for 12 months; maintenance continues per shared decision-making, with tapering only when clinically appropriate and patient-initiated.',
    priorTreatment: [
      '2026-06-15 to 2026-08-10 — Standard outpatient counseling (ASAM 1.0) without pharmacotherapy, weekly, 8 of 9 sessions attended. Outcome: two returns to use.',
      `${WM_EPISODE} No medication for opioid use disorder was continued at discharge.`,
      'Buprenorphine/naloxone induction begun 2026-08-12; this request covers continued treatment.',
    ].join('\n'),
    whyNotLower: 'Counselling alone has been tried and was insufficient: the patient completed 8 weeks of weekly outpatient counseling without pharmacotherapy (2026-06-15 to 2026-08-10) with two returns to use. Medication for opioid use disorder is the standard of care for moderate-to-severe OUD and is not clinically substitutable with psychosocial treatment alone.',
    whyNotHigher: 'Daily observed dosing at an opioid treatment program is not required: the patient has stable housing and reliable transport, no untreated sedative-hypnotic use or withdrawal risk requiring daily medical monitoring, and has demonstrated full adherence and negative confirmatory toxicology since induction on 2026-08-12. Office-based treatment with periodic monitoring is appropriate.',
    d6: 'D6 Recovery Environment: partially supportive — stable housing with a supportive sibling and reliable transport to office visits, with ongoing contact with using peers from the prior workplace.',
    policyId: 'BSH-PHARM-009 (rev. 2026-02)',
    policySection: '§ 2.3 — Medication for Opioid Use Disorder',
    paRequired: 'No — prior authorization is not required for buprenorphine/naloxone. This packet is submitted as the notification required within 5 business days and to authorize the concurrent counseling benefit.',
    criteria: 'Coverage requires a documented opioid use disorder diagnosis, a prescriber with appropriate DEA registration, and counseling offered concurrently. Quantity limits apply above 24 mg/day buprenorphine equivalent; this request is within limits.',
  },
}

const SERVICE_KEYWORDS: [string, keyof typeof LOC][] = [
  ['intensive outpatient', 'iop'], ['iop', 'iop'],
  ['partial hospital', 'php'], ['php', 'php'],
  ['residential', 'residential'], ['inpatient', 'residential'],
  ['medication-assisted', 'mat'], ['medication assisted', 'mat'], ['mat', 'mat'],
  ['buprenorphine', 'mat'], ['suboxone', 'mat'], ['methadone', 'mat'], ['naltrexone', 'mat'],
  ['outpatient', 'outpatient'],
]
function bundleFor(service: string): LocBundle {
  const s = service.toLowerCase()
  for (const [kw, key] of SERVICE_KEYWORDS) if (s.includes(kw)) return LOC[key]
  return LOC.outpatient
}

// ── SUD detection → Part 2 gating (mirrors the live agent's heuristic) ───────────────────
const SUD_TERMS = ['sud', 'opioid', 'alcohol', 'substance', 'mat', 'buprenorphine', 'methadone',
  'naltrexone', 'suboxone', 'detox', 'f10', 'f11', 'f12', 'f13', 'f14', 'f15', 'f16', 'f19']
export function looksSud(text: string): boolean {
  const t = ` ${text.toLowerCase()} `
  return SUD_TERMS.some((term) => t.includes(term))
}

// The 42 CFR §2.32 Notice Prohibiting Redisclosure — correction #3. Rendered only when Part 2
// content is actually disclosed.
export const REDISCLOSURE_NOTICE =
  'This information has been disclosed to you from records protected by federal confidentiality rules ' +
  '(42 CFR Part 2). The federal rules prohibit you from making any further disclosure of information in ' +
  'this record that identifies a patient as having or having had a substance use disorder either directly, ' +
  'by reference to publicly available information, or through verification of such identification by another ' +
  'person unless further disclosure is expressly permitted by the written consent of the individual whose ' +
  'information is being disclosed or as otherwise permitted by 42 CFR Part 2. A general authorization for the ' +
  'release of medical or other information is NOT sufficient for this purpose (see 42 CFR § 2.32). The federal ' +
  'rules restrict any use of the information to investigate or prosecute with regard to a crime any patient ' +
  'with a substance use disorder, except as provided at 42 CFR §§ 2.12(c)(5) and 2.65.'

// ── Derived text ─────────────────────────────────────────────────────────────────────────
function fmt(d: Date): string { return d.toISOString().slice(0, 10) }

function authWindow(units: string, start: Date): { end: string; period: string } {
  const m = /(\d+)\s*(day|week|month)/.exec(units.toLowerCase())
  const days = m ? Number(m[1]) * (m[2] === 'day' ? 1 : m[2] === 'week' ? 7 : 30) : 90
  const end = new Date(start.getTime() + days * 86400000)
  return { end: fmt(end), period: `${fmt(start)} to ${fmt(end)} (${days} days)` }
}

function asamSummary(b: LocBundle): string {
  return [
    `D1 Intoxication/Withdrawal: ${BANDS.dast10.band} substance use severity (DAST-10 ${BANDS.dast10.score}); COWS 3 and CIWA-Ar 4 at assessment on 2026-08-24 — no acute withdrawal requiring medical management.`,
    'D2 Biomedical Conditions: no unstable biomedical condition documented; vital signs within normal limits and hepatic panel unremarkable on 2026-08-24.',
    `D3 Emotional/Behavioral: mood ${BANDS.phq9.band} (PHQ-9 ${BANDS.phq9.score}), anxiety ${BANDS.gad7.band} (GAD-7 ${BANDS.gad7.score}), suicide risk ${BANDS.cssrs.band} (C-SSRS ${BANDS.cssrs.score}) with no plan, intent, or preparatory behavior.`,
    `D4 Readiness to Change: ${BANDS.socrates.band} (SOCRATES-8 ${BANDS.socrates.score}); patient is actively engaged in treatment planning and initiated this referral.`,
    `D5 Relapse/Continued-Use Potential: elevated — AUDIT ${BANDS.audit.score} (${BANDS.audit.band}) with documented returns to use during the most recent treatment episode.`,
    b.d6,
  ].join('\n')
}

// ── Packet builder ───────────────────────────────────────────────────────────────────────
let seq = 47

/** Build the corrected prior-auth document from the draft form. Every derived value —
 *  including the Date of Request — is computed ONCE here and stored on the packet, so it
 *  never drifts on re-render (correction #4). */
export function buildDemoPacket(form: DemoForm): DemoPacket {
  const now = new Date()
  const today = fmt(now)
  const start = new Date(now.getTime() + 7 * 86400000)     // requested start: one week out
  const { end, period } = authWindow(form.requestedUnits, start)
  const b = bundleFor(form.service)
  const primaryDx = dxLabel(form.primaryDx)
  const secondary = form.secondaryDx.map(dxLabel).join('; ')
  const part2 = looksSud(`${form.service} ${primaryDx} ${secondary}`)
  seq += 1

  const f = (
    id: string, label: string, value: string,
    opts: { editable?: boolean; multiline?: boolean; sensitive?: boolean; hint?: string } = {},
  ): DemoField => ({
    id, label, value,
    editable: opts.editable ?? true,
    multiline: opts.multiline,
    sensitive: opts.sensitive,
    hint: opts.hint,
  })

  const sections: DemoSection[] = [
    // 1 ── Request Summary. Date of Request is stamped once, here, and is neither editable
    //      nor recomputed — correction #4.
    { id: 'request', title: 'Request Summary', fields: [
      f('request_type', 'Request Type', 'Initial authorization'),
      f('date_of_request', 'Date of Request', today, { editable: false, hint: 'Stamped when the packet was drafted' }),
      f('urgency', 'Urgency', 'Standard (non-expedited)'),
      f('service', 'Service Requested', form.service, { sensitive: true }),
      f('cpt_hcpcs', 'Requested CPT/HCPCS', b.cpt, { sensitive: true }),
      f('revenue_code', 'Revenue Code', b.rev, { sensitive: true }),
      f('primary_dx', 'Primary Diagnosis (ICD-10)', primaryDx, { sensitive: true }),
      f('secondary_dx', 'Secondary Diagnosis (ICD-10)', secondary, { sensitive: true }),
      f('level_of_care', 'Level of Care Requested', b.loc, { sensitive: true }),
      f('place_of_service', 'Place of Service', b.pos),
      f('units', 'Units / Frequency Requested', form.requestedUnits || b.frequency, { sensitive: true }),
      f('requested_start', 'Requested Start Date', fmt(start)),
      f('requested_end', 'Requested End Date', end),
      f('auth_period', 'Authorization Period', period),
    ] },

    // 2 ── Member Information (+ group #, address, subscriber relationship)
    { id: 'member', title: 'Member Information', fields: [
      f('member_name', 'Member Name', DEMO_MEMBER.name, { editable: false }),
      f('member_id', 'Member ID', DEMO_MEMBER.memberId, { editable: false }),
      f('member_group', 'Group Number', DEMO_MEMBER.group, { editable: false }),
      f('member_dob', 'Date of Birth', DEMO_MEMBER.dob, { editable: false }),
      f('member_mrn', 'MRN', DEMO_MEMBER.mrn, { editable: false }),
      f('member_address', 'Address', DEMO_MEMBER.address, { editable: false }),
      f('member_phone', 'Phone', DEMO_MEMBER.phone, { editable: false }),
      f('member_relationship', 'Relationship to Subscriber', DEMO_MEMBER.relationship, { editable: false }),
      f('member_payer', 'Payer / Plan', `${form.payer} — PPO Behavioral Health`, { editable: false }),
      f('eligibility_verified', 'Eligibility Verified', `Yes — active as of ${today} (ELG-DEMO-0077)`, { editable: false }),
    ] },

    // 3 ── Requesting provider, with the identifiers a payer actually requires — correction #2
    { id: 'provider', title: 'Requesting / Ordering Provider', fields: [
      f('provider_name', 'Provider Name', DEMO_PROVIDER.name, { editable: false }),
      f('provider_credentials', 'Credentials', DEMO_PROVIDER.credentials, { editable: false }),
      f('provider_npi', 'Individual NPI', DEMO_PROVIDER.npi, { editable: false }),
      f('provider_tin', 'TIN', DEMO_PROVIDER.tin, { editable: false }),
      f('provider_taxonomy', 'Taxonomy Code', DEMO_PROVIDER.taxonomy, { editable: false }),
      f('provider_practice', 'Practice / Group', DEMO_PROVIDER.practice, { editable: false }),
      f('provider_address', 'Address', DEMO_PROVIDER.address, { editable: false }),
      f('provider_phone', 'Phone', DEMO_PROVIDER.phone, { editable: false }),
      f('provider_fax', 'Fax', DEMO_PROVIDER.fax, { editable: false }),
      f('p2p_contact', 'Peer-to-Peer Contact', DEMO_PROVIDER.p2pContact),
      f('p2p_phone', 'Peer-to-Peer Callback', DEMO_PROVIDER.p2pPhone),
    ] },

    // 4 ── Servicing facility — correction #2
    { id: 'facility', title: 'Servicing Facility', fields: [
      f('facility_name', 'Facility Name', DEMO_FACILITY.name, { editable: false }),
      f('facility_npi', 'Facility NPI', DEMO_FACILITY.npi, { editable: false }),
      f('facility_tin', 'Facility TIN', DEMO_FACILITY.tin, { editable: false }),
      f('facility_address', 'Facility Address', DEMO_FACILITY.address, { editable: false }),
      f('facility_pos', 'Place of Service Code', b.pos, { editable: false }),
    ] },

    // 5 ── Clinical justification
    { id: 'justification', title: 'Clinical Justification (Medical Necessity)', fields: [
      f('presenting_problem', 'Presenting Problem', 'Patient is a 35-year-old presenting with escalating substance use over the past six months, accompanied by depressed mood, disrupted sleep, and loss of employment in 2026-07. Documented returns to use during the most recent treatment episode despite consistent engagement. Reports intact motivation, has arranged transport, and has no dependent-care barrier to attendance.', { multiline: true, sensitive: true }),
      f('risk_assessment', 'Risk Assessment', `C-SSRS ${BANDS.cssrs.band} (score ${BANDS.cssrs.score}): passive ideation endorsed within the past month, with no plan, no intent, and no preparatory behavior. No lifetime attempt. Means-restriction counseling completed and a written safety plan is on file (2026-08-24). No homicidal ideation and no history of violence. Risk level alone does not require a higher-acuity setting.`, { multiline: true }),
      f('why_loc', 'Why This Level of Care', `The patient's presentation and screening results meet ASAM criteria for ${b.loc}. The Dimension findings below, the documented course of prior treatment, and the current level of symptom severity together establish that this level of care — and not one above or below it — is the least restrictive setting that can reasonably be expected to be effective.`, { multiline: true, sensitive: true }),
      f('why_not_lower', 'Why Not a Lower Level of Care', b.whyNotLower, { multiline: true, sensitive: true }),
      f('why_not_higher', 'Why Not a Higher Level of Care', b.whyNotHigher, { multiline: true, sensitive: true }),
      f('asam', 'ASAM Dimension Summary (1–6)', asamSummary(b), { multiline: true, sensitive: true }),
    ] },

    // 6 ── Clinical history — correction #6
    { id: 'history', title: 'Clinical History', fields: [
      f('current_medications', 'Current Medications', 'Sertraline 100 mg PO daily — since 2026-05-02, prescriber Okafor\nBuprenorphine/naloxone 8 mg/2 mg SL daily — since 2026-08-12, prescriber Okafor\nTrazodone 50 mg PO QHS PRN insomnia — since 2026-06-01, prescriber Okafor', { multiline: true, sensitive: true }),
      f('allergies', 'Allergies / Adverse Reactions', 'Penicillin — urticaria, documented 2018. No other known drug allergies. No known food allergies.', { multiline: true }),
      f('prior_treatment', 'Prior Level-of-Care / Treatment History', b.priorTreatment, { multiline: true, sensitive: true }),
      f('psychosocial', 'Psychosocial Factors', 'Housing stable, shared with an adult sibling. Unemployed since 2026-07; the prior workplace involved regular contact with using peers. Reliable transport and no dependent-care barrier to attendance. Attends a community peer-support group weekly. No legal involvement.', { multiline: true }),
    ] },

    // 7 ── Policy criteria referenced — correction #5 (was "Coverage Determination")
    { id: 'policy', title: 'Policy Criteria Referenced', fields: [
      f('pa_required', 'Prior Authorization Required?', b.paRequired, { multiline: true, sensitive: true }),
      f('policy_id', 'Payer Policy ID', b.policyId, { sensitive: true }),
      f('policy_section', 'Policy Section', b.policySection, { sensitive: true }),
      f('criteria_summary', 'Medical-Necessity Criteria (as published by the payer)', b.criteria, { multiline: true, sensitive: true }),
      f('criteria_met', 'How This Request Meets the Criteria', `Each published criterion is addressed in this packet: the DSM-5 diagnosis is documented as ${primaryDx}; the ASAM Dimension findings supporting ${b.loc} are itemized in the ASAM Dimension Summary; the course and outcome of prior treatment are documented with dates under Prior Level-of-Care; measurable goals and discharge criteria are stated in the Treatment Plan; and medical and psychiatric stability are documented under Risk Assessment and ASAM Dimensions 1–3.`, { multiline: true, sensitive: true }),
    ] },

    // 8 ── Treatment plan
    { id: 'plan', title: 'Treatment Plan & Goals', fields: [
      f('goals', 'Measurable Goals', '1. Reduce PHQ-9 from 16 to 9 or below within 8 weeks, measured biweekly.\n2. Achieve and sustain 30 consecutive days without a return to use, verified by self-report and scheduled toxicology.\n3. Attend 90% or more of scheduled programming hours across the authorization period.\n4. Complete a written relapse-prevention plan naming 5 personal triggers and 3 coping responses by week 3.\n5. Re-establish structured daily activity — employment, volunteering, or training — by week 6.', { multiline: true, sensitive: true }),
      f('modalities', 'Modalities', b.modalities, { multiline: true, sensitive: true }),
      f('frequency', 'Frequency & Duration', b.frequency, { sensitive: true }),
      f('discharge', 'Discharge Criteria', b.discharge, { multiline: true, sensitive: true }),
      f('coordination', 'Care Coordination', 'Prescriber and treatment team meet weekly for case review. Primary care notified with member consent. Warm handoff to the next level of care is scheduled before discharge, with the first follow-up appointment booked prior to the discharge date.', { multiline: true }),
    ] },
  ]

  if (part2) {
    sections.push({ id: 'sud', title: 'SUD Detail (42 CFR Part 2)', fields: [
      f('sud_detail', 'SUD Detail', `Substance use disorder treatment detail for ${form.service}, primary diagnosis ${primaryDx}. Primary substance: opioids, non-prescribed, most recent use 2026-08-09. Secondary: alcohol, most recent use 2026-08-18. Currently maintained on buprenorphine/naloxone under prescriber oversight since 2026-08-12.`, { multiline: true, sensitive: true }),
      f('sud_history', 'Substance Use History', 'Opioid use beginning approximately 2021 following a post-surgical prescription, transitioning to non-prescribed use by 2023. Alcohol use since adolescence, escalating over the past 18 months. One prior withdrawal-management episode in 2025-11. No injection use reported. No overdose history. No tobacco or stimulant use.', { multiline: true, sensitive: true }),
      f('sud_consent', 'Part 2 Consent on File', 'Written consent CNS-DEMO-0219, signed 2026-08-24, authorizing disclosure to the named payer for payment purposes; expires 2027-08-24 or upon written revocation.', { editable: false }),
    ] })
  }

  // 9 ── Attestation & signature INSIDE the document — correction #1
  sections.push({ id: 'attestation', title: 'Attestation & Signature', fields: [
    f('attest_statement', 'Attestation', 'I certify that the information provided in this request is accurate and complete to the best of my knowledge, that I am the treating provider or an authorized representative of the treating provider, and that the services requested are medically necessary for the treatment of the condition described. I understand that knowingly submitting false information may constitute a violation of federal and state law.', { editable: false, multiline: true }),
    f('signer_name', 'Attesting Clinician', DEMO_PROVIDER.name, { editable: false }),
    f('signer_credentials', 'Credentials', DEMO_PROVIDER.credentials, { editable: false }),
    f('signer_license', 'State License Number', DEMO_PROVIDER.license, { editable: false }),
    f('signer_npi', 'NPI', DEMO_PROVIDER.npi, { editable: false }),
    f('signature', 'Electronic Signature', '', { hint: 'Type your full name to sign' }),
    f('date_signed', 'Date Signed', '', { editable: false, hint: 'Stamped on submission' }),
  ] })

  // 10 ── Payer use only
  sections.push({ id: 'payer_use', title: 'Payer Use Only', fields: [
    f('auth_number', 'Authorization Number', '', { editable: false }),
    f('determination', 'Determination', '', { editable: false }),
    f('units_approved', 'Units Approved', '', { editable: false }),
    f('approved_span', 'Approved Span', '', { editable: false }),
    f('reviewer', 'Reviewer', '', { editable: false }),
    f('decision_date', 'Decision Date', '', { editable: false }),
  ] })

  return {
    id: `PA-DEMO-${String(seq).padStart(4, '0')}`,
    service: form.service,
    status: 'draft',
    part2Gated: part2,
    draftedByAgent: true,
    dateOfRequest: today,
    sections,
    attachments: DEMO_ATTACHMENTS,
  }
}
