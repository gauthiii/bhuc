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
  /** Node to highlight on the swimlane (futureFlow ids for AI steps, currentFlow ids for manual steps). */
  nodeId: string
  agent: string
  title: string
  detail: string
  facts?: StepFact[]
  tone?: StepTone
  render?: 'approval' | 'denial'
  /** True when the actor is a person rather than an AI agent (all manual-mode steps). */
  human?: boolean
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
  /** Outcome badge shown when running the traditional (manual) mode. */
  manualBadge: string
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
  /** Traditional (manual) walkthrough of the same request — linear, no interactive decision. */
  manualSteps: SimStep[]
  manualApproval?: ApprovalNotice
  manualDenial?: DenialLetter
}

export const authCases: AuthCase[] = [
  // ── Case A: clean rule match → auto-approval ─────────────────────────────
  {
    id: 'iop',
    requestId: 'PA-2026-004821',
    label: 'Continue Intensive Outpatient Program (IOP)',
    pathBadge: 'Auto-approval',
    manualBadge: 'Approved — day 6',
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
    manualSteps: [
      {
        id: 'am1', nodeId: 'submit', agent: 'Clinic front office (human)', human: true,
        title: 'Authorization request faxed to the payer',
        detail: 'Clinic staff complete the plan\'s prior-authorization form by hand, print 22 pages of supporting records, and fax the packet to the UM intake line. There is no confirmation beyond the fax transmission report.',
        facts: [
          { label: 'Channel', value: 'Fax — UM intake line' },
          { label: 'Packet', value: 'PA form + 22 pages of records' },
          { label: 'Elapsed', value: 'Day 0' },
        ],
      },
      {
        id: 'am2', nodeId: 'receive', agent: 'UM Intake Coordinator (human)', human: true,
        title: 'Request keyed into the UM system',
        detail: 'The next business day, an intake coordinator matches the member, keys the request into the UM system by hand, and scans the fax into the document repository. A transposed member ID requires a call back to the clinic.',
        facts: [
          { label: 'Data entry', value: 'Manual, ~25 minutes' },
          { label: 'Rework', value: 'Member ID corrected by phone' },
          { label: 'Elapsed', value: 'Day 1' },
        ],
      },
      {
        id: 'am3', nodeId: 'checks', agent: 'UM Nurse Reviewer (human)', human: true,
        title: 'Benefits, claims and clinical history reviewed by hand',
        detail: 'A nurse reviewer pulls the benefits plan and claims history across two systems and reads the faxed notes. The attendance record is missing, so an additional-information request is faxed back to the clinic — pausing the decision clock.',
        facts: [
          { label: 'Systems consulted', value: 'Benefits, claims, imaged documents' },
          { label: 'Additional info', value: 'Attendance record requested by fax' },
          { label: 'Elapsed', value: 'Day 2–3 (clock extension issued)' },
        ],
      },
      {
        id: 'am4', nodeId: 'escalate', agent: 'Clinical review queue (human)', human: true,
        title: 'Case pends in the clinical review queue',
        detail: 'The clinic faxes the attendance record back on day 4. The case re-enters the nurse review queue behind the day\'s expedited work and waits for capacity.',
        facts: [
          { label: 'Queue position', value: 'Behind expedited cases' },
          { label: 'Elapsed', value: 'Day 4–5' },
        ],
      },
      {
        id: 'am5', nodeId: 'determine', agent: 'UM Nurse Reviewer (human)', human: true, tone: 'approve',
        title: 'Continued-stay criteria confirmed — approved',
        detail: 'With the complete record, the nurse confirms the IOP continued-stay criteria are met and approves 12 visits. The same clinical facts the AI read in minutes took six days to assemble by fax and phone.',
        facts: [
          { label: 'Determination', value: 'Approved — 12 visits' },
          { label: 'Elapsed', value: 'Day 6' },
        ],
      },
      {
        id: 'am6', nodeId: 'treatment', agent: 'Notification (mail / fax)', human: true, tone: 'approve', render: 'approval',
        title: 'Approval letter mailed and faxed',
        detail: 'The approval letter is mailed to the member and faxed to the clinic. The member\'s first authorized visit was rescheduled once while the request was pending.',
      },
      {
        id: 'am7', nodeId: 'monitor', agent: 'Clinical team (human)', human: true,
        title: 'Retrospective post-care review',
        detail: 'Utilization is reviewed retrospectively on a sampled basis after claims arrive; step-down planning depends on the provider\'s own reporting.',
        facts: [
          { label: 'Post-care review', value: 'Retrospective, sampled' },
        ],
      },
    ],
    manualApproval: {
      authNumber: 'AUTH-2026-117893',
      approvedService: 'Intensive outpatient psychiatric services, per diem (S9480)',
      units: '12 visits, 3×/week over 4 weeks',
      validFrom: '09/14/2026',
      validTo: '10/11/2026',
      notes: [
        'Determination issued on day 6 — an extension notice was required after additional information was requested.',
        'Approval letter mailed to the member; fax confirmation sent to the provider.',
        'This authorization is a determination of medical necessity and is not a guarantee of payment; payment is subject to eligibility and benefits at the time of service.',
      ],
    },
    approval: {
      authNumber: 'AUTH-2026-118102',
      approvedService: 'Intensive outpatient psychiatric services, per diem (S9480)',
      units: '12 visits, 3×/week over 4 weeks',
      validFrom: '09/08/2026',
      validTo: '10/05/2026',
      notes: [
        'Auto-approved — determination issued 3 minutes 42 seconds after receipt, within the 72-hour standard window.',
        'Continued treatment beyond the approved units requires a new continued-stay request.',
        'This authorization is a determination of medical necessity and is not a guarantee of payment; payment is subject to eligibility and benefits at the time of service.',
      ],
    },
  },

  // ── Case B: complex expedited inpatient admission → human review ─────────
  {
    id: 'inpatient',
    requestId: 'PA-2026-004876',
    label: 'Inpatient psychiatric admission (expedited)',
    pathBadge: 'Human review',
    manualBadge: 'Approved — hour 23 of 24',
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
    manualSteps: [
      {
        id: 'bm1', nodeId: 'submit', agent: 'Hospital UM department (human)', human: true,
        title: 'After-hours notification by phone and fax',
        detail: 'At 2:47 AM the hospital UM department calls the payer\'s after-hours line, reaches a voicemail, and faxes the ED psychiatric evaluation. The expedited 24-hour clock starts at receipt.',
        facts: [
          { label: 'Channel', value: 'Phone (voicemail) + fax' },
          { label: 'Clock started', value: '09/01/2026 02:47 ET (24-hour TAT)' },
        ],
      },
      {
        id: 'bm2', nodeId: 'receive', agent: 'UM Intake Coordinator (human)', human: true,
        title: 'Request processed at start of business',
        detail: 'The intake coordinator finds the fax at 7:00 AM, keys the admission request as expedited, and pages the on-call nurse reviewer. Seven hours of the 24-hour window are already gone.',
        facts: [
          { label: 'Picked up', value: 'Hour 7 of 24' },
        ],
      },
      {
        id: 'bm3', nodeId: 'checks', agent: 'UM Nurse Reviewer (human)', human: true,
        title: 'Clinical review — chasing the medical clearance',
        detail: 'The nurse reviews the ED evaluation but cannot find the medical clearance labs in the fax. Two phone calls to the inpatient unit later, the labs arrive by fax and the acuity picture is complete.',
        facts: [
          { label: 'Missing at intake', value: 'Medical clearance labs' },
          { label: 'Phone calls', value: '2 to the inpatient unit' },
          { label: 'Elapsed', value: 'Hour 10–16' },
        ],
      },
      {
        id: 'bm4', nodeId: 'escalate', agent: 'Physician Reviewer (human)', human: true,
        title: 'Peer-to-peer scheduled with the attending',
        detail: 'Inpatient admissions require physician review. The payer psychiatrist attempts a peer-to-peer with Dr. Webb — first attempt hits the unit\'s voicemail; the second connects.',
        facts: [
          { label: 'Peer-to-peer', value: 'Connected on attempt 2' },
          { label: 'Elapsed', value: 'Hour 20' },
        ],
      },
      {
        id: 'bm5', nodeId: 'determine', agent: 'Physician Reviewer (human)', human: true, tone: 'approve',
        title: 'Admission approved at hour 23',
        detail: 'The reviewing psychiatrist confirms all four acute inpatient criteria and approves 5 days with concurrent review at day 3 — one hour inside the expedited window.',
        facts: [
          { label: 'Determination', value: 'Approved — 5 days, concurrent review day 3' },
          { label: 'Elapsed', value: 'Hour 23 of 24' },
        ],
      },
      {
        id: 'bm6', nodeId: 'treatment', agent: 'Notification (phone / fax)', human: true, tone: 'approve', render: 'approval',
        title: 'Verbal approval phoned to the hospital',
        detail: 'The determination is phoned to the hospital UM department and confirmed by fax; the written notice follows by mail. Concurrent review at day 3 will again be conducted by phone and fax.',
      },
      {
        id: 'bm7', nodeId: 'monitor', agent: 'Concurrent review (human)', human: true,
        title: 'Concurrent review by phone at day 3',
        detail: 'A nurse reviewer calls the unit at day 3 for an updated clinical picture and discharge plan. Post-acute placement is arranged by the hospital\'s own case manager working the phones.',
        facts: [
          { label: 'Method', value: 'Telephonic review + faxed notes' },
        ],
      },
    ],
    manualApproval: {
      authNumber: 'AUTH-2026-118217',
      approvedService: 'Acute inpatient psychiatric admission (Rev 0124)',
      units: '5 days (09/01/2026 – 09/05/2026), concurrent review day 3',
      validFrom: '09/01/2026',
      validTo: '09/05/2026',
      notes: [
        'Expedited determination issued at hour 23 of the 24-hour window after two peer-to-peer attempts.',
        'Verbal notification by phone; written notice mailed within 24 hours.',
        'This authorization is a determination of medical necessity and is not a guarantee of payment; payment is subject to eligibility and benefits at the time of service.',
      ],
    },
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
    manualBadge: 'Denied — day 7',
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
    manualSteps: [
      {
        id: 'cm1', nodeId: 'submit', agent: 'Facility admissions office (human)', human: true,
        title: '30-day residential request faxed',
        detail: 'The facility faxes a 30-day residential treatment request with the intake assessment and a partial ASAM assessment. Nobody at the facility is notified that the packet is incomplete.',
        facts: [
          { label: 'Channel', value: 'Fax — UM intake line' },
          { label: 'Packet', value: 'Intake assessment + ASAM dimensions 1–3' },
          { label: 'Elapsed', value: 'Day 0' },
        ],
      },
      {
        id: 'cm2', nodeId: 'receive', agent: 'UM Intake Coordinator (human)', human: true,
        title: 'Request keyed and routed to clinical review',
        detail: 'The intake coordinator keys the request and routes it to the SUD review queue. The documentation gaps will not be discovered until a nurse opens the file.',
        facts: [
          { label: 'Elapsed', value: 'Day 1' },
        ],
      },
      {
        id: 'cm3', nodeId: 'checks', agent: 'UM Nurse Reviewer (human)', human: true,
        title: 'Gaps found — additional information requested by mail and fax',
        detail: 'The nurse finds ASAM dimensions 4–6 missing and no record of a lower-level-of-care trial. An additional-information request is faxed to the facility and mailed to the member, and the decision clock is extended.',
        facts: [
          { label: 'Missing', value: 'ASAM dims 4–6 · lower level-of-care trial · discharge plan' },
          { label: 'Elapsed', value: 'Day 2 (extension issued)' },
        ],
      },
      {
        id: 'cm4', nodeId: 'escalate', agent: 'Physician Reviewer queue (human)', human: true,
        title: 'No response — case pends to peer review',
        detail: 'The response window passes with no additional documentation received. The case pends to a physician peer reviewer for a determination on the record as submitted.',
        facts: [
          { label: 'Facility response', value: 'None received in window' },
          { label: 'Elapsed', value: 'Day 3–6' },
        ],
      },
      {
        id: 'cm5', nodeId: 'determine', agent: 'Physician Peer Reviewer (human)', human: true, tone: 'reject',
        title: 'Adverse determination on the submitted record',
        detail: 'The peer reviewer cannot establish medical necessity for residential care from the submitted record and issues an adverse determination. A peer-to-peer offer is noted in the file.',
        facts: [
          { label: 'Determination', value: 'Denied — insufficient documentation' },
          { label: 'Elapsed', value: 'Day 7' },
        ],
      },
      {
        id: 'cm6', nodeId: 'rejectLetter', agent: 'Notification (mail)', human: true, tone: 'reject', render: 'denial',
        title: 'Template denial letter mailed',
        detail: 'A standard template letter is mailed to the member and faxed to the facility. It cites the plan criteria in general terms — the member must call to learn exactly which documents were missing.',
      },
    ],
    manualDenial: {
      reasons: [
        'Based on review of the information received, the requested service does not meet the plan\'s medical necessity criteria for the requested level of care.',
        'This determination was made by a physician reviewer applying the plan\'s SUD Level of Care Criteria.',
      ],
      criteriaCited: ['SUD Level of Care Criteria — Residential (ASAM 3.5)'],
      missing: ['See plan criteria; contact Member Services for details regarding this determination.'],
      appealRights: 'You have the right to appeal within 180 days and to request an external review. To request a copy of the criteria used, or a peer-to-peer discussion, call Member Services at 1-800-555-0134 between 8:00 AM and 5:00 PM, Monday through Friday.',
    },
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
