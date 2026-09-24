import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bot, CheckCircle2, ChevronRight, Circle, ClipboardList,
  FileText, Gavel, Info, Pause, Play, RotateCcw, UserRound,
} from 'lucide-react'
import { LegalLayout } from './Layout'
import { ComparisonTable } from './ComparisonTable'
import { Swimlane } from '../Swimlane'
import { legalCurrentFlow, legalFutureFlow } from '../../../lib/legalCopilotFlows'
import { legalCases } from '../../../lib/legalCopilotDemo'
import type { Citation, LegalCase, LegalStep, LegalTone } from '../../../lib/legalCopilotDemo'

// /prior/legal/simulate: step through a legal research request either the way it is
// done today ('manual') or with Copilot ('copilot'). External work product stops at a
// Chief Legal Officer decision. State lives in the URL (?case=&mode=&s=&d=).

type SimMode = 'manual' | 'copilot'

const SIM_LABEL = 'Illustrative simulation, fictitious data'

function ModeToggle({ mode, onChange }: { mode: SimMode; onChange: (m: SimMode) => void }) {
  const seg = (m: SimMode, label: string) => (
    <button
      onClick={() => onChange(m)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        mode === m ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
      {seg('manual', 'Manual (today)')}
      {seg('copilot', 'With Copilot (future)')}
    </div>
  )
}

const TONE_CHIP: Record<LegalTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  approve: 'bg-emerald-100 text-emerald-800',
  hitl: 'bg-amber-100 text-amber-800',
  flag: 'bg-amber-100 text-amber-800',
}

const CASE_CHIP: Record<LegalCase['tone'], string> = {
  approve: 'bg-emerald-100 text-emerald-800',
  hitl: 'bg-amber-100 text-amber-800',
  flag: 'bg-amber-100 text-amber-800',
}

function UseChip({ use }: { use: LegalCase['use'] }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${use === 'External' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
      {use} use
    </span>
  )
}

function SimNote() {
  return (
    <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
      <Info className="h-4 w-4 shrink-0" />
      {SIM_LABEL}. Only the 1 to 3 business day cycle time comes from the workbook; other times are for illustration.
      Every Copilot output is checked by an attorney before anyone relies on it.
    </p>
  )
}

// ── Case picker ─────────────────────────────────────────────────────────────

function CasePicker({ mode, onMode, onPick }: { mode: SimMode; onMode: (m: SimMode) => void; onPick: (id: string) => void }) {
  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold text-slate-900">Case Simulation</h1>
        <p className="mt-2 text-slate-500">
          Pick a research request and step through it the way it is handled today, or with Copilot.
          In the Copilot version, the attorney checks every citation, and anything going outside BCBSVT
          waits for the Chief Legal Officer.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Process mode:</span>
        <ModeToggle mode={mode} onChange={onMode} />
        <span className="text-xs text-slate-400">
          {mode === 'manual' ? 'Folder-by-folder search and drafting by hand. Answers in 1 to 3 business days.' : 'Copilot searches, summarizes and drafts. The attorney verifies and decides.'}
        </span>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {legalCases.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-400 hover:shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-400">{c.requestId}</span>
              <UseChip use={c.use} />
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-800">{c.label}</h2>
            <p className="mt-1 text-sm text-slate-500">From {c.requester.unit} · {c.attorney}</p>
            <p className="mt-2 text-xs italic text-slate-500">"{c.question}"</p>
            <div className="mt-4 flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${mode === 'manual' ? 'bg-slate-100 text-slate-700' : CASE_CHIP[c.tone]}`}>{mode === 'manual' ? c.manualBadge : c.badge}</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 opacity-0 transition group-hover:opacity-100">
                Run case <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </button>
        ))}
      </div>
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-800">Case by case: today and with Copilot</h2>
        <p className="mt-1 text-sm text-slate-500">
          How each request plays out today and with Copilot. Each request arrives on day 1 and the attorney picks it up
          at the same time in both modes.
        </p>
        <div className="mt-3"><ComparisonTable /></div>
      </section>
      <SimNote />
    </div>
  )
}

// ── Panels ──────────────────────────────────────────────────────────────────

const CITATION_STYLE: Record<Citation['status'], { box: string; chip: string; label: string }> = {
  verified: { box: 'border-emerald-200 bg-emerald-50/50', chip: 'bg-emerald-100 text-emerald-800', label: 'Verified by attorney' },
  superseded: { box: 'border-amber-300 bg-amber-50/70', chip: 'bg-amber-100 text-amber-800', label: 'Rejected: outdated source' },
  pending: { box: 'border-slate-200 bg-slate-50', chip: 'bg-slate-100 text-slate-600', label: 'Not yet checked' },
}

function CitationsPanel({ citations }: { citations: Citation[] }) {
  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Citation check</h3>
      {citations.map((c, i) => {
        const st = CITATION_STYLE[c.status]
        return (
          <div key={`${c.doc}-${i}`} className={`rounded-xl border p-4 ${st.box}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-800">[{i + 1}] {c.doc}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.chip}`}>
                {c.status === 'superseded' ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {st.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{c.location}</p>
            <p className="mt-2 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-700">"{c.excerpt}"</p>
            {c.note && <p className="mt-2 text-xs font-medium text-amber-800">{c.note}</p>}
          </div>
        )
      })}
    </div>
  )
}

function WorkProductPanel({ legalCase, manual, extra }: { legalCase: LegalCase; manual: boolean; extra?: string }) {
  const w = legalCase.workProduct
  const body = extra ? [...w.body, extra] : w.body
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <FileText className="h-4 w-4" /> {w.kind}
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-xs font-medium text-slate-500">To</dt><dd className="text-slate-800">{w.to}</dd>
        <dt className="text-xs font-medium text-slate-500">From</dt><dd className="text-slate-800">{legalCase.attorney}, Legal Department</dd>
        <dt className="text-xs font-medium text-slate-500">Subject</dt><dd className="text-slate-800">{w.subject}</dd>
      </dl>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
        {body.map((p) => <p key={p}>{p}</p>)}
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="font-medium">{manual ? 'Sources the attorney found by hand:' : 'Sources cited by Copilot and verified by the attorney:'}</span>
        <ul className="mt-1 list-inside list-disc">
          {w.sources.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
    </div>
  )
}

function ReleasePanel({ legalCase, returned }: { legalCase: LegalCase; returned: boolean }) {
  return (
    <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50/60 p-5">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
        <CheckCircle2 className="h-5 w-5" /> Approved for external release
      </span>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-medium text-slate-500">Approved by</dt><dd className="text-slate-800">Chief Legal Officer</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Prepared by</dt><dd className="text-slate-800">{legalCase.attorney}, with Copilot</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Sent by</dt><dd className="text-slate-800">{legalCase.requester.unit}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Review rounds</dt><dd className="text-slate-800">{returned ? '2 (returned once for an edit)' : '1'}</dd></div>
      </dl>
      <WorkProductPanel legalCase={legalCase} manual={false} extra={returned ? legalCase.returnEdit : undefined} />
    </div>
  )
}

function DecisionCard({ legalCase, onDecide }: { legalCase: LegalCase; onDecide: (d: 'a' | 'r') => void }) {
  const dp = legalCase.decision!
  return (
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/60 p-5">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800">
        <Gavel className="h-5 w-5" /> Chief Legal Officer review
      </span>
      <p className="mt-2 text-sm text-slate-700">{dp.summary}</p>
      <ul className="mt-3 space-y-1.5">
        {dp.checks.map((c) => (
          <li key={c.text} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${c.ok ? 'text-emerald-600' : 'text-slate-300'}`} /> {c.text}
          </li>
        ))}
      </ul>
      <WorkProductPanel legalCase={legalCase} manual={false} />
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={() => onDecide('a')} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">
          Approve release
        </button>
        <button onClick={() => onDecide('r')} className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50">
          Return to attorney
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">You are acting as the Chief Legal Officer.</p>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export function LegalSimulate() {
  const [params, setParams] = useSearchParams()
  const [autoPlay, setAutoPlay] = useState(false)

  const caseId = params.get('case')
  const legalCase = legalCases.find((c) => c.id === caseId) ?? null
  const mode: SimMode = params.get('mode') === 'manual' ? 'manual' : 'copilot'
  const decision = params.get('d') === 'a' ? 'a' : params.get('d') === 'r' ? 'r' : null

  const steps: LegalStep[] = useMemo(() => {
    if (!legalCase) return []
    if (mode === 'manual') return legalCase.manualSteps
    if (!legalCase.decision || !decision) return legalCase.copilotSteps
    return [...legalCase.copilotSteps, ...((decision === 'a' ? legalCase.approveSteps : legalCase.returnSteps) ?? [])]
  }, [legalCase, mode, decision])

  const rawIdx = Number(params.get('s') ?? 0)
  const idx = Math.min(Math.max(Number.isFinite(rawIdx) ? rawIdx : 0, 0), Math.max(steps.length - 1, 0))
  const step = steps[idx]
  const atDecision = mode === 'copilot' && !!legalCase?.decision && !decision && idx === (legalCase?.copilotSteps.length ?? 0) - 1
  const atEnd = !atDecision && idx === steps.length - 1

  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) v === null ? p.delete(k) : p.set(k, v)
    setParams(p)
  }

  useEffect(() => {
    if (!autoPlay) return
    if (atDecision || atEnd || !legalCase) { setAutoPlay(false); return }
    const t = setTimeout(() => update({ s: String(idx + 1) }), 2600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, idx, atDecision, atEnd, legalCase])

  if (!legalCase || !step) {
    return (
      <LegalLayout>
        <CasePicker
          mode={mode}
          onMode={(m) => setParams(m === 'manual' ? { mode: 'manual' } : {})}
          onPick={(id) => setParams({ case: id, s: '0', ...(mode === 'manual' ? { mode: 'manual' } : {}) })}
        />
      </LegalLayout>
    )
  }

  const visited = steps.slice(0, idx + 1).map((s) => s.nodeId)
  const tone = step.tone ?? 'neutral'
  const pendingDecision = mode === 'copilot' && !!legalCase.decision && !decision

  return (
    <LegalLayout>
      {/* Case header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-400">{legalCase.requestId}</span>
            <UseChip use={legalCase.use} />
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${mode === 'manual' ? 'bg-slate-100 text-slate-700' : CASE_CHIP[legalCase.tone]}`}>{mode === 'manual' ? legalCase.manualBadge : legalCase.badge}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold text-slate-900">{legalCase.label}</h1>
          <p className="mt-1 text-sm text-slate-500">{mode === 'manual' ? legalCase.timeNote.manual : legalCase.timeNote.copilot}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModeToggle mode={mode} onChange={(m) => { setAutoPlay(false); update({ mode: m === 'manual' ? 'manual' : null, s: '0', d: null }) }} />
          <button onClick={() => update({ s: String(Math.max(idx - 1, 0)) })} disabled={idx === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button onClick={() => update({ s: String(idx + 1) })} disabled={atDecision || atEnd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-40">
            Next <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={() => setAutoPlay((v) => !v)} disabled={atDecision || atEnd}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
            {autoPlay ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Auto-play</>}
          </button>
          <button onClick={() => { setAutoPlay(false); update({ s: '0', d: null }) }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button onClick={() => { setAutoPlay(false); setParams({}) }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Change case
          </button>
        </div>
      </div>

      {/* Swimlane */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Swimlane
          flow={mode === 'manual' ? legalCurrentFlow : legalFutureFlow}
          title={mode === 'manual' ? 'Manual legal research: live case position' : 'Legal research with Copilot: live case position'}
          active={step.nodeId}
          visited={visited}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Current step */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${step.human ? TONE_CHIP[tone] : 'bg-blue-100 text-blue-800'}`}>
                {step.human ? <UserRound className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                {step.actor}
              </span>
              <span className="text-xs text-slate-400">Step {idx + 1} of {steps.length}{pendingDecision ? '+' : ''}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-800">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.detail}</p>
            {step.facts && (
              <dl className="mt-4 grid gap-x-6 gap-y-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                {step.facts.map((f) => (
                  <div key={f.label}>
                    <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
                    <dd className="text-slate-800">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {step.render === 'citations' && step.citations && <CitationsPanel citations={step.citations} />}
            {step.render === 'answer' && <WorkProductPanel legalCase={legalCase} manual={mode === 'manual'} />}
            {step.render === 'release' && <ReleasePanel legalCase={legalCase} returned={decision === 'r'} />}
            {atDecision && <DecisionCard legalCase={legalCase} onDecide={(d) => update({ d, s: String(idx + 1) })} />}
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><ClipboardList className="h-4 w-4" /> Steps</h3>
            <ol className="mt-3 space-y-2.5">
              {steps.map((s, i) => (
                <li key={s.id} className="flex items-start gap-2 text-sm">
                  {i < idx
                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    : i === idx
                      ? <Circle className="mt-0.5 h-4 w-4 shrink-0 fill-brand-500 text-brand-500" />
                      : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                  <span className={i === idx ? 'font-medium text-slate-800' : i < idx ? 'text-slate-600' : 'text-slate-400'}>{s.title}</span>
                </li>
              ))}
              {pendingDecision && (
                <li className="flex items-start gap-2 text-sm">
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span className="text-amber-700">Release decision by the Chief Legal Officer</span>
                </li>
              )}
            </ol>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">Request</h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div><dt className="text-xs font-medium text-slate-500">Question</dt><dd className="italic text-slate-800">"{legalCase.question}"</dd></div>
              <div><dt className="text-xs font-medium text-slate-500">Requested by</dt><dd className="text-slate-800">{legalCase.requester.name}, {legalCase.requester.unit}</dd></div>
              <div><dt className="text-xs font-medium text-slate-500">Assigned to</dt><dd className="text-slate-800">{legalCase.attorney}</dd></div>
              <div><dt className="text-xs font-medium text-slate-500">Intended use</dt><dd className="text-slate-800">{legalCase.use}{legalCase.use === 'External' ? ' (Chief Legal Officer approval if Copilot-assisted)' : ''}</dd></div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Relevant Z: drive documents</dt>
                <dd className="text-slate-800">{legalCase.documents.map((d) => <span key={d} className="block">{d}</span>)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <SimNote />
    </LegalLayout>
  )
}
