import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Send, CalendarDays, HeartPulse, MessageCircle, ClipboardList } from 'lucide-react'
import { api } from '../../services/api'
import { usePatientAuth } from '../../contexts/AuthContext'
import type { ChatReply, ChatTurn, DashboardSummary, ScreeningStatusItem } from '../../lib/types'
import { PatientShell } from '../../components/portals'
import { CrisisDialog } from '../../components/CrisisDialog'
import { Panel, Button, StatusBadge, Spinner, ErrorState, Textarea, EmptyState } from '../../components/ui'
import { formatDateTime } from '../../lib/format'

const QUICK_REPLIES = ['Book a visit', 'I need to talk', 'Check coverage']

// Agent replies are Markdown (bold, links, numbered lists). Render them; links open
// in a new tab. User turns are plain text (no markdown parsing on user input).
function MessageBody({ role, text }: { role: ChatTurn['role']; text: string }) {
  if (role === 'user') return <>{text}</>
  return (
    <div className="md-msg">
      <ReactMarkdown
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer noopener" />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

// Animated "typing…" indicator (three bouncing dots).
function TypingIndicator() {
  return (
    <div className="flex justify-start msg-enter">
      <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3" role="status" aria-label="Assistant is typing">
        <span className="typing-dots"><span /><span /><span /></span>
        <span className="sr-only">Assistant is typing…</span>
      </div>
    </div>
  )
}

export function PatientHome() {
  const [turns, setTurns] = useState<ChatTurn[]>([
    { id: 'seed', role: 'agent', text: 'Hi, I’m here to help. I can assist with hours, insurance, booking a visit, or starting registration. How can we help today?' },
  ])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [crisis, setCrisis] = useState(false)

  const { user } = usePatientAuth()
  const [dash, setDash] = useState<DashboardSummary | null>(null)
  const [screening, setScreening] = useState<ScreeningStatusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const loadDash = () => {
    setLoading(true)
    setError(null)
    api.getDashboard()
      .then(setDash)
      .catch(() => setError('Couldn’t load your dashboard.'))
      .finally(() => setLoading(false))
  }
  useEffect(loadDash, [])
  useEffect(() => {
    api.getScreeningStatus(user?.username ?? '').then(setScreening).catch(() => setScreening([]))
  }, [user])
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }) }, [turns, sending])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setDraft('')
    setTurns((t) => [...t, { id: 'u-' + Date.now(), role: 'user', text: trimmed }])
    setSending(true)
    try {
      const reply: ChatReply = await api.frontDoorChat(trimmed)
      setTurns((t) => [...t, { id: 'a-' + Date.now(), role: 'agent', text: reply.reply }])
      if (reply.crisis) setCrisis(true)
    } catch {
      setTurns((t) => [...t, { id: 'e-' + Date.now(), role: 'agent', text: 'Sorry, that didn’t send. Please try again.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <PatientShell title="How can we help today?" intro="Ask a question, or use the shortcuts on the right to manage your care.">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel title="Chat with BHUC Care">
            <div ref={logRef} role="log" aria-live="polite" aria-label="Conversation" className="mb-3 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
              {turns.map((t) => (
                <div key={t.id} className={`msg-enter ${t.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${t.role === 'user' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
                    <MessageBody role={t.role} text={t.text} />
                  </div>
                </div>
              ))}
              {sending && <TypingIndicator />}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {QUICK_REPLIES.map((q) => (
                <button key={q} onClick={() => send(q)} disabled={sending}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">{q}</button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(draft) }} className="flex items-end gap-2">
              <Textarea
                aria-label="Type your message"
                placeholder="Type your message…"
                rows={2}
                maxLength={2000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft) } }}
              />
              <Button type="submit" aria-label="Send message" disabled={sending || !draft.trim()}><Send className="h-4 w-4" /></Button>
            </form>
          </Panel>
        </div>

        <aside className="space-y-4 lg:col-span-5">
          {loading && <Panel title="Your care"><Spinner /></Panel>}
          {error && !loading && <Panel title="Your care"><ErrorState message={error} onRetry={loadDash} /></Panel>}
          {dash && !loading && (
            <>
              {!dash.registrationComplete && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Finish registration &amp; consent to unlock all features. <Link to="/patient/register" className="font-semibold underline">Complete now</Link>
                </div>
              )}
              <Panel title={<span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-teal-700" /> Next appointment</span>}
                actions={<Link to="/patient/appointments" className="text-sm font-semibold text-teal-700 hover:underline">View</Link>}>
                {dash.nextAppointment ? (
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-slate-800">{formatDateTime(dash.nextAppointment.start)}</p>
                    <p className="text-slate-600">{dash.nextAppointment.visitType} · {dash.nextAppointment.modality === 'telehealth' ? 'Telehealth' : 'In person'}</p>
                    <p className="text-slate-500">{dash.nextAppointment.clinician}</p>
                    <StatusBadge tone="success">Confirmed</StatusBadge>
                  </div>
                ) : <EmptyState title="No upcoming appointments" action={<Link to="/patient/appointments" className="text-sm font-semibold text-teal-700 hover:underline">Book a visit</Link>} />}
              </Panel>

              <Panel title={<span className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-teal-700" /> Your care plan</span>}
                actions={<Link to="/patient/care-plan" className="text-sm font-semibold text-teal-700 hover:underline">Open</Link>}>
                {dash.carePlanStatus === 'none' ? (
                  <p className="text-sm text-slate-500">No care plan yet.</p>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    {dash.carePlanPendingTasks > 0
                      ? <StatusBadge tone="warning">Action needed · {dash.carePlanPendingTasks} task{dash.carePlanPendingTasks > 1 ? 's' : ''}</StatusBadge>
                      : <StatusBadge tone="success">Up to date</StatusBadge>}
                  </div>
                )}
              </Panel>

              <Panel title={<span className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-teal-700" /> Messages</span>}
                actions={<Link to="/patient/messages" className="text-sm font-semibold text-teal-700 hover:underline">Open inbox</Link>}>
                {dash.unreadMessages > 0
                  ? <StatusBadge tone="warning">{dash.unreadMessages} unread</StatusBadge>
                  : <p className="text-sm text-slate-500">No new messages.</p>}
              </Panel>
            </>
          )}

          {screening.length > 0 && (
            <Panel title={<span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-teal-700" /> Screening status</span>}
              actions={<Link to="/patient/screening" className="text-sm font-semibold text-teal-700 hover:underline">View</Link>}>
              <ul className="grid gap-2">
                {screening.slice(0, 4).map((s) => (
                  <li key={s.screeningId} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{s.instrument}</span>
                    <StatusBadge tone={s.stage === 'reviewed' ? 'success' : s.stage === 'under_review' ? 'warning' : 'info'}>{s.stageLabel}</StatusBadge>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>

      <CrisisDialog open={crisis} onClose={() => setCrisis(false)} onConnect={() => setCrisis(false)} />
    </PatientShell>
  )
}
