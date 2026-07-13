import { useEffect, useState } from 'react'
import { ShieldAlert, Phone, PhoneCall, PhoneOff, CheckCircle2, UserX, UserRound, UserPlus, Clock, Stethoscope, Check } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { Panel, StatusBadge, Spinner, ErrorState, Button, EmptyState } from '../../components/ui'
import { useClinicianAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { timeAgo } from '../../lib/format'
import type { Escalation } from '../../lib/types'

function statusTone(s: Escalation['status']) {
  return s === 'resolved' ? 'success' : s === 'acknowledged' ? 'info' : 'danger'
}

// Mock on-call roster — purely front-end; reassignment is local demo state.
type Clinician = { id: string; name: string; role: string; phone: string }
const CLINICIANS: Clinician[] = [
  { id: 'dr-patel', name: 'Dr. Anaya Patel', role: 'Psychiatrist', phone: '+1 (415) 555-0142' },
  { id: 'dr-reyes', name: 'Dr. Marcus Reyes', role: 'Addiction Medicine', phone: '+1 (415) 555-0177' },
  { id: 'dr-nguyen', name: 'Dr. Linh Nguyen', role: 'Crisis Counselor', phone: '+1 (415) 555-0198' },
  { id: 'dr-okafor', name: 'Dr. Grace Okafor', role: 'On-call Clinician', phone: '+1 (415) 555-0121' },
]

type CallTarget = { name: string; sub: string; phone: string }

// Ringing "call in progress" modal card.
function CallCard({ target, onEnd }: { target: CallTarget; onEnd: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-label="Call in progress">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
        <div className="relative mx-auto mb-6 grid h-24 w-24 place-items-center">
          <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-teal-400 opacity-60" />
          <span className="absolute inline-flex h-24 w-24 animate-ping rounded-full bg-teal-300 opacity-30 [animation-delay:400ms]" />
          <div className="relative grid h-16 w-16 place-items-center rounded-full bg-teal-600 text-white shadow-lg">
            <PhoneCall className="h-7 w-7 animate-pulse" />
          </div>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Call in progress</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-800">{target.name}</h2>
        <p className="text-sm text-slate-500">{target.sub}</p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-slate-600">
          <Phone className="h-3.5 w-3.5" /> {target.phone}
        </p>
        <p className="mt-3 flex items-center justify-center gap-1 text-sm text-slate-400">
          Ringing<span className="animate-pulse">…</span>
        </p>
        <button
          onClick={onEnd}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-rose-700"
        >
          <PhoneOff className="h-4 w-4" /> End call
        </button>
      </div>
    </div>
  )
}

export function ClinicianEscalations() {
  const { user } = useClinicianAuth()
  const [rows, setRows] = useState<Escalation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  // Front-end-only demo state.
  const [assigned, setAssigned] = useState<Record<string, Clinician>>({})
  const [assignMenu, setAssignMenu] = useState('')
  const [call, setCall] = useState<CallTarget | null>(null)

  const load = () => { setError(null); api.getEscalations().then(setRows).catch(() => setError("Couldn't load escalations.")) }
  useEffect(load, [])

  async function act(id: string, kind: 'ack' | 'resolve') {
    setBusy(id)
    try {
      if (kind === 'ack') await api.acknowledgeEscalation(id, user?.username)
      else await api.resolveEscalation(id, user?.username)
      load()
    } catch {
      setError('The action failed. Try again.')
    } finally {
      setBusy('')
    }
  }

  const openCount = rows?.filter((r) => r.status === 'open').length ?? 0

  return (
    <ClinicianShell
      title="Escalations"
      intro="Crisis escalations raised by the Front-Door agent's 988 flow or by check-in / screening. An escalation with no patient on file is from an unregistered (anonymous) visitor."
    >
      {rows === null ? <Spinner label="Loading escalations…" />
        : error ? <ErrorState message={error} onRetry={load} />
          : rows.length === 0 ? <EmptyState title="No escalations logged." />
            : (
              <div className="grid gap-3">
                {openCount > 0 && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {openCount} open escalation{openCount > 1 ? 's' : ''} awaiting acknowledgement.
                  </p>
                )}
                {rows.map((e) => (
                  <Panel key={e.id}
                    title={<span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-600" /> {e.id}</span>}
                    actions={<StatusBadge tone={statusTone(e.status)}>{e.status}</StatusBadge>}>
                    <div className="grid gap-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        {e.registered
                          ? <StatusBadge tone="neutral" icon={<UserRound className="h-3.5 w-3.5" />}>{e.patientName}{e.patientNumber ? ` · ${e.patientNumber}` : ''}</StatusBadge>
                          : <StatusBadge tone="warning" icon={<UserX className="h-3.5 w-3.5" />}>From an unregistered patient</StatusBadge>}
                        <StatusBadge tone="neutral"><Phone className="mr-1 inline h-3 w-3" />{e.channel}</StatusBadge>
                        <StatusBadge tone="neutral">{e.source}</StatusBadge>
                        <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3 w-3" />{timeAgo(e.createdAt)}</span>
                      </div>
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">“{e.message || '—'}”</p>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        <span>Detected by {e.detectedBy}</span>
                        {e.onCallNotified && <span>· On-call notified</span>}
                        {e.acknowledgedAt && <span>· Acknowledged {e.acknowledgedAt}</span>}
                      </div>
                      {assigned[e.id] && (
                        <StatusBadge tone="info" icon={<Stethoscope className="h-3.5 w-3.5" />}>
                          Assigned to {assigned[e.id].name}
                        </StatusBadge>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {e.status !== 'resolved' && e.status === 'open' && (
                          <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={busy === e.id} onClick={() => act(e.id, 'ack')}>
                            Acknowledge
                          </Button>
                        )}

                        {/* Assign / reassign to another clinician */}
                        <div className="relative">
                          <Button
                            variant="secondary"
                            className="px-3 py-1.5 text-xs"
                            onClick={() => setAssignMenu((m) => (m === e.id ? '' : e.id))}
                          >
                            <UserPlus className="h-3.5 w-3.5" /> {assigned[e.id] ? 'Reassign' : 'Assign'}
                          </Button>
                          {assignMenu === e.id && (
                            <div className="absolute left-0 top-full z-20 mt-1 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                              <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Assign to clinician
                              </p>
                              {CLINICIANS.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => { setAssigned((a) => ({ ...a, [e.id]: c })); setAssignMenu('') }}
                                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                                >
                                  <span>
                                    <span className="block font-medium text-slate-800">{c.name}</span>
                                    <span className="block text-xs text-slate-500">{c.role}</span>
                                  </span>
                                  {assigned[e.id]?.id === c.id && <Check className="h-4 w-4 text-teal-600" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Call the assigned clinician, or the patient if none assigned */}
                        <Button
                          className="px-3 py-1.5 text-xs"
                          onClick={() => {
                            const c = assigned[e.id]
                            setCall(c
                              ? { name: c.name, sub: c.role, phone: c.phone }
                              : { name: e.registered ? (e.patientName ?? 'Patient') : 'Unregistered patient', sub: 'Crisis outreach', phone: e.patientNumber || '+1 (415) 555-0100' })
                          }}
                        >
                          <PhoneCall className="h-3.5 w-3.5" /> Call
                        </Button>

                        {e.status !== 'resolved' && (
                          <Button className="px-3 py-1.5 text-xs" disabled={busy === e.id} onClick={() => act(e.id, 'resolve')}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            )}

      {call && <CallCard target={call} onEnd={() => setCall(null)} />}
    </ClinicianShell>
  )
}
