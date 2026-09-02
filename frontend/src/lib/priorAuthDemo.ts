// Mock prior-authorization cases for the /prior/simulate demo (frontend-only, no PHI —
// all members, providers and identifiers are fictitious). Modeled on real utilization-
// management practice: X12 278 intake, eligibility/benefit verification, level-of-care
// criteria review, expedited/standard turnaround clocks, and clinician-only denials.

export type StepTone = 'neutral' | 'approve' | 'reject' | 'hitl'

export interface StepFact {
  label: string
  value: string
}

export interface SimStep {
  id: string
  /** Node in futureFlow to highlight on the swimlane. */
  nodeId: string
  agent: string
  title: string
  detail: string
  facts?: StepFact[]
  tone?: StepTone
  render?: 'approval' | 'denial'
}

export interface DecisionCriterion {
  text: string
  met: boolean
  note?: string
}

export interface DecisionPoint {
  summary: string
  criteria: DecisionCriterion[]
  recommendation: 'approve' | 'deny'
  recommendationReason: string
}

export interface ApprovalNotice {
  authNumber: string
  approvedService: string
  units: string
  validFrom: string
  validTo: string
  notes: string[]
}

export interface DenialLetter {
  reasons: string[]
  criteriaCited: string[]
  missing: string[]
  appealRights: string
}

export interface AuthCase {
  id: string
  requestId: string
  label: string
  pathBadge: string
  pathTone: 'approve' | 'hitl' | 'reject'
  member: { name: string; memberId: string; dob: string; plan: string }
  provider: { name: string; npi: string }
  service: {
    description: string
    code: string
    units: string
    startDate: string
    urgency: 'Standard' | 'Expedited'
    placeOfService: string
    diagnoses: { code: string; label: string }[]
  }
  attachments: string[]
  tatNote: string
  baseSteps: SimStep[]
  decision?: DecisionPoint
  approveSteps?: SimStep[]
  denySteps?: SimStep[]
  approval?: ApprovalNotice
  denial?: DenialLetter
}

export const authCases: AuthCase[] = [
  // ── Case A: clean rule match → auto-approval ─────────────────────────────
  {
    id: 'iop',
    requestId: 'PA-2026-004821',
    label: 'Continue Intensive Outpatient Program (IOP)',
    pathBadge: 'Auto-approval',
    pathTone: 'approve',
    member: { name: 'Jordan Pierce', memberId: 'M-84512033', dob: '03/14/1991', plan: 'BlueEdge HMO — Behavioral Health' },
    provider: { name: 'Green Mountain Behavioral Health — IOP Program', npi: '1487654321' },
    service: {
      description: 'Intensive outpatient psychiatric services, per diem — continuation',
      code: 'HCPCS S9480',
      units: '12 visits (3×/week, 4 weeks)',
      startDate: '09/08/2026',
      urgency: 'Standard',
      placeOfService: '52 — Psychiatric Facility (Partial Hospitalization / IOP)',
      diagnoses: [
        { code: 'F33.1', label: 'Major depressive disorder, recurrent, moderate' },
        { code: 'F41.1', label: 'Generalized anxiety disorder' },
      ],
    },
    attachments: ['Clinical progress notes (4)', 'PHQ-9 score trend', 'Attendance record', 'Updated treatment plan'],
    tatNote: 'Standard request — determination due within 72 hours of receipt.',
    baseSteps: [
      {
        id: 'a1', nodeId: 'ehr', agent: 'Provider EHR Agent',
        title: 'Authorization requirement detected and request submitted',
        detail: 'The agent inside the provider EHR recognizes that continued IOP (S9480) under this plan requires prior authorization, assembles the clinical packet from the chart, and submits an electronic request.',
        facts: [
          { label: 'Transaction', value: 'X12 278 authorization request' },
          { label: 'Attachments', value: '4 progress notes, PHQ-9 trend, attendance, treatment plan' },
          { label: 'Submitted', value: '09/01/2026 09:12 ET' },
        ],
      },
      {
        id: 'a2', nodeId: 'analyze', agent: 'Intake & Eligibility Agent',
        title: 'Eligibility verified, codes extracted, criteria set selected',
        detail: 'The payer-side agent verifies active coverage and the behavioral-health benefit, extracts service and diagnosis codes from structured fields and narrative notes, and selects the applicable level-of-care criteria set.',
        facts: [
          { label: 'Eligibility', value: 'Active — BH benefit verified, no exclusions' },
          { label: 'Codes read', value: 'S9480 · F33.1 · F41.1' },
          { label: 'Criteria set', value: 'BH Level of Care — IOP continued stay' },
        ],
      },
      {
        id: 'a3', nodeId: 'autoApprove', agent: 'Clinical Criteria Agent',
        title: 'Continued-stay criteria met — auto-approved', tone: 'approve',
        detail: 'Documentation shows measurable symptom improvement (PHQ-9 18 → 11), 92% attendance, active step-down planning, and no acute risk indicators. The request closely matches the continued-stay criteria, so the agent approves in real time. Approvals may be automated; only a licensed clinical reviewer can issue an adverse determination.',
        facts: [
          { label: 'Criteria match', value: '5 of 5 continued-stay indicators met' },
          { label: 'Confidence', value: '96% (above 90% auto-approval threshold)' },
          { label: 'Turnaround', value: 'Determination in 3 minutes 42 seconds' },
        ],
      },
      {
        id: 'a4', nodeId: 'treatment', agent: 'Determination & Notification Agent',
        title: 'Authorization issued to member and provider', tone: 'approve', render: 'approval',
        detail: 'The approval is written back to the provider EHR via the 278 response, and the member is notified through the portal. No care was interrupted while the request was reviewed.',
      },
      {
        id: 'a5', nodeId: 'monitor', agent: 'Care Progression Agent',
        title: 'Monitoring for step-down readiness',
        detail: 'The agent monitors EHR feeds during the authorized period and predicts readiness to step down to standard outpatient care in approximately 3 weeks, prompting the care team to prepare the transition.',
        facts: [
          { label: 'Predicted step-down', value: '~Week 3 of 4' },
          { label: 'Suggested next level', value: 'Outpatient therapy + medication management' },
        ],
      },
      {
        id: 'a6', nodeId: 'crosscheck', agent: 'Payment Integrity Agent',
        title: 'Billing pre-check — no discrepancies',
        detail: 'Billed S9480 units are cross-checked against attendance documentation before claims payment. Units billed match units attended; no discrepancy flags raised.',
        facts: [
          { label: 'Units billed vs documented', value: '12 / 12 — consistent' },
          { label: 'Flags', value: 'None' },
        ],
      },
    ],
  },

  // ── Case B: complex expedited inpatient admission → human review ─────────
  {
    id: 'inpatient',
    requestId: 'PA-2026-004876',
    label: 'Inpatient psychiatric admission (expedited)',
    pathBadge: 'Human review',
    pathTone: 'hitl',
    member: { name: 'Alicia Tran', memberId: 'M-90211457', dob: '11/02/1978', plan: 'BlueEdge PPO — Behavioral Health' },
    provider: { name: 'Dr. Marcus Webb, MD — Copley Regional Medical Center', npi: '1093827465' },
    service: {
      description: 'Acute inpatient psychiatric admission — 5 days requested',
      code: 'Rev 0124 (Psychiatric, R&B)',
      units: '5 days',
      startDate: '09/01/2026 (admission in progress)',
      urgency: 'Expedited',
      placeOfService: '21 — Inpatient Hospital',
      diagnoses: [{ code: 'F31.2', label: 'Bipolar I disorder, manic episode, severe with psychotic features' }],
    },
    attachments: ['ED psychiatric evaluation', 'Safety assessment', 'Medication history', 'Medical clearance labs'],
    tatNote: 'Expedited request — determination due within 24 hours of receipt.',
    baseSteps: [
      {
        id: 'b1', nodeId: 'ehr', agent: 'Provider EHR Agent',
        title: 'Expedited authorization submitted from the ED',
        detail: 'The hospital EHR agent detects that the admission requires authorization, marks the request expedited based on the documented acuity, and submits it with the ED evaluation attached.',
        facts: [
          { label: 'Transaction', value: 'X12 278 — expedited indicator set' },
          { label: 'Clock started', value: '09/01/2026 02:47 ET (24-hour TAT)' },
        ],
      },
      {
        id: 'b2', nodeId: 'analyze', agent: 'Intake & Eligibility Agent',
        title: 'Coverage verified, acuity indicators extracted',
        detail: 'Coverage and inpatient BH benefit verified. The agent extracts acuity indicators from the ED narrative: psychotic features, 48-hour safety concern, failed outpatient medication adjustment, and completed medical clearance.',
        facts: [
          { label: 'Eligibility', value: 'Active — inpatient BH benefit verified' },
          { label: 'Criteria set', value: 'BH Level of Care — acute inpatient admission' },
        ],
      },
      {
        id: 'b3', nodeId: 'flag', agent: 'Clinical Criteria Agent',
        title: 'Flagged for human review — high complexity', tone: 'hitl',
        detail: 'Acute safety risk, psychotic features and benefit-limit interplay place this case above the automation threshold. Model confidence (71%) is below the auto-approval bar, so the case is routed to a licensed clinical reviewer with a pre-assembled criteria worksheet. It is never auto-denied.',
        facts: [
          { label: 'Confidence', value: '71% (below 90% threshold)' },
          { label: 'Routing', value: 'Priority queue — psychiatrist reviewer (expedited)' },
        ],
      },
      {
        id: 'b4', nodeId: 'escalated', agent: 'Clinical Review Team (human)',
        title: 'Clinical reviewer determination', tone: 'hitl',
        detail: 'A licensed psychiatrist reviews the assembled evidence against the acute inpatient criteria and issues the final determination. The AI prepared the worksheet; the human makes the call.',
      },
    ],
    decision: {
      summary: 'Acute inpatient psychiatric admission, 5 days requested. Reviewer worksheet assembled by the Clinical Criteria Agent:',
      criteria: [
        { text: 'Imminent risk to self or others documented within 48 hours', met: true, note: 'ED safety assessment, 09/01' },
        { text: 'Failure of less restrictive level of care', met: true, note: 'Outpatient medication adjustment failed over 2 weeks' },
        { text: 'Medical clearance completed', met: true, note: 'Labs within normal limits' },
        { text: '24-hour nursing / psychiatric supervision required', met: true, note: 'Psychotic features, medication titration' },
      ],
      recommendation: 'approve',
      recommendationReason: 'All four acute inpatient criteria are documented. Recommend approval of 5 days with concurrent review at day 3.',
    },
    approveSteps: [
      {
        id: 'b5', nodeId: 'treatment', agent: 'Determination & Notification Agent',
        title: 'Admission approved — 5 days with concurrent review', tone: 'approve', render: 'approval',
        detail: 'The reviewer approves the admission. The determination is returned inside the 24-hour expedited window, with a concurrent review scheduled at day 3 to assess continued stay.',
      },
      {
        id: 'b6', nodeId: 'monitor', agent: 'Care Progression Agent',
        title: 'Discharge readiness monitoring active',
        detail: 'The agent watches daily documentation to predict the discharge date and proposes post-acute options — step-down to partial hospitalization and an IOP bed search — before day 5.',
        facts: [
          { label: 'Predicted discharge', value: 'Day 4–5' },
          { label: 'Suggested post-acute', value: 'Partial hospitalization program, then IOP' },
        ],
      },
    ],
    denySteps: [
      {
        id: 'b7', nodeId: 'denial', agent: 'Determination & Notification Agent',
        title: 'Adverse determination issued by clinical reviewer', tone: 'reject', render: 'denial',
        detail: 'The reviewer issues an adverse determination. The agent drafts the plain-language notice citing the exact criteria applied; the reviewer signs it before release.',
      },
    ],
    approval: {
      authNumber: 'AUTH-2026-118234',
      approvedService: 'Acute inpatient psychiatric admission (Rev 0124)',
      units: '5 days (09/01/2026 – 09/05/2026), concurrent review day 3',
      validFrom: '09/01/2026',
      validTo: '09/05/2026',
      notes: [
        'Expedited determination issued within the 24-hour regulatory window.',
        'Concurrent review scheduled for day 3 to assess continued-stay criteria.',
        'This authorization is a determination of medical necessity and is not a guarantee of payment; payment is subject to eligibility and benefits at the time of service.',
      ],
    },
    denial: {
      reasons: [
        'The clinical reviewer determined that the submitted documentation does not establish that 24-hour inpatient care is required at this time.',
        'The record indicates the member can be safely treated at a less restrictive level of care with crisis wrap-around services.',
      ],
      criteriaCited: ['BH Level of Care Criteria — Acute Inpatient Admission §2.1 (imminent risk)', '§2.3 (less restrictive alternatives)'],
      missing: ['Updated safety assessment supporting 24-hour supervision'],
      appealRights: 'You or your provider may request an expedited appeal within 72 hours, an expedited external review, or a peer-to-peer discussion with the reviewing psychiatrist at 1-800-555-0134.',
    },
  },

  // ── Case C: residential SUD request with documentation gaps → likely deny ─
  {
    id: 'residential',
    requestId: 'PA-2026-004902',
    label: 'Residential SUD treatment — documentation gaps',
    pathBadge: 'Human review — likely denial',
    pathTone: 'reject',
    member: { name: 'Devon Okafor', memberId: 'M-77120943', dob: '06/27/1985', plan: 'BlueEdge HMO — Behavioral Health' },
    provider: { name: 'Birchwood Recovery Center', npi: '1265439870' },
    service: {
      description: 'Residential substance-use disorder treatment, per diem — 30 days requested',
      code: 'HCPCS H0017',
      units: '30 days',
      startDate: '09/10/2026',
      urgency: 'Standard',
      placeOfService: '55 — Residential Substance Abuse Treatment Facility',
      diagnoses: [{ code: 'F10.20', label: 'Alcohol use disorder, severe' }],
    },
    attachments: ['Intake assessment', 'Partial ASAM assessment (dimensions 1–3)'],
    tatNote: 'Standard request — determination due within 72 hours of receipt.',
    baseSteps: [
      {
        id: 'c1', nodeId: 'ehr', agent: 'Provider EHR Agent',
        title: 'Residential treatment request submitted',
        detail: 'The facility submits a 30-day residential SUD treatment request. The agent attaches the intake assessment and the ASAM documentation available in the record.',
        facts: [
          { label: 'Transaction', value: 'X12 278 authorization request' },
          { label: 'Attachments', value: 'Intake assessment, partial ASAM (dimensions 1–3)' },
        ],
      },
      {
        id: 'c2', nodeId: 'analyze', agent: 'Intake & Eligibility Agent',
        title: 'Documentation gaps detected against criteria set',
        detail: 'Coverage is verified, but the agent detects that the packet does not document a trial of a lower level of care within the past 90 days, and ASAM dimensions 4–6 are missing. It also finds no discharge-planning statement for the requested 30-day length of stay.',
        facts: [
          { label: 'Eligibility', value: 'Active — residential SUD benefit verified' },
          { label: 'Criteria set', value: 'SUD Level of Care — Residential (ASAM 3.5)' },
          { label: 'Gaps', value: 'No documented IOP/outpatient trial · ASAM dims 4–6 missing' },
        ],
      },
      {
        id: 'c3', nodeId: 'flag', agent: 'Clinical Criteria Agent',
        title: 'Flagged as likely-to-deny — mandatory human review', tone: 'hitl',
        detail: 'Because the documentation does not support the criteria, this is a potential adverse determination. Policy requires that every potential denial be reviewed and decided by a licensed clinical peer — the AI assembles the worksheet and drafts a criteria-cited letter, but cannot deny.',
        facts: [
          { label: 'Routing', value: 'Peer reviewer queue — SUD specialist' },
          { label: 'Safeguard', value: 'AI cannot issue adverse determinations' },
        ],
      },
      {
        id: 'c4', nodeId: 'escalated', agent: 'Clinical Review Team (human)',
        title: 'Peer reviewer determination', tone: 'hitl',
        detail: 'A licensed SUD peer reviewer examines the record against ASAM Level 3.5 criteria and issues the final determination.',
      },
    ],
    decision: {
      summary: 'Residential SUD treatment, 30 days requested. Reviewer worksheet assembled by the Clinical Criteria Agent:',
      criteria: [
        { text: 'ASAM Level 3.5 assessment complete (dimensions 1–6)', met: false, note: 'Dimensions 4–6 not submitted' },
        { text: 'Trial of lower level of care within 90 days documented', met: false, note: 'No IOP or outpatient records found' },
        { text: 'Medical necessity for 24-hour structured setting established', met: false, note: 'Intake assessment insufficient on its own' },
        { text: 'Active SUD diagnosis documented', met: true, note: 'F10.20 confirmed at intake' },
      ],
      recommendation: 'deny',
      recommendationReason: 'Three of four criteria are unsupported by the submitted documentation. Recommend adverse determination with a peer-to-peer offer, noting the specific documents that would support reconsideration.',
    },
    approveSteps: [
      {
        id: 'c5', nodeId: 'treatment', agent: 'Determination & Notification Agent',
        title: 'Approved on reviewer override', tone: 'approve', render: 'approval',
        detail: 'The peer reviewer obtained the missing clinical detail directly from the facility during a peer-to-peer call and documented it, then approved an initial 14 days with continued-stay review.',
      },
    ],
    denySteps: [
      {
        id: 'c6', nodeId: 'denial', agent: 'Determination & Notification Agent',
        title: 'Plain-language denial letter issued', tone: 'reject', render: 'denial',
        detail: 'The agent drafts a plain-language notice that cites the exact criteria applied and lists the specific missing documentation; the peer reviewer signs it. The letter tells the member and facility precisely what would support an appeal or a new request.',
      },
    ],
    approval: {
      authNumber: 'AUTH-2026-118307',
      approvedService: 'Residential SUD treatment (H0017)',
      units: '14 days initial (09/10/2026 – 09/23/2026), continued-stay review required',
      validFrom: '09/10/2026',
      validTo: '09/23/2026',
      notes: [
        'Approved after peer-to-peer review supplied the missing ASAM dimensions 4–6.',
        'Continued stay beyond day 14 requires an updated ASAM assessment and discharge plan.',
        'This authorization is a determination of medical necessity and is not a guarantee of payment.',
      ],
    },
    denial: {
      reasons: [
        'Your plan covers residential substance-use treatment when the full ASAM assessment shows that a 24-hour structured setting is medically necessary and outpatient options have been tried first.',
        'The request we received did not include ASAM dimensions 4–6, and did not show that intensive outpatient or outpatient treatment was tried in the last 90 days.',
      ],
      criteriaCited: ['SUD Level of Care Criteria — Residential (ASAM 3.5) §3.2 (complete six-dimension assessment)', '§3.4 (trial of lower level of care)'],
      missing: ['ASAM assessment dimensions 4–6', 'Records of IOP/outpatient treatment within the past 90 days', 'Discharge plan supporting the requested 30-day stay'],
      appealRights: 'You have the right to appeal within 180 days, to request an external review, and to a peer-to-peer discussion with the reviewing clinician at 1-800-555-0134. If your provider submits the missing documentation, a new request will be reviewed promptly.',
    },
  },
]
