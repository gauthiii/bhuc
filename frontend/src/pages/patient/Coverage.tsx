import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { api } from '../../services/api'
import type { Eligibility } from '../../lib/types'
import { PatientShell } from '../../components/portals'
import { Panel, Button, StatusBadge, Spinner, ErrorState, Textarea, type Tone } from '../../components/ui'
import { currency, formatDate } from '../../lib/format'

const STATUS_META: Record<Eligibility['status'], { tone: Tone; label: string }> = {
  active: { tone: 'success', label: 'Active coverage' },
  pending: { tone: 'warning', label: 'Verification pending' },
  self_pay: { tone: 'neutral', label: 'Self-pay' },
  none: { tone: 'neutral', label: 'No insurance on file' },
}

export function PatientCoverage() {
  const [data, setData] = useState<Eligibility | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [note, setNote] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    api.getEligibility()
      .then(setData)
      .catch(() => setError('We couldn’t verify your coverage right now.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function requestCounselor() {
    setRequesting(true)
    try {
      await api.requestCounselor()
      setRequested(true)
    } catch {
      setError('We couldn’t submit your request. Please try again.')
    } finally {
      setRequesting(false)
    }
  }

  const meta = data ? STATUS_META[data.status] : null

  return (
    <PatientShell title="Coverage & cost" intro="Review your insurance status and an estimate for your visit. Cost should never be a barrier to care.">
      <div className="mx-auto max-w-2xl space-y-5">
        {loading && <Panel title="Coverage status"><Spinner /></Panel>}
        {error && !loading && <Panel title="Coverage status"><ErrorState message={error} onRetry={load} /></Panel>}

        {data && !loading && meta && (
          <>
            <Panel title="Coverage status" actions={<Button variant="secondary" onClick={load}>Re-check coverage</Button>}>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge tone={meta.tone} icon={<ShieldCheck className="h-3.5 w-3.5" />}>{meta.label}</StatusBadge>
                {data.payer && <span className="text-sm text-slate-700">{data.payer}{data.plan ? ` · ${data.plan}` : ''}</span>}
              </div>
              {data.effectiveDate && <p className="mt-2 text-sm text-slate-500">Effective {formatDate(data.effectiveDate)}</p>}
              {(data.status === 'none' || data.status === 'self_pay') && (
                <p className="mt-3 text-sm text-slate-500">
                  <Link to="/patient/register" className="font-semibold text-teal-700 hover:underline">Update insurance info</Link> if this looks wrong.
                </p>
              )}
            </Panel>

            <Panel title="Estimated cost for your visit">
              {data.estimate ? (
                <>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      <tr><th scope="row" className="py-2 text-left font-medium text-slate-600">Visit type</th><td className="py-2 text-right text-slate-800">{data.estimate.visitType.replace(/_/g, ' ')}</td></tr>
                      <tr><th scope="row" className="py-2 text-left font-medium text-slate-600">Estimated allowed amount</th><td className="py-2 text-right text-slate-800">{currency(data.estimate.allowedAmount, data.estimate.currency)}</td></tr>
                      <tr><th scope="row" className="py-2 text-left font-medium text-slate-600">Your estimated responsibility</th><td className="py-2 text-right font-semibold text-slate-900">{currency(data.estimate.patientResponsibility, data.estimate.currency)}</td></tr>
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-slate-500">This is an estimate, not a bill. As of {formatDate(data.estimate.asOf)}.</p>
                </>
              ) : <p className="text-sm text-slate-500">A cost estimate isn’t available yet.</p>}
            </Panel>

            <Panel title="Need help with costs?">
              {requested ? (
                <div role="status" aria-live="polite" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                  A financial counselor will reach out within 1 business day.
                </div>
              ) : (
                <>
                  <p className="mb-3 text-sm text-slate-600">A financial counselor can walk you through your options, including self-pay pricing and payment plans.</p>
                  <label className="mb-3 block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Anything you’d like the counselor to know? (optional)</span>
                    <Textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I’m worried about affording the visit" />
                  </label>
                  <Button onClick={requestCounselor} disabled={requesting}>{requesting ? 'Sending…' : 'Talk to a financial counselor'}</Button>
                </>
              )}
            </Panel>
          </>
        )}
      </div>
    </PatientShell>
  )
}
