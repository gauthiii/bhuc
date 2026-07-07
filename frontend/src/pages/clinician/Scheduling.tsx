import { useEffect, useState } from 'react'
import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { Panel, StatusBadge, Spinner, ErrorState, Button } from '../../components/ui'
import { api } from '../../services/api'
import type { SchedulingRecommendation } from '../../lib/types'

const FOLLOW_UPS = [
  { name: 'Maya Alvarez', when: 'Discharged 3 days ago', due: 'Follow-up call due today' },
  { name: 'J. Okafor', when: 'Discharged 6 days ago', due: '7-day check-in tomorrow' },
]

// C8 — Scheduling. Fairness-check result applied and shown above the recommended matches.
export function ClinicianScheduling() {
  const [data, setData] = useState<SchedulingRecommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setData(await api.getScheduling('BHUC_PATIENT_001'))
    } catch {
      setError("Couldn't load scheduling recommendations.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function confirm(clinician: string) {
    setConfirming(clinician)
    try {
      await api.confirmScheduling()
      setConfirmed(clinician)
    } catch {
      setError('Confirming the match failed. Try again.')
    } finally {
      setConfirming(null)
    }
  }

  return (
    <ClinicianShell
      title="Scheduling"
      intro="The Scheduling Agent's recommended clinician matches, with the fairness check already applied. Confirm a match to book it."
    >
      {loading ? (
        <Spinner label="Loading recommendations…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data ? (
        <div className="grid gap-4">
          <div className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Fairness check {data.fairness.pass ? 'passed' : 'flagged'}</div>
              <p className="mt-0.5">Protected attributes were excluded from matching: {data.fairness.excludedFields.join(', ')}.</p>
            </div>
          </div>

          <Panel title={`Recommended matches — ${data.patientName}`}>
            <ul className="grid gap-3">
              {data.matches.map((m) => (
                <li key={m.clinician} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3">
                  <div>
                    <div className="font-medium text-slate-800">{m.clinician}</div>
                    <div className="text-xs text-slate-500">{m.specialty} · {m.availability}</div>
                    <div className="mt-1 text-xs text-slate-400">{m.matchReason}</div>
                  </div>
                  {confirmed === m.clinician
                    ? <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>Confirmed</StatusBadge>
                    : <Button variant="secondary" onClick={() => confirm(m.clinician)} disabled={confirming !== null || confirmed !== null}>{confirming === m.clinician ? 'Confirming…' : 'Confirm match'}</Button>}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Discharged-patient follow-ups">
            <ul className="grid gap-2">
              {FOLLOW_UPS.map((f) => (
                <li key={f.name} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-800">{f.name}</div>
                    <div className="text-xs text-slate-400">{f.when}</div>
                  </div>
                  <StatusBadge tone="warning">{f.due}</StatusBadge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}
    </ClinicianShell>
  )
}
