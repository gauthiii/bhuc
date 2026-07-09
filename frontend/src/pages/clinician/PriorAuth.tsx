import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Lock, CheckCircle2, Sparkles, Plus, FileText, Trash2 } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { HumanInLoopNote } from '../../components/Shell'
import { Panel, StatusBadge, Spinner, ErrorState, Button, Field, Input } from '../../components/ui'
import { AgentRunProgress } from '../../components/AgentRunProgress'
import { AgentChat } from '../../components/AgentChat'
import { useClinicianAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import type { PriorAuthPacket } from '../../lib/types'

const EMPTY_FORM = { service: 'Intensive Outpatient (IOP)', diagnosis: '', requestedUnits: '3x/week for 4 weeks', payer: 'Blue Shield' }

// The Coverage assistant reuses the governance Agents-Inventory chat UI, wired to the
// live Prior-Auth Compliance Agent (read-only coverage questions — never drafts a record).
const COVERAGE_EXAMPLES = [
  { label: 'IOP coverage', prompt: 'Using ONLY the payer policy library, does the payer require prior authorization for Intensive Outpatient (IOP) behavioral health treatment, and what are the medical-necessity criteria? Cite the policy id and section. Do not draft or write any record.' },
  { label: 'MAT coverage', prompt: 'Using ONLY the payer policy library, is prior authorization required for MAT (buprenorphine/naloxone) for opioid use disorder? Cite the policy id and section. Do not draft or write any record.' },
]

// C6 — Treatment & Prior-Auth. A patient can have MANY prior-auth packets: the Prior-Auth
// Compliance Agent (Agent 5) drafts each into u_bhuc_prior_auth; the human reviews, then
// submits OR deletes a draft — the agent never submits. Once no draft is open, the clinician
// can start another. SUD fields are access-gated under 42 CFR Part 2 (role + patient consent).
export function ClinicianPriorAuth() {
  const { patientId } = useParams()
  const { user } = useClinicianAuth()
  const [packets, setPackets] = useState<PriorAuthPacket[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)   // draft form open for a NEW packet
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [drafting, setDrafting] = useState(false)   // Agent 5 modal open
  const [draftDone, setDraftDone] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selected = packets.find((p) => p.id === selectedId) ?? null
  const openDraft = packets.find((p) => p.status !== 'submitted') ?? null   // an unsubmitted packet
  const canCreateNew = !openDraft                                          // only after the latest is submitted / deleted
  const showForm = creating || packets.length === 0

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const list = await api.listPriorAuth(patientId!, user?.username)
      setPackets(list)
      const focus = list.find((p) => p.status !== 'submitted') ?? list[0]
      setSelectedId(focus?.id ?? null)
      setCreating(false)
    } catch {
      setError("Couldn't load prior authorizations.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [patientId, user?.username])

  async function draft() {
    if (!form.service.trim() || !form.payer.trim()) return
    setDrafting(true); setDraftDone(false)
    try {
      const p = await api.draftPriorAuth({ patient: patientId!, ...form, clinicianEmail: user?.username })
      setPackets((prev) => [p, ...prev.filter((x) => x.id !== p.id)])
      setSelectedId(p.id)
      setCreating(false)
      setDraftDone(true)
    } catch {
      setDrafting(false)
      setError('The Prior-Auth agent could not draft the packet. Try again.')
    }
  }

  async function submit() {
    if (!selected) return
    setSubmitting(true)
    try {
      await api.submitPriorAuth(selected.id)
      setPackets((prev) => prev.map((p) => (p.id === selected.id ? { ...p, status: 'submitted' } : p)))
    } catch {
      setError('Submitting the prior authorization failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove() {
    if (!selected || selected.status === 'submitted') return
    if (!window.confirm(`Delete draft prior authorization ${selected.id}? This removes it permanently.`)) return
    setDeleting(true)
    try {
      await api.deletePriorAuth(selected.id)
      const rest = packets.filter((p) => p.id !== selected.id)
      setPackets(rest)
      setSelectedId(rest[0]?.id ?? null)
      setCreating(rest.length === 0)
    } catch {
      setError('Deleting the draft failed. Try again.')
    } finally {
      setDeleting(false)
    }
  }

  function startNew() {
    setForm(EMPTY_FORM)
    setCreating(true)
    setSelectedId(null)
  }

  return (
    <ClinicianShell
      title="Treatment & prior authorization"
      intro="The Prior-Auth Compliance Agent drafts a packet and answers coverage questions with citations. A patient can have several prior authorizations; submit or delete the open draft, then start another. SUD fields are access-gated under 42 CFR Part 2; a human clinician submits — the agent never does."
    >
      {loading ? (
        <Spinner label="Loading prior authorizations…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="mx-auto grid max-w-4xl gap-4">
          <HumanInLoopNote>
            The agent drafts and checks coverage with citations, but a human clinician submits the prior authorization — the agent never submits.
          </HumanInLoopNote>

          {/* History of all prior-auth packets for this patient */}
          {packets.length > 0 && (
            <Panel
              title={<span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Prior authorizations</span>}
              subtitle={`${packets.length} packet${packets.length > 1 ? 's' : ''}`}
              actions={
                <Button variant="secondary" className="shrink-0 px-3 py-1.5 text-xs" onClick={startNew} disabled={!canCreateNew}>
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              }
            >
              {!canCreateNew && (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Submit or delete the open draft below before starting another prior authorization.
                </p>
              )}
              <ul className="grid gap-2">
                {packets.map((p) => {
                  const active = !creating && p.id === selectedId
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => { setSelectedId(p.id); setCreating(false) }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${active ? 'border-teal-300 bg-teal-50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-800">{p.service}</div>
                          <div className="truncate text-xs text-slate-400">{p.id}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {p.part2Gated && <StatusBadge tone="neutral">Part 2</StatusBadge>}
                          {p.status === 'submitted'
                            ? <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>Submitted</StatusBadge>
                            : <StatusBadge tone="warning">Draft</StatusBadge>}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )}

          {/* Draft form (new packet) OR the selected packet's detail */}
          {showForm ? (
            <Panel title="Draft a prior-auth packet">
              <p className="mb-3 text-sm text-slate-500">Enter the request; the Prior-Auth Compliance Agent searches the payer policy library and drafts a cited packet.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Service"><Input value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} placeholder="e.g., Intensive Outpatient (IOP)" /></Field>
                <Field label="Payer"><Input value={form.payer} onChange={(e) => setForm((f) => ({ ...f, payer: e.target.value }))} placeholder="e.g., Blue Shield" /></Field>
                <Field label="Diagnosis"><Input value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} placeholder="e.g., F33.1" /></Field>
                <Field label="Requested units"><Input value={form.requestedUnits} onChange={(e) => setForm((f) => ({ ...f, requestedUnits: e.target.value }))} placeholder="e.g., 3x/week for 4 weeks" /></Field>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button onClick={draft} disabled={!form.service.trim() || !form.payer.trim()}><Sparkles className="h-4 w-4" /> Draft with agent</Button>
                {creating && packets.length > 0 && (
                  <Button variant="ghost" onClick={() => { setCreating(false); setSelectedId(packets[0]?.id ?? null) }}>Cancel</Button>
                )}
              </div>
            </Panel>
          ) : selected ? (
            <Panel
              title={`Prior-auth packet — ${selected.service}`}
              subtitle={selected.id}
              actions={selected.status === 'submitted' ? <StatusBadge tone="success">Submitted</StatusBadge> : <StatusBadge tone="warning">Draft</StatusBadge>}
            >
              <dl className="grid gap-3">
                {selected.fields.map((f) => (
                  <div key={f.label} className="flex items-start justify-between gap-3 border-b border-slate-50 pb-2">
                    <dt className="text-sm text-slate-500">{f.label}</dt>
                    <dd className="max-w-[60%] text-right text-sm font-medium text-slate-800">
                      {f.part2 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500" title="Protected under 42 CFR Part 2 — requires case-manager role and patient consent.">
                          <Lock className="h-3 w-3" /> •••••• Protected (Part 2)
                        </span>
                      ) : f.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {selected.status === 'submitted' ? (
                  <div className="flex items-center gap-2 text-sm text-teal-800"><CheckCircle2 className="h-4 w-4" /> Submitted by clinician.</div>
                ) : (
                  <>
                    <Button onClick={submit} disabled={submitting || deleting}>{submitting ? 'Submitting…' : 'Submit prior authorization'}</Button>
                    <Button variant="ghost" onClick={remove} disabled={submitting || deleting} className="text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting…' : 'Delete draft'}
                    </Button>
                    {selected.draftedByAgent && <StatusBadge tone="info">AI-drafted · verify before submitting</StatusBadge>}
                  </>
                )}
              </div>
            </Panel>
          ) : null}

          {/* Coverage assistant — same chat component as the Agents Inventory, wired live to Agent 5 */}
          <div className="h-[30rem]">
            <AgentChat
              agentKey="priorauth"
              agentName="Coverage & prior-auth assistant"
              subtitle="Prior-Auth Compliance Agent · cites the payer policy library"
              examples={COVERAGE_EXAMPLES}
            />
          </div>
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
