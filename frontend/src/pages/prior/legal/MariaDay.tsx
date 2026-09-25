import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, Ban, Bot, CheckCircle2, CircleDashed, Clock, FileCheck2, FileText, Loader2, LogIn,
  Mail, MinusCircle, Play, RotateCcw, ScrollText, SearchX, ShieldCheck, SkipForward, Tag, Trash2, UserCheck, XCircle,
} from 'lucide-react'
import { LegalLayout } from './Layout'
import { DemoNote } from './ProveParts'
import {
  INTRO, MARIA, MARIA_CARDS, PROVE_QUESTIONS, type LabelTone, type MariaCard, type MariaResponse, type MariaRun,
  type MariaStep, type OutcomeTone, type ProveKey, type StepTone,
} from '../../../lib/legalMariaDay'
import { addMariaLog, resetMariaLog, useMariaLog, type MariaLogRecord } from '../../../lib/legalMariaLog'
import { fmtTime } from '../../../lib/legalEvidence'

// /prior/legal/maria: deck slides 11 to 22, "A Day in the Life of a Legal Professional".
// Fourteen cards in the order of Maria's day, each with the deck wording and a runnable
// demonstration: the same step-by-step runner, coloured results and evidence records as
// the /prior/legal/demo screens. Card in ?card=, run in ?run= (11:00 only).
// Simulated, fictitious data.

const STEP_MS = 800
const PROVE_ID = '1630-prove'

const OUTCOME_STYLE: Record<OutcomeTone, string> = {
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  warn: 'border-amber-300 bg-amber-50 text-amber-900',
  block: 'border-red-300 bg-red-50 text-red-800',
}
const PILL_STYLE: Record<OutcomeTone, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  warn: 'bg-amber-100 text-amber-900',
  block: 'bg-red-100 text-red-800',
}
const OUTCOME_ICON = { ok: CheckCircle2, warn: AlertTriangle, block: Ban }

const LABEL_STYLE: Record<LabelTone, string> = {
  confidential: 'bg-amber-100 text-amber-900',
  privileged: 'bg-red-100 text-red-800',
}

type RunTone = Exclude<StepTone, 'skip'>
const STEP_STYLE: Record<RunTone, { box: string; dot: string; Icon: typeof CheckCircle2; name: string }> = {
  done: { box: 'border-brand-200 bg-white', dot: 'bg-brand-500 text-white', Icon: CheckCircle2, name: 'Done' },
  pass: { box: 'border-emerald-200 bg-emerald-50/60', dot: 'bg-emerald-600 text-white', Icon: CheckCircle2, name: 'Passed' },
  human: { box: 'border-violet-200 bg-violet-50/60', dot: 'bg-violet-600 text-white', Icon: UserCheck, name: 'Human review' },
  warn: { box: 'border-amber-300 bg-amber-50', dot: 'bg-amber-500 text-white', Icon: AlertTriangle, name: 'Flagged' },
  fail: { box: 'border-red-300 bg-red-50', dot: 'bg-red-600 text-white', Icon: XCircle, name: 'Restricted / failed' },
}

type Status = RunTone | 'pending' | 'active' | 'skip'

const shortOutcome = (label: string) => label.split(' · ')[0].split(' (')[0]
const cardTitle = (c: MariaCard, run?: MariaRun) =>
  `${c.title}${c.variant ? ` · ${c.variant}` : ''}${run && c.runs.length > 1 ? ` · ${run.label}` : ''}`

// ── Shared pieces ───────────────────────────────────────────────────────────

function LabelChip({ name, tone }: { name: string; tone: LabelTone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${LABEL_STYLE[tone]}`}>
      <Tag className="h-3 w-3" /> {name}
    </span>
  )
}

function OutcomeBanner({ tone, label }: { tone: OutcomeTone; label: string }) {
  const Icon = OUTCOME_ICON[tone]
  return (
    <div className={`flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold ${OUTCOME_STYLE[tone]}`}>
      <Icon className="h-5 w-5 shrink-0" /> Demonstration outcome: {label}
    </div>
  )
}

function Controls({ progress, running, done, locked, onRun, onStep, onReset }: {
  progress: number; running: boolean; done: boolean; locked: boolean; onRun: () => void; onStep: () => void; onReset: () => void
}) {
  return (
    <div className="flex gap-2">
      <button onClick={onRun} disabled={running || done || locked} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-40">
        <Play className="h-4 w-4" /> {progress === 0 ? 'Run scenario' : 'Continue'}
      </button>
      <button onClick={onStep} disabled={done || locked} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
        <SkipForward className="h-4 w-4" /> Step
      </button>
      <button onClick={onReset} disabled={progress === 0} aria-label="Reset" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  )
}

function StepRow({ n, step, status, children }: { n: number; step: Pick<MariaStep, 'actor' | 'label' | 'detail'>; status: Status; children?: ReactNode }) {
  const ran = status !== 'pending' && status !== 'active' && status !== 'skip'
  const style = ran ? STEP_STYLE[status as RunTone] : null
  const box = style ? style.box
    : status === 'active' ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200'
    : status === 'skip' ? 'border-slate-200 bg-slate-50'
    : 'border-slate-200 bg-white/60'
  return (
    <li className={`rounded-xl border p-3 transition ${box}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${style ? style.dot : status === 'active' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'}`}>
          {style ? <style.Icon className="h-4 w-4" /> : status === 'active' ? <Loader2 className="h-4 w-4 animate-spin" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-semibold ${ran || status === 'active' ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-500 uppercase">{step.actor}</span>
          </div>
          <div className="text-xs text-slate-500">{step.detail}</div>
          {ran && children}
        </div>
        {status === 'pending' && <CircleDashed className="h-4 w-4 shrink-0 text-slate-300" />}
        {status === 'skip' && <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-400"><MinusCircle className="h-4 w-4" /> Not reached</span>}
      </div>
    </li>
  )
}

function StepExtras({ step, tone }: { step: MariaStep; tone: RunTone }) {
  return (
    <>
      {step.lines && (
        <ul className="mt-2 space-y-1 text-sm">
          {step.lines.map((l) => (
            <li key={l} className={tone === 'fail' ? 'font-medium text-red-700' : l.includes('MATCH') ? 'font-semibold text-amber-800' : 'text-slate-700'}>{l}</li>
          ))}
        </ul>
      )}
      {step.citations && (
        <div className="mt-2 space-y-2">
          {step.citations.map((c) => (
            <div key={c.doc + c.location} className={`rounded-lg border p-2.5 text-xs ${c.status === 'superseded' ? 'border-amber-300 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/50'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-800">{c.doc} · {c.location}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${c.status === 'superseded' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {c.status === 'superseded' ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                  {c.status === 'superseded' ? 'Rejected: outdated source' : 'Verified by Maria'}
                </span>
              </div>
              <p className="mt-1 text-slate-600 italic">"{c.excerpt}"</p>
              {c.note && <p className="mt-1 font-medium text-amber-800">{c.note}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
      {(Object.keys(STEP_STYLE) as RunTone[]).map((t) => {
        const s = STEP_STYLE[t]
        return <span key={t} className="inline-flex items-center gap-1.5"><span className={`grid h-4 w-4 place-items-center rounded-full ${s.dot}`}><s.Icon className="h-2.5 w-2.5" /></span>{s.name}</span>
      })}
    </div>
  )
}

// ── Card brief: what, where and the deck wording ────────────────────────────

function CardBrief({ card }: { card: MariaCard }) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-800 px-2.5 py-0.5 font-semibold text-white"><Clock className="h-3 w-3" /> {card.time}</span>
          {card.variant && <span className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600">{card.variant}</span>}
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">{card.title}</h2>
        <p className="text-sm font-medium text-brand-700">{card.headline}</p>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="space-y-5 p-5">
          <div>
            <h3 className="text-[11px] font-bold tracking-wider text-brand-600 uppercase">What</h3>
            <div className="mt-1.5 space-y-1 text-sm text-slate-800">
              {card.what.text.map((t) => <p key={t}>{t}</p>)}
              {card.what.bullets && <ul className="list-disc space-y-0.5 pl-5">{card.what.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
              {card.what.after?.map((t) => <p key={t} className="font-medium">{t}</p>)}
            </div>
          </div>
          <div>
            <h3 className="text-[11px] font-bold tracking-wider text-brand-600 uppercase">Where</h3>
            <ul className="mt-1.5 space-y-1 text-sm text-slate-800">{card.where.map((w) => <li key={w}>{w}</li>)}</ul>
            {card.basedOn && (
              <Link to={card.basedOn.to} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800">
                Also in the app: {card.basedOn.label} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60 p-5 lg:border-t-0 lg:border-l">
          <dl className="space-y-3 text-sm">
            {card.deck.map((d) => (
              <div key={d.k}>
                <dt className="font-semibold text-slate-700">{d.k}</dt>
                <dd className="mt-0.5 text-slate-800">
                  {d.v.length === 1 ? d.v[0] : d.v[0].endsWith(':') ? (
                    <>
                      <span>{d.v[0]}</span>
                      <ul className="mt-0.5 list-disc pl-5">{d.v.slice(1).map((x) => <li key={x}>{x}</li>)}</ul>
                    </>
                  ) : d.k.endsWith(':') ? (
                    <ul className="list-disc pl-5">{d.v.map((x) => <li key={x}>{x}</li>)}</ul>
                  ) : d.v.map((x) => <p key={x}>{x}</p>)}
                </dd>
              </div>
            ))}
            {card.principle && (
              <div className="rounded-lg bg-brand-800 px-3 py-2 text-white">
                <span className="font-semibold text-brand-200">{card.principle.k} </span>{card.principle.v}
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-b-2xl border-t border-slate-100 sm:grid-cols-4">
        {[["Maria's activity", card.day.activity], ['What Maria experiences', card.day.experience], ['What could go wrong', card.day.risk], ['Control requirement', card.day.control]].map(([k, v], i) => (
          <div key={k} className={`p-4 ${i > 0 ? 'border-t border-slate-100 sm:border-t-0 sm:border-l' : ''}`}>
            <div className="text-[11px] font-bold tracking-wider text-brand-600 uppercase">{k}</div>
            <div className="mt-1 text-sm font-medium text-slate-800">{v}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Screen pane: what Maria sees ────────────────────────────────────────────

function ResponseView({ r }: { r: MariaResponse }) {
  if (r.kind === 'granted') {
    return (
      <div className="rounded-xl border border-emerald-300 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" /> {r.title}</div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Bot className="h-4 w-4 text-brand-500" /> Microsoft 365 Copilot</div>
          <p className="mt-1.5 text-sm text-slate-600">{r.text[0]}</p>
        </div>
      </div>
    )
  }
  if (r.kind === 'denied') {
    return (
      <div className="rounded-xl border border-red-300 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-800"><Ban className="h-5 w-5" /> Access blocked</div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-800">{r.title}</div>
          <p className="mt-1 text-sm text-slate-600">{r.text[0]}</p>
          <p className="mt-2 font-mono text-xs text-slate-400">Error code {r.code}</p>
        </div>
      </div>
    )
  }
  if (r.kind === 'tip' || r.kind === 'blocked') {
    return (
      <div className={`rounded-xl border px-4 py-3 text-sm ${r.kind === 'tip' ? OUTCOME_STYLE.warn : OUTCOME_STYLE.block}`}>
        <p className="flex items-start gap-2 font-medium">
          {r.kind === 'tip' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Ban className="mt-0.5 h-4 w-4 shrink-0" />}
          {r.text[0]}
        </p>
        {r.footnote && <p className="mt-2 text-xs opacity-80">{r.footnote}</p>}
      </div>
    )
  }
  return (
    <div className="max-w-[95%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm text-slate-800">
      {r.title && <p className="mb-1.5 text-xs font-semibold text-slate-500">{r.title}</p>}
      {r.kind === 'nothing' ? (
        <p className="flex items-start gap-2"><SearchX className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{r.text[0]}</p>
      ) : (
        <div className="space-y-1.5">{r.text.map((t) => <p key={t}>{t}</p>)}</div>
      )}
      {(r.label || r.footnote) && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {r.label && <LabelChip name={r.label.name} tone={r.label.tone} />} {r.footnote}
        </p>
      )}
    </div>
  )
}

function ScreenPane({ run, response, progress, running, done, awaiting }: {
  run: MariaRun; response: MariaResponse; progress: number; running: boolean; done: boolean; awaiting: boolean
}) {
  const sc = run.screen
  const started = progress >= 1
  const signIn = sc.app === 'Microsoft 365 sign-in'
  const AppIcon = signIn ? LogIn : sc.app === 'Outlook' ? Mail : Bot
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><AppIcon className="h-4 w-4 text-brand-500" /> {sc.app}</span>
        {!signIn && started && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> {MARIA.upn}</span>}
      </div>
      <div className="flex-1 space-y-3 p-5">
        {sc.context && (
          <dl className="grid gap-x-4 gap-y-1.5 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-[5.5rem_1fr]">
            {sc.context.map((c) => <div key={c.k} className="contents"><dt className="text-xs font-medium text-slate-500">{c.k}</dt><dd className={c.k === 'Account' ? 'font-mono text-xs text-slate-800' : 'text-slate-800'}>{c.v}</dd></div>)}
          </dl>
        )}
        {!started && !sc.context && <p className="text-sm text-slate-400">Run the scenario to follow Maria.</p>}
        {started && sc.ask && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
            <div className="text-xs font-semibold text-slate-500">{sc.ask.from}</div>
            <p className="text-slate-700">{sc.ask.text}</p>
          </div>
        )}
        {started && sc.prompt && (
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-500 px-4 py-2.5 text-sm text-white">{sc.prompt}</div>
        )}
        {progress >= 2 && sc.sources && (
          <div className="ml-auto flex max-w-[90%] flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-slate-500">
            {sc.sources.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {s.name} {s.label && s.tone && <LabelChip name={s.label} tone={s.tone} />}</span>
            ))}
          </div>
        )}
        {running && !done && !awaiting && <p className="inline-flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Working…</p>}
        {awaiting && <p className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800"><UserCheck className="h-4 w-4" /> Waiting for the Chief Legal Officer's decision</p>}
        {done && <ResponseView r={response} />}
      </div>
    </div>
  )
}

function EvidencePanel({ records, at, onProve }: { records: MariaRun['evidence']; at: string; onProve?: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><ScrollText className="h-4 w-4 text-brand-500" /> Evidence records</span>
        <span className="text-xs text-slate-400">{fmtTime(at)}</span>
      </div>
      <div className="grid gap-3 p-5 md:grid-cols-2">
        {records.map((a) => (
          <div key={a.source + a.activity} className="rounded-xl bg-slate-50 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-brand-700">{a.activity}</span>
              <span className="text-[11px] text-slate-500">{a.source}</span>
            </div>
            <dl className="mt-2 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1 text-xs">
              {a.fields.map((f) => <div key={f.k} className="contents"><dt className="text-slate-500">{f.k}</dt><dd className="text-slate-800">{f.v}</dd></div>)}
            </dl>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-2xl bg-brand-50 px-5 py-3 text-sm">
        <span className="inline-flex items-center gap-2 font-medium text-brand-800"><FileCheck2 className="h-4 w-4" /> Added to Maria's day log</span>
        {onProve && <button onClick={onProve} className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-800">4:30 PM · Can the organization prove it? <ArrowRight className="h-4 w-4" /></button>}
      </div>
    </div>
  )
}

// ── Runner for cards 8:30 to 3:30 ───────────────────────────────────────────

function Runner({ card, run, onSelect }: { card: MariaCard; run: MariaRun; onSelect: (id: string) => void }) {
  const [progress, setProgress] = useState(0) // runnable steps completed
  const [running, setRunning] = useState(false)
  const [branchId, setBranchId] = useState<string | null>(null)
  const [doneAt, setDoneAt] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const option = run.branch?.options.find((o) => o.id === branchId)
  const mainCount = run.steps.filter((s) => s.tone !== 'skip').length
  const total = mainCount + (option?.steps.length ?? 0)
  const awaiting = !!run.branch && !option && progress >= mainCount
  const done = run.branch ? !!option && progress >= total : progress >= mainCount
  const response = option?.response ?? run.screen.response
  const outcome = option?.outcome ?? run.outcome
  const evidence = option?.evidence ?? run.evidence
  const facts = option?.facts ?? run.facts

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  useEffect(() => {
    if (!running) return
    if (done || awaiting) { setRunning(false); return }
    timer.current = setTimeout(() => setProgress((p) => p + 1), STEP_MS)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [running, progress, done, awaiting])

  useEffect(() => {
    if (!done || doneAt) return
    setDoneAt(new Date().toISOString())
    addMariaLog({
      cardId: card.id, runId: run.id, time: card.time, title: cardTitle(card, run),
      tone: outcome.tone, outcome: outcome.label, facts, evidence,
    })
  }, [done, doneAt, card, run, outcome, facts, evidence])

  const reset = () => {
    if (timer.current) clearTimeout(timer.current)
    setRunning(false); setProgress(0); setBranchId(null); setDoneAt(null)
  }
  const choose = (id: string) => { setBranchId(id); setRunning(true) }

  let ri = -1
  const rows = [...run.steps, ...(option?.steps ?? [])].map((s) => {
    if (s.tone === 'skip') return { s, status: (done ? 'skip' : 'pending') as Status }
    ri += 1
    const status: Status = ri < progress ? s.tone : ri === progress && running ? 'active' : 'pending'
    return { s, status }
  })
  const experience = card.deck.find((d) => d.k === 'What does Maria experience?')

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <Controls
          progress={progress} running={running} done={done} locked={awaiting}
          onRun={() => setRunning(true)}
          onStep={() => { setRunning(false); setProgress((p) => p + 1) }}
          onReset={reset}
        />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <ScreenPane run={run} response={response} progress={progress} running={running} done={done} awaiting={awaiting} />
        <section>
          <h3 className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">The scenario, step by step</h3>
          <ol className="space-y-2">
            {rows.map(({ s, status }, i) => (
              <StepRow key={`${i}-${s.label}`} n={i + 1} step={s} status={status}>
                {status !== 'pending' && status !== 'active' && status !== 'skip' && <StepExtras step={s} tone={status} />}
              </StepRow>
            ))}
          </ol>
          {awaiting && run.branch && (
            <div className="mt-3 rounded-xl border border-violet-300 bg-violet-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-900"><UserCheck className="h-4 w-4" /> {run.branch.title}</div>
              <p className="mt-1 text-sm text-slate-700">{run.branch.summary}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {run.branch.checks.map((c) => <li key={c} className="flex items-start gap-2 text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{c}</li>)}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {run.branch.options.map((o) => (
                  <button key={o.id} onClick={() => choose(o.id)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${o.tone === 'ok' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Legend />
        </section>
      </div>

      {done && doneAt && (
        <div className="mt-6 space-y-4">
          <OutcomeBanner tone={outcome.tone} label={outcome.label} />
          <EvidencePanel records={evidence} at={doneAt} onProve={MARIA_CARDS.some((c) => c.id === PROVE_ID) ? () => onSelect(PROVE_ID) : undefined} />
          <div className="space-y-1 rounded-2xl bg-brand-800 p-4 text-sm text-white">
            {experience && <p><strong className="text-brand-200">What does Maria experience? </strong>{experience.v.join(' ')}</p>}
            {card.principle && <p><strong className="text-brand-200">{card.principle.k}: </strong>{card.principle.v}</p>}
          </div>
        </div>
      )}
    </>
  )
}

// ── 4:30 · the eight questions on slide 21, answered from the day log ───────

function answersFor(records: MariaLogRecord[]): Record<ProveKey, string[]> {
  const uniq = (xs: string[]) => [...new Set(xs)]
  const counts = new Map<string, number>()
  records.forEach((r) => r.evidence.forEach((e) => {
    const k = `${e.source} · ${e.activity}`
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }))
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  return {
    who: uniq(records.map((r) => r.facts.user)),
    activity: records.map((r) => `${r.time} · ${r.facts.activity}`),
    information: uniq(records.flatMap((r) => r.facts.information)),
    protections: uniq(records.flatMap((r) => r.facts.protections)),
    restricted: records.filter((r) => r.facts.restricted).map((r) => `${r.time} · ${r.facts.restricted}`),
    review: records.filter((r) => r.facts.humanReview).map((r) => `${r.time} · ${r.facts.humanReview}`),
    action: records.map((r) => `${r.time} · ${r.facts.action}`),
    evidence: total ? [`${total} evidence record${total === 1 ? '' : 's'} from ${records.length} run${records.length === 1 ? '' : 's'}`, ...[...counts].map(([k, n]) => `${k}: ${n}`)] : [],
  }
}

function ProveRunner({ card, log, onSelect }: { card: MariaCard; log: MariaLogRecord[]; onSelect: (id: string) => void }) {
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const order = (id: string) => MARIA_CARDS.findIndex((c) => c.id === id)
  const records = log.filter((r) => r.cardId !== PROVE_ID).sort((a, b) => order(a.cardId) - order(b.cardId) || a.runId.localeCompare(b.runId))
  const answers = answersFor(records)
  const count = PROVE_QUESTIONS.length
  const done = progress >= count
  const answered = PROVE_QUESTIONS.filter((q) => answers[q.key].length > 0).length

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => {
    if (!running) return
    if (done) { setRunning(false); return }
    timer.current = setTimeout(() => setProgress((p) => p + 1), STEP_MS)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [running, progress, done])

  const reset = () => { if (timer.current) clearTimeout(timer.current); setRunning(false); setProgress(0) }
  const cardLabel = (id: string) => { const c = MARIA_CARDS.find((x) => x.id === id)!; return `${c.time} ${c.title}${c.variant ? ` · ${c.variant}` : ''}` }
  const theQuestion = card.deck.find((d) => d.k === 'The question')

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <Controls progress={progress} running={running} done={done} locked={false}
          onRun={() => setRunning(true)} onStep={() => { setRunning(false); setProgress((p) => p + 1) }} onReset={reset} />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><ScrollText className="h-4 w-4 text-brand-500" /> Maria's day log</span>
            <span className="text-xs text-slate-400">{records.length} run{records.length === 1 ? '' : 's'} recorded</span>
          </div>
          {records.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No cards run yet. Run the cards above; each finished run adds a record here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr><th className="px-4 py-2 font-medium">Time</th><th className="px-4 py-2 font-medium">Activity</th><th className="px-4 py-2 font-medium">Outcome</th></tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-2 whitespace-nowrap text-slate-500">{r.time}</td>
                      <td className="px-4 py-2 text-slate-800"><button onClick={() => onSelect(r.cardId)} className="text-left hover:text-brand-700">{r.title}</button></td>
                      <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PILL_STYLE[r.tone]}`}>{shortOutcome(r.outcome)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <section>
          <h3 className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">The organization also needs to know</h3>
          <ol className="space-y-2">
            {PROVE_QUESTIONS.map((q, i) => {
              const list = answers[q.key]
              const tone: RunTone = list.length ? 'pass' : 'warn'
              const status: Status = i < progress ? tone : i === progress && running ? 'active' : 'pending'
              return (
                <StepRow key={q.key} n={i + 1} step={{ actor: 'Evidence', label: q.q, detail: list.length ? `${list.length} answer${list.length === 1 ? '' : 's'} from today's records` : 'Not yet shown' }} status={status}>
                  {list.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">{list.map((a) => <li key={a}>{a}</li>)}</ul>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-amber-900">Run one of:</span>
                      {q.hint.map((h) => <button key={h} onClick={() => onSelect(h)} className="rounded-full border border-amber-300 bg-white px-2 py-0.5 font-medium text-amber-900 hover:bg-amber-100">{cardLabel(h)}</button>)}
                    </div>
                  )}
                </StepRow>
              )
            })}
          </ol>
          <Legend />
        </section>
      </div>

      {done && (
        <div className="mt-6 space-y-4">
          <OutcomeBanner
            tone={answered === count ? 'ok' : 'warn'}
            label={answered === count ? `Governance can be proven · ${count} of ${count} questions answered from today's records` : `${answered} of ${count} questions answered · run the cards marked "Not yet shown"`}
          />
          <div className="space-y-1 rounded-2xl bg-brand-800 p-4 text-sm text-white">
            {theQuestion && <p><strong className="text-brand-200">The question: </strong>{theQuestion.v[0]}</p>}
            {card.principle && <p><strong className="text-brand-200">{card.principle.k}: </strong>{card.principle.v}</p>}
          </div>
        </div>
      )}
    </>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export function LegalMariaDay() {
  const [params, setParams] = useSearchParams()
  const card = MARIA_CARDS.find((c) => c.id === params.get('card')) ?? MARIA_CARDS[0]
  const run = card.runs.find((r) => r.id === params.get('run')) ?? card.runs[0]
  const log = useMariaLog()
  const activityCards = MARIA_CARDS.filter((c) => !c.prove)
  const ranCount = activityCards.filter((c) => log.some((r) => r.cardId === c.id)).length

  const select = (id: string) => {
    setParams({ card: id }, { replace: true })
    document.getElementById('maria-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <LegalLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-brand-500 uppercase">Day in the life</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-slate-900">Maria's day</h1>
          <p className="mt-1 text-sm text-slate-600">{INTRO.subtitle} · {MARIA.name}, {MARIA.role}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{ranCount} of {activityCards.length} activity cards run</span>
          <button onClick={resetMariaLog} disabled={log.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
            <Trash2 className="h-4 w-4" /> Clear the day
          </button>
        </div>
      </div>

      <section className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{INTRO.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{INTRO.lead}</p>
          <p className="mt-2 text-sm font-medium text-brand-700">Let's follow Maria through her day.</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500">But throughout the day, different questions arise:</p>
          <ol className="mt-1.5 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
            {INTRO.questions.map((q, i) => <li key={q} className="flex gap-2"><span className="font-bold text-brand-500">{i + 1}</span>{q}</li>)}
          </ol>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700">Choose a moment in Maria's day</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {MARIA_CARDS.map((c) => {
            const active = c.id === card.id
            const ran = log.some((r) => r.cardId === c.id)
            return (
              <button
                key={c.id}
                onClick={() => select(c.id)}
                className={`flex flex-col rounded-2xl border p-3 text-left transition ${active ? 'border-brand-500 bg-white shadow ring-2 ring-brand-200' : 'border-slate-200 bg-white hover:border-brand-300'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-brand-600">{c.time}</span>
                  {ran && <CheckCircle2 className="h-4 w-4 text-brand-500" aria-label="Already run" />}
                </div>
                <div className="mt-1 text-sm leading-snug font-semibold text-slate-800">{c.title}</div>
                {c.variant && <div className="text-xs text-slate-500">{c.variant}</div>}
                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                  {c.prove
                    ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">8 questions</span>
                    : c.runs.map((r) => (
                        <span key={r.id} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILL_STYLE[r.outcome.tone]}`}>
                          {c.runs.length > 1 ? r.label : shortOutcome(r.outcome.label)}
                        </span>
                      ))}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <div id="maria-card" className="scroll-mt-4">
        <CardBrief card={card} />

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Demonstration</h2>
            {card.runs.length > 1 && (
              <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {card.runs.map((r) => (
                  <button key={r.id} onClick={() => setParams({ card: card.id, run: r.id }, { replace: true })}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${run?.id === r.id ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {card.prove
            ? <ProveRunner card={card} log={log} onSelect={select} />
            : run && <Runner key={`${card.id}:${run.id}`} card={card} run={run} onSelect={select} />}
        </section>
      </div>

      <DemoNote />
    </LegalLayout>
  )
}
