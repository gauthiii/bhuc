import { useEffect, useState } from 'react'
import { ShieldAlert, Phone, CheckCircle2, UserX, UserRound, Clock } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { Panel, StatusBadge, Spinner, ErrorState, Button, EmptyState } from '../../components/ui'
import { useClinicianAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { timeAgo } from '../../lib/format'
import type { Escalation } from '../../lib/types'

function statusTone(s: Escalation['status']) {
  return s === 'resolved' ? 'success' : s === 'acknowledged' ? 'info' : 'danger'
}

export function ClinicianEscalations() {
  const { user } = useClinicianAuth()
  const [rows, setRows] = useState<Escalation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState('')

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
                      {e.status !== 'resolved' && (
                        <div className="mt-1 flex items-center gap-2">
                          {e.status === 'open' && (
                            <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={busy === e.id} onClick={() => act(e.id, 'ack')}>
                              Acknowledge
                            </Button>
                          )}
                          <Button className="px-3 py-1.5 text-xs" disabled={busy === e.id} onClick={() => act(e.id, 'resolve')}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  </Panel>
                ))}
              </div>
            )}
    </ClinicianShell>
  )
}
