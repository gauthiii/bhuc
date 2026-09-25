import { useSyncExternalStore } from 'react'
import type { MariaEvidence, MariaFacts, OutcomeTone } from './legalMariaDay'

// Activity log for the /prior/legal/maria page. Each card adds a record when its run
// finishes; the 4:30 card reads them back. Separate from the Demo 1 / Demo 2 evidence
// pack. Kept in sessionStorage so it survives reloads during a presentation.

export interface MariaLogRecord {
  id: string
  cardId: string
  runId: string
  time: string
  title: string
  at: string
  tone: OutcomeTone
  outcome: string
  facts: MariaFacts
  evidence: MariaEvidence[]
}

const KEY = 'bcbsvt-maria-day-log'

function load(): MariaLogRecord[] {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

let records: MariaLogRecord[] = load()
const listeners = new Set<() => void>()

function set(next: MariaLogRecord[]) {
  records = next
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable (private window): keep the in-memory copy only.
  }
  listeners.forEach((l) => l())
}

export function addMariaLog(r: Omit<MariaLogRecord, 'id' | 'at'>) {
  // One record per card and run: re-running replaces it with a fresh timestamp.
  const id = `${r.cardId}:${r.runId}`
  set([...records.filter((x) => x.id !== id), { ...r, id, at: new Date().toISOString() }])
}

export function resetMariaLog() {
  set([])
}

export function useMariaLog() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => records,
  )
}
