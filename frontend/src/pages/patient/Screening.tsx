import { useMemo, useState } from 'react'
import { api } from '../../services/api'
import type { Instrument, ScreeningQuestion, ScreeningResult } from '../../lib/types'
import { PatientShell } from '../../components/portals'
import { CrisisDialog } from '../../components/CrisisDialog'
import { Panel, Button, RadioGroup, StatusBadge, Spinner } from '../../components/ui'

const NAMES: Record<Instrument, string> = { c_ssrs: 'C-SSRS', phq9: 'PHQ-9', gad7: 'GAD-7' }
const START: Instrument = 'c_ssrs'

export function PatientScreening() {
  const [instrument, setInstrument] = useState<Instrument>(START)
  const [started, setStarted] = useState(false)
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<ScreeningResult | null>(null)
  const [crisis, setCrisis] = useState(false)
  const [done, setDone] = useState(false)

  const questions: ScreeningQuestion[] = useMemo(() => api.getInstrumentQuestions(instrument), [instrument])

  function beginInstrument(next: Instrument) {
    setInstrument(next)
    setStarted(false)
    setAnswers({})
    setErrors({})
    setResult(null)
    setSubmitError(null)
  }

  async function submit() {
    const missing: Record<string, boolean> = {}
    questions.forEach((q) => { if (answers[q.id] === undefined) missing[q.id] = true })
    if (Object.keys(missing).length) { setErrors(missing); return }
    setErrors({})
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await api.submitScreening(instrument, answers)
      setResult(res)
      const item9Positive = instrument === 'phq9' && Number(answers['q9']) > 0
      if (res.escalate || item9Positive || res.riskBand === 'high') setCrisis(true)
      if (!res.nextInstrument) setDone(true)
    } catch {
      setSubmitError('We saved your answers and will process them shortly. You can retry now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PatientShell title="Intake screening" intro="A few short questionnaires help your care team understand how you’ve been feeling. Take your time — there are no wrong answers.">
      <div className="mx-auto max-w-2xl space-y-5">
        {!started && !result && (
          <Panel title={`${NAMES[instrument]} screening`}>
            <p className="text-sm text-slate-600">
              This next set of questions helps us understand how you’ve been feeling over the last 2 weeks. There are no time limits and your answers are confidential.
            </p>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setStarted(true)}>Start</Button>
            </div>
          </Panel>
        )}

        {started && !result && (
          <Panel
            title={`${NAMES[instrument]}`}
            subtitle={`${questions.length} question${questions.length > 1 ? 's' : ''}`}
            actions={<StatusBadge tone="info">Confidential</StatusBadge>}
          >
            <div className="space-y-6">
              {questions.map((q, i) => (
                <fieldset key={q.id}>
                  <legend className="mb-2 text-sm font-medium text-slate-800">{i + 1}. {q.text}</legend>
                  <RadioGroup
                    name={q.id}
                    value={answers[q.id]}
                    onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                    options={q.options}
                  />
                  {errors[q.id] && <p role="alert" className="mt-1 text-xs font-medium text-slate-600">Please select an answer to continue.</p>}
                </fieldset>
              ))}
            </div>
            {submitError && <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{submitError}</p>}
            <div className="mt-6 flex justify-end">
              <Button onClick={submit} disabled={submitting}>{submitting ? 'Scoring your responses…' : 'Submit screening'}</Button>
            </div>
            {submitting && <div className="mt-2"><Spinner label="Scoring your responses…" /></div>}
          </Panel>
        )}

        {result && (
          <Panel title="Thank you">
            {result.riskBand === 'high' || result.escalate ? (
              <p className="text-sm text-slate-700">Thank you for your honesty. Your care team has your responses. If you ever feel unsafe, call or text 988 any time.</p>
            ) : (
              <p className="text-sm text-slate-700">
                Thanks for completing the {NAMES[result.instrument]} questionnaire. Your responses were recorded for your care team.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              {result.nextInstrument && !done ? (
                <Button onClick={() => beginInstrument(result.nextInstrument!)}>Continue to {NAMES[result.nextInstrument]}</Button>
              ) : (
                <StatusBadge tone="success">All screenings complete</StatusBadge>
              )}
            </div>
          </Panel>
        )}
      </div>

      <CrisisDialog
        open={crisis}
        onClose={() => setCrisis(false)}
        onConnect={() => setCrisis(false)}
        message="Thank you for your honesty. Your safety matters — please call or text 988 now, or tap to connect with a counselor."
      />
    </PatientShell>
  )
}
