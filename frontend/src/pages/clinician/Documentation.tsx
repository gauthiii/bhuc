import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { HumanInLoopNote } from '../../components/Shell'
import { Panel, StatusBadge, Spinner, ErrorState, Button, Textarea } from '../../components/ui'
import { api } from '../../services/api'
import type { DocumentationDraft } from '../../lib/types'

// C5 — Ambient Documentation. Sign is blocked until all unverified lines are resolved + attestation.
export function ClinicianDocumentation() {
  const { id } = useParams()
  const [data, setData] = useState<DocumentationDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [lines, setLines] = useState<DocumentationDraft['lines']>([])
  const [codes, setCodes] = useState<DocumentationDraft['suggestedCodes']>([])
  const [attested, setAttested] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.getDocumentation(id!)
      setData(d)
      setLines(d.lines)
      setCodes(d.suggestedCodes)
      setSigned(d.signed)
    } catch {
      setError("Couldn't load the documentation draft.")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  const unverifiedCount = lines.filter((l) => !l.verified).length
  const canSign = unverifiedCount === 0 && attested && !signing && !signed

  const reasons: string[] = []
  if (unverifiedCount > 0) reasons.push(`${unverifiedCount} unverified line${unverifiedCount > 1 ? 's' : ''} remain — verify each before signing.`)
  if (!attested) reasons.push('Check the attestation to sign.')

  function verify(lineId: string) {
    setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, verified: true } : l)))
  }
  function editLine(lineId: string, text: string) {
    setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, text } : l)))
  }
  function toggleCode(code: string) {
    setCodes((cs) => cs.map((c) => (c.code === code ? { ...c, accepted: !c.accepted } : c)))
  }

  async function sign() {
    if (!canSign) return
    setSigning(true)
    try {
      await api.signNote()
      setSigned(true)
    } catch {
      setError('Signing the note failed. Try again.')
    } finally {
      setSigning(false)
    }
  }

  return (
    <ClinicianShell
      title="Ambient documentation"
      intro="Review the AI-drafted session note. Unverified lines are flagged; resolve each and attest before signing."
    >
      {loading ? (
        <Spinner label="Loading note…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 lg:col-span-2">
            <HumanInLoopNote>
              The BHUC Clinical Documentation Agent drafts this note but never signs it — a human clinician must. Draft note; not part of the record until signed.
            </HumanInLoopNote>

            <Panel title={`Session note — ${data.patientName}`} actions={signed ? <StatusBadge tone="success">Signed</StatusBadge> : <StatusBadge tone="warning">Draft</StatusBadge>}>
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
                  <div className="mt-4">
                    <Button onClick={sign} disabled={!canSign} className="w-full">{signing ? 'Signing…' : 'Sign note'}</Button>
                  </div>
                </>
              )}
            </Panel>
          </div>
        </div>
      ) : null}
    </ClinicianShell>
  )
}
