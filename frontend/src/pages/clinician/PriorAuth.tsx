import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Lock, CheckCircle2 } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { HumanInLoopNote } from '../../components/Shell'
import { Panel, StatusBadge, Spinner, ErrorState, Button, Field, Input } from '../../components/ui'
import { api } from '../../services/api'
import type { PriorAuthPacket, CoverageAnswer } from '../../lib/types'

// C6 — Treatment & Prior-Auth. SUD fields access-gated; the human submits — the agent never does.
export function ClinicianPriorAuth() {
  const { patientId } = useParams()
  const [data, setData] = useState<PriorAuthPacket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState<CoverageAnswer | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const p = await api.getPriorAuth(patientId!)
      setData(p)
      setSubmitted(p.status === 'submitted')
    } catch {
      setError("Couldn't load the prior-auth packet.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [patientId])

  async function ask() {
    if (!question.trim()) return
    setAsking(true)
    try {
      setAnswer(await api.askCoverage(question))
    } finally {
      setAsking(false)
    }
  }

  async function submit() {
    setSubmitting(true)
    try {
      await api.submitPriorAuth()
      setSubmitted(true)
    } catch {
      setError('Submitting the prior authorization failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ClinicianShell
      title="Treatment & prior authorization"
      intro="The Prior-Auth Compliance Agent drafts a packet and answers coverage questions with citations. SUD fields are access-gated under 42 CFR Part 2."
    >
      {loading ? (
        <Spinner label="Loading prior-auth packet…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            <HumanInLoopNote>
              The agent drafts and checks coverage, but a human clinician submits the prior authorization — the agent never submits.
            </HumanInLoopNote>

            <Panel title={`Prior-auth packet — ${data.service}`} actions={submitted ? <StatusBadge tone="success">Submitted</StatusBadge> : <StatusBadge tone="warning">Draft</StatusBadge>}>
              <dl className="grid gap-3">
                {data.fields.map((f) => (
                  <div key={f.label} className="flex items-start justify-between gap-3 border-b border-slate-50 pb-2">
                    <dt className="text-sm text-slate-500">{f.label}</dt>
                    <dd className="text-right text-sm font-medium text-slate-800">
                      {f.part2 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500" title="Protected under 42 CFR Part 2 — access-gated.">
                          <Lock className="h-3 w-3" /> •••••• Protected (Part 2)
                        </span>
                      ) : f.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4">
                {submitted
                  ? <div className="flex items-center gap-2 text-sm text-teal-800"><CheckCircle2 className="h-4 w-4" /> Submitted by clinician.</div>
                  : <Button onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit prior authorization'}</Button>}
              </div>
            </Panel>
          </div>

          <Panel title="Coverage & prior-auth assistant">
            <Field label="Ask about coverage">
              <div className="flex gap-2">
                <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g., Is IOP covered under this plan?" />
                <Button variant="secondary" onClick={ask} disabled={asking || !question.trim()}>{asking ? 'Asking…' : 'Ask'}</Button>
              </div>
            </Field>
            {answer && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm leading-relaxed text-slate-700">{answer.answer}</p>
                <div className="mt-2">
                  <StatusBadge tone="info">Source: {answer.citation.policy} · {answer.citation.section}</StatusBadge>
                </div>
              </div>
            )}
          </Panel>
        </div>
      ) : null}
    </ClinicianShell>
  )
}
