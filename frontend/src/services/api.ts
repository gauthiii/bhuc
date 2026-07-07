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
  getProfile: () => j('/patient/me'),
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
  getChart: (patientId: string) => j(`/patient/${patientId}/chart`),
  getRiskDetail: (id: string) => j(`/risk/${id}`),
  confirmRisk: (id: string, action: string, rationale: string) => j('/risk/confirm', { method: 'POST', body: JSON.stringify({ id, action, rationale }) }),
  getDocumentation: (id: string) => j(`/note/${id}`),
  signNote: (id: string) => j('/note/sign', { method: 'POST', body: JSON.stringify({ id }) }),
  getPriorAuth: (patientId: string) => j(`/priorauth?patient=${patientId}`),
  askCoverage: (question: string) => j('/priorauth', { method: 'POST', body: JSON.stringify({ question }) }),
  submitPriorAuth: (id: string) => j('/priorauth/submit', { method: 'POST', body: JSON.stringify({ id }) }),
  getScheduling: (patientId: string) => j(`/scheduling?patient=${patientId}`),
  confirmScheduling: (id: string) => j('/scheduling/confirm', { method: 'POST', body: JSON.stringify({ id }) }),
  getDisposition: (id: string) => j(`/disposition/${id}`),
}

// Per-endpoint live override: the Front-Door Security Agent (Agent 1) is built and
// verified over A2A, but the other ~35 CRUD routes are not yet implemented on the
// backend (BE-6). So keep the app on mock, EXCEPT route the front-door chat to the
// live FastAPI backend when VITE_FRONTDOOR_LIVE=true (default on). Flip the whole
// app with VITE_USE_MOCK=false once the rest of the backend lands.
const FRONTDOOR_LIVE = (import.meta.env.VITE_FRONTDOOR_LIVE ?? 'true') !== 'false'

const base = USE_MOCK ? mock : (live as any)
const withLiveFrontdoor =
  USE_MOCK && FRONTDOOR_LIVE ? { ...mock, frontDoorChat: live.frontDoorChat } : base

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = withLiveFrontdoor as typeof mock
export const IS_MOCK = USE_MOCK && !FRONTDOOR_LIVE
