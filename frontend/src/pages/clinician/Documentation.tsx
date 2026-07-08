import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, PenLine } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { HumanInLoopNote } from '../../components/Shell'
import { Panel, StatusBadge, Spinner, ErrorState, Button, Textarea, EmptyState } from '../../components/ui'
import { AgentRunProgress } from '../../components/AgentRunProgress'
import { api } from '../../services/api'
import type { DocumentationDraft } from '../../lib/types'

type Phase = 'loading' | 'drafting' | 'ready' | 'empty' | 'error'

// C5 — Ambient Documentation. ?new=1 drafts a fresh note (Agent 3, animated);
// ?note=<id> views a specific note; default views the patient's latest note.
export function ClinicianDocumentation() {
  const { id } = useParams()          // patientId (or a note id via ?note)
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
          apply(await api.getDocumentation(noteParam))
        } else {
          apply(await api.getLatestNote(id!))
        }
      } catch { if (alive) setPhase('error') }
    }
    run()
    return () => { alive = false }
  }, [id, wantNew, noteParam, screeningParam])

  const unverifiedCount = lines.filter((l) => !l.verified).length
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
      // Persist the clinician's resolution; server re-checks and rejects (422) if any remain.
      const unresolved = lines.filter((l) => !l.verified).map((l) => l.id)
      await api.signNote(data.id, unresolved)
      setSigned(true)
    }
    catch { setPhase('error') }
    finally { setSigning(false) }
  }

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

      {phase === 'ready' && data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 lg:col-span-2">
            <HumanInLoopNote>
              The BHUC Clinical Documentation Agent drafts this note but never signs it — a human clinician must. Draft note; not part of the record until signed.
            </HumanInLoopNote>

            <Panel
              title={`Session note — ${data.patientName}`}
              subtitle={data.screeningId ? `${data.id} · from ${data.screeningId}` : data.id}
              actions={signed
                ? <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>Signed &amp; verified</StatusBadge>
                : (
                  <div className="flex items-center gap-2">
                    {unverifiedCount > 0 && (
                      <Button variant="secondary" className="px-3 py-1 text-xs" onClick={verifyAll}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verify all
                      </Button>
                    )}
                    <StatusBadge tone="warning">Draft</StatusBadge>
                  </div>
                )}
            >
              <ul className="grid gap-3">
                {lines.map((l) => (
                  <li key={l.id} className={`rounded-lg border p-3 ${l.verified ? 'border-slate-100' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="mb-2 flex items-center justify-between">
                      {l.verified
                        ? <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>Verified</StatusBadge>
                        : <StatusBadge tone="warning" icon={<AlertTriangle className="h-3.5 w-3.5" />}>Unverified</StatusBadge>}
                      {!l.verified && !signed && <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => verify(l.id)}>Mark verified</Button>}
                    </div>
                    <Textarea rows={2} value={l.text} disabled={signed} onChange={(e) => editLine(l.id, e.target.value)} />
                  </li>
                ))}
              </ul>
            </Panel>
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
              <div className="mt-3 border-t border-slate-100 pt-3">
                <Link to={`/clinician/documentation/${id}?new=1`}><Button variant="ghost" className="w-full text-xs"><PenLine className="h-3.5 w-3.5" /> Start another note</Button></Link>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </ClinicianShell>
  )
}
