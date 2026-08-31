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
  help?: string          // hover explanation: what the field is + what to enter
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
  memberId: 'BSA447192801',
  group: 'GRP-778120',
  dob: '1991-03-14',
  mrn: 'BHUC_PATIENT_042',
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
  license: 'TX M55219',
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
  'AUDIT screening (BHUC_SCREENING_104) — 18, moderate',
  'DAST-10 screening (BHUC_SCREENING_105) — 7, substantial',
  'PHQ-9 screening (BHUC_SCREENING_106) — 16, moderately severe',
  'GAD-7 screening (BHUC_SCREENING_107) — 12, moderate',
  'C-SSRS screening (BHUC_SCREENING_108) — low risk',
  'SOCRATES-8 screening (BHUC_SCREENING_109) — high readiness',
  'Clinical note BHUC_CARE_PLAN_311 — signed 2026-08-24',
  'Clinical note BHUC_CARE_PLAN_298 — signed 2026-08-11',
  'Eligibility verification BHUC_ELIGIBILITY_077 — active',
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

// ── Hover help: what each field is, and what belongs in it ───────────────────────────────
// Keyed by field id and attached to every field by the factory below, so the document is
// self-explanatory to anyone reading it — clinician, reviewer, or auditor.
const FIELD_HELP: Record<string, string> = {
  // Request Summary
  request_type: 'Whether this is a brand-new authorization or a change to one that already exists. Enter "Initial authorization" for a first request, "Concurrent review" to extend an active authorization, or "Retrospective" for services already delivered.',
  date_of_request: 'The date this packet was drafted. Stamped once and locked, so the submitted record always shows when the request was actually made rather than when it was last opened.',
  urgency: 'How fast the payer must decide. Standard is the normal turnaround; use Expedited only when the standard timeframe could seriously jeopardise the patient\u2019s life, health, or ability to regain maximum function \u2014 payers audit this.',
  service: 'The treatment being requested, in plain language. Enter the level-of-care name the payer\u2019s own policy uses, for example "Intensive Outpatient (IOP)".',
  cpt_hcpcs: 'The procedure code the claim will be billed under. Enter the CPT or HCPCS code with its description. It must match the level of care requested, or the claim can deny even with an approval on file.',
  revenue_code: 'The four-digit facility revenue code that pairs with the procedure code on an institutional (UB-04) claim. Enter the code and its description, or leave blank for professional-only billing.',
  primary_dx: 'The condition that is the main reason for this treatment. Enter the ICD-10 code and description, coded to the highest level of specificity the chart supports.',
  secondary_dx: 'Co-occurring conditions that affect the treatment plan or justify the intensity requested. Enter additional ICD-10 codes separated by semicolons, or leave blank if none apply.',
  level_of_care: 'The ASAM level being requested. Enter the level number and name exactly as the payer\u2019s medical policy words it \u2014 reviewers match this against their criteria set.',
  place_of_service: 'The two-digit CMS place-of-service code describing where care is delivered. Enter the code and its description; it must be consistent with the revenue code and the servicing facility.',
  units: 'How much care is being requested. Enter sessions or days per week and the total duration, for example "3x/week for 4 weeks". This is what the payer authorises and what claims are checked against.',
  requested_start: 'The first date of service you are asking the payer to cover. Enter a date on or after today \u2014 back-dating turns this into a retrospective review with different rules.',
  requested_end: 'The last date of service covered by this request. Calculated from the requested start plus the duration in Units; edit it if the plan of care differs.',
  auth_period: 'The full window the authorisation would span, shown as start to end with the day count. This is the span the payer stamps on the approval.',

  // Member Information
  member_name: 'The patient\u2019s full legal name exactly as it appears on the insurance card. A mismatch against the payer\u2019s records is the most common cause of an administrative denial.',
  member_id: 'The subscriber ID printed on the insurance card, including any alpha prefix. Enter it exactly as printed, without spaces or dashes that are not on the card.',
  member_group: 'The employer or plan group number from the insurance card. It tells the payer which benefit set applies \u2014 the same member ID can carry different behavioural health benefits under different groups.',
  member_dob: 'The patient\u2019s date of birth as YYYY-MM-DD. Used together with name and member ID to match the member record.',
  member_mrn: 'Your organisation\u2019s internal medical record number for this patient. The payer does not use it, but it lets both sides trace this request back to the chart.',
  member_address: 'The patient\u2019s current residential address on file. Payers use it to confirm the plan\u2019s service area and network adequacy.',
  member_phone: 'A phone number where the patient can be reached about this request, including area code.',
  member_relationship: 'How the patient relates to the person who holds the policy. Enter "Self" when the patient is the subscriber, otherwise Spouse, Child, or Other.',
  member_payer: 'The insurance company and the specific plan being billed. Enter the payer name and the product, for example "PPO Behavioral Health" \u2014 behavioural health benefits are often carved out to a separate plan.',
  eligibility_verified: 'Confirmation that coverage was active when checked, with the date and the verification reference. Always verify before submitting: an authorisation on an inactive policy will not pay.',

  // Requesting / Ordering Provider
  provider_name: 'The clinician ordering the service and taking clinical responsibility for the request. Enter their full name as it appears on their licence.',
  provider_credentials: 'The ordering clinician\u2019s degree and any board certification. Payers check that the credential is appropriate to the level of care being requested.',
  provider_npi: 'The ordering clinician\u2019s ten-digit individual National Provider Identifier. Enter the individual (Type 1) NPI, not the group or facility NPI \u2014 the payer validates it against the NPPES registry.',
  provider_tin: 'The Tax Identification Number the claim will be billed under, as XX-XXXXXXX. It must match the TIN on the provider\u2019s contract with this payer.',
  provider_taxonomy: 'The ten-character taxonomy code describing the provider\u2019s specialty. Enter the code and its description; it must match the taxonomy registered to the NPI.',
  provider_practice: 'The practice or group the ordering clinician bills under. Enter the legal business name as contracted with the payer.',
  provider_address: 'The service location address for the ordering provider, matching what the payer has on file.',
  provider_phone: 'A daytime phone number the payer\u2019s reviewer can call about this request.',
  provider_fax: 'The secure fax number where the payer should send the determination letter. Confirm it is a fax the clinical team actually monitors \u2014 determinations are still commonly faxed.',
  p2p_contact: 'The person the payer\u2019s medical director should reach for a peer-to-peer clinical discussion if this request heads toward denial. Enter a name and role.',
  p2p_phone: 'The direct number and hours for that peer-to-peer discussion. Payers allow only a short window to respond before issuing a denial, so give a number that is genuinely answered.',

  // Servicing Facility
  facility_name: 'The legal name of the facility where the service will actually be delivered, which may differ from the ordering provider\u2019s practice.',
  facility_npi: 'The facility\u2019s ten-digit organisational (Type 2) NPI. Enter the servicing site\u2019s NPI, not the ordering clinician\u2019s individual NPI.',
  facility_tin: 'The Tax Identification Number the facility bills under, as XX-XXXXXXX.',
  facility_address: 'The physical address where the patient will receive the service. Payers check it against the network and against the place-of-service code.',
  facility_pos: 'The CMS place-of-service code for this site, repeated here so the servicing location and the billed setting are unambiguous.',

  // Clinical Justification
  presenting_problem: 'The clinical picture in the current episode: what is happening now, how long it has been happening, and how it affects functioning. Write three to six sentences a reviewer who has never seen the chart could follow, and spell out abbreviations.',
  risk_assessment: 'Current suicide, self-harm, and violence risk, with the instrument, score, and date behind it. State plan, intent, access to means, and history explicitly \u2014 "no SI" on its own is not enough for a reviewer.',
  why_loc: 'The core medical-necessity argument: why this exact level of care is required now. Tie it to specific ASAM dimensions, screening scores, and documented events rather than general statements of severity.',
  why_not_lower: 'Why a less intensive setting will not work, with evidence. Name the lower level, give the dates it was tried, and state what happened. An untried lower level is the most common reason a request gets downgraded.',
  why_not_higher: 'Why a more intensive setting is not needed, which shows the reviewer you considered the whole continuum. Address medical stability, withdrawal risk, safety, and the recovery environment.',
  asam: 'A dimension-by-dimension summary across all six ASAM dimensions. Give each dimension its own line with the finding and the evidence \u2014 reviewers score criteria dimension by dimension and skip narrative that is not organised this way.',

  // Clinical History
  current_medications: 'Every medication the patient is currently taking, with dose, route, frequency, start date, and prescriber. Include psychiatric and medication-assisted treatment drugs \u2014 they justify the medication-management component of the request.',
  allergies: 'Known drug and food allergies with the reaction that occurred, or an explicit statement that there are none. Never leave this blank: a blank field reads to a reviewer as "not assessed".',
  prior_treatment: 'Every prior behavioural health treatment episode with dates, level of care, attendance or dose, and outcome. This is the evidence behind the why-not-lower argument, so give real dates rather than "has failed outpatient".',
  psychosocial: 'Housing, employment, transport, caregiving duties, supports, and legal involvement. These drive ASAM Dimension 6 and show whether the patient can realistically attend the level of care requested.',

  // Policy Criteria Referenced
  pa_required: 'Whether the payer\u2019s own published policy requires authorisation for this service, and under what conditions. State it as the policy states it, including any visit thresholds or notification-only rules.',
  policy_id: 'The identifier of the specific medical policy you are relying on, with its revision. Cite the version in effect on the requested start date, not the newest one.',
  policy_section: 'The exact section or paragraph of that policy containing the criteria. Pointing at a section rather than the whole document is what makes a citation checkable.',
  criteria_summary: 'The payer\u2019s published criteria, quoted or closely paraphrased. Reproduce their wording so the reviewer can match your evidence to their checklist item by item.',
  criteria_met: 'A point-by-point mapping of each published criterion to where in this packet it is satisfied. This is the section that most often turns a pended request into an approval, so name the sections you are pointing at.',

  // Treatment Plan & Goals
  goals: 'Specific, measurable, time-bound treatment goals. Each should name a metric, a target, and a deadline \u2014 "reduce PHQ-9 from 16 to 9 or below within 8 weeks" rather than "improve mood".',
  modalities: 'The specific interventions that will be delivered and at what intensity. Reviewers check that these add up to the hours the requested level of care requires.',
  frequency: 'How often and for how long the patient will be seen. It must be arithmetically consistent with the Units requested and with the level-of-care definition.',
  discharge: 'The observable conditions under which the patient will step down or complete treatment. Payers require a defined endpoint; open-ended plans are routinely pended.',
  coordination: 'How the treating team, prescriber, primary care, and the next level of care stay connected \u2014 including who books the follow-up appointment and when.',

  // SUD Detail (42 CFR Part 2)
  sud_detail: 'The substance use disorder specifics supporting this request: substances, most recent use dates, and current medication. This is 42 CFR Part 2 protected information and may only be disclosed with a written consent meeting \u00a7 2.31.',
  sud_history: 'The course of the substance use disorder over time \u2014 onset, progression, routes of use, prior withdrawal or overdose events. Also 42 CFR Part 2 protected.',
  sud_consent: 'The written consent authorising this specific disclosure, with its identifier, signature date, purpose, and expiry. A general medical release is not sufficient under 42 CFR \u00a7 2.31: without a qualifying consent on file, none of this section may be sent.',

  // Attestation & Signature
  attest_statement: 'The certification you are signing. Read it before signing \u2014 it asserts that the clinical information is accurate and that the services are medically necessary, and it carries legal consequences if knowingly false.',
  signer_name: 'The clinician taking responsibility for this request. Must be the treating provider, or someone authorised to sign on the treating provider\u2019s behalf.',
  signer_credentials: 'The signer\u2019s degree and board certification, shown so the payer can confirm the attestation came from an appropriately qualified clinician.',
  signer_license: 'The signer\u2019s state professional licence number \u2014 how the payer confirms they are licensed to practise in the state where care is delivered.',
  signer_npi: 'The signer\u2019s individual NPI, repeated in the signature block so the attestation is tied to a specific registered provider.',
  signature: 'Type your full legal name to sign. This is your electronic signature and carries the same weight as a handwritten one. Never sign on another clinician\u2019s behalf.',
  date_signed: 'The date the attestation was signed. Stamped automatically on submission, so it always reflects the real signing date.',

  // Payer Use Only
  auth_number: 'The authorisation number the payer issues on approval. Leave blank \u2014 the payer completes this section. You will need this number on every claim for the authorised services.',
  determination: 'The payer\u2019s decision: approved, partially approved, denied, or pended for more information. Completed by the payer.',
  units_approved: 'How many sessions or days the payer actually authorised, which can be fewer than requested. Completed by the payer \u2014 check it against your request before starting care.',
  approved_span: 'The date range the payer authorised, which can be narrower than requested. Completed by the payer; services outside this span will not pay.',
  reviewer: 'The payer\u2019s reviewer or medical director who made the determination. Completed by the payer \u2014 you need this name to request a peer-to-peer discussion or file an appeal.',
  decision_date: 'The date the payer issued the determination. Completed by the payer; appeal deadlines run from this date.',
}

// ── Draft-form help ──────────────────────────────────────────────────────────────────────
// What each level of care actually involves, used to decode the Service currently selected in
// the draft form.
export const SERVICE_NOTES: Record<string, string> = {
  'Intensive Outpatient (IOP)': 'ASAM 2.1 — roughly 9 structured treatment hours a week, with the patient continuing to live at home.',
  'Partial Hospitalization (PHP)': 'ASAM 2.5 — full-day programming, roughly 30 hours a week, with the patient returning home each evening.',
  'Clinically Managed Residential': 'ASAM 3.5 — 24-hour treatment in a structured residential setting.',
  'Medication-Assisted Treatment (MAT)': 'Office-based treatment with buprenorphine/naloxone plus counselling, billed per visit rather than per programme day.',
  'Standard Outpatient': 'ASAM 1.0 — weekly individual or group therapy, the least intensive level on the continuum.',
}

const NUMBER_WORD: Record<number, string> = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six',
  7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve',
}
const word = (n: number) => NUMBER_WORD[n] ?? String(n)

/** Plain-English decode of a "Requested units" string: what the frequency and duration mean,
 *  the resulting session count, and the authorisation window the packet derives from it.
 *  Computed from the same parsing `authWindow` uses, so the explanation can never drift from
 *  the dates the packet actually produces. */
export function explainUnits(units: string): string {
  const text = units.trim()
  if (!text) {
    return 'Left blank, the packet falls back to the standard frequency for the level of care selected and to a 90-day authorisation window.'
  }
  const freq = /(\d+)\s*x\s*\/?\s*(day|week|month)/i.exec(text)
  const rest = text.replace(/(\d+)\s*x\s*\/?\s*(day|week|month)/i, ' ')
  const dur = /(\d+)\s*(day|week|month)/i.exec(rest)

  const durDays = dur
    ? Number(dur[1]) * (dur[2].toLowerCase() === 'day' ? 1 : dur[2].toLowerCase() === 'week' ? 7 : 30)
    : 90
  const art = /^(8|11|18)/.test(String(durDays)) ? 'an' : 'a'
  const window = dur
    ? `and it is what sets the authorisation period: the packet derives ${art} ${durDays}-day window from the “${dur[1]} ${dur[2].toLowerCase()}${Number(dur[1]) === 1 ? '' : 's'}” part`
    : 'and because no duration is stated the packet falls back to a 90-day authorisation window'

  if (freq && dur) {
    const n = Number(freq[1]), m = Number(dur[1])
    const per = freq[2].toLowerCase(), span = dur[2].toLowerCase()
    const total = per === span ? ` — ${word(n * m)} sessions in total —` : ''
    return `“${text}” means ${word(n)} treatment session${n === 1 ? '' : 's'} each ${per} for ${word(m)} consecutive ${span}${m === 1 ? '' : 's'}${total} ${window}. Change the “${freq[1]}x/${per}” part to change how often the patient is seen, and the “${m} ${span}${m === 1 ? '' : 's'}” part to change how long the authorisation runs.`
  }
  if (dur) {
    return `“${text}” states how long treatment runs but not how often the patient is seen. The packet derives ${art} ${durDays}-day authorisation window from it. Add a frequency such as “3x/week” so the payer can see the intended intensity as well as the span.`
  }
  return `“${text}” does not state a duration the packet can read, ${window}. Write it as a frequency followed by a span — for example “3x/week for 4 weeks” — so the authorisation period is derived correctly.`
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
    help: FIELD_HELP[id],
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
      f('eligibility_verified', 'Eligibility Verified', `Yes — active as of ${today} (BHUC_ELIGIBILITY_077)`, { editable: false }),
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
      f('sud_consent', 'Part 2 Consent on File', 'Written consent BHUC_CONSENT_219, signed 2026-08-24, authorizing disclosure to the named payer for payment purposes; expires 2027-08-24 or upon written revocation.', { editable: false }),
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
    id: `BHUC_PRIOR_AUTH_${String(seq).padStart(3, '0')}`,
    service: form.service,
    status: 'draft',
    part2Gated: part2,
    draftedByAgent: true,
    dateOfRequest: today,
    sections,
    attachments: DEMO_ATTACHMENTS,
  }
}
