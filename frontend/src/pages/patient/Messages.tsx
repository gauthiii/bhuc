import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Send } from 'lucide-react'
import { api } from '../../services/api'
import type { Message, MessageThread } from '../../lib/types'
import { PatientShell } from '../../components/portals'
import { CrisisDialog } from '../../components/CrisisDialog'
import { Panel, Button, Spinner, ErrorState, EmptyState, Textarea } from '../../components/ui'
import { formatDateTime } from '../../lib/format'

export function PatientMessages() {
  const [threads, setThreads] = useState<MessageThread[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [crisis, setCrisis] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api.getThreads()
      .then((t) => { setThreads(t); if (t.length && !activeId) openThread(t[0].id) })
      .catch(() => setError('Couldn’t load your messages.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }) }, [messages, sending])

  async function openThread(id: string) {
    setActiveId(id)
    setThreadLoading(true)
    setMessages(null)
    try {
      setMessages(await api.getThread(id))
    } catch {
      setMessages([])
    } finally {
      setThreadLoading(false)
    }
  }

  async function send() {
    const body = draft.trim()
    if (!body || !activeId || sending) return
    setDraft('')
    setSending(true)
    const optimistic: Message = { id: 'tmp-' + Date.now(), threadId: activeId, body, senderType: 'patient', timestamp: new Date().toISOString(), status: 'sent', distressLevel: 'none' }
    setMessages((m) => [...(m ?? []), optimistic])
    try {
      const res = await api.sendMessage(activeId, body)
      if (res.distress.level === 'elevated' || res.distress.level === 'crisis') setCrisis(true)
    } catch {
      setMessages((m) => (m ?? []).map((msg) => msg.id === optimistic.id ? { ...msg, status: 'failed' } : msg))
    } finally {
      setSending(false)
    }
  }

  return (
    <PatientShell title="Secure messaging" intro="Message your care team about non-urgent questions.">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Panel title="Conversations">
            {loading && <Spinner />}
            {error && !loading && <ErrorState message={error} onRetry={load} />}
            {threads && !loading && threads.length === 0 && <EmptyState title="No messages yet" hint="Start a conversation with your care team." />}
            {threads && threads.length > 0 && (
              <ul className="space-y-1">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => openThread(t.id)}
                      aria-label={`${t.subject}${t.unread ? ', unread' : ''}`}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${activeId === t.id ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate ${t.unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{t.subject}</span>
                        {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-teal-600" aria-hidden />}
                      </div>
                      <p className="truncate text-xs text-slate-500">{t.lastMessage}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-8">
          <Panel title="Conversation">
            <div ref={logRef} role="log" aria-live="polite" className="mb-3 max-h-80 space-y-3 overflow-y-auto pr-1">
              {threadLoading && <Spinner />}
              {!threadLoading && !activeId && <p className="py-8 text-center text-sm text-slate-400">Select a conversation to view messages.</p>}
              {!threadLoading && messages?.map((m) => (
                <div key={m.id} className={m.senderType === 'patient' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.senderType === 'patient' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
                    <p>{m.body}</p>
                    <p className={`mt-1 text-[10px] ${m.senderType === 'patient' ? 'text-teal-100' : 'text-slate-400'}`}>
                      {formatDateTime(m.timestamp)}{m.status === 'failed' ? ' · Not sent' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Messages aren’t monitored 24/7. If this is an emergency, call or text <a href="tel:988" className="font-semibold underline">988</a>.</span>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex items-end gap-2">
              <Textarea
                aria-label="Type your message"
                placeholder="Type your message…"
                rows={2}
                maxLength={4000}
                value={draft}
                disabled={!activeId}
                onChange={(e) => setDraft(e.target.value)}
              />
              <Button type="submit" aria-label="Send" disabled={!activeId || sending || !draft.trim()}><Send className="h-4 w-4" /></Button>
            </form>
          </Panel>
        </div>
      </div>

      <CrisisDialog
        open={crisis}
        onClose={() => setCrisis(false)}
        onConnect={() => setCrisis(false)}
        message="It sounds like you may be going through something serious. Messaging isn’t monitored in real time — please call or text 988 now, or tap to connect with a counselor."
      />
    </PatientShell>
  )
}
