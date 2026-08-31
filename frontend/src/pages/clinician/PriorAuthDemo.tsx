import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Lock, LockOpen, CheckCircle2, Sparkles, Plus, FileText, Trash2, Eye, EyeOff,
  Paperclip, PenLine, AlertTriangle, Scale,
} from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { HumanInLoopNote } from '../../components/Shell'
import { Panel, StatusBadge, Button, Input, Textarea, Select } from '../../components/ui'
import { AgentRunProgress } from '../../components/AgentRunProgress'
import { HelpTip } from '../../components/HelpTip'
import { PriorAuthFairnessModal } from '../../components/PriorAuthFairnessModal'
import {
  buildDemoPacket, REDISCLOSURE_NOTICE,
  DEMO_PRIMARY_DX_OPTIONS, DEMO_SECONDARY_DX_OPTIONS, DEMO_PAYER_OPTIONS,
  DEMO_SERVICE_OPTIONS, DEMO_PAYER,
  DEMO_FACILITY, DEMO_MEMBER, SERVICE_NOTES, explainUnits,
} from '../../lib/priorAuthDemoData'
import type { DemoPacket, DemoField, DemoForm } from '../../lib/priorAuthDemoData'

const EMPTY_FORM: DemoForm = {
  service: 'Intensive Outpatient (IOP)',
  payer: 'Blue Shield',
  primaryDx: 'F11.20',
  secondaryDx: [],
  requestedUnits: '3x/week for 4 weeks',
}

// A draft-form control with hover help. Mirrors <Field> from ui.tsx, but wraps in a div
// instead of a <label> so the help button is not nested inside a label element.
function FormField({ label, help, children }: { label: string; help: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        {label}
        <HelpTip label={label} help={help} />
      </span>
      {children}
    </div>
  )
}

// A redacted (42 CFR Part 2) field renders as a classified-style black bar.
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
function DocFieldRow({ field, value, redacted, editable, onEdit }: {
  field: DemoField; value: string; redacted: boolean; editable: boolean; onEdit: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[230px_1fr] sm:items-start sm:gap-4">
      <dt className="pt-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          {field.label}
          {field.help && <HelpTip label={field.label} help={field.help} />}
        </span>
        {field.hint && <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-slate-300">{field.hint}</span>}
      </dt>
      <dd className="text-sm text-slate-800">
        {redacted ? <RedactedBar />
          : !editable ? <span className={`whitespace-pre-line ${value ? '' : 'text-slate-400'}`}>{value || '—'}</span>
          : field.multiline
            ? <Textarea rows={Math.min(9, Math.max(2, Math.ceil((value.length || 1) / 68)))} value={value} onChange={(e) => onEdit(e.target.value)} placeholder="—" />
            : <Input value={value} onChange={(e) => onEdit(e.target.value)} placeholder="—" />}
      </dd>
    </div>
  )
}

// Prior authorization (C6, second variant) — draft a payer-ready packet, review and edit it,
// sign the attestation, submit. The document carries the full request/member/provider/facility
// identifiers, the medical-necessity narrative written per level of care, the policy criteria
// referenced, a signature block, and the 42 CFR § 2.32 redisclosure notice when Part 2 content
// is disclosed. Every field label carries hover help explaining what belongs in it.
// This screen runs standalone on fixture data (see lib/priorAuthDemoData.ts) and makes no
// backend or agent calls; the record-backed screen is /clinician/prior-auth/:patientId.
export function ClinicianPriorAuthDemo() {
  const [packets, setPackets] = useState<DemoPacket[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState<DemoForm>(EMPTY_FORM)
  const [drafting, setDrafting] = useState(false)
  const [draftDone, setDraftDone] = useState(false)
  const timer = useRef<number | null>(null)

  const [edits, setEdits] = useState<Record<string, string>>({})
  const [attested, setAttested] = useState(false)
  const [preview, setPreview] = useState(false)
  const [part2Access, setPart2Access] = useState(true)   // toggle: role + consent granted?
  const [fairnessOpen, setFairnessOpen] = useState(false)

  const selected = packets.find((p) => p.id === selectedId) ?? null
  const openDraft = packets.find((p) => p.status !== 'submitted') ?? null
  const canCreateNew = !openDraft
  const showForm = creating || packets.length === 0

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])
  // Reset per-packet edit state when the selection changes.
  useEffect(() => { setEdits({}); setAttested(false); setPreview(false) }, [selectedId])

  // Mock agent run: the progress card self-animates, we just flip `done` after a randomized
  // 4–10s so each run feels like a real Agent 5 call.
  function draft() {
    if (!form.service.trim() || !form.payer.trim() || !form.primaryDx) return
    const ms = 4000 + Math.round(Math.random() * 6000)
    setDrafting(true); setDraftDone(false)
    timer.current = window.setTimeout(() => {
      const p = buildDemoPacket(form)
      setPackets((prev) => [p, ...prev])
      setSelectedId(p.id); setCreating(false); setDraftDone(true)
    }, ms)
  }

  function valueOf(f: DemoField): string { return edits[f.id] ?? f.value }
  function isRedacted(p: DemoPacket, f: DemoField): boolean {
    return p.part2Gated && !part2Access && !!f.sensitive
  }

  // Submit freezes the clinician's edits into the packet and stamps the signature date.
  // Date of Request is deliberately untouched — it keeps the value stamped at draft time.
  function submit() {
    if (!selected) return
    const stamped = new Date().toISOString().slice(0, 10)
    setPackets((prev) => prev.map((p) => p.id !== selected.id ? p : {
      ...p,
      status: 'submitted',
      sections: p.sections.map((s) => ({
        ...s,
        fields: s.fields.map((fl) =>
          fl.id === 'date_signed' ? { ...fl, value: stamped }
            : fl.id in edits ? { ...fl, value: edits[fl.id] }
            : fl),
      })),
    }))
    setEdits({})
  }

  function remove() {
    if (!selected || selected.status === 'submitted') return
    if (!window.confirm(`Delete draft prior authorization ${selected.id}? This removes it permanently.`)) return
    const rest = packets.filter((p) => p.id !== selected.id)
    setPackets(rest); setSelectedId(rest[0]?.id ?? null); setCreating(rest.length === 0)
  }

  function startNew() { setForm(EMPTY_FORM); setCreating(true); setSelectedId(null) }

  // Draft-form hover help. The "currently" clause reads live form state, so it can never
  // describe a value the clinician has already changed.
  const primaryDxOption = DEMO_PRIMARY_DX_OPTIONS.find((o) => o.code === form.primaryDx)
  const serviceNote = SERVICE_NOTES[form.service]
  const FORM_HELP = {
    service:
      'The level of care you are asking the payer to authorise. It drives the whole packet: it selects the procedure and revenue codes, the ASAM level, the payer policy that gets cited, and the argument for why a lower or higher level of care is not appropriate. Pick the level named in the payer\u2019s own policy rather than an internal programme name. '
      + `Currently selected: ${form.service}.${serviceNote ? ` ${serviceNote}` : ''}`,
    payer:
      'The insurance company that will review this request and whose published medical policy the packet is checked against. Pick the payer named on the member\u2019s insurance card \u2014 behavioural health benefits are often administered by a different company from the one on the front of the card, so check the back. '
      + `Currently selected: ${form.payer}. The policy citations in the drafted packet come from this payer\u2019s medical policy set.`,
    primaryDx:
      'The single condition that is the main clinical reason for this treatment \u2014 the one the payer weighs the request against. Only diagnoses documented on this patient\u2019s signed notes are offered, and the primary diagnosis here must be a substance use disorder. Co-occurring conditions belong under Secondary diagnoses. '
      + (primaryDxOption
        ? `Currently selected: ${primaryDxOption.code} \u2014 ${primaryDxOption.label}.`
        : 'Nothing is selected yet, so the packet cannot be drafted.'),
    units:
      'Units are the amount of care you are asking the payer to approve \u2014 how often the patient is seen and for how long, not what happens in the sessions. The payer authorises a specific quantity and claims beyond it will not pay, so this has to match what the treatment plan actually delivers. Write it as a frequency followed by a span. '
      + explainUnits(form.requestedUnits),
    secondaryDx:
      'Co-occurring conditions that affect the treatment plan or help justify the intensity being requested \u2014 depression or anxiety alongside a substance use disorder, for example. They are optional, they do not replace the primary diagnosis, and they appear on the packet as additional ICD-10 codes. Click a code to add or remove it. '
      + (form.secondaryDx.length
        ? `Currently selected: ${form.secondaryDx.join(', ')}.`
        : 'None selected. The codes offered are the other diagnoses documented on this patient\u2019s notes.'),
  }

  const submitted = selected?.status === 'submitted'
  const readOnly = submitted || preview
  const signature = selected ? valueOf(selected.sections.flatMap((s) => s.fields).find((f) => f.id === 'signature')!) : ''
  const canSubmit = attested && signature.trim().length > 1

  return (
    <ClinicianShell
      title="Prior authorization"
      intro="Draft a payer-ready prior-authorization packet. The Prior-Auth Compliance Agent searches the payer policy library and drafts a cited packet with the medical-necessity narrative, ASAM dimensions and provider identifiers filled in. Review, edit, sign and submit — the agent never submits. SUD fields are redacted under 42 CFR Part 2 without role + consent."
      actions={
        <Button variant="secondary" onClick={() => setFairnessOpen(true)}>
          <Scale className="h-4 w-4" /> Fairness monitoring
        </Button>
      }
    >
      <div className="mx-auto grid max-w-4xl gap-4">
        <HumanInLoopNote>
          The agent drafts and checks coverage with citations, but a human clinician edits, signs, attests, and submits the prior authorization — the agent never submits.
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
                const masked = p.part2Gated && !part2Access
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => { setSelectedId(p.id); setCreating(false) }}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${active ? 'border-teal-300 bg-teal-50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-800">
                          {masked
                            ? <span className="inline-flex items-center gap-1 text-slate-500"><Lock className="h-3 w-3" /> Protected (42 CFR Part 2)</span>
                            : p.service}
                        </div>
                        <div className="truncate text-xs text-slate-400">{p.id} · drafted {p.dateOfRequest}</div>
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
          <Panel title="Draft a prior-auth packet">
            <p className="mb-3 text-sm text-slate-500">
              Member <span className="font-medium text-slate-700">{DEMO_MEMBER.name}</span> ({DEMO_MEMBER.mrn}).
              Choose the request details; the Prior-Auth Compliance Agent searches the payer policy library and drafts a cited packet.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Service" help={FORM_HELP.service}>
                <Select value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}>
                  {DEMO_SERVICE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="Payer" help={FORM_HELP.payer}>
                <Select value={form.payer} onChange={(e) => setForm((f) => ({ ...f, payer: e.target.value }))}>
                  {DEMO_PAYER_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </FormField>
              <FormField label="Primary diagnosis" help={FORM_HELP.primaryDx}>
                <Select
                  value={form.primaryDx}
                  onChange={(e) => setForm((f) => ({ ...f, primaryDx: e.target.value, secondaryDx: f.secondaryDx.filter((c) => c !== e.target.value) }))}
                >
                  <option value="">Select a diagnosis…</option>
                  {DEMO_PRIMARY_DX_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.code} — {o.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Requested units" help={FORM_HELP.units}>
                <Input value={form.requestedUnits} onChange={(e) => setForm((f) => ({ ...f, requestedUnits: e.target.value }))} placeholder="e.g., 3x/week for 4 weeks" />
              </FormField>
            </div>
            {form.primaryDx && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  Secondary diagnoses (optional)
                  <HelpTip label="Secondary diagnoses" help={FORM_HELP.secondaryDx} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEMO_SECONDARY_DX_OPTIONS.filter((o) => o.code !== form.primaryDx).map((o) => {
                    const on = form.secondaryDx.includes(o.code)
                    return (
                      <button key={o.code} type="button"
                        onClick={() => setForm((f) => ({ ...f, secondaryDx: on ? f.secondaryDx.filter((c) => c !== o.code) : [...f.secondaryDx, o.code] }))}
                        className={`rounded-full border px-3 py-1 text-xs transition ${on ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        {o.code}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <p className="mt-3 text-xs">
              <span className="inline-flex items-center gap-1 text-amber-700">
                <Lock className="h-3 w-3" />
                Primary diagnosis options are substance use disorders by design, so every packet drafted here is
                42 CFR Part 2 gated and carries the § 2.32 redisclosure notice.
              </span>
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button onClick={draft} disabled={!form.primaryDx}><Sparkles className="h-4 w-4" /> Draft with agent</Button>
              {creating && packets.length > 0 && (
                <Button variant="ghost" onClick={() => { setCreating(false); setSelectedId(packets[0]?.id ?? null) }}>Cancel</Button>
              )}
            </div>
          </Panel>
        ) : selected ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b border-slate-100 bg-slate-50/70 px-5 py-2.5">
              <span className="text-xs font-medium text-slate-500">{selected.id}</span>
              <div className="flex items-center gap-2">
                {selected.part2Gated && (
                  <button
                    type="button"
                    onClick={() => setPart2Access((v) => !v)}
                    aria-pressed={part2Access}
                    title="Toggle the viewer's 42 CFR Part 2 access (role + patient consent)"
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${part2Access ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-300 bg-slate-100 text-slate-600'}`}
                  >
                    {part2Access ? <LockOpen className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    Part 2 access: {part2Access ? 'granted' : 'denied'}
                  </button>
                )}
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
              {/* Payer submission header — where the packet is going */}
              <div className="mb-5 grid gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:grid-cols-2">
                <div><span className="font-semibold text-slate-700">Submit to:</span> {DEMO_PAYER.name} — Behavioral Health Utilization Management</div>
                <div><span className="font-semibold text-slate-700">Form:</span> {DEMO_PAYER.formId}</div>
                <div><span className="font-semibold text-slate-700">PA fax:</span> {DEMO_PAYER.paFax}</div>
                <div><span className="font-semibold text-slate-700">PA phone:</span> {DEMO_PAYER.paPhone}</div>
              </div>

              {/* Letterhead */}
              <div className="border-b border-slate-200 pb-4 text-center">
                <div className="font-display text-lg font-bold text-slate-800">Prior Authorization Request</div>
                <div className="mt-0.5 text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Behavioral Health</div>
                <div className="mt-2 text-xs text-slate-500">{DEMO_FACILITY.name} · {DEMO_FACILITY.address} · NPI {DEMO_FACILITY.npi}</div>
              </div>

              {/* Sections */}
              {selected.sections.map((section) => (
                <section key={section.id} className="mt-6">
                  <h3 className="mb-3 border-b border-slate-200 pb-1 font-display text-sm font-bold uppercase tracking-wide text-slate-700">{section.title}</h3>

                  {/* 42 CFR § 2.32 Notice Prohibiting Redisclosure — only when Part 2 content is
                      actually disclosed. When access is denied nothing was disclosed, so the
                      notice is replaced by a gating note. */}
                  {section.id === 'sud' && (
                    part2Access ? (
                      <div className="mb-4 rounded-lg border-2 border-slate-800 bg-slate-50 px-4 py-3">
                        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-800">
                          <AlertTriangle className="h-3.5 w-3.5" /> Notice Prohibiting Redisclosure — 42 CFR § 2.32
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-700">{REDISCLOSURE_NOTICE}</p>
                      </div>
                    ) : (
                      <div className="mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Withheld under 42 CFR Part 2. This viewer holds neither the Part 2 access role nor a patient consent on file, so no substance use disorder information is disclosed and the § 2.32 redisclosure notice does not apply.</span>
                      </div>
                    )
                  )}

                  {section.id === 'attestation' && !submitted && !preview && (
                    <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <PenLine className="h-3.5 w-3.5" /> Type your full name in Electronic Signature and tick the attestation below to enable submission. The date is stamped on submit.
                    </p>
                  )}

                  <dl className="grid gap-2.5">
                    {section.fields.map((f) => (
                      <DocFieldRow
                        key={f.id}
                        field={f}
                        value={valueOf(f)}
                        redacted={isRedacted(selected, f)}
                        editable={f.editable && !readOnly}
                        onEdit={(v) => setEdits((e) => ({ ...e, [f.id]: v }))}
                      />
                    ))}
                  </dl>
                </section>
              ))}

              {/* Supporting documentation */}
              <section className="mt-6">
                <h3 className="mb-3 border-b border-slate-200 pb-1 font-display text-sm font-bold uppercase tracking-wide text-slate-700">Supporting Documentation Attached</h3>
                <ul className="grid gap-1.5 text-sm text-slate-700">
                  {selected.attachments.map((a) => (
                    <li key={a} className="flex items-center gap-2"><Paperclip className="h-3.5 w-3.5 text-slate-400" /> {a}</li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Attest + submit / delete (hidden in preview and once submitted) */}
            {!submitted && !preview && (
              <div className="rounded-b-xl border-t border-slate-100 px-6 py-4 sm:px-10">
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-0.5 accent-teal-700" />
                  I certify that the information provided is accurate and that the requested services are medically necessary.
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button onClick={submit} disabled={!canSubmit}>Submit prior authorization</Button>
                  <Button variant="ghost" onClick={remove} className="text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" /> Delete draft
                  </Button>
                  {selected.draftedByAgent && <StatusBadge tone="info">AI-drafted · verify before submitting</StatusBadge>}
                </div>
                {!canSubmit && (
                  <p className="mt-2 text-xs text-slate-500">
                    {signature.trim().length > 1 ? 'Tick the attestation to submit.' : 'Sign the Attestation & Signature section and tick the attestation to submit.'}
                  </p>
                )}
              </div>
            )}
            {submitted && (
              <div className="rounded-b-xl border-t border-slate-100 px-6 py-4 text-sm text-teal-800 sm:px-10">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Submitted and signed by the clinician — this packet is now read-only. Date of Request remains {selected.dateOfRequest}, as stamped at draft time.</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {fairnessOpen && <PriorAuthFairnessModal onClose={() => setFairnessOpen(false)} />}

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
                'Assembling provider & facility identifiers…',
                'Drafting the prior-auth packet…',
              ]}
              cardSteps={['Searching payer policy', 'Checking criteria', 'Drafting packet']}
              cards={[{ key: 'priorauth', name: 'Prior-Auth Compliance Agent' }]}
              done={draftDone}
              doneMessage="Draft ready — review and edit the packet, sign, attest, then submit. The agent never submits."
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
