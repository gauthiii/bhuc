import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react'

// Reusable "an agent is running" animation — a color-shifting progress bar, rotating
// status texts, and a live card per unit of work, ending with a completion banner.
// Used by the patient screening batch (Agent 2 ×3) and the note draft (Agent 3).
// Pass `alert` to render the DONE state in red (a flagged/attention result, e.g. the
// Consent agent finding 42 CFR Part 2 content) instead of the default teal success.
export function AgentRunProgress({
  runningTitle, doneTitle, statusTexts, cardSteps, cards, done, error, alert,
  doneMessage, doneSubtext,
}: {
  runningTitle: string
  doneTitle: string
  statusTexts: string[]
  cardSteps: string[]
  cards: { key: string; name: string }[]
  done: boolean
  error?: boolean
  alert?: boolean
  doneMessage: string
  doneSubtext?: string
}) {
  const flagged = done && !!alert   // done, but a result that needs attention → red
  const [progress, setProgress] = useState(5)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (done || error) { setProgress(100); return }
    const iv = setInterval(
      () => setProgress((p) => (p < 92 ? p + Math.max(0.6, (92 - p) * 0.05) : p)), 600)
    const tv = setInterval(() => setTick((t) => t + 1), 1300)
    return () => { clearInterval(iv); clearInterval(tv) }
  }, [done, error])

  const statusText = error
    ? 'Something interrupted this step. Nothing was finalized — you can retry.'
    : done ? `${doneTitle}.` : statusTexts[tick % statusTexts.length]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" role="status" aria-live="polite">
      <div className="mb-4 flex items-center gap-3">
        {done
          ? (flagged ? <ShieldAlert className="h-5 w-5 text-rose-600" /> : <ShieldCheck className="h-5 w-5 text-teal-700" />)
          : <Loader2 className="h-5 w-5 animate-spin text-teal-700" />}
        <div>
          <p className={`text-sm font-semibold ${flagged ? 'text-rose-700' : 'text-slate-800'}`}>{done ? doneTitle : runningTitle}</p>
          <p className="text-xs text-slate-500">{statusText}</p>
        </div>
        <span className="ml-auto text-sm font-semibold tabular-nums text-slate-500">{Math.round(progress)}%</span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${done ? '' : 'run-shimmer'}`}
          style={{
            width: `${progress}%`,
            background: done ? (flagged ? '#e11d48' : 'var(--teal)')
              : `linear-gradient(90deg, var(--amber) 0%, var(--accent) ${Math.min(100, progress + 20)}%)`,
          }}
        />
      </div>

      <ul className={`mt-4 grid gap-2 ${cards.length > 1 ? 'sm:grid-cols-3' : ''}`}>
        {cards.map((c, i) => (
          <li key={c.key}
            className={`rounded-xl border p-3 transition-colors ${
              done ? (flagged ? 'border-rose-200 bg-rose-50' : 'border-teal-200 bg-teal-50') : 'border-slate-200 bg-slate-50 msg-enter'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">{c.name}</span>
              {done
                ? (flagged ? <AlertTriangle className="h-4 w-4 text-rose-600" /> : <CheckCircle2 className="h-4 w-4 text-teal-700" />)
                : <span className="typing-dots"><span /><span /><span /></span>}
            </div>
            <p className={`mt-1 text-xs ${done ? (flagged ? 'text-rose-700' : 'text-teal-700') : 'text-slate-500'}`}>
              {done ? (flagged ? 'Flagged' : 'Done') : cardSteps[(tick + i) % cardSteps.length]}
            </p>
          </li>
        ))}
      </ul>

      {done && !error && (
        <div className={`msg-enter mt-4 rounded-xl border px-4 py-3 text-sm ${flagged ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-teal-200 bg-teal-50 text-teal-900'}`}>
          <span className="font-semibold">{doneMessage}</span>{doneSubtext ? ` ${doneSubtext}` : ''}
        </div>
      )}
    </div>
  )
}
