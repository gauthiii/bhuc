// In-memory fixtures + mock endpoint implementations.
// Used when VITE_USE_MOCK=true (default) so every screen renders with no backend.
import type {
  Appointment, AvailabilitySlot, CarePlan, ChatReply, CheckIn, CheckInResult, CoverageAnswer,
  DispositionCase, DocumentationDraft, Eligibility, Message, MessageThread, PatientChart,
  PatientProfile, PriorAuthPacket, RiskDetail, SchedulingRecommendation, ScreeningQuestion,
  ScreeningResult, SendMessageResult, WorklistItem, Instrument, ConsentRecord, DashboardSummary,
  MeResponse, ScreeningStatusItem, BatchScreeningResult, NotesSummary,
} from '../lib/types'
import { FACILITY } from '../lib/facility'

const wait = (ms = 320) => new Promise((r) => setTimeout(r, ms))
const iso = (offsetH: number) => new Date(Date.now() + offsetH * 3600_000).toISOString()

const CRISIS_PATTERNS = [
  'kill myself', 'suicide', 'suicidal', 'end my life', 'want to die', 'hurt myself',
  'self harm', 'self-harm', 'overdose', "can't go on", 'no reason to live',
]
export function detectCrisis(text: string): boolean {
  const t = text.toLowerCase()
  return CRISIS_PATTERNS.some((p) => t.includes(p))
}

export const mockProfile: PatientProfile = {
  number: 'BHUC_PATIENT_001', firstName: 'Maya', lastName: 'Alvarez', preferredName: 'Maya',
  dateOfBirth: '1996-04-12', email: 'maya@example.com', phone: '+15125550142',
  insuranceProvider: 'Blue Shield', insuranceMemberId: 'BS-88213', selfPay: false,
  registrationStatus: 'verified', profileComplete: true, hipaaConsent: true, part2Consent: true,
  tcpaSmsConsent: false, riskBand: 'moderate',
}

const upcomingAppt: Appointment = {
  id: 'appt-01', number: 'BHUC_APPOINTMENT_001', start: iso(26), end: iso(27),
  visitType: 'Urgent behavioral', modality: 'telehealth', clinician: 'Dr. R. Finch',
  status: 'confirmed', telehealthUrl: '#',
}

export const mock = {
  // ---- Front door ----
  async frontDoorChat(text: string): Promise<ChatReply> {
    await wait()
    if (detectCrisis(text)) {
      return { reply: "I'm really glad you reached out. Your safety matters — please call or text 988 now, or tap to connect with a counselor.", riskLevel: 'crisis', crisis: true, suggestedActions: [{ type: 'crisis', label: 'Connect me to a counselor' }] }
    }
    // Facility-info answers grounded in the same facts as the BHUC Facility Information KB.
    const t = text.toLowerCase()
    const has = (...w: string[]) => w.some((x) => t.includes(x))
    let reply =
      has('hour', 'open', 'close', 'time') ? `Our walk-in urgent care hours are ${FACILITY.hours.walkIn}. Telehealth is ${FACILITY.hours.telehealth.toLowerCase()}, and crisis support (988) is available 24/7. [Source: Hours of operation]`
      : has('insurance', 'cover', 'plan', 'aetna', 'cigna', 'medicaid', 'medicare') ? `We accept ${FACILITY.insurers.join(', ')}. Don't see your plan? Call ${FACILITY.phone} — we can verify coverage. Self-pay and sliding-scale pricing are also available. [Source: Insurance we accept]`
      : has('where', 'location', 'address', 'parking', 'directions') ? `We're at ${FACILITY.address}. Free on-site parking is available in the lot behind the building. [Source: Location and parking]`
      : has('phone', 'call', 'contact', 'number') ? `You can reach the front desk at ${FACILITY.phone}. In a crisis, call or text 988 anytime; for a life-threatening emergency call 911. [Source: Contact us]`
      : has('bring', 'need', 'prepare') ? `Please bring: ${FACILITY.whatToBring.join('; ')}. [Source: What to bring to your visit]`
      : has('telehealth', 'video', 'virtual', 'online visit') ? `${FACILITY.telehealth} [Source: Telehealth visits]`
      : has('service', 'offer', 'do you', 'treat', 'help with') ? `We offer: ${FACILITY.services.slice(0, 4).join('; ')}, and more. [Source: Services we offer]`
      : has('cost', 'pay', 'price', 'afford', 'self-pay', 'uninsured') ? `${FACILITY.selfPay} [Source: Self-pay and financial assistance]`
      : has('register', 'sign up', 'start', 'new patient') ? `You can register online in this portal (including the separate 42 CFR Part 2 consent) or in person at the front desk. [Source: How to register and start care]`
      : `Thanks for reaching out to ${FACILITY.name}. I can help with hours, insurance, location, services, or starting registration. How can I help?`
    return {
      reply, riskLevel: 'none', crisis: false,
      suggestedActions: [{ type: 'book', label: 'Book a visit' }, { type: 'coverage', label: 'Check coverage' }],
    }
  },

  // ---- Patient profile / dashboard ----
  async getProfile(): Promise<PatientProfile> { await wait(); return mockProfile },
  async getMe(_email?: string): Promise<MeResponse> { await wait(); return { registered: true, profile: { ...mockProfile, patientId: 'mock-patient-sys-id' } } },
  async registerPatient(_data?: unknown): Promise<MeResponse> { await wait(); return { registered: true, profile: { ...mockProfile, patientId: 'mock-patient-sys-id' } } },
  async getScreeningStatus(_email?: string): Promise<ScreeningStatusItem[]> {
    await wait()
    return [
      { screeningId: 'BHUC_SCREENING_003', instrument: 'PHQ-9', stage: 'reviewed', stageLabel: 'Reviewed by clinician', submittedAt: iso(-1) },
      { screeningId: 'BHUC_SCREENING_002', instrument: 'C-SSRS', stage: 'under_review', stageLabel: 'Under clinician review', submittedAt: iso(-1) },
      { screeningId: 'BHUC_SCREENING_001', instrument: 'GAD-7', stage: 'submitted', stageLabel: 'Submitted', submittedAt: iso(0) },
    ]
  },
  async submitScreeningBatch(_patient: string, screenings: { instrument: Instrument }[]): Promise<BatchScreeningResult> {
    await wait(1200)
    return { ok: true, count: screenings.length, anyEscalate: false, results: screenings.map((s) => ({ instrument: s.instrument, screeningId: 'BHUC_SCREENING_0XX', escalate: false })) }
  },
  async getDashboard(): Promise<DashboardSummary> {
    await wait()
    return { nextAppointment: upcomingAppt, carePlanStatus: 'in_progress', carePlanPendingTasks: 1, unreadMessages: 2, registrationComplete: true }
  },

  // ---- Consent ----
  async submitConsent(c: ConsentRecord) { await wait(); return { recorded: true, consentId: 'BHUC_CONSENT_00' + (Math.floor(1 + Math.random() * 8)) } },

  // ---- Screening ----
  getInstrumentQuestions(instrument: Instrument): ScreeningQuestion[] {
    const scale = [
      { value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' },
      { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' },
    ]
    if (instrument === 'phq9') {
      return Array.from({ length: 9 }, (_, i) => ({ id: `q${i + 1}`, text: PHQ9[i], options: scale }))
    }
    if (instrument === 'gad7') {
      return Array.from({ length: 7 }, (_, i) => ({ id: `q${i + 1}`, text: GAD7[i], options: scale }))
    }
    // C-SSRS (yes/no)
    const yn = [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]
    return CSSRS.map((text, i) => ({ id: `q${i + 1}`, text, options: yn }))
  },
  async submitScreening(instrument: Instrument, answers: Record<string, number | string>): Promise<ScreeningResult> {
    await wait(600)
    if (instrument === 'phq9') {
      const score = Object.values(answers).reduce<number>((a, b) => a + (Number(b) || 0), 0)
      const item9 = Number(answers['q9']) > 0
      return { instrument, score, severity: score >= 15 ? 'moderately_severe' : score >= 10 ? 'moderate' : 'mild', riskBand: item9 || score >= 15 ? 'high' : 'moderate', confidence: 89, flags: item9 ? ['item9_positive'] : [], escalate: item9, nextInstrument: 'gad7' }
    }
    if (instrument === 'gad7') {
      const score = Object.values(answers).reduce<number>((a, b) => a + (Number(b) || 0), 0)
      return { instrument, score, severity: score >= 15 ? 'severe' : 'moderate', riskBand: 'moderate', confidence: 84, escalate: false, nextInstrument: null }
    }
    const positive = Object.values(answers).some((v) => v === 'yes')
    return { instrument, riskBand: positive ? 'high' : 'low', confidence: 91, escalate: positive, flags: positive ? ['cssrs_positive'] : [], nextInstrument: 'phq9' }
  },

  // ---- Eligibility ----
  async getEligibility(): Promise<Eligibility> {
    await wait()
    return { status: 'active', payer: 'Blue Shield', plan: 'PPO 500', effectiveDate: '2026-01-01', estimate: { visitType: 'urgent_behavioral', allowedAmount: 220, patientResponsibility: 40, currency: 'USD', asOf: '2026-07-06' } }
  },
  async requestCounselor() { await wait(); return { requestId: 'fc-231', sla: '1_business_day' } },

  // ---- Appointments ----
  async getAppointments(): Promise<{ upcoming: Appointment[]; past: Appointment[] }> {
    await wait()
    return { upcoming: [upcomingAppt], past: [{ id: 'appt-00', start: iso(-240), visitType: 'Intake', modality: 'in_person', clinician: 'Dr. Grant', status: 'completed' }] }
  },
  async getAvailability(): Promise<AvailabilitySlot[]> {
    await wait()
    return [10, 11, 14, 15].map((h, i) => ({ slotId: `s${i}`, start: iso(24 + h) }))
  },
  async bookAppointment(slotId: string): Promise<Appointment> {
    await wait()
    return { id: 'appt-new', number: 'BHUC_APPOINTMENT_002', start: iso(48), visitType: 'Urgent behavioral', modality: 'telehealth', clinician: 'Dr. Finch', status: 'confirmed' }
  },

  // ---- Care plan ----
  async getCarePlan(): Promise<CarePlan> {
    await wait()
    return {
      status: 'finalized', finalizedAt: iso(-18),
      summary: "Continue weekly therapy and daily medication. Practice the coping steps in your safety plan. Return or call 988 if you feel unsafe.",
      safetyPlan: {
        warningSigns: ['Trouble sleeping', 'Feeling hopeless', 'Withdrawing from people'],
        copingSteps: ['Call a support contact', 'Use grounding breathing', 'Remove access to means'],
        supportContacts: [{ name: 'Sister — Elena', phone: '+15125550111' }, { name: 'BHUC Care Team', phone: '+15125550100' }],
        crisisLine: '988',
      },
      medications: [{ name: 'Sertraline', dose: '50 mg', schedule: 'Once daily (morning)', purpose: 'Helps with depression and anxiety' }],
      nextSteps: [{ id: 'n1', text: 'Follow-up visit in 7 days', dueDate: iso(120), acknowledged: false }],
      pdfUrl: '#',
    }
  },

  // ---- Messaging ----
  async getThreads(): Promise<MessageThread[]> {
    await wait()
    return [
      { id: 'th-12', subject: 'Question about my medication', lastMessage: 'Is it okay to take my dose at night?', timestamp: iso(-2), unread: true },
      { id: 'th-08', subject: 'Appointment reminder', lastMessage: 'See you Thursday.', timestamp: iso(-48), unread: false },
    ]
  },
  async getThread(threadId: string): Promise<Message[]> {
    await wait()
    return [
      { id: 'm1', threadId, body: 'Hi, is it okay to take my dose at night instead of the morning?', senderType: 'patient', timestamp: iso(-3), status: 'read', distressLevel: 'none' },
      { id: 'm2', threadId, body: 'Great question — yes, evening dosing is fine. Let us know if it affects your sleep.', senderType: 'care_team', timestamp: iso(-2), status: 'read', distressLevel: 'none' },
    ]
  },
  async sendMessage(threadId: string, body: string): Promise<SendMessageResult> {
    await wait()
    const level = detectCrisis(body) ? 'crisis' : 'none'
    return { messageId: 'm-' + Date.now(), threadId, status: 'sent', distress: { level } }
  },

  // ---- Check-in ----
  async getCheckIn(id: string): Promise<CheckIn> {
    await wait()
    return {
      id, dueDate: iso(2),
      questions: [
        { id: 'wellbeing', text: 'Overall, how are you feeling today? (0 = worst, 10 = best)', options: Array.from({ length: 11 }, (_, i) => ({ value: i, label: String(i) })) },
        { id: 'medAdherence', text: 'Are you taking your medications as prescribed?', options: [{ value: 'yes', label: 'Yes' }, { value: 'mostly', label: 'Mostly' }, { value: 'no', label: 'No' }, { value: 'na', label: 'N/A' }] },
        { id: 'selfHarm', text: 'In the past few days, have you had thoughts of harming yourself?', options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }] },
      ],
    }
  },
  async submitCheckIn(id: string, answers: Record<string, number | string>): Promise<CheckInResult> {
    await wait()
    const escalate = answers['selfHarm'] === 'yes' || Number(answers['wellbeing']) <= 2
    return { recorded: true, escalate, nextCheckIn: iso(7 * 24) }
  },

  // ================= CLINICIAN =================
  async getWorklist(): Promise<WorklistItem[]> {
    await wait()
    return [
      { screeningId: 'BHUC_SCREENING_003', patientId: 'BHUC_PATIENT_001', patientName: 'Maya Alvarez', riskBand: 'high', confidence: 89, waitMinutes: 4, requiresConfirmation: true },
      { screeningId: 'BHUC_SCREENING_002', patientId: 'BHUC_PATIENT_004', patientName: 'J. Okafor', riskBand: 'moderate', confidence: 78, waitMinutes: 12, requiresConfirmation: true },
      { screeningId: 'BHUC_SCREENING_001', patientId: 'BHUC_PATIENT_007', patientName: 'S. Kim', riskBand: 'low', confidence: 66, waitMinutes: 22, requiresConfirmation: false },
    ]
  },
  async getChart(patientId: string, canSeePart2 = false): Promise<PatientChart> {
    await wait()
    const mask = (v: string) => (canSeePart2 ? { value: v, masked: false } : { value: null, masked: true })
    return {
      patientId, number: 'BHUC_PATIENT_001',
      name: { value: 'Maya Alvarez', masked: false },
      dateOfBirth: { value: '1996-04-12', masked: false },
      demographics: [
        { label: 'Insurance', value: { value: 'Blue Shield PPO 500', masked: false } },
        { label: 'SUD treatment history (42 CFR Part 2)', value: mask('Prior outpatient SUD program, 2024') },
      ],
      aiSummary: {
        text: 'Patient presents with moderate-to-high suicide risk on intake screening (C-SSRS positive, PHQ-9 = 18). Reports sleep disturbance and hopelessness over 2 weeks. No current plan disclosed.',
        citations: [{ label: 'PHQ-9 result', source: 'BHUC_SCREENING_003' }, { label: 'C-SSRS result', source: 'BHUC_SCREENING_003' }],
      },
      history: [
        { date: iso(-2), note: 'Intake screening submitted; risk flagged for confirmation.', part2: false },
        { date: iso(-24 * 60), note: 'Prior SUD outpatient program referral.', part2: true },
      ],
    }
  },
  async getRiskDetail(screeningId: string): Promise<RiskDetail> {
    await wait()
    return {
      screeningId, patientName: 'Maya Alvarez', instrument: 'phq9', riskBand: 'high', confidence: 89,
      rationale: 'PHQ-9 total 18 (moderately severe). Item 9 (thoughts of self-harm) endorsed "more than half the days", which drives the High band regardless of total.',
      contributingInputs: [
        { label: 'PHQ-9 item 9 (self-harm)', answer: 'More than half the days' },
        { label: 'PHQ-9 total', answer: '18 / 27' },
        { label: 'C-SSRS ideation', answer: 'Positive' },
      ],
      status: 'pending',
    }
  },
  async confirmRisk(_id?: string, _action?: string, _rationale?: string) { await wait(); return { ok: true } },
  async getDocumentation(id: string): Promise<DocumentationDraft> {
    await wait()
    return {
      id, patientName: 'Maya Alvarez', signed: false,
      lines: [
        { id: 'l1', text: 'Patient reports depressed mood and poor sleep for ~2 weeks.', verified: true },
        { id: 'l2', text: 'Denies current intent or plan; endorses passive ideation.', verified: true },
        { id: 'l3', text: 'Mentioned a past medication that helped — name unclear on audio.', verified: false },
      ],
      suggestedCodes: [
        { code: 'F32.1', type: 'ICD-10', description: 'Major depressive disorder, single episode, moderate', accepted: false },
        { code: '90791', type: 'CPT', description: 'Psychiatric diagnostic evaluation', accepted: false },
      ],
    }
  },
  async getNotesSummary(_patientId?: string): Promise<NotesSummary> {
    await wait()
    return { count: 1, signedCount: 0, hasNotes: true, latestSigned: false, notes: [{ id: 'BHUC_CARE_PLAN_001', signed: false, state: 'draft', signedAt: '', createdAt: iso(0) }] }
  },
  async getLatestNote(patientId: string): Promise<DocumentationDraft | null> { await wait(); return { ...(await this.getDocumentation(patientId)) } },
  async draftNewNote(patientId: string): Promise<DocumentationDraft> { await wait(1200); return this.getDocumentation(patientId) },
  async signNote(_id?: string) { await wait(); return { ok: true } },
  async getPriorAuth(patientId: string): Promise<PriorAuthPacket> {
    await wait()
    return {
      id: 'pa-01', service: 'Intensive outpatient program (IOP)', status: 'draft', part2Gated: true,
      fields: [
        { label: 'Diagnosis', value: 'F32.1 Major depressive disorder', part2: false },
        { label: 'Requested service', value: 'IOP, 3x/week, 4 weeks', part2: false },
        { label: 'SUD treatment history (Part 2)', value: '•••••• (access-gated)', part2: true },
      ],
    }
  },
  async askCoverage(question: string): Promise<CoverageAnswer> {
    await wait(500)
    return { answer: 'IOP is covered under this plan when a psychiatric diagnostic evaluation and a documented step-up from outpatient are on file. Prior authorization is required.', citation: { policy: 'Blue Shield Behavioral Health Policy BH-204', section: '§3.2 Levels of Care' } }
  },
  async submitPriorAuth() { await wait(); return { ok: true, submittedAt: iso(0) } },
  async getScheduling(patientId: string): Promise<SchedulingRecommendation> {
    await wait()
    return {
      patientName: 'Maya Alvarez',
      fairness: { pass: true, excludedFields: ['race', 'ethnicity', 'gender', 'zip', 'insurance_type'] },
      matches: [
        { clinician: 'Dr. R. Finch', specialty: 'Addiction psychiatry', availability: 'Tomorrow 10:00 AM', matchReason: 'Credential + availability match for urgent behavioral' },
        { clinician: 'Dr. L. Osei', specialty: 'Psychiatry', availability: 'Tomorrow 2:00 PM', matchReason: 'Next-available licensed match' },
      ],
    }
  },
  async confirmScheduling() { await wait(); return { ok: true } },
  async getDisposition(id: string): Promise<DispositionCase> {
    await wait()
    return {
      id, patientName: 'Maya Alvarez',
      aiDischargeInstructions: 'Continue Sertraline 50mg daily. Attend follow-up within 7 days. Use safety plan. Call or text 988 if unsafe.',
      aiSafetyPlanTemplate: 'Warning signs: … | Coping steps: … | Support contacts: … | Crisis line: 988',
      referralOptions: [{ id: 'r1', label: 'IOP referral' }, { id: 'r2', label: 'Outpatient therapy' }, { id: 'r3', label: 'Peer support' }],
    }
  },
}

const PHQ9 = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure',
  'Trouble concentrating on things',
  'Moving or speaking slowly, or being fidgety/restless',
  'Thoughts that you would be better off dead, or of hurting yourself',
]
const GAD7 = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
]
const CSSRS = [
  'Have you wished you were dead or wished you could go to sleep and not wake up?',
  'Have you actually had any thoughts of killing yourself?',
  'Have you been thinking about how you might do this?',
  'Have you had these thoughts and had some intention of acting on them?',
  'Have you started to work out the details of how to kill yourself? Do you intend to carry out this plan?',
  'Have you done anything, started to do anything, or prepared to do anything to end your life?',
]
