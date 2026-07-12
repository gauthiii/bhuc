// Public service facade. Screens import ONLY from here.
// VITE_USE_MOCK=true (default) → in-memory fixtures (mockData).
// VITE_USE_MOCK=false → live calls to the FastAPI backend at VITE_API_BASE (/api/x_bhuc).
// The two implementations share the same method signatures, so flipping the flag needs no page changes.
import { mock } from './mockData'
import { getAccessToken, currentEmail } from './auth'

// Signed-in patient email, appended to open/pre-auth patient CRUD calls (email -> u_bhuc_patient).
const pemail = () => encodeURIComponent(currentEmail('patient'))

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false'
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/x_bhuc'

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`API ${res.status} ${path}`)
  return (await res.json()) as T
}

// Live implementation (used only when USE_MOCK=false). Kept thin; extend as backend routes land.
const live = {
  frontDoorChat: (text: string) => j('/frontdoor/chat', { method: 'POST', body: JSON.stringify({ text }) }),
  agentChat: (key: string, text: string) => j(`/agent/${key}/chat`, { method: 'POST', body: JSON.stringify({ text }) }),
  getProfile: () => j('/patient/me'),
  getMe: (email: string) => j(`/patient/me?email=${encodeURIComponent(email)}`),
  registerPatient: (data: unknown) => j('/patient/register', { method: 'POST', body: JSON.stringify(data) }),
  getScreeningStatus: (email: string) => j(`/screening/status?email=${encodeURIComponent(email)}`),
  submitScreeningBatch: (patient: string, screenings: unknown[]) => j('/intake/screening/batch', { method: 'POST', body: JSON.stringify({ patient, screenings }) }),
  getDashboard: () => j('/dashboard'),
  submitConsent: (c: unknown) => j('/consent', { method: 'POST', body: JSON.stringify(c) }),
  getInstrumentQuestions: mock.getInstrumentQuestions, // static content
  submitScreening: (instrument: string, answers: unknown) => j('/intake/screening', { method: 'POST', body: JSON.stringify({ instrument, answers }) }),
  getEligibility: () => j(`/eligibility?email=${pemail()}`),
  requestCounselor: () => j('/financial-counselor/request', { method: 'POST', body: JSON.stringify({ email: currentEmail('patient') }) }),
  getAppointments: () => j(`/appointments?email=${pemail()}`),
  getAvailability: () => j('/appointments/availability'),
  bookAppointment: (req: import('../lib/types').BookReq) => j('/appointments', { method: 'POST', body: JSON.stringify({ ...req, email: currentEmail('patient') }) }),
  getCarePlan: () => j(`/careplan?email=${pemail()}`),
  getThreads: () => j(`/messages/threads?email=${pemail()}`),
  getThread: (id: string) => j(`/messages/threads/${id}`),
  sendMessage: (threadId: string, body: string) => j('/message', { method: 'POST', body: JSON.stringify({ threadId, body, email: currentEmail('patient') }) }),
  getCheckIn: (id: string) => j(`/checkin/${id}?email=${pemail()}`),
  submitCheckIn: (id: string, answers: unknown) => j(`/checkin/${id}`, { method: 'POST', body: JSON.stringify({ ...(answers as object), email: currentEmail('patient') }) }),
  getWorklist: () => j('/worklist'),
  getChart: (patientId: string, reveal = false, clinicianEmail?: string) => {
    const qs = new URLSearchParams()
    if (reveal) qs.set('reveal', '1')
    if (clinicianEmail) qs.set('clinicianEmail', clinicianEmail)
    const q = qs.toString()
    return j(`/patient/${patientId}/chart${q ? `?${q}` : ''}`)
  },
  setConsent: (body: unknown) => j('/patient/consent', { method: 'PATCH', body: JSON.stringify(body) }),
  getRiskDetail: (id: string) => j(`/risk/${id}`),
  confirmRisk: (id: string, action: string, rationale: string, band?: string) => j('/risk/confirm', { method: 'POST', body: JSON.stringify({ id, action, rationale, band }) }),
  getDocumentation: (id: string, clinicianEmail?: string) => j(`/note/${id}${clinicianEmail ? `?clinicianEmail=${encodeURIComponent(clinicianEmail)}` : ''}`),
  getNotesSummary: (patientId: string) => j(`/notes/summary/${patientId}`),
  getLatestNote: (patientId: string, clinicianEmail?: string) => j(`/note/latest/${patientId}${clinicianEmail ? `?clinicianEmail=${encodeURIComponent(clinicianEmail)}` : ''}`),
  draftNewNote: (patientId: string, screening?: string) => j(`/note/new/${patientId}${screening ? `?screening=${encodeURIComponent(screening)}` : ''}`, { method: 'POST', body: '{}' }),
  signNote: (id: string, unverifiedLines?: string[], noteText?: string) => j('/note/sign', { method: 'POST', body: JSON.stringify({ id, unverifiedLines, noteText }) }),
  getOutputIntegrity: () => j('/governance/output-integrity'),
  getPromptInjection: () => j('/governance/prompt-injection'),
  getAIAssets: () => j('/governance/ai-assets'),
  getAIAssetDetail: (id: string) => j(`/governance/ai-assets/${id}`),
  checkHallucination: (agentKey: string, output: string) => j('/hallucination/check', { method: 'POST', body: JSON.stringify({ agentKey, output }) }),
  getPriorAuth: (patientId: string, clinicianEmail?: string) =>
    j(`/priorauth?patient=${patientId}${clinicianEmail ? `&clinicianEmail=${encodeURIComponent(clinicianEmail)}` : ''}`),
  listPriorAuth: (patientId: string, clinicianEmail?: string) =>
    j(`/priorauth/all?patient=${patientId}${clinicianEmail ? `&clinicianEmail=${encodeURIComponent(clinicianEmail)}` : ''}`),
  askCoverage: (question: string) => j('/priorauth', { method: 'POST', body: JSON.stringify({ question }) }),
  getPriorAuthDxOptions: (patientId: string) => j(`/priorauth/dx-options?patient=${patientId}`),
  draftPriorAuth: (req: import('../lib/types').PriorAuthDraftReq) => j('/priorauth/draft', { method: 'POST', body: JSON.stringify(req) }),
  savePriorAuth: (id: string, edits: Record<string, string>, clinicianEmail?: string) => j('/priorauth/save', { method: 'POST', body: JSON.stringify({ id, edits, clinicianEmail }) }),
  submitPriorAuth: (id: string, edits?: Record<string, string>, clinicianEmail?: string) => j('/priorauth/submit', { method: 'POST', body: JSON.stringify({ id, edits: edits ?? {}, clinicianEmail }) }),
  deletePriorAuth: (id: string) => j(`/priorauth/${id}`, { method: 'DELETE' }),
  checkNotePart2: (id: string) => j('/note/part2-check', { method: 'POST', body: JSON.stringify({ id }) }),
  listPatients: () => j('/patients'),
  // Scheduling review queue (Agent 6 v2)
  getClinicianCalendar: () => j('/clinician/calendar'),
  getSchedulingQueue: () => j('/scheduling/queue'),
  runScheduling: () => j('/scheduling/run', { method: 'POST', body: '{}' }),
  acceptAppointment: (id: string) => j('/scheduling/accept', { method: 'POST', body: JSON.stringify({ id }) }),
  rejectAppointment: (id: string) => j('/scheduling/reject', { method: 'POST', body: JSON.stringify({ id }) }),
  getFairness: () => j('/governance/fairness'),
  getDisposition: (id: string) => j(`/disposition/${id}`),
  getEscalations: () => j('/escalations'),
  acknowledgeEscalation: (id: string, clinicianEmail?: string) => j('/escalations/acknowledge', { method: 'POST', body: JSON.stringify({ id, clinicianEmail }) }),
  resolveEscalation: (id: string, clinicianEmail?: string) => j('/escalations/resolve', { method: 'POST', body: JSON.stringify({ id, clinicianEmail }) }),
  getNotifications: () => j('/notifications'),
}

// Per-endpoint live overrides. The rest of the app stays on mock (its CRUD routes
// aren't built), but specific agent-backed flows call the live FastAPI backend:
//   VITE_FRONTDOOR_LIVE — Front-Door chat (Agent 1)
//   VITE_AGENTS_LIVE   — Risk Identification (Agent 2) + Clinical Documentation (Agent 3)
// Flip the whole app with VITE_USE_MOCK=false once all backend routes land.
const FRONTDOOR_LIVE = (import.meta.env.VITE_FRONTDOOR_LIVE ?? 'true') !== 'false'
const AGENTS_LIVE = (import.meta.env.VITE_AGENTS_LIVE ?? 'true') !== 'false'

// getDocumentation receives a patientId from the Chart "Start note" link; route it to
// the idempotent for-patient draft endpoint (returns an existing draft or drafts one).
const liveAgent2and3 = {
  submitScreening: live.submitScreening,
  submitScreeningBatch: live.submitScreeningBatch,
  getWorklist: live.getWorklist,
  getRiskDetail: live.getRiskDetail,
  confirmRisk: live.confirmRisk,
  getDocumentation: live.getDocumentation,
  getNotesSummary: live.getNotesSummary,
  getLatestNote: live.getLatestNote,
  draftNewNote: live.draftNewNote,
  signNote: live.signNote,
  getOutputIntegrity: live.getOutputIntegrity,
  getPromptInjection: live.getPromptInjection,
  getAIAssets: live.getAIAssets,
  getAIAssetDetail: live.getAIAssetDetail,
  checkHallucination: live.checkHallucination,
  getMe: live.getMe,
  registerPatient: live.registerPatient,
  getScreeningStatus: live.getScreeningStatus,
  agentChat: live.agentChat,
  getChart: live.getChart,
  setConsent: live.setConsent,
  checkNotePart2: live.checkNotePart2,
  getPriorAuth: live.getPriorAuth,
  listPriorAuth: live.listPriorAuth,
  getPriorAuthDxOptions: live.getPriorAuthDxOptions,
  askCoverage: live.askCoverage,
  draftPriorAuth: live.draftPriorAuth,
  savePriorAuth: live.savePriorAuth,
  submitPriorAuth: live.submitPriorAuth,
  deletePriorAuth: live.deletePriorAuth,
  // Care-team CRUD screens now wired live (BE-6): Coverage/P5, Appointments/P6,
  // Care plan/P7, Messages/P8, Check-in/P9, Scheduling/C8 (Agent 6), Disposition/C7.
  getEligibility: live.getEligibility,
  requestCounselor: live.requestCounselor,
  getAppointments: live.getAppointments,
  getAvailability: live.getAvailability,
  bookAppointment: live.bookAppointment,
  getCarePlan: live.getCarePlan,
  getThreads: live.getThreads,
  getThread: live.getThread,
  sendMessage: live.sendMessage,
  getCheckIn: live.getCheckIn,
  submitCheckIn: live.submitCheckIn,
  listPatients: live.listPatients,
  getClinicianCalendar: live.getClinicianCalendar,
  getSchedulingQueue: live.getSchedulingQueue,
  runScheduling: live.runScheduling,
  acceptAppointment: live.acceptAppointment,
  rejectAppointment: live.rejectAppointment,
  getFairness: live.getFairness,
  getDisposition: live.getDisposition,
  getEscalations: live.getEscalations,
  acknowledgeEscalation: live.acknowledgeEscalation,
  resolveEscalation: live.resolveEscalation,
  getNotifications: live.getNotifications,
}

const overrides = USE_MOCK
  ? {
      ...mock,
      ...(FRONTDOOR_LIVE ? { frontDoorChat: live.frontDoorChat } : {}),
      ...(AGENTS_LIVE ? liveAgent2and3 : {}),
    }
  : (live as any)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = overrides as typeof mock
export const IS_MOCK = USE_MOCK && !FRONTDOOR_LIVE && !AGENTS_LIVE
