import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'

// Animated "running the 3 risk agents" state. The batch call blocks until all three
// finish, so the motion here is time-based/cosmetic — a color-shifting progress bar,
// rotating status texts, and a live card per instrument — then a completion message.
const STATUS_TEXTS = [
  'Scoring your responses…',
  'Applying clinical risk-band rules…',
  'Cross-checking instrument thresholds…',
  'Checking for safety flags…',
  'Routing results to your care team…',
]
const CARD_STEPS = ['Queued', 'Analyzing responses', 'Applying scoring rules', 'Finalizing']

export function ScreeningRunProgress({
  instruments, done, error,
}: {
  instruments: { key: string; name: string }[]
  done: boolean
  error?: boolean
}) {
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
    ? 'Something interrupted the scoring. Your answers are saved — you can retry.'
    : done
      ? 'Risk identification complete.'
      : STATUS_TEXTS[tick % STATUS_TEXTS.length]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" role="status" aria-live="polite">
      <div className="mb-4 flex items-center gap-3">
        {done ? <ShieldCheck className="h-5 w-5 text-teal-700" />
          : <Loader2 className="h-5 w-5 animate-spin text-teal-700" />}
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {done ? 'Risk identification complete' : 'Running your risk identification'}
          </p>
          <p className="text-xs text-slate-500 transition-opacity">{statusText}</p>
        </div>
        <span className="ml-auto text-sm font-semibold tabular-nums text-slate-500">{Math.round(progress)}%</span>
      </div>

      {/* progress bar — shifts amber → teal as it advances, shimmer while running */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${done ? '' : 'run-shimmer'}`}
          style={{
            width: `${progress}%`,
            background: done
              ? 'var(--teal)'
              : `linear-gradient(90deg, var(--amber) 0%, var(--accent) ${Math.min(100, progress + 20)}%)`,
          }}
        />
      </div>

      {/* per-instrument cards */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {instruments.map((ins, i) => {
          const cardDone = done
          const step = CARD_STEPS[(tick + i) % CARD_STEPS.length]
          return (
            <li
              key={ins.key}
              className={`rounded-xl border p-3 transition-colors ${
                cardDone ? 'border-teal-200 bg-teal-50'
                  : 'border-slate-200 bg-slate-50 msg-enter'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{ins.name}</span>
                {cardDone
                  ? <CheckCircle2 className="h-4 w-4 text-teal-700" />
                  : <span className="typing-dots"><span /><span /><span /></span>}
              </div>
              <p className={`mt-1 text-xs ${cardDone ? 'text-teal-700' : 'text-slate-500'}`}>
                {cardDone ? 'Scored & routed' : step}
              </p>
            </li>
          )
        })}
      </ul>

      {done && !error && (
        <div className="msg-enter mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          <span className="font-semibold">Risk identification has been completed and sent to the clinicians for review.</span>{' '}
          Your care team will review your responses. You can track the status below at any time.
        </div>
      )}
    </div>
  )
}
