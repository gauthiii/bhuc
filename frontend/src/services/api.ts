// Public service facade. Screens import ONLY from here.
// VITE_USE_MOCK=true (default) → in-memory fixtures (mockData).
// VITE_USE_MOCK=false → live calls to the FastAPI backend at VITE_API_BASE (/api/x_bhuc).
// The two implementations share the same method signatures, so flipping the flag needs no page changes.
import { mock } from './mockData'
import { getAccessToken } from './auth'

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
  getEligibility: () => j('/eligibility'),
  requestCounselor: () => j('/financial-counselor/request', { method: 'POST', body: '{}' }),
  getAppointments: () => j('/appointments'),
  getAvailability: () => j('/appointments/availability'),
  bookAppointment: (slotId: string) => j('/appointments', { method: 'POST', body: JSON.stringify({ slotId }) }),
  getCarePlan: () => j('/careplan'),
  getThreads: () => j('/messages/threads'),
  getThread: (id: string) => j(`/messages/threads/${id}`),
  sendMessage: (threadId: string, body: string) => j('/message', { method: 'POST', body: JSON.stringify({ threadId, body }) }),
  getCheckIn: (id: string) => j(`/checkin/${id}`),
  submitCheckIn: (id: string, answers: unknown) => j(`/checkin/${id}`, { method: 'POST', body: JSON.stringify(answers) }),
  getWorklist: () => j('/worklist'),
  getChart: (patientId: string, reveal = false) => j(`/patient/${patientId}/chart${reveal ? '?reveal=1' : ''}`),
  setConsent: (body: unknown) => j('/patient/consent', { method: 'PATCH', body: JSON.stringify(body) }),
  getRiskDetail: (id: string) => j(`/risk/${id}`),
  confirmRisk: (id: string, action: string, rationale: string) => j('/risk/confirm', { method: 'POST', body: JSON.stringify({ id, action, rationale }) }),
  getDocumentation: (id: string) => j(`/note/${id}`),
  getNotesSummary: (patientId: string) => j(`/notes/summary/${patientId}`),
  getLatestNote: (patientId: string) => j(`/note/latest/${patientId}`),
  draftNewNote: (patientId: string, screening?: string) => j(`/note/new/${patientId}${screening ? `?screening=${encodeURIComponent(screening)}` : ''}`, { method: 'POST', body: '{}' }),
  signNote: (id: string, unverifiedLines?: string[]) => j('/note/sign', { method: 'POST', body: JSON.stringify({ id, unverifiedLines }) }),
  getOutputIntegrity: () => j('/governance/output-integrity'),
  checkHallucination: (agentKey: string, output: string) => j('/hallucination/check', { method: 'POST', body: JSON.stringify({ agentKey, output }) }),
  getPriorAuth: (patientId: string) => j(`/priorauth?patient=${patientId}`),
  askCoverage: (question: string) => j('/priorauth', { method: 'POST', body: JSON.stringify({ question }) }),
  draftPriorAuth: (req: import('../lib/types').PriorAuthDraftReq) => j('/priorauth/draft', { method: 'POST', body: JSON.stringify(req) }),
  submitPriorAuth: (id: string) => j('/priorauth/submit', { method: 'POST', body: JSON.stringify({ id }) }),
  checkNotePart2: (id: string) => j('/note/part2-check', { method: 'POST', body: JSON.stringify({ id }) }),
  getScheduling: (patientId: string) => j(`/scheduling?patient=${patientId}`),
  confirmScheduling: (id: string) => j('/scheduling/confirm', { method: 'POST', body: JSON.stringify({ id }) }),
  getDisposition: (id: string) => j(`/disposition/${id}`),
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
  checkHallucination: live.checkHallucination,
  getMe: live.getMe,
  registerPatient: live.registerPatient,
  getScreeningStatus: live.getScreeningStatus,
  agentChat: live.agentChat,
  getChart: live.getChart,
  setConsent: live.setConsent,
  checkNotePart2: live.checkNotePart2,
  getPriorAuth: live.getPriorAuth,
  askCoverage: live.askCoverage,
  draftPriorAuth: live.draftPriorAuth,
  submitPriorAuth: live.submitPriorAuth,
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
