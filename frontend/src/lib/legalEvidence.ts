import { useSyncExternalStore } from 'react'
import type { ReqId } from './legalGovernance'

// Evidence pack for the /prior/legal governance demo. Demo 1 and Demo 2 add a record
// each time a scenario runs to the end; the Evidence & decision page reads them.
// Kept in sessionStorage so it survives tab changes and reloads during a presentation,
// and starts empty in a new browser session.

export interface EvidenceRecord {
  id: string
  demo: 'identity' | 'purview'
  scenario: string
  title: string
  outcome: 'granted' | 'blocked' | 'allowed' | 'restricted' | 'notified' | 'not surfaced'
  reqs: ReqId[]
  source: string
  at: string
  fields: { k: string; v: string }[]
}

export interface Decision {
  status: 'approved' | 'deferred'
  at: string
  id: string
}

interface State {
  records: EvidenceRecord[]
  decision: Decision | null
}

const KEY = 'bcbsvt-copilot-governance-evidence'
const EMPTY: State = { records: [], decision: null }

function load(): State {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

let state: State = load()
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable (private window): keep the in-memory copy only.
  }
  listeners.forEach((l) => l())
}

export function addEvidence(r: Omit<EvidenceRecord, 'id' | 'at'>) {
  // One record per scenario (and policy mode): re-running replaces it with a fresh timestamp.
  const id = `${r.demo}:${r.scenario}`
  const record: EvidenceRecord = { ...r, id, at: new Date().toISOString() }
  set({ ...state, records: [...state.records.filter((x) => x.id !== id), record], decision: null })
}

export function recordDecision(status: Decision['status']) {
  const now = new Date()
  const id = `AIGC-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-LEGAL`
  set({ ...state, decision: { status, at: now.toISOString(), id } })
}

export function resetEvidence() {
  set(EMPTY)
}

export function useEvidence() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => state,
  )
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })
