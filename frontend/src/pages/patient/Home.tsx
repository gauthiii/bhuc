import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Send, CalendarDays, HeartPulse, MessageCircle, ClipboardList, ShieldAlert } from 'lucide-react'
import { api } from '../../services/api'
import { usePatientAuth } from '../../contexts/AuthContext'
import type { ChatReply, ChatTurn, DashboardSummary, ScreeningStatusItem } from '../../lib/types'
import { PatientShell } from '../../components/portals'
import { CrisisDialog } from '../../components/CrisisDialog'
import { Panel, Button, StatusBadge, Spinner, ErrorState, Textarea, EmptyState } from '../../components/ui'
import { formatDateTime } from '../../lib/format'
import { screenInput, CATEGORY_LABEL, BLOCKLIST_COUNT, type InjectionCategory } from '../../lib/promptInjectionPolicy'

type BlockedInfo = { input: string; category: InjectionCategory; matched: string }

// Content-filtering policy modal — shown when a submitted message matches the Front-Door
// input policy (300+ prompt-injection samples + heuristics). The message is never sent.
function ContentFilterModal({ info, onClose }: { info: BlockedInfo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cf-title" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-slate-100 p-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 id="cf-title" className="text-lg font-semibold text-slate-800">Blocked by content filtering policy</h2>
            <p className="mt-1 text-sm text-slate-500">
              This message was blocked before reaching the assistant. The front door only handles
              routine facility questions.
            </p>
          </div>
        </div>
        <div className="space-y-3 p-5">
          {/* Policy category + matched policy phrase — kept for later, hidden for now.
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Policy category</span>
            <div className="mt-0.5 font-medium text-slate-700">{CATEGORY_LABEL[info.category]}</div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Matched policy phrase</span>
            <div className="mt-0.5"><code className="rounded bg-rose-50 px-1 text-xs text-rose-700">{info.matched}</code></div>
          </div>
          */}
          <p className="text-xs text-slate-400">
            If you need help, ask about hours, location, insurance, or how to register — or call 988 in a crisis.
          </p>
        </div>
        <div className="flex justify-end border-t border-slate-100 p-4">
          <Button onClick={onClose}>OK</Button>
        </div>
      </div>
    </div>
  )
}

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
  const [blocked, setBlocked] = useState<BlockedInfo | null>(null)
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
    // INPUT content-filtering policy (Front-Door only): block prompt-injection attempts
    // before they reach the agent, and show the policy modal. The message is not sent.
    const screen = screenInput(trimmed)
    if (screen.blocked) {
      // Realistic beat: show the message + a brief processing pause (~1.5s), then the policy
      // modal — so it reads like the request was evaluated rather than blocked instantly.
      setDraft('')
      setTurns((t) => [...t, { id: 'u-' + Date.now(), role: 'user', text: trimmed }])
      setSending(true)
      window.setTimeout(() => {
        setSending(false)
        setBlocked({ input: trimmed, category: screen.category!, matched: screen.matched! })
      }, 1500)
      return
    }
    setDraft('')
    setTurns((t) => [...t, { id: 'u-' + Date.now(), role: 'user', text: trimmed }])
    setSending(true)
    try {
      const reply: ChatReply = await api.frontDoorChat(trimmed)
      setTurns((t) => [...t, { id: 'a-' + Date.now(), role: 'agent', text: reply.reply, filtered: reply.filtered }])
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
                    {t.filtered && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                        <ShieldAlert className="h-3 w-3 text-amber-500" /> Filtered for safety
                      </div>
                    )}
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
      {blocked && <ContentFilterModal info={blocked} onClose={() => setBlocked(null)} />}
    </PatientShell>
  )
}
