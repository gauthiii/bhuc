import { useEffect } from 'react'
import { X, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { HelpTip } from './HelpTip'
import {
  FAIRNESS_DIMENSIONS, FAIRNESS_HELP, PARITY_THRESHOLD,
  fairnessSummary, rateOf, type FairnessDimension, type Parity,
} from '../lib/priorAuthFairnessData'

const parityText = (p: number) =>
  p >= PARITY_THRESHOLD ? 'text-teal-700' : p >= 70 ? 'text-amber-600' : 'text-rose-600'
const parityBar = (p: number) =>
  p >= PARITY_THRESHOLD ? 'bg-teal-500' : p >= 70 ? 'bg-amber-500' : 'bg-rose-500'

// A group's bar is coloured by how its submission rate compares with the best-served group in
// the same dimension — the same four-fifths comparison the parity figure is built from, so the
// group actually dragging parity down is the one that reads red.
const groupBar = (ratio: number) =>
  ratio >= 0.8 ? 'bg-teal-500' : ratio >= 0.7 ? 'bg-amber-500' : 'bg-rose-500'

function ParityBadge({ parity }: { parity: number }) {
  const pass = parity >= PARITY_THRESHOLD
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold ${parityText(parity)}`}>
      {pass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {parity}% parity
    </span>
  )
}

// One demographic axis: a bar per group showing its submission rate, with the eligible and
// submitted counts behind it, plus the axis parity and its explanation.
function Dimension({ dim, parity }: { dim: FairnessDimension; parity: Parity }) {
  const highest = rateOf(parity.highest) || 1
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <header className="mb-3 flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          {dim.title}
          <HelpTip label={`${dim.title} parity`} help={dim.help} />
        </h3>
        <ParityBadge parity={parity.parity} />
      </header>
      <ul className="space-y-2.5">
        {dim.groups.map((g) => {
          const rate = rateOf(g)
          const ratio = rate / highest
          const tag = g === parity.lowest ? 'lowest' : g === parity.highest ? 'highest' : ''
          return (
            <li key={g.group}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="font-medium text-slate-700">
                  {g.group}
                  {tag && <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tag}</span>}
                </span>
                <span className="whitespace-nowrap text-slate-500">
                  {g.eligible} eligible · {g.submitted} submitted · <span className="font-semibold text-slate-700">{rate.toFixed(1)}%</span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${groupBar(ratio)}`} style={{ width: `${Math.round(rate)}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        {parity.lowest.group} at {rateOf(parity.lowest).toFixed(1)}% against {parity.highest.group} at {rateOf(parity.highest).toFixed(1)}%
        {parity.parity >= PARITY_THRESHOLD
          ? ` — ${parity.parity}%, within the four-fifths rule.`
          : ` — ${parity.parity}%, below the ${PARITY_THRESHOLD}% four-fifths threshold. Flagged for review.`}
      </p>
    </section>
  )
}

// Fairness monitoring for prior authorization: of the patients who were clinically eligible for
// a prior auth, which ones actually had a packet submitted for them? Mirrors the measure on
// /governance/fairness, but the outcome under test is submission rather than wait time.
export function PriorAuthFairnessModal({ onClose }: { onClose: () => void }) {
  const s = fairnessSummary(FAIRNESS_DIMENSIONS)
  const flagged = s.overallParity < PARITY_THRESHOLD

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Prior-authorization fairness monitoring"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-800">
              <Scale className="h-4 w-4 text-teal-700" /> Fairness monitoring
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Prior-authorization submission parity across age, gender, race and ethnicity
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close fairness monitoring"
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-4 px-6 py-5">
          <p className="text-sm text-slate-600">
            Of the patients who were clinically eligible for a prior authorization, how many actually had a
            packet submitted on their behalf? An eligible patient with no packet never reaches the payer, so
            there is no determination to appeal — which makes a gap here invisible in approval-rate reporting.
          </p>

          {/* Overall */}
          <section className={`rounded-xl border p-4 ${flagged ? 'border-rose-200 bg-rose-50/60' : 'border-teal-200 bg-teal-50/60'}`}>
            <header className="mb-2 flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-slate-800">Overall parity</h3>
              <HelpTip label="Parity" help={FAIRNESS_HELP.parity} />
              <HelpTip label="The overall figure" help={FAIRNESS_HELP.overall} />
            </header>
            <div className="flex flex-wrap items-center gap-5">
              <div className={`font-display text-5xl font-bold ${parityText(s.overallParity)}`}>{s.overallParity}%</div>
              <div className="max-w-lg text-sm text-slate-600">
                <p>
                  Lowest parity across the four axes, driven by <span className="font-semibold text-slate-800">{s.worst.title.replace(/^By /, '')}</span>.
                  Across the whole cohort, <span className="font-semibold text-slate-800">{s.submitted}</span> of{' '}
                  <span className="font-semibold text-slate-800">{s.eligible}</span> eligible patients had a packet
                  submitted — an overall rate of {s.overallRate.toFixed(1)}%.
                </p>
                <p className={`mt-1 font-medium ${flagged ? 'text-rose-700' : 'text-teal-700'}`}>
                  {flagged
                    ? `Below the ${PARITY_THRESHOLD}% four-fifths threshold — investigate before drawing a conclusion.`
                    : `At or above the ${PARITY_THRESHOLD}% four-fifths threshold.`}
                </p>
              </div>
            </div>
            <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-white">
              <div className={`h-full rounded-full ${parityBar(s.overallParity)} transition-[width] duration-700`} style={{ width: `${s.overallParity}%` }} />
              <span className="absolute inset-y-0 w-0.5 bg-slate-400" style={{ left: `${PARITY_THRESHOLD}%` }} aria-hidden />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">The marker sits at the {PARITY_THRESHOLD}% four-fifths threshold.</p>
          </section>

          {/* How to read the numbers */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
            <span className="font-semibold uppercase tracking-wide text-slate-400">How to read this</span>
            <span className="inline-flex items-center gap-1">Eligible candidates <HelpTip label="Eligible candidates" help={FAIRNESS_HELP.eligible} /></span>
            <span className="inline-flex items-center gap-1">Submitted packets <HelpTip label="Submitted packets" help={FAIRNESS_HELP.submitted} /></span>
            <span className="inline-flex items-center gap-1">Submission rate <HelpTip label="Submission rate" help={FAIRNESS_HELP.rate} align="right" /></span>
          </div>

          {/* Per axis */}
          <div className="grid gap-4 lg:grid-cols-2">
            {s.perDimension.map(({ dim, parity }) => (
              <Dimension key={dim.id} dim={dim} parity={parity} />
            ))}
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Parity below the threshold is a signal to investigate, not a finding of discrimination. Confirm the
            eligible cohort is defined correctly, check whether the gap persists after controlling for site, payer
            and requested level of care, and be cautious reading a ratio built on small groups.
          </p>
        </div>

        <footer className="rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}
