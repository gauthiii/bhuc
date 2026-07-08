import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Bot, ShieldCheck, ShieldAlert, ScanSearch, ChevronDown } from 'lucide-react'
import { api } from '../services/api'
import { Button, Textarea } from './ui'
import type { HallucinationCheck } from '../lib/types'

interface Turn { id: string; role: 'user' | 'agent'; text: string }

// Grounding meter + per-claim breakdown for one hallucination check.
function GroundingResult({ result }: { result: HallucinationCheck }) {
  const [open, setOpen] = useState(false)
  const bad = result.possibleHallucination
  const barColor = result.groundingScore >= 60 ? 'bg-teal-600' : result.groundingScore >= result.threshold ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className={`mt-2 rounded-xl border p-3 text-sm ${bad ? 'border-rose-200 bg-rose-50' : 'border-teal-200 bg-teal-50'}`}>
      <div className="flex items-center gap-2">
        {bad ? <ShieldAlert className="h-4 w-4 text-rose-600" /> : <ShieldCheck className="h-4 w-4 text-teal-700" />}
        <span className={`font-semibold ${bad ? 'text-rose-700' : 'text-teal-800'}`}>
          {bad ? 'Possible hallucination' : 'Grounded in knowledge base'}
        </span>
        <span className="ml-auto truncate text-xs text-slate-500">vs {result.kbDoc}</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="mb-1 flex justify-between text-slate-600"><span>Grounding</span><span className="font-semibold">{result.groundingScore}%</span></div>
          <div className="h-2 rounded-full bg-slate-200"><div className={`h-2 rounded-full ${barColor}`} style={{ width: `${result.groundingScore}%` }} /></div>
        </div>
        <div className="text-slate-500">
          <p>Hallucination risk: <span className="font-semibold text-slate-700">{result.hallucinationScore}%</span></p>
          <p>Threshold {result.threshold}% · flagged {result.flaggedCount}/{result.claimCount}</p>
        </div>
      </div>

      <button onClick={() => setOpen((o) => !o)} className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /> {open ? 'Hide' : 'Show'} claim-by-claim analysis
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {result.claims.map((c, i) => (
            <li key={i} className={`rounded-lg border p-2 text-xs ${c.grounded ? 'border-slate-200 bg-white' : 'border-rose-200 bg-white'}`}>
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono ${c.grounded ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-700'}`}>{c.score}%</span>
                <div className="min-w-0">
                  <p className="text-slate-700">{c.text}</p>
                  {c.evidence
                    ? <p className="mt-0.5 text-slate-400">↳ KB: “{c.evidence}”</p>
                    : <p className="mt-0.5 text-rose-500">↳ no supporting passage found in the KB</p>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-slate-400">{result.algorithm}</p>
    </div>
  )
}

// Reusable governance test-chat for one agent. Relays messages to the agent over A2A
// (POST /api/x_bhuc/agent/{key}/chat) and renders the reply as Markdown.
export function AgentChat({
  agentKey, agentName, subtitle, examples, groundable = false,
}: {
  agentKey: string
  agentName: string
  subtitle?: string
  examples?: { label: string; prompt: string }[]
  groundable?: boolean   // show the "Check hallucination" control (Agents 2 & 3)
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [checks, setChecks] = useState<Record<string, HallucinationCheck>>({})
  const [checking, setChecking] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  async function checkGrounding(turn: Turn) {
    if (checking) return
    setChecking(turn.id)
    try {
      const res = await api.checkHallucination(agentKey, turn.text)
      setChecks((c) => ({ ...c, [turn.id]: res }))
    } catch {
      /* silent — leave the button available to retry */
    } finally {
      setChecking(null)
    }
  }

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
          t.role === 'user' ? (
            <div key={t.id} className="msg-enter flex justify-end">
              <div className="max-w-[88%] rounded-2xl bg-teal-700 px-3 py-2 text-sm text-white">{t.text}</div>
            </div>
          ) : (
            <div key={t.id} className="msg-enter flex flex-col items-start">
              <div className="max-w-[92%] rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-800">
                <div className="md-msg">
                  <ReactMarkdown components={{ a: ({ node: _n, ...p }) => <a {...p} target="_blank" rel="noreferrer noopener" /> }}>{t.text}</ReactMarkdown>
                </div>
              </div>
              {groundable && (
                <div className="w-full max-w-[92%]">
                  {checks[t.id]
                    ? <GroundingResult result={checks[t.id]} />
                    : (
                      <button onClick={() => checkGrounding(t)} disabled={checking === t.id}
                        className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                        <ScanSearch className="h-3.5 w-3.5" />
                        {checking === t.id ? 'Analyzing against KB…' : 'Check hallucination'}
                      </button>
                    )}
                </div>
              )}
            </div>
          )
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
