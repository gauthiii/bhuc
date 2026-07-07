import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Download, LifeBuoy } from 'lucide-react'
import { api } from '../../services/api'
import type { CarePlan } from '../../lib/types'
import { PatientShell } from '../../components/portals'
import { Panel, Button, StatusBadge, Spinner, ErrorState } from '../../components/ui'
import { formatDate } from '../../lib/format'

export function PatientCarePlan() {
  const [data, setData] = useState<CarePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acked, setAcked] = useState<Record<string, boolean>>({})

  const load = () => {
    setLoading(true)
    setError(null)
    api.getCarePlan()
      .then((d) => { setData(d); setAcked(Object.fromEntries((d.nextSteps ?? []).map((s) => [s.id, s.acknowledged]))) })
      .catch(() => setError('Couldn’t load your care plan.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const finalized = data?.status === 'finalized'

  return (
    <PatientShell
      title="Care plan & discharge instructions"
      intro="Your plain-language plan from your care team."
      actions={data?.pdfUrl ? <a href={data.pdfUrl}><Button variant="primary"><Download className="h-4 w-4" /> Download PDF</Button></a> : undefined}
    >
      <div className="mx-auto max-w-2xl space-y-5">
        {loading && <Panel title="Your care plan"><Spinner /></Panel>}
        {error && !loading && <Panel title="Your care plan"><ErrorState message={error} onRetry={load} /></Panel>}

        {data && !loading && (
          <>
            {!finalized && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Your care team is finalizing your plan — you’ll be notified when it’s ready. In the meantime, if you’re in crisis, call or text 988.
              </div>
            )}

            {data.summary && (
              <Panel title="Your care plan summary">
                <p className="text-sm leading-relaxed text-slate-700">{data.summary}</p>
                {data.finalizedAt && <p className="mt-3 text-xs text-slate-400">Finalized {formatDate(data.finalizedAt)}</p>}
              </Panel>
            )}

            {finalized && data.safetyPlan && (
              <section className="rounded-2xl border border-teal-200 bg-teal-50/60 shadow-sm">
                <header className="flex items-center gap-2 border-b border-teal-100 px-5 py-4">
                  <LifeBuoy className="h-4 w-4 text-teal-700" />
                  <h2 className="text-base font-semibold text-teal-900">Your safety plan</h2>
                </header>
                <div className="space-y-4 px-5 py-4 text-sm text-teal-900">
                  <div className="rounded-lg bg-white/70 px-4 py-3">
                    <p className="font-semibold">If you feel unsafe, reach the crisis line now:</p>
                    <a href="tel:988" className="mt-1 inline-flex items-center gap-1 font-semibold text-teal-800 underline"><Phone className="h-3.5 w-3.5" /> Call or text {data.safetyPlan.crisisLine}</a>
                  </div>
                  <div>
                    <p className="font-semibold">Warning signs</p>
                    <ul className="mt-1 list-disc pl-5">{data.safetyPlan.warningSigns.map((w, i) => <li key={i}>{w}</li>)}</ul>
                  </div>
                  <div>
                    <p className="font-semibold">Coping steps</p>
                    <ul className="mt-1 list-disc pl-5">{data.safetyPlan.copingSteps.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                  <div>
                    <p className="font-semibold">Your support contacts</p>
                    <ul className="mt-1 space-y-1">
                      {data.safetyPlan.supportContacts.map((c, i) => (
                        <li key={i}>{c.name} — <a href={`tel:${c.phone}`} className="font-medium underline">{c.phone}</a></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {finalized && data.medications && data.medications.length > 0 && (
              <Panel title="Medications">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th scope="col" className="py-2 pr-3 font-medium">Name</th>
                        <th scope="col" className="py-2 pr-3 font-medium">Dose</th>
                        <th scope="col" className="py-2 pr-3 font-medium">Schedule</th>
                        <th scope="col" className="py-2 font-medium">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {data.medications.map((m, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-3 font-medium text-slate-800">{m.name}</td>
                          <td className="py-2 pr-3">{m.dose}</td>
                          <td className="py-2 pr-3">{m.schedule}</td>
                          <td className="py-2">{m.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {finalized && data.nextSteps && data.nextSteps.length > 0 && (
              <Panel title="Next steps">
                <ul className="space-y-2">
                  {data.nextSteps.map((s) => (
                    <li key={s.id}>
                      <label className="flex items-start gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={!!acked[s.id]} onChange={(e) => setAcked((a) => ({ ...a, [s.id]: e.target.checked }))} className="mt-0.5 accent-teal-700" />
                        <span>
                          {s.text}
                          {s.dueDate && <span className="text-slate-400"> · due {formatDate(s.dueDate)}</span>}
                          {acked[s.id] && <StatusBadge tone="success"><span className="ml-2">Acknowledged</span></StatusBadge>}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <Panel title="Questions?">
              <p className="mb-3 text-sm text-slate-600">For non-urgent questions, message your care team. For emergencies, call or text 988.</p>
              <Link to="/patient/messages"><Button variant="secondary">Message my care team</Button></Link>
            </Panel>
          </>
        )}
      </div>
    </PatientShell>
  )
}
