import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Eye, EyeOff, PenLine, ShieldAlert, ShieldCheck } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { HumanInLoopNote } from '../../components/Shell'
import { Panel, StatusBadge, Spinner, ErrorState, Button, Textarea, EmptyState } from '../../components/ui'
import { AgentRunProgress } from '../../components/AgentRunProgress'
import { useClinicianAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { FACILITY } from '../../lib/facility'
import type { DocumentationDraft, Part2CheckResult, PatientChart } from '../../lib/types'

type Phase = 'loading' | 'drafting' | 'ready' | 'empty' | 'error'

// --- Parse the agent's section-tagged lines into a document layout. Each line keeps its
// identity (id/verified) so per-line verify is unchanged; we only derive a section + a
// prefix-stripped display value so the note reads like a clinical paper. ---
type DocLine = DocumentationDraft['lines'][number]
type Field = { line: DocLine; prefix: string; display: string }
type DocSection = { key: string; label: string; items: Field[] }

const SECTIONS: { key: string; label: string; match: RegExp }[] = [
  { key: 'cc', label: 'Chief Complaint', match: /^(chief complaint|cc)\b/i },
  { key: 'hpi', label: 'History of Present Illness', match: /^(hpi|history of present illness)\b/i },
  { key: 'screening', label: 'Screening Results', match: /^(screening results?|screening)\b/i },
  { key: 'mse', label: 'Mental Status Exam', match: /^(mse|mental status( exam)?)\b/i },
  { key: 'assessment', label: 'Assessment', match: /^(assessment( ?\/ ?diagnosis)?|diagnosis|impression)\b/i },
  { key: 'plan', label: 'Plan', match: /^(plan)\b/i },
]

function detectSection(text: string): { key: string; label: string; prefix: string; display: string } | null {
  const t = text.replace(/^\s+/, '')
  for (const s of SECTIONS) {
    if (s.match.test(t)) {
      const colon = t.indexOf(':')
      if (colon !== -1) return { key: s.key, label: s.label, prefix: t.slice(0, colon + 1), display: t.slice(colon + 1).trim() }
      return { key: s.key, label: s.label, prefix: '', display: t }
    }
  }
  return null
}

// A static key/value line in the document header (not editable — not agent-generated).
function DocField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700">{value && value !== '—' ? value : <span className="text-slate-400">—</span>}</dd>
    </div>
  )
}

function groupSections(lines: DocLine[]): DocSection[] {
  const groups: DocSection[] = []
  let cur = 'cc'
  for (const line of lines) {
    const d = detectSection(line.text)
    const key = d ? d.key : cur
    const label = d ? d.label : (SECTIONS.find((s) => s.key === key)?.label ?? 'Note')
    cur = key
    if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, label, items: [] })
    const prefix = d ? d.prefix : ''
    const display = d ? d.display : line.text
    if (d && display.trim() === '') continue        // bare "HPI:" header → heading only, no field
    groups[groups.length - 1].items.push({ line, prefix, display })
  }
  return groups
}

// C5 — Ambient Documentation. ?new=1 drafts a fresh note (Agent 3, animated);
// ?note=<id> views a specific note; default views the patient's latest note.
export function ClinicianDocumentation() {
  const { id } = useParams()          // patientId (or a note id via ?note)
  const { user } = useClinicianAuth()
  const [sp] = useSearchParams()
  const wantNew = sp.get('new') === '1'
  const noteParam = sp.get('note')
  const screeningParam = sp.get('screening') ?? undefined

  const [phase, setPhase] = useState<Phase>('loading')
  const [data, setData] = useState<DocumentationDraft | null>(null)
  const [lines, setLines] = useState<DocumentationDraft['lines']>([])
  const [codes, setCodes] = useState<DocumentationDraft['suggestedCodes']>([])
  const [attested, setAttested] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [part2Check, setPart2Check] = useState<'running' | Part2CheckResult | null>(null)
  const [chart, setChart] = useState<PatientChart | null>(null)
  const [preview, setPreview] = useState(false)   // eye toggle → clean read-only PDF view

  function apply(d: DocumentationDraft | null) {
    if (!d) { setPhase('empty'); return }
    setData(d); setLines(d.lines); setCodes(d.suggestedCodes); setSigned(d.signed); setPhase('ready')
  }

  useEffect(() => {
    let alive = true
    async function run() {
      try {
        if (wantNew) {
          setPhase('drafting')
          const d = await api.draftNewNote(id!, screeningParam)   // Agent 3 runs here
          // A freshly agent-drafted note starts FULLY UNVERIFIED: the clinician must
          // review and mark every line verified (nothing is pre-verified by the agent).
          if (alive) apply(d ? { ...d, lines: d.lines.map((l) => ({ ...l, verified: false })) } : d)
        } else if (noteParam) {
          apply(await api.getDocumentation(noteParam, user?.username))
        } else {
          apply(await api.getLatestNote(id!, user?.username))
        }
      } catch { if (alive) setPhase('error') }
    }
    run()
    return () => { alive = false }
  }, [id, wantNew, noteParam, screeningParam, user?.username])

  // Patient demographics for the document header (name/MRN/DOB/insurance/phone).
  useEffect(() => {
    let alive = true
    if (!id) return
    api.getChart(id, false, user?.username).then((c) => { if (alive) setChart(c) }).catch(() => {})
    return () => { alive = false }
  }, [id, user?.username])

  const unverifiedCount = lines.filter((l) => !l.verified).length
  const sections = useMemo(() => groupSections(lines), [lines])
  const acceptedCodes = codes.filter((c) => c.accepted)
  const canSign = unverifiedCount === 0 && attested && !signing && !signed
  const reasons: string[] = []
  if (unverifiedCount > 0) reasons.push(`${unverifiedCount} unverified line${unverifiedCount > 1 ? 's' : ''} remain — verify each before signing.`)
  if (!attested) reasons.push('Check the attestation to sign.')

  const verify = (lineId: string) => setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, verified: true } : l)))
  const verifyAll = () => setLines((ls) => ls.map((l) => ({ ...l, verified: true })))
  const editLine = (lineId: string, text: string) => setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, text } : l)))
  const toggleCode = (code: string) => setCodes((cs) => cs.map((c) => (c.code === code ? { ...c, accepted: !c.accepted } : c)))

  async function sign() {
    if (!canSign || !data) return
    setSigning(true)
    try {
      // Persist the clinician's edits + resolution; server re-checks and rejects (422) if any
      // remain. Sending the edited text is what lets Agent 4 scan what the clinician actually wrote.
      const unresolved = lines.filter((l) => !l.verified).map((l) => l.id)
      const noteText = lines.map((l) => l.text).join('\n\n')
      await api.signNote(data.id, unresolved, noteText)
      setSigned(true)
      // UC3 — the Consent & Data Protection Agent (Agent 4) scans the signed note for
      // 42 CFR Part 2 / SUD content and labels it; surface the run + result in a modal.
      setPart2Check('running')
      try { setPart2Check(await api.checkNotePart2(data.id)) }
      catch { setPart2Check({ note: data.id, sensitivity: 'unknown', containsPart2: false }) }
    }
    catch { setPhase('error') }
    finally { setSigning(false) }
  }

  const p2 = part2Check && part2Check !== 'running' ? part2Check : null

  return (
    <ClinicianShell
      title="Ambient documentation"
      intro="Review the AI-drafted session note. Unverified lines are flagged; resolve each and attest before signing."
    >
      {phase === 'loading' && <Spinner label="Loading note…" />}

      {phase === 'drafting' && (
        <div className="mx-auto max-w-2xl">
          <AgentRunProgress
            runningTitle="Generating the clinical note"
            doneTitle="Note drafted"
            statusTexts={['Reading the encounter…', 'Drafting the note…', 'Grounding each line to source…', 'Suggesting ICD-10 / CPT codes…', 'Flagging unverified lines…']}
            cardSteps={['Queued', 'Drafting', 'Grounding lines', 'Suggesting codes']}
            cards={[{ key: 'note', name: 'Clinical documentation agent' }]}
            done={false}
            doneMessage="Draft note ready for your review."
          />
        </div>
      )}

      {phase === 'error' && <ErrorState message="Couldn't load the documentation." onRetry={() => window.location.reload()} />}

      {phase === 'empty' && (
        <div className="mx-auto max-w-2xl">
          <Panel title="No note yet">
            <EmptyState title="This patient has no documentation yet" hint="Draft an AI note grounded in the encounter; you review and sign it." />
            <div className="mt-4 flex justify-end">
              <Link to={`/clinician/documentation/${id}?new=1`}><Button><PenLine className="h-4 w-4" /> Start note</Button></Link>
            </div>
          </Panel>
        </div>
      )}

      {phase === 'ready' && data?.part2Masked && (
        <div className="mx-auto max-w-2xl">
          <Panel title={<span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-600" /> Protected note — 42 CFR Part 2</span>}
            subtitle={data.id}
            actions={<StatusBadge tone="danger">Access-gated</StatusBadge>}>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              This signed note was flagged as containing 42 CFR Part 2 (substance-use) content by the Consent &amp; Data Protection Agent. Its body is withheld because it requires <span className="font-medium">both</span> the approved case-manager role <span className="font-medium">and</span> the patient's Part 2 consent on file. Ask an administrator for access if you are an approved case manager.
            </div>
          </Panel>
        </div>
      )}

      {phase === 'ready' && data && !data.part2Masked && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 lg:col-span-2">
            <HumanInLoopNote>
              The BHUC Clinical Documentation Agent drafts this note but never signs it — a human clinician must. Draft note; not part of the record until signed.
            </HumanInLoopNote>

            {/* Clinical-document "paper": static scaffold (letterhead + demographics + section
                headings), agent-generated text as editable per-line fields with verify. */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-2.5">
                <span className="text-xs font-medium text-slate-500">
                  {data.screeningId ? `${data.id} · from ${data.screeningId}` : data.id}
                </span>
                <div className="flex items-center gap-2">
                  {!preview && !signed && unverifiedCount > 0 && (
                    <Button variant="secondary" className="px-3 py-1 text-xs" onClick={verifyAll}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verify all
                    </Button>
                  )}
                  {signed
                    ? <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>Signed &amp; verified</StatusBadge>
                    : <StatusBadge tone="warning">Draft</StatusBadge>}
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
                  <div className="font-display text-lg font-bold text-slate-800">{FACILITY.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{FACILITY.address} · {FACILITY.phone}</div>
                  <div className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">Clinical Encounter Note</div>
                </div>

                {/* Demographics + encounter */}
                <dl className="grid grid-cols-1 gap-x-10 gap-y-1.5 border-b border-slate-200 py-4 text-sm sm:grid-cols-2">
                  <DocField label="Patient" value={chart?.name.value ?? data.patientName} />
                  <DocField label="Encounter date" value={new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} />
                  <DocField label="MRN" value={chart?.number} />
                  <DocField label="Provider" value={user?.username ?? 'Attending clinician'} />
                  <DocField label="Date of birth" value={chart?.dateOfBirth.value} />
                  <DocField label="Encounter type" value="Behavioral Health Urgent Care" />
                  {chart?.demographics
                    ?.filter((d) => !/42 CFR|SUD/i.test(d.label))   // header is demographics only — not the Part 2 field
                    .map((d) => (
                      <DocField key={d.label} label={d.label} value={d.value.masked ? null : d.value.value} />
                    ))}
                </dl>

                {/* Sections — agent text as editable fields under document headings */}
                {sections.map((section, si) => (
                  <section key={`${section.key}-${si}`} className="mt-6">
                    <h3 className="mb-2.5 border-b border-slate-200 pb-1 font-display text-sm font-bold uppercase tracking-wide text-slate-700">{section.label}</h3>
                    <div className="grid gap-2">
                      {section.items.map(({ line, prefix, display }) => {
                        // Preview (eye-on): plain document text, no field container / badges.
                        if (preview) {
                          const isBullet = /^\s*-\s+/.test(display)
                          return (
                            <p key={line.id} className={`text-sm leading-relaxed text-slate-800 ${isBullet ? 'pl-4' : ''}`}>
                              {isBullet ? `• ${display.replace(/^\s*-\s*/, '')}` : display}
                            </p>
                          )
                        }
                        const rows = Math.min(6, Math.max(1, Math.ceil((display.length || 1) / 72)))
                        return (
                          <div key={line.id} className={`rounded-md border px-3 py-2 ${line.verified ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50/60'}`}>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              {line.verified
                                ? <StatusBadge tone="success" icon={<CheckCircle2 className="h-3 w-3" />}>Verified</StatusBadge>
                                : <StatusBadge tone="warning" icon={<AlertTriangle className="h-3 w-3" />}>Unverified</StatusBadge>}
                              {!line.verified && !signed && <Button variant="secondary" className="px-2.5 py-0.5 text-xs" onClick={() => verify(line.id)}>Mark verified</Button>}
                            </div>
                            <Textarea
                              rows={rows}
                              value={display}
                              disabled={signed}
                              onChange={(e) => editLine(line.id, prefix ? `${prefix} ${e.target.value}` : e.target.value)}
                            />
                          </div>
                        )
                      })}
                      {/* Accepted codes flow into the Assessment section, live. */}
                      {section.key === 'assessment' && acceptedCodes.length > 0 && (
                        <div className="mt-1 rounded-md border border-teal-200 bg-teal-50/60 px-3 py-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-teal-800">Coded diagnoses &amp; services</div>
                          <ul className="mt-1 grid gap-0.5 text-sm text-slate-700">
                            {acceptedCodes.map((c) => (
                              <li key={c.code}><span className="font-semibold">{c.code}</span> <span className="text-xs text-slate-400">{c.type}</span> — {c.description}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </section>
                ))}

                {/* If the agent produced no Assessment section but codes were accepted, show them. */}
                {acceptedCodes.length > 0 && !sections.some((s) => s.key === 'assessment') && (
                  <section className="mt-6">
                    <h3 className="mb-2.5 border-b border-slate-200 pb-1 font-display text-sm font-bold uppercase tracking-wide text-slate-700">Assessment</h3>
                    <div className="rounded-md border border-teal-200 bg-teal-50/60 px-3 py-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-teal-800">Coded diagnoses &amp; services</div>
                      <ul className="mt-1 grid gap-0.5 text-sm text-slate-700">
                        {acceptedCodes.map((c) => (
                          <li key={c.code}><span className="font-semibold">{c.code}</span> <span className="text-xs text-slate-400">{c.type}</span> — {c.description}</li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Panel title="Suggested codes">
              <ul className="grid gap-2">
                {codes.map((c) => (
                  <li key={c.code} className="rounded-lg border border-slate-100 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{c.code}</span>
                      <StatusBadge tone="neutral">{c.type}</StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{c.description}</p>
                    {!signed && (
                      <div className="mt-2">
                        <Button variant={c.accepted ? 'primary' : 'secondary'} className="px-3 py-1 text-xs" onClick={() => toggleCode(c.code)}>
                          {c.accepted ? 'Accepted' : 'Accept / override'}
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Sign">
              {signed ? (
                <div className="flex items-center gap-2 text-sm text-teal-800"><CheckCircle2 className="h-4 w-4" /> Note signed and locked.</div>
              ) : (
                <>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-0.5 accent-teal-700" />
                    I attest this note is accurate and complete.
                  </label>
                  {reasons.length > 0 && (
                    <ul className="mt-3 grid gap-1 text-xs text-amber-700" aria-live="polite">
                      {reasons.map((r) => <li key={r} className="flex items-start gap-1"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {r}</li>)}
                    </ul>
                  )}
                  <div className="mt-4"><Button onClick={sign} disabled={!canSign} className="w-full">{signing ? 'Signing…' : 'Sign note'}</Button></div>
                </>
              )}
              <div className="mt-3 flex justify-center">
                <StatusBadge tone="success" icon={<ShieldCheck className="h-3.5 w-3.5" />}>Output integrity: positive</StatusBadge>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <Link to={`/clinician/documentation/${id}?new=1`}><Button variant="ghost" className="w-full text-xs"><PenLine className="h-3.5 w-3.5" /> Start another note</Button></Link>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {part2Check && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Consent & Data Protection Agent">
          <div className="w-full max-w-lg">
            <AgentRunProgress
              runningTitle="Consent & Data Protection Agent"
              doneTitle={p2?.containsPart2 ? '42 CFR Part 2 / SUD content detected' : 'No Part 2 content found'}
              statusTexts={[
                'Scanning the signed note for 42 CFR Part 2 / SUD content…',
                'Matching against protected substance-use terms…',
                'Setting the note sensitivity label…',
                'Applying role-based access restriction…',
              ]}
              cardSteps={['Scanning note', 'Matching Part 2 terms', 'Labeling record']}
              cards={[{ key: 'consent', name: 'Consent & Data Protection Agent' }]}
              done={!!p2}
              alert={!!p2?.containsPart2}
              doneMessage={p2?.containsPart2
                ? 'This note contains 42 CFR Part 2 / SUD content — it is now labeled and access-gated (masked from unauthorized roles on the chart).'
                : 'No 42 CFR Part 2 / SUD content found — the note is labeled standard sensitivity.'}
            />
            {p2 && (
              <div className="mt-3 flex justify-end">
                <Button onClick={() => setPart2Check(null)}>Done</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </ClinicianShell>
  )
}
