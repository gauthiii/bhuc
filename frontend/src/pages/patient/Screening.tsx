import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, Loader2, UserRoundCheck } from 'lucide-react'
import { api } from '../../services/api'
import type { Instrument, ScreeningQuestion, MeResponse, ScreeningStatusItem, BatchScreeningResult } from '../../lib/types'
import { usePatientAuth } from '../../contexts/AuthContext'
import { PatientShell } from '../../components/portals'
import { CrisisDialog } from '../../components/CrisisDialog'
import { AgentRunProgress } from '../../components/AgentRunProgress'
import { Panel, Button, RadioGroup, StatusBadge, Spinner } from '../../components/ui'

const INSTRUMENTS: { key: Instrument; name: string }[] = [
  { key: 'c_ssrs', name: 'C-SSRS' },
  { key: 'phq9', name: 'PHQ-9' },
  { key: 'gad7', name: 'GAD-7' },
]

type Phase = 'checking' | 'blocked' | 'intro' | 'stepping' | 'running'
type AnswerMap = Record<string, number | string>

const STAGE_TONE = { submitted: 'info', under_review: 'warning', reviewed: 'success' } as const

export function PatientScreening() {
  const { user } = usePatientAuth()
  const email = user?.username ?? ''

  const [phase, setPhase] = useState<Phase>('checking')
  const [me, setMe] = useState<MeResponse | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<Instrument, AnswerMap>>({ c_ssrs: {}, phq9: {}, gad7: {} })
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [runComplete, setRunComplete] = useState(false)
  const [runError, setRunError] = useState(false)
  const [crisis, setCrisis] = useState(false)
  const [status, setStatus] = useState<ScreeningStatusItem[]>([])

  const current = INSTRUMENTS[stepIdx]
  const questions: ScreeningQuestion[] = useMemo(
    () => api.getInstrumentQuestions(current.key), [current.key])

  // --- gate: must be authenticated + registered before the agents can run ---
  useEffect(() => {
    let alive = true
    api.getMe(email)
      .then((m) => { if (!alive) return; setMe(m); setPhase(m.registered ? 'intro' : 'blocked') })
      .catch(() => { if (alive) setPhase('blocked') })
    return () => { alive = false }
  }, [email])

  function loadStatus() {
    api.getScreeningStatus(email).then(setStatus).catch(() => setStatus([]))
  }
  useEffect(() => { if (me?.registered) loadStatus() }, [me])

  function next() {
    const missing: Record<string, boolean> = {}
    questions.forEach((q) => { if (answers[current.key][q.id] === undefined) missing[q.id] = true })
    if (Object.keys(missing).length) { setErrors(missing); return }
    setErrors({})
    if (stepIdx < INSTRUMENTS.length - 1) setStepIdx((i) => i + 1)
    else runAll()
  }

  async function runAll() {
    setPhase('running'); setRunComplete(false); setRunError(false)
    const patientId = me?.profile?.patientId ?? ''
    const payload = INSTRUMENTS.map((ins) => ({ instrument: ins.key, answers: answers[ins.key] }))
    try {
      const res: BatchScreeningResult = await api.submitScreeningBatch(patientId, payload)
      setRunComplete(true)
      if (res.anyEscalate) setCrisis(true)
      loadStatus()
    } catch {
      setRunError(true); setRunComplete(true)
    }
  }

  const answeredCount = questions.filter((q) => answers[current.key][q.id] !== undefined).length

  return (
    <PatientShell
      title="Intake screening"
      intro="Three short questionnaires help your care team understand how you've been feeling. Answer all three — nothing is scored until you finish and submit them together."
    >
      <div className="mx-auto max-w-2xl space-y-5">
        {phase === 'checking' && <Spinner label="Loading your screening…" />}

        {phase === 'blocked' && (
          <Panel title="Finish registration first">
            <p className="text-sm text-slate-600">
              To keep your care safe, screening is available once you've completed registration and consent.
              It only takes a few minutes.
            </p>
            <div className="mt-5 flex justify-end">
              <Link to="/patient/register"><Button>Complete registration</Button></Link>
            </div>
          </Panel>
        )}

        {phase === 'intro' && (
          <Panel title="Before we begin">
            <p className="text-sm text-slate-600">
              You'll answer three brief questionnaires — <strong>C-SSRS</strong>, <strong>PHQ-9</strong>, and{' '}
              <strong>GAD-7</strong>. There are no time limits and your answers are confidential.
              Your responses are only scored after you've completed all three and submitted them.
            </p>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setPhase('stepping')}>Start screening</Button>
            </div>
          </Panel>
        )}

        {phase === 'stepping' && (
          <>
            {/* step indicator */}
            <div className="flex items-center gap-2" aria-label={`Questionnaire ${stepIdx + 1} of 3`}>
              {INSTRUMENTS.map((ins, i) => (
                <div key={ins.key} className="flex flex-1 items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    i < stepIdx ? 'bg-teal-600 text-white'
                      : i === stepIdx ? 'bg-teal-700 text-white ring-2 ring-teal-200'
                        : 'bg-slate-100 text-slate-400'}`}>
                    {i < stepIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${i === stepIdx ? 'text-slate-800' : 'text-slate-400'}`}>{ins.name}</span>
                  {i < INSTRUMENTS.length - 1 && <div className={`h-px flex-1 ${i < stepIdx ? 'bg-teal-300' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>

            <Panel
              title={`${current.name}`}
              subtitle={`Questionnaire ${stepIdx + 1} of 3 · ${answeredCount}/${questions.length} answered`}
              actions={<StatusBadge tone="info">Confidential</StatusBadge>}
            >
              <div className="space-y-6">
                {questions.map((q, i) => (
                  <fieldset key={q.id}>
                    <legend className="mb-2 text-sm font-medium text-slate-800">{i + 1}. {q.text}</legend>
                    <RadioGroup
                      name={q.id}
                      value={answers[current.key][q.id]}
                      onChange={(v) => setAnswers((a) => ({ ...a, [current.key]: { ...a[current.key], [q.id]: v } }))}
                      options={q.options}
                    />
                    {errors[q.id] && <p role="alert" className="mt-1 text-xs font-medium text-slate-600">Please select an answer to continue.</p>}
                  </fieldset>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="secondary" disabled={stepIdx === 0} onClick={() => setStepIdx((i) => Math.max(0, i - 1))}>Back</Button>
                <Button onClick={next}>
                  {stepIdx < INSTRUMENTS.length - 1 ? `Next: ${INSTRUMENTS[stepIdx + 1].name}` : 'Submit all & run screening'}
                </Button>
              </div>
            </Panel>
          </>
        )}

        {phase === 'running' && (
          <>
            <AgentRunProgress
              runningTitle="Running your risk identification"
              doneTitle="Risk identification complete"
              statusTexts={['Scoring your responses…', 'Applying clinical risk-band rules…', 'Cross-checking instrument thresholds…', 'Checking for safety flags…', 'Routing results to your care team…']}
              cardSteps={['Queued', 'Analyzing responses', 'Applying scoring rules', 'Finalizing']}
              cards={INSTRUMENTS.map((i) => ({ key: i.key, name: i.name }))}
              done={runComplete}
              error={runError}
              doneMessage="Risk identification has been completed and sent to the clinicians for review."
              doneSubtext="Your care team will review your responses. You can track the status below at any time."
            />
            {runComplete && !runError && (
              <div className="flex justify-end">
                <Link to="/patient/home"><Button variant="secondary">Back to home</Button></Link>
              </div>
            )}
            {runError && (
              <div className="flex justify-end">
                <Button onClick={runAll}>Retry</Button>
              </div>
            )}
          </>
        )}

        {/* status tracker — patient sees stages only, never a risk band/score */}
        {(phase === 'running' || phase === 'intro') && status.length > 0 && (
          <Panel title="Your screening status">
            <ul className="grid gap-2">
              {status.slice(0, 6).map((s) => (
                <li key={s.screeningId} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    {s.stage === 'reviewed' ? <UserRoundCheck className="h-4 w-4 text-teal-700" />
                      : s.stage === 'under_review' ? <Loader2 className="h-4 w-4 text-amber-600" />
                        : <Clock className="h-4 w-4 text-slate-400" />}
                    {s.instrument}
                  </span>
                  <StatusBadge tone={STAGE_TONE[s.stage]}>{s.stageLabel}</StatusBadge>
                </li>
              ))}
            </ul>
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
