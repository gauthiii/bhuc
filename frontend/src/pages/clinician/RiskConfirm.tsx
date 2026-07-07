import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { HumanInLoopNote } from '../../components/Shell'
import { Panel, RiskBadge, StatusBadge, Spinner, ErrorState, Button, Textarea, Field, RadioGroup } from '../../components/ui'
import { api } from '../../services/api'
import type { RiskDetail, RiskBand } from '../../lib/types'

type Decision = 'confirm' | 'adjust' | 'reject'

// C4 — Risk Confirmation (Human-in-the-Loop). Blocks until the clinician acts.
export function ClinicianRiskConfirm() {
  const { screeningId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<RiskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [decision, setDecision] = useState<Decision | null>(null)
  const [adjustedBand, setAdjustedBand] = useState<RiskBand | undefined>()
  const [rationale, setRationale] = useState('')
  const [attested, setAttested] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setData(await api.getRiskDetail(screeningId!))
    } catch {
      setError("Couldn't load the risk assessment.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [screeningId])

  const adjustNeedsBand = decision === 'adjust'
  const bandInvalid = adjustNeedsBand && (!adjustedBand || adjustedBand === data?.riskBand)
  const canSubmit = !!decision && rationale.trim().length >= 5 && attested && !bandInvalid && !submitting

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const action = decision === 'confirm' ? 'confirmed' : decision === 'adjust' ? 'adjusted' : 'rejected'
      await api.confirmRisk(screeningId!, action, rationale)
      navigate('/clinician/worklist')
    } catch {
      setError('Submitting the decision failed. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <ClinicianShell
      title="Confirm risk assessment"
      intro="Review the AI score against its exact contributing inputs, then confirm, adjust, or reject with a rationale."
    >
      {loading ? (
        <Spinner label="Loading risk detail…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data ? (
        <div className="grid gap-4">
          <HumanInLoopNote>
            Awaiting your confirmation — no orders, notes, or disposition can be finalized for this patient until you confirm, adjust, or reject this AI risk assessment. The agent never adjudicates risk; a human must.
          </HumanInLoopNote>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="AI assessment" subtitle={`${data.patientName} · ${data.instrument.toUpperCase()}`}>
              <div className="flex items-center gap-3">
                <RiskBadge band={data.riskBand} />
                <span className="text-sm text-slate-500">Confidence <span className="font-semibold tabular-nums text-slate-700">{(data.confidence / 100).toFixed(2)}</span></span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{data.rationale}</p>
              <p className="mt-3 text-xs text-slate-400">Screening {data.screeningId}</p>
            </Panel>

            <Panel title="Contributing inputs">
              <ul className="grid gap-2">
                {data.contributingInputs.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <span className="text-slate-600">{c.label}</span>
                    <span className="font-medium text-slate-800">{c.answer}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <Panel title="Your decision">
            <div className="grid gap-3 sm:grid-cols-3">
              <Button variant={decision === 'confirm' ? 'primary' : 'secondary'} onClick={() => setDecision('confirm')}>Confirm risk band</Button>
              <Button variant={decision === 'adjust' ? 'primary' : 'secondary'} onClick={() => setDecision('adjust')}>Adjust band…</Button>
              <Button variant={decision === 'reject' ? 'danger' : 'secondary'} onClick={() => setDecision('reject')}>Reject assessment</Button>
            </div>

            {decision === 'adjust' && (
              <div className="mt-4">
                <Field label="Adjusted band" required error={bandInvalid ? 'Choose a different band, or use Confirm to keep the AI band.' : undefined}>
                  <RadioGroup<RiskBand>
                    name="adjustedBand"
                    value={adjustedBand}
                    onChange={setAdjustedBand}
                    options={[{ value: 'high', label: 'High risk' }, { value: 'moderate', label: 'Moderate risk' }, { value: 'low', label: 'Low risk' }]}
                  />
                </Field>
              </div>
            )}

            <div className="mt-4">
              <Field label="Clinical rationale" required hint="Required for every decision (min. 5 characters).">
                <Textarea rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Document your clinical reasoning…" />
              </Field>
            </div>

            <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-0.5 accent-teal-700" />
              I attest this decision reflects my clinical judgment.
            </label>

            {!decision && (
              <p className="mt-3 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Select Confirm, Adjust, or Reject to proceed.</p>
            )}

            <div className="mt-4">
              <Button onClick={submit} disabled={!canSubmit}>{submitting ? 'Submitting…' : 'Submit decision'}</Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </ClinicianShell>
  )
}
