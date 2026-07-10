// In-memory fixtures + mock endpoint implementations.
// Used when VITE_USE_MOCK=true (default) so every screen renders with no backend.
import type {
  Appointment, AvailabilitySlot, CarePlan, ChatReply, CheckIn, CheckInResult, CoverageAnswer,
  DispositionCase, DocumentationDraft, Eligibility, Message, MessageThread, PatientChart,
  PatientProfile, PriorAuthPacket, RiskDetail, ScreeningQuestion,
  ScreeningResult, SendMessageResult, WorklistItem, Instrument, ConsentRecord, DashboardSummary,
  MeResponse, ScreeningStatusItem, BatchScreeningResult, NotesSummary, OutputIntegritySummary,
  HallucinationCheck,
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
  async setConsent(_body?: unknown): Promise<MeResponse> { await wait(); return { registered: true, profile: { ...mockProfile, patientId: 'mock-patient-sys-id' } } },
  async registerPatient(_data?: unknown): Promise<MeResponse> { await wait(); return { registered: true, profile: { ...mockProfile, patientId: 'mock-patient-sys-id' } } },
  async getScreeningStatus(_email?: string): Promise<ScreeningStatusItem[]> {
    await wait()
    return [
      { screeningId: 'BHUC_SCREENING_003', instrument: 'PHQ-9', stage: 'reviewed', stageLabel: 'Reviewed by clinician', submittedAt: iso(-1) },
      { screeningId: 'BHUC_SCREENING_002', instrument: 'C-SSRS', stage: 'under_review', stageLabel: 'Under clinician review', submittedAt: iso(-1) },
      { screeningId: 'BHUC_SCREENING_001', instrument: 'GAD-7', stage: 'submitted', stageLabel: 'Submitted', submittedAt: iso(0) },
    ]
  },
  async agentChat(key: string, text: string): Promise<{ agent: string; reply: string; state?: string }> {
    await wait(600)
    const names: Record<string, string> = { frontdoor: 'BHUC Front-Door Security Agent', risk: 'BHUC Risk Identification Agent', clinicaldoc: 'BHUC Clinical Documentation Agent' }
    return { agent: names[key] ?? key, reply: `**(demo)** Received: "${text}". In live mode this is relayed to the agent over A2A.`, state: 'completed' }
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
  getInstrumentQuestions(instrument: Instrument, variant?: 'alcohol' | 'drug'): ScreeningQuestion[] {
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
    if (instrument === 'nida_qs') return NIDA_QS
    if (instrument === 'audit') return AUDIT
    if (instrument === 'dast10') {
      // DAST-10: score = count of "yes" answers, except item 3 which is reverse-scored —
      // the option values already carry the scored points, so a plain sum is the total.
      return DAST10.map((text, i) => ({
        id: `q${i + 1}`, text,
        options: i === 2
          ? [{ value: 1, label: 'No' }, { value: 0, label: 'Yes' }]
          : [{ value: 0, label: 'No' }, { value: 1, label: 'Yes' }],
      }))
    }
    if (instrument === 'craving') return CRAVING
    if (instrument === 'sows') {
      const sowsScale = [
        { value: 0, label: 'Not at all' }, { value: 1, label: 'A little' },
        { value: 2, label: 'Moderately' }, { value: 3, label: 'Quite a bit' },
        { value: 4, label: 'Extremely' },
      ]
      return SOWS.map((text, i) => ({ id: `q${i + 1}`, text, options: sowsScale }))
    }
    if (instrument === 'bam') return BAM
    if (instrument === 'socrates8') {
      // SOCRATES v8, 19 items (CASAA, public domain): 8A alcohol wording / 8D drug wording.
      const items = variant === 'drug' ? SOCRATES_8D : SOCRATES_8A
      const likert = [
        { value: 1, label: 'NO! Strongly disagree' }, { value: 2, label: 'No, disagree' },
        { value: 3, label: '? Undecided or unsure' }, { value: 4, label: 'Yes, agree' },
        { value: 5, label: 'YES! Strongly agree' },
      ]
      return items.map((text, i) => ({ id: `q${i + 1}`, text, options: likert }))
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
  async bookAppointment(req: import('../lib/types').BookReq): Promise<Appointment> {
    await wait()
    return { id: 'appt-new', number: 'BHUC_APPOINTMENT_002', start: req.start ?? iso(48), visitType: 'Urgent behavioral', modality: 'telehealth', status: 'pending' }
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
      { screeningId: 'BHUC_SCREENING_003', patientId: 'BHUC_PATIENT_001', patientName: 'Maya Alvarez', riskBand: 'high', confidence: 89, instrument: 'c_ssrs', updatedAt: iso(-4 / 60), clinicalAction: 'pending', requiresConfirmation: true },
      { screeningId: 'BHUC_SCREENING_002', patientId: 'BHUC_PATIENT_004', patientName: 'J. Okafor', riskBand: 'moderate', confidence: 78, instrument: 'phq9', updatedAt: iso(-12 / 60), clinicalAction: 'adjusted', requiresConfirmation: false },
      { screeningId: 'BHUC_SCREENING_001', patientId: 'BHUC_PATIENT_007', patientName: 'S. Kim', riskBand: 'low', confidence: 66, instrument: 'gad7', updatedAt: iso(-1), clinicalAction: 'confirmed', requiresConfirmation: false },
    ]
  },
  async getChart(patientId: string, canSeePart2 = false, _clinicianEmail?: string): Promise<PatientChart> {
    await wait()
    const mask = (v: string) => (canSeePart2 ? { value: v, masked: false } : { value: null, masked: true })
    return {
      patientId, number: 'BHUC_PATIENT_001', part2Consent: true, part2Role: true,
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
      part2Content: canSeePart2
        ? [{ number: 'BHUC_CARE_PLAN_001', signed: true, signedAt: iso(-24 * 60), summary: 'Prior outpatient SUD program, 2024.', note: 'Chief Complaint: SUD follow-up.\n\nHPI: outpatient program 2024; discussed relapse-prevention plan.' }]
        : [],
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
  async confirmRisk(_id?: string, _action?: string, _rationale?: string, _band?: string) { await wait(); return { ok: true } },
  async getDocumentation(id: string, _clinicianEmail?: string): Promise<DocumentationDraft> {
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
  async getLatestNote(patientId: string, _clinicianEmail?: string): Promise<DocumentationDraft | null> { await wait(); return { ...(await this.getDocumentation(patientId)) } },
  async draftNewNote(patientId: string, _screening?: string): Promise<DocumentationDraft> { await wait(1200); return this.getDocumentation(patientId) },
  async signNote(_id?: string, _unverifiedLines?: string[], _noteText?: string) { await wait(); return { ok: true } },
  async checkHallucination(agentKey: string, output: string): Promise<HallucinationCheck> {
    await wait()
    const claims = output.split(/(?:[.;!?]\s+|\n+)/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3)
    const scored = claims.map((text, i) => {
      const score = Math.max(8, 62 - i * 9)
      return { text, score, grounded: score >= 20, evidence: score >= 20 ? 'PHQ-9 15–19 → moderately severe; item 9 non-zero triggers the crisis pathway.' : '' }
    })
    const grounding = scored.length ? Math.round(scored.reduce((a, c) => a + c.score, 0) / scored.length) : 0
    const flagged = scored.filter((c) => !c.grounded).length
    const possible = grounding < 35 || (scored.length > 0 && flagged / scored.length > 0.5)
    return {
      agentKey, kbDoc: agentKey === 'risk' ? 'BHUC Screening Scoring Rules' : 'BHUC Clinical Coding and Documentation',
      kbFile: '', algorithm: 'TF-IDF cosine extractive grounding (claim → best KB sentence)',
      groundingScore: grounding, hallucinationScore: 100 - grounding, threshold: 35, claimFloor: 20,
      verdict: possible ? 'possible_hallucination' : 'grounded', possibleHallucination: possible,
      claimCount: scored.length, flaggedCount: flagged, kbSentenceCount: 42, claims: scored,
    }
  },
  async getOutputIntegrity(): Promise<OutputIntegritySummary> {
    await wait()
    return {
      agent2: { label: 'BHUC Risk Identification Agent', total: 12, avgConfidence: 91, lowConfidence: 1, reviewed: 8, pending: 4, confirmed: 6, adjusted: 1, rejected: 1, disagreeRatePct: 25 },
      agent3: { label: 'BHUC Clinical Documentation Agent', total: 6, withUnverified: 5, unverifiedRatePct: 83, avgUnverifiedLines: 2, signed: 1, unsigned: 5 },
    }
  },
  async getPriorAuth(_patientId: string, _clinicianEmail?: string): Promise<PriorAuthPacket | null> {
    await wait()
    return {
      id: 'pa-01', service: 'Intensive outpatient program (IOP)', status: 'draft', part2Gated: true, draftedByAgent: true,
      fields: [
        { label: 'Diagnosis', value: 'F32.1 Major depressive disorder', part2: false },
        { label: 'Requested service', value: 'IOP, 3x/week, 4 weeks', part2: false },
        { label: 'SUD treatment history (Part 2)', value: '•••••• (access-gated)', part2: true },
      ],
    }
  },
  async listPriorAuth(patientId: string, clinicianEmail?: string): Promise<PriorAuthPacket[]> {
    const p = await this.getPriorAuth(patientId, clinicianEmail)
    return p ? [p] : []
  },
  async draftPriorAuth(req: { patient: string; service: string; diagnosis: string; requestedUnits: string; payer: string; clinicianEmail?: string }): Promise<PriorAuthPacket> {
    await wait(1600)
    return {
      id: 'pa-01', service: req.service || 'Intensive Outpatient (IOP)', status: 'draft', part2Gated: false, draftedByAgent: true,
      fields: [
        { label: 'Diagnosis', value: req.diagnosis || 'F33.1', part2: false },
        { label: 'Requested units', value: req.requestedUnits || '3x/week for 4 weeks', part2: false },
        { label: 'Payer', value: req.payer || 'Blue Shield', part2: false },
        { label: 'Coverage determination', value: 'Prior authorization is required; medical-necessity criteria met.', part2: false },
        { label: 'Citation', value: 'BH-204 · Levels of Care', part2: false },
      ],
    }
  },
  async askCoverage(question: string): Promise<CoverageAnswer> {
    await wait(500)
    return { answer: 'IOP is covered under this plan when a psychiatric diagnostic evaluation and a documented step-up from outpatient are on file. Prior authorization is required.', citation: { policy: 'Blue Shield Behavioral Health Policy BH-204', section: '§3.2 Levels of Care' } }
  },
  async submitPriorAuth(_id?: string) { await wait(); return { ok: true, status: 'submitted' } },
  async deletePriorAuth(id: string) { await wait(); return { ok: true, deleted: id } },
  async checkNotePart2(id: string): Promise<{ note: string; sensitivity: string; containsPart2: boolean }> {
    await wait(1600)
    return { note: id, sensitivity: 'part2', containsPart2: true }
  },
  async listPatients() {
    await wait()
    return [
      { number: 'BHUC_PATIENT_002', name: 'Maya Alvarez', gender: 'female', race: 'white', ethnicity: 'hispanic_or_latino' },
      { number: 'BHUC_PATIENT_007', name: 'Aisha Rahman', gender: 'female', race: 'asian', ethnicity: 'not_hispanic_or_latino' },
      { number: 'BHUC_PATIENT_008', name: 'Marcus Johnson', gender: 'male', race: 'black_or_african_american', ethnicity: 'not_hispanic_or_latino' },
    ]
  },
  async getClinicianCalendar() {
    await wait()
    const a = (id: string, name: string, num: string, hrs: number, status: string, cat: string, label: string) =>
      ({ id, number: 'BHUC_APPOINTMENT_' + id, patientId: num, patientName: name, patientNumber: num, start: iso(hrs), status, reasonCategory: cat, reasonLabel: label, visitType: 'Follow Up', modality: 'telehealth' })
    return {
      pendingCount: 5,
      appointments: [
        a('101', 'Maya Alvarez', 'BHUC_PATIENT_002', -72, 'completed', 'therapy', 'Therapy'),
        a('102', 'Marcus Johnson', 'BHUC_PATIENT_008', -24, 'completed', 'medication', 'Medication'),
        a('103', 'Aisha Rahman', 'BHUC_PATIENT_007', 6, 'confirmed', 'crisis', 'Crisis'),
        a('104', 'Wei Chen', 'BHUC_PATIENT_010', 30, 'confirmed', 'therapy', 'Therapy'),
        a('105', 'Sofia Ramirez', 'BHUC_PATIENT_009', 54, 'confirmed', 'intake', 'Intake'),
        a('106', 'Grace Kim', 'BHUC_PATIENT_015', 120, 'confirmed', 'medication', 'Medication'),
        a('107', 'Nia Okafor', 'BHUC_PATIENT_018', -120, 'completed', 'intake', 'Intake'),
      ],
    }
  },
  async getSchedulingQueue() {
    await wait()
    const q = (id: string, name: string, num: string, cat: string, label: string, req: string, sug: string, urg: string, status: string) =>
      ({ id, number: num, patientName: name, patientNumber: num, status, reasonCategory: cat, reasonLabel: label, reasonText: '', requestedStart: req, suggestedStart: sug, urgency: urg, visitType: 'Urgent Behavioral', modality: 'telehealth' })
    return {
      pendingCount: 2,
      proposed: [
        q('p1', 'Marcus Johnson', 'BHUC_PATIENT_008', 'crisis', 'Crisis', iso(30), iso(26), 'high', 'proposed'),
        q('p2', 'Aisha Rahman', 'BHUC_PATIENT_007', 'medication', 'Medication', iso(54), iso(50), 'moderate', 'proposed'),
      ],
      pending: [
        q('q1', 'Wei Chen', 'BHUC_PATIENT_010', 'therapy', 'Therapy', iso(72), '', '', 'pending'),
        q('q2', 'Sofia Ramirez', 'BHUC_PATIENT_009', 'intake', 'Intake', iso(96), '', '', 'pending'),
      ],
    }
  },
  async runScheduling() {
    await wait(2600)
    const b = await mock.getSchedulingQueue()
    return { ok: true, newProposals: b.pending.length, ...b, pending: [], pendingCount: 0 }
  },
  async acceptAppointment(_id: string) { await wait(); return { ok: true, status: 'confirmed' } },
  async rejectAppointment(_id: string) { await wait(); return { ok: true, status: 'pending' } },
  async getFairness() {
    await wait()
    return {
      total: 24,
      byGender: [ { group: 'Female', count: 11, avgWaitDays: 1.6 }, { group: 'Male', count: 10, avgWaitDays: 1.8 }, { group: 'Non-binary', count: 3, avgWaitDays: 1.7 } ],
      byEthnicity: [ { group: 'Hispanic or Latino', count: 6, avgWaitDays: 1.7 }, { group: 'Not Hispanic or Latino', count: 18, avgWaitDays: 1.7 } ],
      byAge: [ { group: '18-29', count: 7, avgWaitDays: 1.7 }, { group: '30-44', count: 10, avgWaitDays: 1.6 }, { group: '45-59', count: 5, avgWaitDays: 1.9 }, { group: '60+', count: 2, avgWaitDays: 1.8 } ],
      fairnessRate: { gender: 89, ethnicity: 100, age: 84, overall: 91 },
    }
  },
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

// ---- SUD battery (all instruments below are real, public-domain screens) ----

// NIDA Quick Screen V1.0 — "In the past year, how often have you used the following?"
const NIDA_FREQ = [
  { value: 0, label: 'Never' }, { value: 1, label: 'Once or twice' },
  { value: 2, label: 'Monthly' }, { value: 3, label: 'Weekly' },
  { value: 4, label: 'Daily or almost daily' },
]
const NIDA_QS: ScreeningQuestion[] = [
  { id: 'q1', text: 'Alcohol — for men, 5 or more drinks a day; for women, 4 or more drinks a day', options: NIDA_FREQ },
  { id: 'q2', text: 'Tobacco products', options: NIDA_FREQ },
  { id: 'q3', text: 'Prescription drugs for non-medical reasons', options: NIDA_FREQ },
  { id: 'q4', text: 'Illegal drugs', options: NIDA_FREQ },
]

// AUDIT (WHO Alcohol Use Disorders Identification Test) — 10 items, total 0–40.
const AUDIT_FREQ = [
  { value: 0, label: 'Never' }, { value: 1, label: 'Monthly or less' },
  { value: 2, label: '2–4 times a month' }, { value: 3, label: '2–3 times a week' },
  { value: 4, label: '4 or more times a week' },
]
const AUDIT_QTY = [
  { value: 0, label: '1 or 2' }, { value: 1, label: '3 or 4' }, { value: 2, label: '5 or 6' },
  { value: 3, label: '7, 8, or 9' }, { value: 4, label: '10 or more' },
]
const AUDIT_HOWOFTEN = [
  { value: 0, label: 'Never' }, { value: 1, label: 'Less than monthly' },
  { value: 2, label: 'Monthly' }, { value: 3, label: 'Weekly' },
  { value: 4, label: 'Daily or almost daily' },
]
const AUDIT_YESNO = [
  { value: 0, label: 'No' }, { value: 2, label: 'Yes, but not in the last year' },
  { value: 4, label: 'Yes, during the last year' },
]
const AUDIT: ScreeningQuestion[] = [
  { id: 'q1', text: 'How often do you have a drink containing alcohol?', options: AUDIT_FREQ },
  { id: 'q2', text: 'How many drinks containing alcohol do you have on a typical day when you are drinking?', options: AUDIT_QTY },
  { id: 'q3', text: 'How often do you have six or more drinks on one occasion?', options: AUDIT_HOWOFTEN },
  { id: 'q4', text: 'How often during the last year have you found that you were not able to stop drinking once you had started?', options: AUDIT_HOWOFTEN },
  { id: 'q5', text: 'How often during the last year have you failed to do what was normally expected of you because of drinking?', options: AUDIT_HOWOFTEN },
  { id: 'q6', text: 'How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?', options: AUDIT_HOWOFTEN },
  { id: 'q7', text: 'How often during the last year have you had a feeling of guilt or remorse after drinking?', options: AUDIT_HOWOFTEN },
  { id: 'q8', text: 'How often during the last year have you been unable to remember what happened the night before because of your drinking?', options: AUDIT_HOWOFTEN },
  { id: 'q9', text: 'Have you or someone else been injured because of your drinking?', options: AUDIT_YESNO },
  { id: 'q10', text: 'Has a relative, friend, doctor, or other health worker been concerned about your drinking or suggested you cut down?', options: AUDIT_YESNO },
]

// DAST-10 (Drug Abuse Screening Test) — past 12 months, "drug use" excludes alcohol.
// Yes = 1 except item 3, which is reverse-scored (Yes = 0). Total 0–10.
const DAST10 = [
  'Have you used drugs other than those required for medical reasons?',
  'Do you abuse more than one drug at a time?',
  'Are you always able to stop using drugs when you want to?',
  'Have you had "blackouts" or "flashbacks" as a result of drug use?',
  'Do you ever feel bad or guilty about your drug use?',
  'Does your spouse (or parents) ever complain about your involvement with drugs?',
  'Have you neglected your family because of your use of drugs?',
  'Have you engaged in illegal activities in order to obtain drugs?',
  'Have you ever experienced withdrawal symptoms (felt sick) when you stopped taking drugs?',
  'Have you had medical problems as a result of your drug use (e.g., memory loss, hepatitis, convulsions, bleeding)?',
]

// BAM — Brief Addiction Monitor (VA/Penn, Cacciola et al. 2013), 17 items, past 30 days.
// Subscales (scored server-side / by Agent 2): Use = q4,q5,q6; Risk = q1,q2,q3,q8,q11,q15;
// Protective = q9,q10,q12,q13,q14,q16. Item 17 is standalone (reverse-scored). Mixed anchors.
const BAM_HEALTH = [
  { value: 0, label: 'Excellent' }, { value: 1, label: 'Very good' }, { value: 2, label: 'Good' },
  { value: 3, label: 'Fair' }, { value: 4, label: 'Poor' },
]
const BAM_DAYS = [
  { value: 0, label: '0 days' }, { value: 1, label: '1–3 days' }, { value: 2, label: '4–8 days' },
  { value: 3, label: '9–15 days' }, { value: 4, label: '16–30 days' },
]
const BAM_INTENSITY = [
  { value: 0, label: 'Not at all' }, { value: 1, label: 'Slightly' }, { value: 2, label: 'Moderately' },
  { value: 3, label: 'Considerably' }, { value: 4, label: 'Extremely' },
]
const BAM_YESNO = [{ value: 0, label: 'No' }, { value: 4, label: 'Yes' }]
const BAM_PROGRESS = [
  { value: 4, label: 'Not at all' }, { value: 3, label: 'Slightly' }, { value: 2, label: 'Moderately' },
  { value: 1, label: 'Considerably' }, { value: 0, label: 'Extremely' },
]
const BAM: ScreeningQuestion[] = [
  { id: 'q1', text: 'In the past 30 days, would you say your physical health has been?', options: BAM_HEALTH },
  { id: 'q2', text: 'In the past 30 days, how many nights did you have trouble falling asleep or staying asleep?', options: BAM_DAYS },
  { id: 'q3', text: 'In the past 30 days, how many days have you felt depressed, anxious, angry, or very upset throughout most of the day?', options: BAM_DAYS },
  { id: 'q4', text: 'In the past 30 days, how many days did you drink ANY alcohol?', options: BAM_DAYS },
  { id: 'q5', text: 'In the past 30 days, how many days did you have at least 5 drinks (if you are a man) or at least 4 drinks (if you are a woman)?', options: BAM_DAYS },
  { id: 'q6', text: 'In the past 30 days, how many days did you use any illegal/street drugs or abuse any prescription medications?', options: BAM_DAYS },
  // (canonical item 7 = 7A–7G drug-type elaboration; unscored, not administered here)
  { id: 'q8', text: 'In the past 30 days, how much were you bothered by cravings or urges to drink alcohol or use drugs?', options: BAM_INTENSITY },
  { id: 'q9', text: 'How confident are you in your ability to be completely abstinent (clean) from alcohol and drugs in the next 30 days?', options: BAM_INTENSITY },
  { id: 'q10', text: 'In the past 30 days, how many days did you attend self-help meetings like AA or NA to support your recovery?', options: BAM_DAYS },
  { id: 'q11', text: 'In the past 30 days, how many days were you in any situations or with any people that might put you at an increased risk for using alcohol or drugs (risky people, places, or things)?', options: BAM_DAYS },
  { id: 'q12', text: 'Does your religion or spirituality help support your recovery?', options: BAM_INTENSITY },
  { id: 'q13', text: 'In the past 30 days, how many days did you spend much of the time at work, school, or doing volunteer work?', options: BAM_DAYS },
  { id: 'q14', text: 'Do you have enough income (from legal sources) to pay for necessities such as housing, transportation, food, and clothing for yourself and your dependents?', options: BAM_YESNO },
  { id: 'q15', text: 'In the past 30 days, how much have you been bothered by arguments or problems getting along with any family members or friends?', options: BAM_INTENSITY },
  { id: 'q16', text: 'In the past 30 days, how many days were you in contact or spent time with any family members or friends who are supportive of your recovery?', options: BAM_DAYS },
  { id: 'q17', text: 'How satisfied are you with your progress toward achieving your recovery goals?', options: BAM_PROGRESS },
]

// SOWS — Subjective Opiate Withdrawal Scale (Handelsman et al. 1987), 16 items, total 0–64.
// Public domain / freely available (NCETA/Flinders). Bands: 1–10 mild, 11–20 moderate, 21+ severe.
const SOWS = [
  'I feel anxious',
  'I feel like yawning',
  'I am perspiring',
  'My eyes are teary',
  'My nose is running',
  'I have goosebumps',
  'I am shaking',
  'I have hot flushes',
  'I have cold flushes',
  'My bones and muscles ache',
  'I feel restless',
  'I feel nauseous',
  'I feel like vomiting',
  'My muscles twitch',
  'I have cramps in my stomach',
  'I feel like using now',
]

// Craving & Triggers — CUSTOM BHUC clinic module (not a validated/copyrighted instrument).
// Captures craving intensity, triggers (before use), control, and after-use feelings.
// 7 items × 0–4 = total 0–28; operational bands only (low <10, moderate 10–19, high ≥20).
const CRAVING_FREQ = [
  { value: 0, label: 'Never' }, { value: 1, label: 'Rarely' }, { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' }, { value: 4, label: 'Nearly all the time' },
]
const CRAVING_INTENSITY = [
  { value: 0, label: 'None' }, { value: 1, label: 'Mild' }, { value: 2, label: 'Moderate' },
  { value: 3, label: 'Strong' }, { value: 4, label: 'Overwhelming' },
]
const CRAVING_RESIST = [
  { value: 0, label: 'Not at all difficult' }, { value: 1, label: 'Slightly difficult' },
  { value: 2, label: 'Moderately difficult' }, { value: 3, label: 'Very difficult' },
  { value: 4, label: 'Impossible to resist' },
]
const CRAVING_AGREE = [
  { value: 0, label: 'Not at all' }, { value: 1, label: 'A little' }, { value: 2, label: 'Somewhat' },
  { value: 3, label: 'Quite a bit' }, { value: 4, label: 'Very much' },
]
const CRAVING: ScreeningQuestion[] = [
  { id: 'q1', text: 'In the past week, how often did you think about drinking or using?', options: CRAVING_FREQ },
  { id: 'q2', text: 'At its strongest this past week, how intense was your urge or craving to use?', options: CRAVING_INTENSITY },
  { id: 'q3', text: 'If drugs or alcohol had been available, how difficult would it have been to resist using?', options: CRAVING_RESIST },
  { id: 'q4', text: 'How often were you around people, places, or things that set off an urge to use?', options: CRAVING_FREQ },
  { id: 'q5', text: 'How much are your urges set off by difficult feelings such as stress, sadness, anger, or loneliness?', options: CRAVING_AGREE },
  { id: 'q6', text: 'How much are your urges set off by social or celebratory situations, or being around others who are using?', options: CRAVING_AGREE },
  { id: 'q7', text: 'After using, how often do you feel regret, guilt, or feel worse than before?', options: CRAVING_FREQ },
]

// SOCRATES v8 (Miller & Tonigan), 19 items, PUBLIC DOMAIN. 8A = alcohol, 8D = drug wording.
// 5-point Likert 1–5 (NO! Strongly disagree → YES! Strongly agree), applied by getInstrumentQuestions.
// Subscales (scored by Agent 2): Recognition = items 1,3,7,10,12,15,17; Ambivalence = 2,6,11,16;
// Taking Steps = 4,5,8,9,13,14,18,19. Ranges: Re 7–35, Am 4–20, Ts 8–40.
//
const SOCRATES_8A = [
  'I really want to make changes in my drinking.',
  'Sometimes I wonder if I am an alcoholic.',
  'If I don\'t change my drinking soon, my problems are going to get worse.',
  'I have already started making some changes in my drinking.',
  'I was drinking too much at one time, but I\'ve managed to change my drinking.',
  'Sometimes I wonder if my drinking is hurting other people.',
  'I am a problem drinker.',
  'I\'m not just thinking about changing my drinking, I\'m already doing something about it.',
  'I have already changed my drinking, and I am looking for ways to keep from slipping back to my old pattern.',
  'I have serious problems with drinking.',
  'Sometimes I wonder if I am in control of my drinking.',
  'My drinking is causing a lot of harm.',
  'I am actively doing things now to cut down or stop drinking.',
  'I want help to keep from going back to the drinking problems that I had before.',
  'I know that I have a drinking problem.',
  'There are times when I wonder if I drink too much.',
  'I am an alcoholic.',
  'I am working hard to change my drinking.',
  'I have made some changes in my drinking, and I want some help to keep from going back to the way I used to drink.',
]
const SOCRATES_8D = [
  'I really want to make changes in my use of drugs.',
  'Sometimes I wonder if I am an addict.',
  'If I don\'t change my drug use soon, my problems are going to get worse.',
  'I have already started making some changes in my use of drugs.',
  'I was using drugs too much at one time, but I\'ve managed to change that.',
  'Sometimes I wonder if my drug use is hurting other people.',
  'I have a drug problem.',
  'I\'m not just thinking about changing my drug use, I\'m already doing something about it.',
  'I have already changed my drug use, and I am looking for ways to keep from slipping back to my old pattern.',
  'I have serious problems with drugs.',
  'Sometimes I wonder if I am in control of my drug use.',
  'My drug use is causing a lot of harm.',
  'I am actively doing things now to cut down or stop my use of drugs.',
  'I want help to keep from going back to the drug problems that I had before.',
  'I know that I have a drug problem.',
  'There are times when I wonder if I use drugs too much.',
  'I am a drug addict.',
  'I am working hard to change my drug use.',
  'I have made some changes in my drug use, and I want some help to keep from going back to the way I used before.',
]
