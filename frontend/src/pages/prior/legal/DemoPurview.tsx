import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, Ban, Bell, Bot, CheckCircle2, CircleDashed, FileCheck2, FileText, Loader2, Play,
  RotateCcw, ScrollText, SearchX, ShieldCheck, SkipForward, Tag, UserRound,
} from 'lucide-react'
import { LegalLayout } from './Layout'
import { DemoNote, ProveHeader } from './ProveParts'
import {
  PURVIEW_SCENARIOS, PURVIEW_STAGES, reqById, type PolicyMode, type PurviewScenario,
} from '../../../lib/legalGovernance'
import { addEvidence, fmtTime, useEvidence, type EvidenceRecord } from '../../../lib/legalEvidence'

// /prior/legal/demo/data-protection: deck slide 14, "Demo 2: What happens to sensitive
// information?". Walks Maria's Copilot request through the five stages on the slide and
// writes the Purview activity records to the evidence pack. Scenario in ?sc=, policy mode
// in ?mode= (notify or restrict, only used where it changes the outcome).

const STEP_MS = 900

const LABEL_STYLE: Record<PurviewScenario['doc']['labelTone'], string> = {
  none: 'bg-slate-100 text-slate-600',
  general: 'bg-slate-100 text-slate-700',
  confidential: 'bg-amber-100 text-amber-900',
  privileged: 'bg-red-100 text-red-800',
}

const TONE_STYLE = {
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  warn: 'border-amber-300 bg-amber-50 text-amber-900',
  block: 'border-red-300 bg-red-50 text-red-800',
}

function LabelChip({ s }: { s: PurviewScenario }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${LABEL_STYLE[s.doc.labelTone]}`}>
      <Tag className="h-3 w-3" /> {s.doc.label}
    </span>
  )
}

function outcomeOf(s: PurviewScenario, mode: PolicyMode): EvidenceRecord['outcome'] {
  if (s.id === 'restricted') return 'not surfaced'
  const t = s.behavior[mode].tone
  return t === 'ok' ? 'allowed' : t === 'warn' ? 'notified' : 'restricted'
}

function CopilotPane({ s, mode, stage }: { s: PurviewScenario; mode: PolicyMode; stage: number }) {
  const r = s.response[mode]
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><Bot className="h-4 w-4 text-brand-500" /> Microsoft 365 Copilot</span>
        {stage >= 1 && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> maria.alvarez@bcbsvt.demo</span>}
      </div>
      <div className="flex-1 space-y-3 p-5">
        {stage < 1 && <p className="text-sm text-slate-400">Waiting for Maria to open Copilot…</p>}
        {stage >= 2 && (
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-500 px-4 py-2.5 text-sm text-white">
            {s.prompt}
          </div>
        )}
        {/* Scenario 4: the file is outside Maria's permissions, so it never appears as a source. */}
        {stage >= 2 && s.id !== 'restricted' && (
          <div className="ml-auto flex max-w-[85%] flex-wrap items-center justify-end gap-2 text-xs text-slate-500">
            <FileText className="h-3.5 w-3.5" /> {s.doc.name} <LabelChip s={s} />
          </div>
        )}
        {(stage === 2 || stage === 3) && <p className="inline-flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Purview is evaluating…</p>}
        {stage >= 4 && (
          r.kind === 'answer' ? (
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm text-slate-800">
              <p>{r.text}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500"><LabelChip s={s} /> {r.footnote}</p>
            </div>
          ) : r.kind === 'nothing' ? (
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm text-slate-800">
              <p className="flex items-start gap-2"><SearchX className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{r.text}</p>
              <p className="mt-2 text-xs text-slate-500">{r.footnote}</p>
            </div>
          ) : (
            <div className={`rounded-xl border px-4 py-3 text-sm ${r.kind === 'tip' ? TONE_STYLE.warn : TONE_STYLE.block}`}>
              <p className="flex items-start gap-2 font-medium">
                {r.kind === 'tip' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Ban className="mt-0.5 h-4 w-4 shrink-0" />}
                {r.text}
              </p>
              <p className="mt-2 text-xs opacity-80">{r.footnote}</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

type StageStatus = 'pending' | 'active' | 'done'

function StageBody({ id, s, mode }: { id: string; s: PurviewScenario; mode: PolicyMode }) {
  if (id === 'open') return <p>Signed in as <span className="font-mono text-xs">maria.alvarez@bcbsvt.demo</span> through CA-Legal-Copilot (Demo 1).</p>
  if (id === 'doc') return <p className="flex flex-wrap items-center gap-2">{s.doc.name} <LabelChip s={s} /><span className="w-full text-xs text-slate-500">{s.doc.path}</span></p>
  if (id === 'evaluate') return <ul className="space-y-1">{s.evaluate.map((e) => <li key={e} className={e.includes('MATCH') ? 'font-semibold text-red-700' : ''}>{e}</li>)}</ul>
  if (id === 'behavior') {
    const b = s.behavior[mode]
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE_STYLE[b.tone]}`}>{b.tone === 'block' ? <Ban className="h-3.5 w-3.5" /> : b.tone === 'warn' ? <Bell className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{b.label}</span>
  }
  return <p>{s.audit[mode].map((a) => a.activity).join(' + ')} written to Purview Audit and Activity explorer.</p>
}

function Stages({ s, mode, stage, running }: { s: PurviewScenario; mode: PolicyMode; stage: number; running: boolean }) {
  return (
    <ol className="space-y-2">
      {PURVIEW_STAGES.map((st, i) => {
        const status: StageStatus = i < stage ? 'done' : i === stage && running ? 'active' : 'pending'
        return (
          <li key={st.id} className={`rounded-xl border p-3 transition ${status === 'done' ? 'border-brand-200 bg-white' : status === 'active' ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200 bg-white/60'}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${status === 'done' ? 'bg-brand-500 text-white' : status === 'active' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'}`}>
                {status === 'done' ? <CheckCircle2 className="h-4 w-4" /> : status === 'active' ? <Loader2 className="h-4 w-4 animate-spin" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>{st.label}</div>
                <div className="text-xs text-slate-500">{st.detail}</div>
                {status === 'done' && <div className="mt-2 text-sm text-slate-700"><StageBody id={st.id} s={s} mode={mode} /></div>}
              </div>
              {status === 'pending' && <CircleDashed className="h-4 w-4 shrink-0 text-slate-300" />}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function AuditRecords({ s, mode, at }: { s: PurviewScenario; mode: PolicyMode; at: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><ScrollText className="h-4 w-4 text-brand-500" /> Purview audit and activity records</span>
        <span className="text-xs text-slate-400">{fmtTime(at)}</span>
      </div>
      <div className="grid gap-3 p-5 md:grid-cols-2">
        {s.audit[mode].map((a) => (
          <div key={a.activity} className="rounded-xl bg-slate-50 p-3">
            <div className="font-mono text-xs font-semibold text-brand-700">{a.activity}</div>
            <dl className="mt-2 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1 text-xs">
              {a.fields.map((f) => <div key={f.k} className="contents"><dt className="text-slate-500">{f.k}</dt><dd className="text-slate-800">{f.v}</dd></div>)}
            </dl>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-2xl bg-brand-50 px-5 py-3 text-sm">
        <span className="inline-flex items-center gap-2 font-medium text-brand-800"><FileCheck2 className="h-4 w-4" /> Added to the evidence pack for {s.req.join(', ')}</span>
        <Link to="/prior/legal/decision" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-800">View pack <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  )
}

export function LegalDemoPurview() {
  const [params, setParams] = useSearchParams()
  const s = PURVIEW_SCENARIOS.find((x) => x.id === params.get('sc')) ?? PURVIEW_SCENARIOS[0]
  const mode: PolicyMode = params.get('mode') === 'restrict' ? 'restrict' : 'notify'
  const [stage, setStage] = useState(0) // stages completed, 0..5
  const [running, setRunning] = useState(false)
  const [doneAt, setDoneAt] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { records } = useEvidence()
  const signedIn = records.find((r) => r.demo === 'identity' && r.scenario === 'maria')
  const done = stage >= PURVIEW_STAGES.length

  const reset = () => {
    if (timer.current) clearTimeout(timer.current)
    setRunning(false); setStage(0); setDoneAt(null)
  }
  useEffect(reset, [s.id, mode])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  useEffect(() => {
    if (!running) return
    if (done) { setRunning(false); return }
    timer.current = setTimeout(() => setStage((x) => x + 1), STEP_MS)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [running, stage, done])

  useEffect(() => {
    if (!done || doneAt) return
    const at = new Date().toISOString()
    setDoneAt(at)
    addEvidence({
      demo: 'purview',
      scenario: s.modeMatters ? `${s.id}:${mode}` : s.id,
      title: s.modeMatters ? `${s.title} (${mode === 'notify' ? 'notify' : 'restrict'} mode)` : s.title,
      outcome: outcomeOf(s, mode),
      reqs: s.req,
      source: 'Purview audit / Activity explorer',
      fields: s.audit[mode].flatMap((a) => a.fields.map((f) => ({ k: `${a.activity} · ${f.k}`, v: f.v }))),
    })
  }, [done, doneAt, s, mode])

  const setQuery = (next: Record<string, string>) => setParams({ sc: s.id, ...(mode === 'restrict' ? { mode } : {}), ...next }, { replace: true })

  return (
    <LegalLayout>
      <ProveHeader
        n={2} title="What happens to sensitive information?" product="Microsoft Purview"
        req="R3 · Protect sensitive information (with R2 and R5)" control="Information protection + DLP"
        impl="Purview sensitivity labels, DLP for Copilot, email and Teams" evidence="Label + policy + activity record"
      />

      <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${signedIn ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
        <span className="inline-flex items-center gap-2">
          <UserRound className="h-4 w-4" />
          {signedIn
            ? <>Maria is inside the identity boundary: signed in through Demo 1 at {fmtTime(signedIn.at)}.</>
            : <>Maria is assumed to be signed in. Run Demo 1, Scenario 1 first to show the identity boundary she came through.</>}
        </span>
        {!signedIn && <Link to="/prior/legal/demo/identity?sc=maria" className="font-semibold underline">Open Demo 1</Link>}
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700">Choose what Maria does</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PURVIEW_SCENARIOS.map((x, i) => {
            const active = x.id === s.id
            const ran = records.some((r) => r.demo === 'purview' && r.scenario.split(':')[0] === x.id)
            return (
              <button
                key={x.id}
                onClick={() => setParams({ sc: x.id, ...(mode === 'restrict' ? { mode } : {}) }, { replace: true })}
                className={`rounded-2xl border p-4 text-left transition ${active ? 'border-brand-500 bg-white shadow ring-2 ring-brand-200' : 'border-slate-200 bg-white hover:border-brand-300'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold tracking-wider text-brand-600 uppercase">Scenario {i + 1}</span>
                  {ran && <CheckCircle2 className="h-4 w-4 text-brand-500" aria-label="Already run" />}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{x.title}</div>
                <div className="mt-2 flex flex-wrap gap-1">{x.req.map((r) => <span key={r} className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">{r} {reqById(r).area}</span>)}</div>
              </button>
            )
          })}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {s.modeMatters ? (
            <>
              <span className="text-sm font-medium text-slate-600">DLP policy mode:</span>
              <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(['notify', 'restrict'] as PolicyMode[]).map((m) => (
                  <button key={m} onClick={() => setQuery(m === 'restrict' ? { mode: m } : {})}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${mode === m ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {m === 'notify' ? 'Notify (policy tip)' : 'Restrict (block)'}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <span className="text-sm text-slate-500">Behavior is the same in notify and restrict mode for this scenario.</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRunning(true)} disabled={running || done} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-40">
            <Play className="h-4 w-4" /> {stage === 0 ? 'Run scenario' : 'Continue'}
          </button>
          <button onClick={() => { setRunning(false); setStage((x) => x + 1) }} disabled={done} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
            <SkipForward className="h-4 w-4" /> Step
          </button>
          <button onClick={reset} disabled={stage === 0} aria-label="Reset" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <CopilotPane s={s} mode={mode} stage={stage} />
        <section>
          <h2 className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">The scenario, step by step</h2>
          <Stages s={s} mode={mode} stage={stage} running={running} />
        </section>
      </div>

      {done && doneAt && (
        <div className="mt-6 space-y-4">
          <AuditRecords s={s} mode={mode} at={doneAt} />
          <p className="rounded-2xl bg-brand-800 p-4 text-sm text-white"><strong className="text-brand-200">Why it matters: </strong>{s.takeaway}</p>
        </div>
      )}

      <p className="mt-6 text-sm text-slate-500">
        The requirement identified in the assessment is now operating inside the technology, and it leaves evidence behind.
      </p>
      <DemoNote />
    </LegalLayout>
  )
}
