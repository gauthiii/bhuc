import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Lock, Unlock, FileText, CheckCircle2, PenLine, ShieldAlert, ClipboardList } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { Panel, RiskBadge, StatusBadge, Spinner, ErrorState, Button } from '../../components/ui'
import { ScreeningResultsModal } from '../../components/ScreeningResultsModal'
import { useClinicianAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { formatDateTime } from '../../lib/format'
import type { PatientChart, MaskableField, NotesSummary } from '../../lib/types'

// C3 — Patient Summary / Chart. Part 2 / SUD content is gated purely on the signed-in
// clinician holding u_bhuc_part2_access (server-side). Clinicians with the role see the
// SUD data; everyone else sees a masked / redacted component. No manual "reveal" toggle.
export function ClinicianChart() {
  const { patientId } = useParams()
  const { user } = useClinicianAuth()
  const [data, setData] = useState<PatientChart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<NotesSummary | null>(null)
  const [showScreenings, setShowScreenings] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // Role-only gate: the backend un-masks Part 2 iff this clinician holds the access role.
      setData(await api.getChart(patientId!, true, user?.username))
    } catch {
      setError("Couldn't load the patient chart.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [patientId, user?.username]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api.getNotesSummary(patientId!).then(setNotes).catch(() => setNotes(null))
  }, [patientId])

  const noteCount = notes?.count ?? 0
  const startLabel = noteCount > 0 ? 'Start another note' : 'Start note'
  const hasPart2Access = !!data?.part2Role

  function MaskedValue({ field }: { field: MaskableField }) {
    if (field.masked) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500" title="Protected under 42 CFR Part 2 — Part 2 access role required to view.">
          <Lock className="h-3 w-3" /> •••••• Protected (42 CFR Part 2)
        </span>
      )
    }
    return <span className="text-slate-800">{field.value ?? '—'}</span>
  }

  return (
    <ClinicianShell
      title="Patient chart"
      intro="Consolidated chart with an AI-generated summary. SUD / 42 CFR Part 2 content is shown only to clinicians who hold the Part 2 access role; others see a redacted component."
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
        <ErrorState message={error} onRetry={load} />
      ) : data ? (
        <div className="grid gap-4">
          <Panel
            title={<span className="flex items-center gap-2">{data.name.masked ? 'Protected patient' : data.name.value} <RiskBadge band="moderate" /></span>}
            subtitle={data.number}
            actions={
              <StatusBadge tone={hasPart2Access ? 'success' : 'neutral'} icon={hasPart2Access ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}>
                {hasPart2Access ? 'Part 2 access' : 'No Part 2 access'}
              </StatusBadge>
            }
          >
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Part 2 / SUD fields are gated by the backend on your Part 2 access role. The client never un-masks a value locally.
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
              actions={<StatusBadge tone="success">Unmasked · Part 2 access role</StatusBadge>}
            >
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Protected under 42 CFR Part 2. Shown because you hold the Part 2 access role. Do not re-disclose without authorization.
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
            <div className="mt-4">
              <Button variant="secondary" onClick={() => setShowScreenings(true)}>
                <ClipboardList className="h-4 w-4" /> View latest screening results
              </Button>
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

      {showScreenings && (
        <ScreeningResultsModal patientId={patientId!} clinicianEmail={user?.username} onClose={() => setShowScreenings(false)} />
      )}
    </ClinicianShell>
  )
}
