import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { HumanInLoopNote } from '../../components/Shell'
import { Panel, StatusBadge, Spinner, ErrorState, Button, Field, Select, Textarea } from '../../components/ui'
import { api } from '../../services/api'
import type { DispositionCase } from '../../lib/types'

const DISPOSITIONS = [
  { value: '', label: 'Select a disposition…' },
  { value: 'discharge_home', label: 'Discharge home with follow-up' },
  { value: 'iop', label: 'Refer to intensive outpatient (IOP)' },
  { value: 'inpatient', label: 'Admit / transfer to inpatient' },
  { value: 'crisis', label: 'Crisis stabilization' },
]

// C7 — Disposition. AI-drafted instructions + safety plan shown as editable drafts to finalize.
export function ClinicianDisposition() {
  const { id } = useParams()
  const [data, setData] = useState<DispositionCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [disposition, setDisposition] = useState('')
  const [instructions, setInstructions] = useState('')
  const [safetyPlan, setSafetyPlan] = useState('')
  const [referrals, setReferrals] = useState<string[]>([])
  const [finalized, setFinalized] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.getDisposition(id!)
      setData(d)
      setInstructions(d.aiDischargeInstructions)
      setSafetyPlan(d.aiSafetyPlanTemplate)
    } catch {
      setError("Couldn't load the disposition case.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  function toggleReferral(rid: string) {
    setReferrals((rs) => (rs.includes(rid) ? rs.filter((x) => x !== rid) : [...rs, rid]))
  }

  return (
    <ClinicianShell
      title="Disposition"
      intro="Finalize the disposition. AI-drafted discharge instructions and a safety-plan template are provided as editable drafts for you to complete."
    >
      {loading ? (
        <Spinner label="Loading disposition…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data ? (
        <div className="grid gap-4">
          <HumanInLoopNote>
            The AI drafts discharge instructions and a safety plan — the clinician reviews, edits, and finalizes them.
          </HumanInLoopNote>

          <Panel title={`Disposition — ${data.patientName}`}>
            <Field label="Disposition decision" required>
              <Select value={disposition} onChange={(e) => setDisposition(e.target.value)}>
                {DISPOSITIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Discharge instructions" actions={<StatusBadge tone="warning">AI draft — edit</StatusBadge>}>
              <Textarea rows={6} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </Panel>
            <Panel title="Safety plan" actions={<StatusBadge tone="warning">AI draft — edit</StatusBadge>}>
              <Textarea rows={6} value={safetyPlan} onChange={(e) => setSafetyPlan(e.target.value)} />
            </Panel>
          </div>

          <Panel title="Referral routing">
            <div className="grid gap-2">
              {data.referralOptions.map((r) => (
                <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${referrals.includes(r.id) ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={referrals.includes(r.id)} onChange={() => toggleReferral(r.id)} className="accent-teal-700" />
                  {r.label}
                </label>
              ))}
            </div>
            <div className="mt-4">
              {finalized
                ? <div className="flex items-center gap-2 text-sm text-teal-800"><CheckCircle2 className="h-4 w-4" /> Disposition finalized.</div>
                : <Button onClick={() => setFinalized(true)} disabled={!disposition}>Finalize disposition</Button>}
            </div>
          </Panel>
        </div>
      ) : null}
    </ClinicianShell>
  )
}
