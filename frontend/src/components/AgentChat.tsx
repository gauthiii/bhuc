import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Bot } from 'lucide-react'
import { api } from '../services/api'
import { Button, Textarea } from './ui'

interface Turn { id: string; role: 'user' | 'agent'; text: string }

// Reusable governance test-chat for one agent. Relays messages to the agent over A2A
// (POST /api/x_bhuc/agent/{key}/chat) and renders the reply as Markdown.
export function AgentChat({
  agentKey, agentName, subtitle, examples,
}: {
  agentKey: string
  agentName: string
  subtitle?: string
  examples?: { label: string; prompt: string }[]
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }) }, [turns, sending])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setDraft('')
    setTurns((t) => [...t, { id: 'u-' + Date.now(), role: 'user', text: trimmed }])
    setSending(true)
    try {
      const res = await api.agentChat(agentKey, trimmed)
      setTurns((t) => [...t, { id: 'a-' + Date.now(), role: 'agent', text: res.reply }])
    } catch {
      setTurns((t) => [...t, { id: 'e-' + Date.now(), role: 'agent', text: 'The agent could not be reached. Try again.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* agent name header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-white"><Bot className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{agentName}</p>
          {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-teal-600/20">Live · A2A</span>
      </div>

      <div ref={logRef} role="log" aria-live="polite" className="min-h-[13rem] flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {turns.length === 0 && (
          <p className="text-xs text-slate-400">Send a message to test this agent. {examples?.length ? 'Or try an example below.' : ''}</p>
        )}
        {turns.map((t) => (
          <div key={t.id} className={`msg-enter ${t.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${t.role === 'user' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
              {t.role === 'user' ? t.text : (
                <div className="md-msg">
                  <ReactMarkdown components={{ a: ({ node: _n, ...p }) => <a {...p} target="_blank" rel="noreferrer noopener" /> }}>{t.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start msg-enter">
            <div className="rounded-2xl bg-slate-100 px-4 py-3"><span className="typing-dots"><span /><span /><span /></span></div>
          </div>
        )}
      </div>

      {examples && examples.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-4 py-2">
          {examples.map((ex) => (
            <button key={ex.label} onClick={() => send(ex.prompt)} disabled={sending}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              {ex.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(draft) }} className="flex items-end gap-2 border-t border-slate-100 p-3">
        <Textarea aria-label={`Message ${agentName}`} placeholder="Type a message…" rows={2} maxLength={4000}
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft) } }} />
        <Button type="submit" aria-label="Send" disabled={sending || !draft.trim()}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}
