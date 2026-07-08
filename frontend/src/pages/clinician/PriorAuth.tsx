import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Lock, CheckCircle2, Sparkles } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { HumanInLoopNote } from '../../components/Shell'
import { Panel, StatusBadge, Spinner, ErrorState, Button, Field, Input } from '../../components/ui'
import { AgentRunProgress } from '../../components/AgentRunProgress'
import { api } from '../../services/api'
import type { PriorAuthPacket, CoverageAnswer } from '../../lib/types'

// C6 — Treatment & Prior-Auth. The Prior-Auth Compliance Agent (Agent 5) drafts a cited
// packet into u_bhuc_prior_auth; the human submits — the agent never does. SUD fields are
// access-gated under 42 CFR Part 2.
export function ClinicianPriorAuth() {
  const { patientId } = useParams()
  const [data, setData] = useState<PriorAuthPacket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // draft form (shown when no packet exists yet)
  const [form, setForm] = useState({ service: 'Intensive Outpatient (IOP)', diagnosis: '', requestedUnits: '3x/week for 4 weeks', payer: 'Blue Shield' })
  const [drafting, setDrafting] = useState(false)   // Agent 5 modal open
  const [draftDone, setDraftDone] = useState(false)

  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState<CoverageAnswer | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const submitted = data?.status === 'submitted'

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setData(await api.getPriorAuth(patientId!))
    } catch {
      setError("Couldn't load the prior-auth packet.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [patientId])

  async function draft() {
    if (!form.service.trim() || !form.payer.trim()) return
    setDrafting(true); setDraftDone(false)
    try {
      const p = await api.draftPriorAuth({ patient: patientId!, ...form })
      setData(p); setDraftDone(true)
    } catch {
      setDrafting(false)
      setError('The Prior-Auth agent could not draft the packet. Try again.')
    }
  }

  async function ask() {
    if (!question.trim()) return
    setAsking(true)
    try { setAnswer(await api.askCoverage(question)) }
    finally { setAsking(false) }
  }

  async function submit() {
    if (!data) return
    setSubmitting(true)
    try {
      await api.submitPriorAuth(data.id)
      setData({ ...data, status: 'submitted' })
    } catch {
      setError('Submitting the prior authorization failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ClinicianShell
      title="Treatment & prior authorization"
      intro="The Prior-Auth Compliance Agent drafts a packet and answers coverage questions with citations. SUD fields are access-gated under 42 CFR Part 2; a human clinician submits — the agent never does."
    >
      {loading ? (
        <Spinner label="Loading prior-auth packet…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            <HumanInLoopNote>
              The agent drafts and checks coverage with citations, but a human clinician submits the prior authorization — the agent never submits.
            </HumanInLoopNote>

            {data ? (
              <Panel title={`Prior-auth packet — ${data.service}`} subtitle={data.id} actions={submitted ? <StatusBadge tone="success">Submitted</StatusBadge> : <StatusBadge tone="warning">Draft</StatusBadge>}>
                <dl className="grid gap-3">
                  {data.fields.map((f) => (
                    <div key={f.label} className="flex items-start justify-between gap-3 border-b border-slate-50 pb-2">
                      <dt className="text-sm text-slate-500">{f.label}</dt>
                      <dd className="max-w-[60%] text-right text-sm font-medium text-slate-800">
                        {f.part2 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500" title="Protected under 42 CFR Part 2 — access-gated.">
                            <Lock className="h-3 w-3" /> •••••• Protected (Part 2)
                          </span>
                        ) : f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {submitted
                    ? <div className="flex items-center gap-2 text-sm text-teal-800"><CheckCircle2 className="h-4 w-4" /> Submitted by clinician.</div>
                    : <Button onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit prior authorization'}</Button>}
                  {!submitted && data.draftedByAgent && <StatusBadge tone="info">AI-drafted · verify before submitting</StatusBadge>}
                </div>
              </Panel>
            ) : (
              <Panel title="Draft a prior-auth packet">
                <p className="mb-3 text-sm text-slate-500">Enter the request; the Prior-Auth Compliance Agent searches the payer policy library and drafts a cited packet.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Service"><Input value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} placeholder="e.g., Intensive Outpatient (IOP)" /></Field>
                  <Field label="Payer"><Input value={form.payer} onChange={(e) => setForm((f) => ({ ...f, payer: e.target.value }))} placeholder="e.g., Blue Shield" /></Field>
                  <Field label="Diagnosis"><Input value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} placeholder="e.g., F33.1" /></Field>
                  <Field label="Requested units"><Input value={form.requestedUnits} onChange={(e) => setForm((f) => ({ ...f, requestedUnits: e.target.value }))} placeholder="e.g., 3x/week for 4 weeks" /></Field>
                </div>
                <div className="mt-4">
                  <Button onClick={draft} disabled={!form.service.trim() || !form.payer.trim()}><Sparkles className="h-4 w-4" /> Draft with agent</Button>
                </div>
              </Panel>
            )}
          </div>

          <Panel title="Coverage & prior-auth assistant">
            <Field label="Ask about coverage">
              <div className="flex gap-2">
                <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g., Is IOP covered under this plan?" onKeyDown={(e) => { if (e.key === 'Enter') ask() }} />
                <Button variant="secondary" onClick={ask} disabled={asking || !question.trim()}>{asking ? 'Asking…' : 'Ask'}</Button>
              </div>
            </Field>
            {answer && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{answer.answer}</p>
                <div className="mt-2">
                  <StatusBadge tone="info">Source: {answer.citation.policy}{answer.citation.section ? ` · ${answer.citation.section}` : ''}</StatusBadge>
                </div>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">Answers cite the payer policy library. Verify citations before relying on them.</p>
          </Panel>
        </div>
      )}

      {drafting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Prior-Auth Compliance Agent">
          <div className="w-full max-w-lg">
            <AgentRunProgress
              runningTitle="Prior-Auth Compliance Agent"
              doneTitle="Prior-auth packet drafted"
              statusTexts={[
                'Reading the request & coverage context…',
                'Searching the payer policy library…',
                'Checking medical-necessity criteria…',
                'Applying 42 CFR Part 2 access gating…',
                'Drafting the prior-auth packet…',
              ]}
              cardSteps={['Searching payer policy', 'Checking criteria', 'Drafting packet']}
              cards={[{ key: 'priorauth', name: 'Prior-Auth Compliance Agent' }]}
              done={draftDone}
              doneMessage="Draft ready — review the cited coverage answer, then submit. The agent never submits."
            />
            {draftDone && (
              <div className="mt-3 flex justify-end">
                <Button onClick={() => { setDrafting(false); setDraftDone(false) }}>Review draft</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </ClinicianShell>
  )
}
