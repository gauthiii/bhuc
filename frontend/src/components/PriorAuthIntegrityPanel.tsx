import { useState } from 'react'
import { ShieldCheck, ShieldAlert, ChevronDown } from 'lucide-react'
import { HelpTip } from './HelpTip'
import { integrityFor, INTEGRITY_HELP, type IntegrityMode } from '../lib/priorAuthIntegrity'
import type { DemoPacket } from '../lib/priorAuthDemoData'

// Output integrity for a drafted packet — the same grounding control the governance agent
// console runs on a chat reply, applied to the generated prior-auth document. The switch
// shows either the packet as drafted or a worked example of the failure this control exists
// to catch: an output that reads well but cites a payer policy section that does not exist.
export function PriorAuthIntegrityPanel({ packet }: { packet: DemoPacket }) {
  const [mode, setMode] = useState<IntegrityMode>('verified')
  const [open, setOpen] = useState(false)
  const r = integrityFor(packet, mode)
  const bad = r.verdict === 'flagged'

  const barColor = r.score >= r.threshold ? 'bg-teal-600' : r.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <section className={`rounded-xl border p-4 ${bad ? 'border-rose-200 bg-rose-50' : 'border-teal-200 bg-teal-50'}`}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Output integrity
          <HelpTip label="Output integrity" help={INTEGRITY_HELP.score} />
        </h3>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white text-xs font-medium">
          {([['verified', 'As drafted'], ['flagged', 'Flagged example']] as const).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`px-3 py-1.5 transition ${mode === m
                ? (m === 'flagged' ? 'bg-rose-600 text-white' : 'bg-teal-700 text-white')
                : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-center gap-2">
        {bad ? <ShieldAlert className="h-4 w-4 text-rose-600" /> : <ShieldCheck className="h-4 w-4 text-teal-700" />}
        <span className={`text-sm font-semibold ${bad ? 'text-rose-700' : 'text-teal-800'}`}>
          {bad ? 'Flagged — unsupported claims found' : 'Verified against source records'}
        </span>
        <span className={`ml-auto font-display text-2xl font-bold ${bad ? 'text-rose-600' : 'text-teal-700'}`}>{r.score}%</span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-600">
            <span>Claim support</span><span className="font-semibold">{r.score}%</span>
          </div>
          <div className="h-2 rounded-full bg-white">
            <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${r.score}%` }} />
          </div>
        </div>
        <div className="text-xs text-slate-600">
          <p className="flex items-center gap-1">
            Hallucination risk: <span className="font-semibold text-slate-800">{r.hallucinationRisk}%</span>
            <HelpTip label="Hallucination risk" help={INTEGRITY_HELP.risk} align="right" />
          </p>
          <p className="mt-0.5">Pass bar {r.threshold}% · {r.flaggedCount} of {r.claimCount} claims flagged</p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">{r.reason}</p>

      <p className="mt-2 truncate text-[11px] text-slate-500">Checked against {r.sources}</p>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-700"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Hide' : 'Show'} claim-by-claim analysis
        <HelpTip label="Claim-by-claim analysis" help={INTEGRITY_HELP.claims} />
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5">
          {r.claims.map((c, i) => {
            const low = c.score < r.claimFloor
            return (
              <li key={i} className={`rounded-lg border p-2 text-xs ${low ? 'border-rose-200 bg-white' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono ${low ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-800'}`}>{c.score}%</span>
                  <div className="min-w-0">
                    <p className="text-slate-700">{c.text}</p>
                    {c.source
                      ? <p className="mt-0.5 text-slate-400">↳ {c.source}</p>
                      : <p className="mt-0.5 font-medium text-rose-600">↳ no supporting passage found in any source record</p>}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{r.algorithm}</p>
    </section>
  )
}
