import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Lock, Unlock, FileText, CheckCircle2, PenLine, ShieldAlert } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { Panel, RiskBadge, StatusBadge, Spinner, ErrorState, Button } from '../../components/ui'
import { useClinicianAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { formatDateTime } from '../../lib/format'
import type { PatientChart, MaskableField, NotesSummary } from '../../lib/types'

// C3 — Patient Summary / Chart. Part 2 / SUD fields masked server-side unless reveal re-fetch.
export function ClinicianChart() {
  const { patientId } = useParams()
  const { user } = useClinicianAuth()
  const [data, setData] = useState<PatientChart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canSeePart2, setCanSeePart2] = useState(false)
  const [consentDenied, setConsentDenied] = useState(false)
  const [roleDenied, setRoleDenied] = useState(false)
  const [notes, setNotes] = useState<NotesSummary | null>(null)

  // Reveal is gated by clinician action AND the patient's Part 2 consent AND the
  // clinician holding the approved case-manager role (u_bhuc_part2_access). The
  // backend re-checks all three server-side before it un-masks — the client only
  // decides which "why not" modal to show.
  function onRevealToggle() {
    if (canSeePart2) { setCanSeePart2(false); return }
    if (!data?.part2Consent) { setConsentDenied(true); return }
    if (!data?.part2Role) { setRoleDenied(true); return }
    setCanSeePart2(true)
  }

  async function load(reveal: boolean) {
    setLoading(true)
    setError(null)
    try {
      setData(await api.getChart(patientId!, reveal, user?.username))
    } catch {
      setError("Couldn't load the patient chart.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(canSeePart2) }, [patientId, canSeePart2, user?.username])
  useEffect(() => {
    api.getNotesSummary(patientId!).then(setNotes).catch(() => setNotes(null))
  }, [patientId])

  const noteCount = notes?.count ?? 0
  const startLabel = noteCount > 0 ? 'Start another note' : 'Start note'

  function MaskedValue({ field }: { field: MaskableField }) {
    if (field.masked) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500" title="Protected under 42 CFR Part 2 — consent + role required to view.">
          <Lock className="h-3 w-3" /> •••••• Protected (42 CFR Part 2)
        </span>
      )
    }
    return <span className="text-slate-800">{field.value ?? '—'}</span>
  }

  return (
    <ClinicianShell
      title="Patient chart"
      intro="Consolidated chart with an AI-generated summary. SUD / 42 CFR Part 2 fields are masked by the server unless consent and role permit."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link to={`/clinician/documentation/${patientId}?new=1`}><Button variant="secondary"><PenLine className="h-4 w-4" /> {startLabel}</Button></Link>
          <Link to={`/clinician/prior-auth/${patientId}`}><Button variant="secondary">Prior-auth</Button></Link>
          <Link to={`/clinician/disposition/${patientId}`}><Button variant="secondary">Disposition</Button></Link>
        </div>
      }
    >
      {loading ? (
        <Spinner label="Loading chart…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(canSeePart2)} />
      ) : data ? (
        <div className="grid gap-4">
          <Panel
            title={<span className="flex items-center gap-2">{data.name.masked ? 'Protected patient' : data.name.value} <RiskBadge band="moderate" /></span>}
            subtitle={data.number}
            actions={
              <Button variant={canSeePart2 ? 'secondary' : 'primary'} onClick={onRevealToggle}>
                {canSeePart2 ? <><Unlock className="h-4 w-4" /> Hide Part 2</> : <><Lock className="h-4 w-4" /> Reveal (role + consent)</>}
              </Button>
            }
          >
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Part 2 / SUD fields are masked by the backend. Revealing re-fetches with consent + role; the client never un-masks a value locally.
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date of birth</dt><dd className="mt-0.5"><MaskedValue field={data.dateOfBirth} /></dd></div>
              {data.demographics.map((d) => (
                <div key={d.label}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{d.label}</dt><dd className="mt-0.5"><MaskedValue field={d.value} /></dd></div>
              ))}
            </dl>
          </Panel>

          {data.part2Content && data.part2Content.length > 0 && (
            <Panel
              title={<span className="flex items-center gap-2"><Unlock className="h-4 w-4 text-teal-700" /> SUD treatment history (42 CFR Part 2)</span>}
              actions={<StatusBadge tone="success">Unmasked · role + consent</StatusBadge>}
            >
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Protected under 42 CFR Part 2. Shown because you hold the case-manager role and the patient has consented. Do not re-disclose without authorization.
              </div>
              <ul className="grid gap-3">
                {data.part2Content.map((n) => (
                  <li key={n.number} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800">{n.number}</span>
                      <StatusBadge tone={n.signed ? 'success' : 'warning'}>{n.signed ? 'Signed' : 'Draft'}{n.signedAt ? ` · ${formatDateTime(n.signedAt)}` : ''}</StatusBadge>
                    </div>
                    {n.summary && <p className="text-sm text-slate-700">{n.summary}</p>}
                    {n.note && <pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 p-2 font-sans text-xs leading-relaxed text-slate-600">{n.note}</pre>}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title={<span className="flex items-center gap-2"><FileText className="h-4 w-4" /> AI chart summary</span>} actions={<StatusBadge tone="warning">Draft — verify against source</StatusBadge>}>
            <p className="text-sm leading-relaxed text-slate-700">{data.aiSummary.text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.aiSummary.citations.map((c, i) => (
                <StatusBadge key={i} tone="info">[{i + 1}] {c.label} · {c.source}</StatusBadge>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">Generated server-side. Not a substitute for chart review.</p>
          </Panel>

          {notes && notes.hasNotes && (
            <Panel
              title={<span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documentation</span>}
              actions={<Link to={`/clinician/documentation/${patientId}?new=1`}><Button variant="secondary" className="px-3 py-1.5 text-xs"><PenLine className="h-3.5 w-3.5" /> {startLabel}</Button></Link>}
            >
              <ul className="grid gap-2">
                {notes.notes.map((n) => (
                  <li key={n.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <Link to={`/clinician/documentation/${patientId}?note=${n.id}`} className="font-medium text-slate-800 hover:text-teal-800 hover:underline">{n.id}</Link>
                    {n.signed
                      ? <StatusBadge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>Signed &amp; verified</StatusBadge>
                      : <StatusBadge tone="warning">Draft — unsigned</StatusBadge>}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="History">
            <ul className="grid gap-2">
              {data.history.map((h, i) => (
                <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <div>
                    <div className="text-slate-700">{h.part2 && data.demographics.some((d) => d.value.masked) ? <span className="inline-flex items-center gap-1 text-slate-500"><Lock className="h-3 w-3" /> Protected (42 CFR Part 2) note</span> : h.note}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{formatDateTime(h.date)}</div>
                  </div>
                  {h.part2 && <StatusBadge tone="neutral">Part 2</StatusBadge>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}

      {consentDenied && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="alertdialog" aria-modal="true" aria-label="Consent required">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 text-amber-700">
              <Lock className="h-5 w-5" />
              <h2 className="text-lg font-semibold text-slate-900">Consent required</h2>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              The patient has not given consent to view this data. 42 CFR Part 2 (substance‑use) information cannot be revealed without the patient's active consent on file.
            </p>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setConsentDenied(false)}>Understood</Button>
            </div>
          </div>
        </div>
      )}

      {roleDenied && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="alertdialog" aria-modal="true" aria-label="Case-manager role required">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
              <h2 className="text-lg font-semibold text-slate-900">Case-manager role required</h2>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              The patient has consented, but 42 CFR Part 2 (substance‑use) data is restricted to approved case managers. Your account does not hold the <span className="font-medium">Part 2 access</span> role, so it stays masked. Ask an administrator to grant access if you are an approved case manager.
            </p>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setRoleDenied(false)}>Understood</Button>
            </div>
          </div>
        </div>
      )}
    </ClinicianShell>
  )
}
