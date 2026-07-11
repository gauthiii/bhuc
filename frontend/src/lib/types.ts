// BHUC domain types — shared contract for pages, the service layer, and mock fixtures.
// Field shapes track the u_bhuc_* tables (see ../../tables.md) but use camelCase for the app.

export type RiskBand = 'low' | 'moderate' | 'high' | 'unknown'
export type DistressLevel = 'none' | 'elevated' | 'crisis'
export type Instrument =
  | 'c_ssrs' | 'phq9' | 'gad7'                                   // core mental-health spine
  | 'nida_qs'                                                    // SUD gateway screen
  | 'audit' | 'dast10' | 'craving' | 'sows' | 'bam' | 'socrates8'  // SUD battery (42 CFR Part 2)
export type ConsentType = 'hipaa' | 'part2_sud' | 'tcpa_sms'

// ---- Patient domain ----
export interface PatientProfile {
  patientId?: string // u_bhuc_patient sys_id
  number: string // BHUC_PATIENT_001
  firstName: string
  lastName: string
  preferredName?: string
  dateOfBirth?: string
  email: string
  phone: string
  insuranceProvider?: string
  insuranceMemberId?: string
  selfPay: boolean
  registrationStatus: 'draft' | 'pending' | 'verified' | 'rejected'
  profileComplete: boolean
  hipaaConsent: boolean
  part2Consent: boolean
  tcpaSmsConsent: boolean
  riskBand: RiskBand
}

export interface MeResponse {
  registered: boolean
  profile: PatientProfile | null
}

export interface ScreeningStatusItem {
  screeningId: string
  instrument: string
  stage: 'submitted' | 'under_review' | 'reviewed'
  stageLabel: string
  submittedAt: string
}

export interface BatchScreeningResult {
  ok: boolean
  count: number
  anyEscalate: boolean
  results: { instrument: Instrument; screeningId: string; escalate: boolean }[]
}

export interface DashboardSummary {
  nextAppointment?: Appointment
  carePlanStatus: 'none' | 'in_progress' | 'finalized'
  carePlanPendingTasks: number
  unreadMessages: number
  registrationComplete: boolean
}

// ---- Front-door / chat ----
export interface ChatReply {
  reply: string
  riskLevel: 'none' | 'elevated' | 'crisis'
  crisis: boolean
  suggestedActions?: { type: string; label: string }[]
  // Prompt-injection output filter (Agent 1): true when the reply was blocked + replaced
  // with a safe refusal; injectionCategory names which control fired.
  filtered?: boolean
  injectionCategory?: string
}

export interface ChatTurn {
  id: string
  role: 'user' | 'agent'
  text: string
  filtered?: boolean
}

// ---- Consent ----
export interface ConsentRecord {
  number?: string
  consentType: ConsentType
  granted: boolean
  version?: string
  scope?: string
  signature?: string
  signedAt?: string
  phone?: string
}

// ---- Screening ----
export interface ScreeningQuestion {
  id: string
  text: string
  options: { value: number | string; label: string }[]
}
export interface ScreeningResult {
  instrument: Instrument
  score?: number
  severity?: string
  riskBand?: RiskBand
  confidence?: number
  flags?: string[]
  rationale?: string
  escalate: boolean
  nextInstrument?: Instrument | null
}

// ---- Eligibility ----
export interface Eligibility {
  status: 'active' | 'pending' | 'self_pay' | 'none'
  payer?: string
  plan?: string
  effectiveDate?: string
  estimate?: { visitType: string; allowedAmount: number; patientResponsibility: number; currency: string; asOf: string }
}

// ---- Appointments ----
export interface Appointment {
  id: string
  number?: string
  start: string
  end?: string
  visitType: string
  modality: 'in_person' | 'telehealth'
  clinician?: string
  status: 'proposed' | 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show'
  location?: string
  telehealthUrl?: string
}
export interface AvailabilitySlot { slotId: string; start: string }

// ---- Care plan ----
export interface CarePlan {
  status: 'none' | 'in_progress' | 'finalized'
  finalizedAt?: string
  summary?: string
  safetyPlan?: { warningSigns: string[]; copingSteps: string[]; supportContacts: { name: string; phone: string }[]; crisisLine: string }
  medications?: { name: string; dose: string; schedule: string; purpose: string }[]
  nextSteps?: { id: string; text: string; dueDate?: string; acknowledged: boolean }[]
  pdfUrl?: string
}

// ---- Messaging ----
export interface MessageThread { id: string; subject: string; lastMessage: string; timestamp: string; unread: boolean }
export interface Message {
  id: string
  threadId: string
  body: string
  senderType: 'patient' | 'care_team'
  timestamp: string
  status: 'sent' | 'read' | 'failed'
  distressLevel: DistressLevel
}
export interface SendMessageResult { messageId: string; threadId: string; status: string; distress: { level: DistressLevel } }

// ---- Check-in ----
export interface CheckIn { id: string; dueDate?: string; questions: ScreeningQuestion[] }
export interface CheckInResult { recorded: boolean; escalate: boolean; nextCheckIn?: string }

// ---- Clinician domain ----
export type ClinicalAction = 'pending' | 'confirmed' | 'adjusted' | 'rejected'

export interface WorklistItem {
  screeningId: string
  patientId: string
  patientNumber?: string // BHUC_PATIENT_00x (shown as subtext, not sys_id)
  patientName: string // may be masked
  riskBand: RiskBand
  confidence: number
  instrument: string // c_ssrs | phq9 | gad7
  updatedAt: string // sys_updated_on (ISO) — drives the "Updated" time-ago column
  clinicalAction: ClinicalAction // drives the Status column
  requiresConfirmation: boolean
  waitMinutes?: number // legacy, unused
  noteCount?: number
  screeningCount?: number
}

export interface HallucinationClaim { text: string; score: number; grounded: boolean; evidence: string }
export interface HallucinationCheck {
  agentKey: string
  kbDoc: string
  kbFile: string
  algorithm: string
  groundingScore: number      // 0-100
  hallucinationScore: number  // 0-100
  threshold: number           // 0-100 overall
  claimFloor: number          // 0-100 per-claim
  verdict: 'grounded' | 'possible_hallucination'
  possibleHallucination: boolean
  claimCount: number
  flaggedCount: number
  kbSentenceCount: number
  claims: HallucinationClaim[]
}

export interface OutputIntegritySummary {
  agent2: {
    label: string; total: number; avgConfidence: number; lowConfidence: number
    reviewed: number; pending: number; confirmed: number; adjusted: number; rejected: number
    disagreeRatePct: number
  }
  agent3: {
    label: string; total: number; withUnverified: number; unverifiedRatePct: number
    avgUnverifiedLines: number; signed: number; unsigned: number
  }
}

// AI Asset Management — mirrors the AI Control Tower Managed / Unmanaged asset inventory.
export interface AIAssetRow {
  name: string
  builtBy: string
  type: string
  lifecycle: string
  risk: string
  managed: boolean
}
export interface AIAssetSummary {
  bhuc: { managed: AIAssetRow[]; unmanaged: AIAssetRow[] }
  instance: { totalSystems: number; managed: number; unmanaged: number }
}

// Prompt-injection defense monitoring (Agent 1 / Front-Door output filter).
export interface PromptInjectionSummary {
  total: number
  inputAttempts: number
  byCategory: { category: string; label: string; count: number }[]
  recent: { category: string; label: string; matched: string; input: string; at: string }[]
  guardrailsActive: boolean
}

export interface NotesSummary {
  count: number
  signedCount: number
  hasNotes: boolean
  latestSigned: boolean
  notes: { id: string; signed: boolean; state: string; signedAt: string; createdAt: string }[]
}

export interface MaskableField { value: string | null; masked: boolean }
export interface Part2Note { number: string; signed: boolean; signedAt: string; summary: string; note: string }
export interface PatientChart {
  patientId: string
  number: string
  part2Consent?: boolean
  part2Role?: boolean
  name: MaskableField
  dateOfBirth: MaskableField
  demographics: { label: string; value: MaskableField }[]
  aiSummary: { text: string; citations: { label: string; source: string }[] }
  history: { date: string; note: string; part2: boolean }[]
  part2Content?: Part2Note[]
}

export interface RiskDetail {
  screeningId: string
  patientId?: string
  patientName: string
  instrument: Instrument
  riskBand: RiskBand
  confidence: number
  rationale: string
  clinicianRationale?: string
  contributingInputs: { label: string; answer: string }[]
  status: 'pending' | 'confirmed' | 'adjusted' | 'rejected'
}

export interface DocumentationDraft {
  id: string
  patientName: string
  screeningId?: string
  lines: { id: string; text: string; verified: boolean }[]
  suggestedCodes: { code: string; type: 'ICD-10' | 'CPT'; description: string; accepted: boolean }[]
  signed: boolean
  containsPart2?: boolean
  part2Masked?: boolean
}

export interface CoverageAnswer { answer: string; citation: { policy: string; section: string } }
export interface PriorAuthField { id: string; label: string; value: string; editable: boolean; redacted: boolean; multiline: boolean }
export interface PriorAuthSection { id: string; title: string; fields: PriorAuthField[] }
export interface PriorAuthDoc { sections: PriorAuthSection[]; attachments: string[] }
export interface PriorAuthPacket { id: string; sysId?: string; service: string; serviceMasked?: boolean; status: 'draft' | 'submitted'; part2Gated: boolean; part2Role?: boolean; part2Consent?: boolean; draftedByAgent?: boolean; document: PriorAuthDoc }
export interface DxOption { code: string; label: string }
export interface PriorAuthDraftReq { patient: string; service: string; diagnosis: string; secondaryDiagnoses?: string[]; requestedUnits: string; payer: string; clinicianEmail?: string }
export interface Part2CheckResult { note: string; sensitivity: string; containsPart2: boolean }

export interface PatientListItem { number: string; name: string; gender?: string; race?: string; ethnicity?: string }

export interface BookReq { slotId?: string; start?: string; reasonCategory: string; reasonText?: string; visitType?: string; modality?: string }

// ---- Scheduling review queue (Agent 6 v2) ----
export interface SchedulingQueueItem {
  id: string; number: string; patientName: string; patientNumber: string; status: string
  reasonCategory: string; reasonLabel: string; reasonText: string
  requestedStart: string; suggestedStart: string; urgency: string; visitType: string; modality: string
}
export interface SchedulingBoard { pendingCount: number; proposed: SchedulingQueueItem[]; pending: SchedulingQueueItem[] }
export interface SchedulingRunResult extends SchedulingBoard { ok: boolean; newProposals: number; error?: string }

// ---- Clinician calendar / dashboard ----
export interface CalendarAppointment {
  id: string; number: string; patientId: string; patientName: string; patientNumber: string
  start: string; status: string; reasonCategory: string; reasonLabel: string; visitType: string; modality: string
}
export interface ClinicianCalendar { pendingCount: number; appointments: CalendarAppointment[] }

// ---- Scheduling fairness (governance) ----
export interface FairnessGroup { group: string; count: number; avgWaitDays: number }
export interface FairnessMetrics {
  total: number
  byGender: FairnessGroup[]; byRace: FairnessGroup[]; byEthnicity: FairnessGroup[]; byAge: FairnessGroup[]
  fairnessRate: { gender: number; race: number; ethnicity: number; age: number; overall: number }
}

export interface SchedulingRecommendation {
  patientName: string
  fairness: { pass: boolean; excludedFields: string[] }
  matches: { clinician: string; specialty: string; availability: string; matchReason: string }[]
}

export interface DispositionCase {
  id: string
  patientName: string
  aiDischargeInstructions: string
  aiSafetyPlanTemplate: string
  referralOptions: { id: string; label: string }[]
}
