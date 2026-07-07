import { useEffect, useState } from 'react'
import { LifeBuoy } from 'lucide-react'
import { api } from '../../services/api'
import type { CheckIn } from '../../lib/types'
import { PatientShell } from '../../components/portals'
import { CrisisDialog } from '../../components/CrisisDialog'
import { Panel, Button, RadioGroup, StatusBadge, Spinner, ErrorState } from '../../components/ui'
import { formatDate } from '../../lib/format'

const CHECK_IN_ID = 'chk-1'

export function PatientCheckIn() {
  const [data, setData] = useState<CheckIn | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [crisis, setCrisis] = useState(false)
  const [nextDate, setNextDate] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    api.getCheckIn(CHECK_IN_ID)
      .then(setData)
      .catch(() => setError('Couldn’t load your check-in.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  function setAnswer(id: string, v: number | string) {
    setAnswers((a) => ({ ...a, [id]: v }))
    // Fail-safe: self-harm "Yes" triggers crisis panel immediately, client-side.
    if (id === 'selfHarm' && v === 'yes') setCrisis(true)
  }

  async function submit() {
    if (!data) return
    const missing: Record<string, boolean> = {}
    data.questions.forEach((q) => { if (answers[q.id] === undefined) missing[q.id] = true })
    if (Object.keys(missing).length) { setErrors(missing); return }
    setErrors({})
    setSubmitting(true)
    try {
      const res = await api.submitCheckIn(data.id, answers)
      if (res.escalate) setCrisis(true)
      setNextDate(res.nextCheckIn ?? null)
      setDone(true)
    } catch {
      // Fail-safe: still surface crisis panel if self-harm endorsed
      if (answers['selfHarm'] === 'yes') setCrisis(true)
      setError('We couldn’t submit your check-in. Your answers are saved — please retry.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PatientShell title="How have you been since your visit?" intro="A quick check-in helps your care team support you. You can reach crisis help any time.">
      <div className="mx-auto max-w-xl space-y-5">
        <Button variant="primary" className="w-full bg-red-700 hover:bg-red-800" onClick={() => setCrisis(true)}>
          <LifeBuoy className="h-4 w-4" /> I need help now
        </Button>

        {loading && <Panel title="Check-in"><Spinner /></Panel>}
        {error && !loading && !done && <Panel title="Check-in"><ErrorState message={error} onRetry={done ? undefined : load} /></Panel>}

        {done ? (
          <Panel title="Thanks for checking in">
            <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
              We’ve recorded your check-in and shared it with your care team.
              {nextDate && <> Your next check-in is due {formatDate(nextDate)}.</>}
            </div>
          </Panel>
        ) : data && !loading && (
          <Panel title="Your check-in">
            {error && <div className="mb-4"><ErrorState message={error} onRetry={submit} /></div>}
            <div className="space-y-6">
              {data.questions.map((q) => (
                <fieldset key={q.id}>
                  <legend className="mb-2 text-sm font-medium text-slate-800">{q.text}</legend>
                  <RadioGroup
                    name={q.id}
                    value={answers[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                    options={q.options}
                  />
                  {errors[q.id] && <p role="alert" className="mt-1 text-xs font-medium text-slate-600">Please answer to continue.</p>}
                </fieldset>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              {data.dueDate && <StatusBadge tone="info">Due {formatDate(data.dueDate)}</StatusBadge>}
              <Button onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit check-in'}</Button>
            </div>
          </Panel>
        )}
      </div>

      <CrisisDialog
        open={crisis}
        onClose={() => setCrisis(false)}
        onConnect={() => setCrisis(false)}
        message="Thank you for being honest. Please call or text 988 now, or tap to connect with a counselor."
      />
    </PatientShell>
  )
}
