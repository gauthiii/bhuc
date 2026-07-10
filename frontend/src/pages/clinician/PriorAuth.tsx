import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Lock, CheckCircle2, Sparkles, Plus, FileText, Trash2, Eye, EyeOff, Paperclip } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { HumanInLoopNote } from '../../components/Shell'
import { Panel, StatusBadge, Spinner, ErrorState, Button, Field, Input, Textarea } from '../../components/ui'
import { AgentRunProgress } from '../../components/AgentRunProgress'
import { AgentChat } from '../../components/AgentChat'
import { useClinicianAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { FACILITY } from '../../lib/facility'
import type { PriorAuthPacket, PriorAuthField, DxOption } from '../../lib/types'

const EMPTY_FORM = { service: 'Intensive Outpatient (IOP)', requestedUnits: '3x/week for 4 weeks', payer: 'Blue Shield' }

const COVERAGE_EXAMPLES = [
  { label: 'IOP coverage', prompt: 'Using ONLY the payer policy library, does the payer require prior authorization for Intensive Outpatient (IOP) behavioral health treatment, and what are the medical-necessity criteria? Cite the policy id and section. Do not draft or write any record.' },
  { label: 'MAT coverage', prompt: 'Using ONLY the payer policy library, is prior authorization required for MAT (buprenorphine/naloxone) for opioid use disorder? Cite the policy id and section. Do not draft or write any record.' },
]

// A redacted (42 CFR Part 2) field renders as a classified-style black bar. This holds in
// BOTH edit and preview modes and for both draft and submitted packets.
function RedactedBar() {
  return (
    <div className="flex items-center gap-2">
      <span className="relative inline-flex min-w-[10rem] flex-1 items-center overflow-hidden rounded-sm bg-slate-900 px-2 py-1.5">
        <span className="h-3 w-full" />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-slate-100/90">▉▉▉▉▉ redacted ▉▉▉▉▉</span>
      </span>
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <Lock className="h-3 w-3" /> 42 CFR Part 2
      </span>
    </div>
  )
}

// One document field: black bar if redacted; static text in preview / submitted / non-editable;
// otherwise an editable input (or textarea for multiline).
function DocFieldRow({ field, value, editable, onEdit }:
  { field: PriorAuthField; value: string; editable: boolean; onEdit: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[220px_1fr] sm:items-start sm:gap-4">
      <dt className="pt-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{field.label}</dt>
      <dd className="text-sm text-slate-800">
        {field.redacted ? <RedactedBar />
          : !editable ? <span className={value ? '' : 'text-slate-400'}>{value || '—'}</span>
          : field.multiline
            ? <Textarea rows={Math.min(6, Math.max(2, Math.ceil((value.length || 1) / 70)))} value={value} onChange={(e) => onEdit(e.target.value)} placeholder="—" />
            : <Input value={value} onChange={(e) => onEdit(e.target.value)} placeholder="—" />}
      </dd>
    </div>
  )
}

// C6 — Treatment & Prior-Auth. Diagnosis is chosen from codes suggested across the patient's
// notes; Agent 5 drafts a cited packet; the clinician edits + attests, then submits (agent never
// submits). SUD fields are 42 CFR Part 2 → black-bar redacted without role+consent, always.
export function ClinicianPriorAuth() {
  const { patientId } = useParams()
  const { user } = useClinicianAuth()
  const [packets, setPackets] = useState<PriorAuthPacket[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dxOptions, setDxOptions] = useState<DxOption[] | null>(null)   // null = still loading
  const [form, setForm] = useState(EMPTY_FORM)
  const [primaryDx, setPrimaryDx] = useState('')
  const [secondaryDx, setSecondaryDx] = useState<string[]>([])
  const [drafting, setDrafting] = useState(false)
  const [draftDone, setDraftDone] = useState(false)

  const [edits, setEdits] = useState<Record<string, string>>({})
  const [attested, setAttested] = useState(false)
  const [preview, setPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selected = packets.find((p) => p.id === selectedId) ?? null
  const openDraft = packets.find((p) => p.status !== 'submitted') ?? null
  const hasDx = (dxOptions?.length ?? 0) > 0
  const canCreateNew = !openDraft && hasDx
  const showForm = creating || packets.length === 0

  async function load() {
    setLoading(true); setError(null)
    try {
      const [list, dx] = await Promise.all([
        api.listPriorAuth(patientId!, user?.username),
        api.getPriorAuthDxOptions(patientId!),
      ])
      setPackets(list); setDxOptions(dx)
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

  // Reset per-packet edit state when the selection changes.
  useEffect(() => { setEdits({}); setAttested(false); setPreview(false) }, [selectedId])

  async function draft() {
    if (!form.service.trim() || !form.payer.trim() || !primaryDx) return
    setDrafting(true); setDraftDone(false)
    try {
      const primaryLabel = dxOptions?.find((o) => o.code === primaryDx)
      const diagnosis = primaryLabel ? `${primaryLabel.code} ${primaryLabel.label}` : primaryDx
      const p = await api.draftPriorAuth({
        patient: patientId!, service: form.service, payer: form.payer,
        requestedUnits: form.requestedUnits, diagnosis, secondaryDiagnoses: secondaryDx,
        clinicianEmail: user?.username,
      })
      setPackets((prev) => [p, ...prev.filter((x) => x.id !== p.id)])
      setSelectedId(p.id); setCreating(false); setDraftDone(true)
    } catch {
      setDrafting(false)
      setError('The Prior-Auth agent could not draft the packet. Try again.')
    }
  }

  // All editable, non-redacted field values → the edits map sent on save/submit.
  function collectEdits(p: PriorAuthPacket): Record<string, string> {
    const out: Record<string, string> = {}
    for (const s of p.document.sections)
      for (const f of s.fields)
        if (f.editable && !f.redacted) out[f.id] = edits[f.id] ?? f.value
    return out
  }

  async function submit() {
    if (!selected) return
    setSubmitting(true)
    try {
      await api.submitPriorAuth(selected.id, collectEdits(selected), user?.username)
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
      setPackets(rest); setSelectedId(rest[0]?.id ?? null); setCreating(rest.length === 0)
    } catch {
      setError('Deleting the draft failed. Try again.')
    } finally {
      setDeleting(false)
    }
  }

  function startNew() {
    setForm(EMPTY_FORM); setPrimaryDx(''); setSecondaryDx([]); setCreating(true); setSelectedId(null)
  }

  const submitted = selected?.status === 'submitted'
  const readOnly = submitted || preview

  return (
    <ClinicianShell
      title="Treatment & prior authorization"
      intro="Choose a diagnosis from the patient's documented codes; the Prior-Auth Compliance Agent drafts a cited packet. Review and edit it, attest, then submit — the agent never submits. SUD fields are redacted under 42 CFR Part 2 without role + consent."
    >
      {loading ? (
        <Spinner label="Loading prior authorizations…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="mx-auto grid max-w-4xl gap-4">
          <HumanInLoopNote>
            The agent drafts and checks coverage with citations, but a human clinician edits, attests, and submits the prior authorization — the agent never submits.
          </HumanInLoopNote>

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
              {!!openDraft && (
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
                          <div className="truncate font-medium text-slate-800">
                            {p.serviceMasked
                              ? <span className="inline-flex items-center gap-1 text-slate-500"><Lock className="h-3 w-3" /> Protected (42 CFR Part 2)</span>
                              : p.service}
                          </div>
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

          {/* Draft form (new packet) OR the selected packet document */}
          {showForm ? (
            !hasDx ? (
              <Panel title="Prior authorization unavailable">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  You cannot apply for a prior auth at this time. A prior authorization needs a diagnosis
                  code, and this patient has no suggested diagnosis codes on any clinical note yet. Draft
                  and sign a clinical note with suggested codes first, then return here.
                </div>
              </Panel>
            ) : (
              <Panel title="Draft a prior-auth packet">
                <p className="mb-3 text-sm text-slate-500">Choose the diagnosis (from codes suggested on this patient's notes); the Prior-Auth Compliance Agent searches the payer policy library and drafts a cited packet.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Service"><Input value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} placeholder="e.g., Intensive Outpatient (IOP)" /></Field>
                  <Field label="Payer"><Input value={form.payer} onChange={(e) => setForm((f) => ({ ...f, payer: e.target.value }))} placeholder="e.g., Blue Shield" /></Field>
                  <Field label="Primary diagnosis">
                    <select
                      value={primaryDx}
                      onChange={(e) => { setPrimaryDx(e.target.value); setSecondaryDx((s) => s.filter((c) => c !== e.target.value)) }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    >
                      <option value="">Select a diagnosis…</option>
                      {dxOptions!.map((o) => <option key={o.code} value={o.code}>{o.code} — {o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Requested units"><Input value={form.requestedUnits} onChange={(e) => setForm((f) => ({ ...f, requestedUnits: e.target.value }))} placeholder="e.g., 3x/week for 4 weeks" /></Field>
                </div>
                {primaryDx && dxOptions!.length > 1 && (
                  <div className="mt-3">
                    <div className="mb-1.5 text-xs font-medium text-slate-500">Secondary diagnoses (optional)</div>
                    <div className="flex flex-wrap gap-2">
                      {dxOptions!.filter((o) => o.code !== primaryDx).map((o) => {
                        const on = secondaryDx.includes(o.code)
                        return (
                          <button key={o.code} type="button"
                            onClick={() => setSecondaryDx((s) => on ? s.filter((c) => c !== o.code) : [...s, o.code])}
                            className={`rounded-full border px-3 py-1 text-xs transition ${on ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            {o.code}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <Button onClick={draft} disabled={!form.service.trim() || !form.payer.trim() || !primaryDx}><Sparkles className="h-4 w-4" /> Draft with agent</Button>
                  {creating && packets.length > 0 && (
                    <Button variant="ghost" onClick={() => { setCreating(false); setSelectedId(packets[0]?.id ?? null) }}>Cancel</Button>
                  )}
                </div>
              </Panel>
            )
          ) : selected ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-2.5">
                <span className="text-xs font-medium text-slate-500">{selected.id}</span>
                <div className="flex items-center gap-2">
                  {submitted ? <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>Submitted</StatusBadge> : <StatusBadge tone="warning">Draft</StatusBadge>}
                  {selected.part2Gated && <StatusBadge tone="neutral">Part 2</StatusBadge>}
                  <button
                    type="button"
                    onClick={() => setPreview((p) => !p)}
                    aria-pressed={preview}
                    aria-label={preview ? 'Exit document preview' : 'Preview document'}
                    title={preview ? 'Exit preview' : 'Preview document'}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${preview ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="px-6 py-7 sm:px-10">
                {/* Letterhead */}
                <div className="border-b border-slate-200 pb-4 text-center">
                  <div className="font-display text-lg font-bold text-slate-800">Prior Authorization Request</div>
                  <div className="mt-0.5 text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Behavioral Health</div>
                  <div className="mt-2 text-xs text-slate-500">{FACILITY.name} · {FACILITY.address} · {FACILITY.phone}</div>
                </div>

                {/* Sections */}
                {selected.document.sections.map((section) => (
                  <section key={section.id} className="mt-6">
                    <h3 className="mb-3 border-b border-slate-200 pb-1 font-display text-sm font-bold uppercase tracking-wide text-slate-700">{section.title}</h3>
                    <dl className="grid gap-2.5">
                      {section.fields.map((f) => (
                        <DocFieldRow
                          key={f.id}
                          field={f}
                          value={edits[f.id] ?? f.value}
                          editable={f.editable && !readOnly}
                          onEdit={(v) => setEdits((e) => ({ ...e, [f.id]: v }))}
                        />
                      ))}
                    </dl>
                  </section>
                ))}

                {/* Supporting documentation — auto-attached screenings + notes */}
                {selected.document.attachments.length > 0 && (
                  <section className="mt-6">
                    <h3 className="mb-3 border-b border-slate-200 pb-1 font-display text-sm font-bold uppercase tracking-wide text-slate-700">Supporting Documentation Attached</h3>
                    <ul className="grid gap-1.5 text-sm text-slate-700">
                      {selected.document.attachments.map((a) => (
                        <li key={a} className="flex items-center gap-2"><Paperclip className="h-3.5 w-3.5 text-slate-400" /> {a}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {/* Attest + submit / delete (hidden in preview and once submitted) */}
              {!submitted && !preview && (
                <div className="border-t border-slate-100 px-6 py-4 sm:px-10">
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-0.5 accent-teal-700" />
                    I certify that the information provided is accurate and that the requested services are medically necessary.
                  </label>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button onClick={submit} disabled={!attested || submitting || deleting}>{submitting ? 'Submitting…' : 'Submit prior authorization'}</Button>
                    <Button variant="ghost" onClick={remove} disabled={submitting || deleting} className="text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting…' : 'Delete draft'}
                    </Button>
                    {selected.draftedByAgent && <StatusBadge tone="info">AI-drafted · verify before submitting</StatusBadge>}
                  </div>
                </div>
              )}
              {submitted && (
                <div className="border-t border-slate-100 px-6 py-4 text-sm text-teal-800 sm:px-10">
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Submitted by clinician — this packet is now read-only.</span>
                </div>
              )}
            </div>
          ) : null}

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
              doneMessage="Draft ready — review and edit the packet, attest, then submit. The agent never submits."
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
