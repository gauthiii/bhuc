import { useEffect, useState } from 'react'
import { Sparkles, CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { Panel, Spinner, ErrorState, Button, EmptyState } from '../../components/ui'
import { AgentRunProgress } from '../../components/AgentRunProgress'
import { api } from '../../services/api'
import type { SchedulingBoard } from '../../lib/types'
import { formatDateTime } from '../../lib/format'

const URGENCY_STYLE: Record<string, string> = {
  high: 'bg-rose-50 text-rose-700 border-rose-200',
  moderate: 'bg-amber-50 text-amber-800 border-amber-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200',
}

// C8 — Scheduling review queue. Patients book -> pending. "Run scheduling agent" invokes
// Agent 6, which fairness-checks the queue and writes suggested slots (-> proposed). The
// clinician accepts (-> confirmed) or rejects (-> back to pending).
export function ClinicianScheduling() {
  const [board, setBoard] = useState<SchedulingBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [acting, setActing] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try { setBoard(await api.getSchedulingQueue()) }
    catch { setError("Couldn't load the scheduling board.") }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function runAgent() {
    setError(null); setRunning(true)
    try {
      const res = await api.runScheduling()
      setBoard({ pendingCount: res.pendingCount, proposed: res.proposed, pending: res.pending })
      if (res.ok === false) setError('The scheduling agent is unavailable right now — showing the current board.')
    } catch {
      setError('The scheduling agent run failed.')
    } finally {
      setRunning(false)
    }
  }

  async function act(id: string, kind: 'accept' | 'reject') {
    setActing(id)
    try {
      await (kind === 'accept' ? api.acceptAppointment(id) : api.rejectAppointment(id))
      await load()
    } catch {
      setError(`Couldn't ${kind} that appointment.`)
    } finally {
      setActing(null)
    }
  }

  return (
    <ClinicianShell
      title="Scheduling"
      intro="Patient booking requests arrive here as pending. Run the Scheduling Agent to fairness-check the queue and get suggested slots, then accept or reject each one."
    >
      <div className="grid gap-4">
        <Panel title="Scheduling agent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{board?.pendingCount ?? 0}</span> pending request{(board?.pendingCount ?? 0) === 1 ? '' : 's'} waiting to be scheduled.
            </p>
            <Button onClick={runAgent} disabled={running || (board?.pendingCount ?? 0) === 0}>
              <Sparkles className="h-4 w-4" /> Run scheduling agent
            </Button>
          </div>
        </Panel>

        {loading ? (
          <Spinner label="Loading the scheduling board…" />
        ) : running ? (
          <AgentRunProgress
            runningTitle="Scheduling Agent — ensuring fair scheduling"
            doneTitle="Fairness check complete"
            statusTexts={[
              'Reading the pending request queue…',
              'Removing protected attributes (race, ethnicity, gender, ZIP, insurance, age)…',
              'Triaging each request by clinical reason…',
              'Assigning fair, conflict-free slots within availability…',
              'Writing suggested times for your review…',
            ]}
            cardSteps={['Queued', 'Fairness check', 'Triaging', 'Assigning slots']}
            cards={[{ key: 'sched', name: 'Scheduling Agent (fairness-checked)' }]}
            done={false}
            doneMessage="Fair suggested slots written — review them below."
          />
        ) : (
          <>
            {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">{error}</div>}

            <Panel title="Suggested slots — review">
              {!board || board.proposed.length === 0 ? (
                <EmptyState title="No suggestions to review" hint="Run the scheduling agent to turn pending requests into suggested slots." />
              ) : (
                <ul className="grid gap-3">
                  {board.proposed.map((it) => (
                    <li key={it.id} className="rounded-xl border border-slate-200 p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{it.patientName}</span>
                            <span className="text-xs text-slate-400">{it.patientNumber}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${URGENCY_STYLE[it.urgency] || URGENCY_STYLE.low}`}>
                              {it.reasonLabel}{it.urgency ? ` · ${it.urgency}` : ''}
                            </span>
                          </div>
                          {it.reasonText && <p className="mt-1 text-xs text-slate-500">{it.reasonText}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-slate-400 line-through">{it.requestedStart ? formatDateTime(it.requestedStart) : '—'}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-teal-700">{it.suggestedStart ? formatDateTime(it.suggestedStart) : 'TBD'}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button variant="secondary" onClick={() => act(it.id, 'accept')} disabled={acting !== null}>
                            <CheckCircle2 className="h-4 w-4" /> {acting === it.id ? 'Working…' : 'Accept'}
                          </Button>
                          <Button variant="ghost" onClick={() => act(it.id, 'reject')} disabled={acting !== null}>
                            <XCircle className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {board && board.pending.length > 0 && (
              <Panel title={`Pending requests (${board.pending.length})`}>
                <ul className="grid gap-2">
                  {board.pending.map((it) => (
                    <li key={it.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-slate-800">{it.patientName}</span>
                        <span className="ml-2 text-xs text-slate-500">{it.reasonLabel} · requested {it.requestedStart ? formatDateTime(it.requestedStart) : '—'}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3.5 w-3.5" /> awaiting agent</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}
      </div>
    </ClinicianShell>
  )
}
