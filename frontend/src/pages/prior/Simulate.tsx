import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Bot, CheckCircle2, ChevronRight, Circle, ClipboardList,
  FileText, Pause, Play, RotateCcw, ShieldCheck, Timer, UserRound, XCircle,
} from 'lucide-react'
import { PriorLayout } from './Layout'
import { Swimlane } from './Swimlane'
import { currentFlow, futureFlow } from '../../lib/priorAuthFlows'
import { authCases } from '../../lib/priorAuthDemo'
import type { AuthCase, SimStep, StepTone } from '../../lib/priorAuthDemo'

// /prior/simulate — interactive walkthrough of a prior-auth case, in either process
// mode: 'manual' (today's fax-and-phone flow, slide 13) or 'ai' (AI-enabled, slide 14).
// State lives in the URL (?case=&mode=&s=&d=) so any moment of the demo is deep-linkable.

type SimMode = 'manual' | 'ai'

function ModeToggle({ mode, onChange }: { mode: SimMode; onChange: (m: SimMode) => void }) {
  const seg = (m: SimMode, label: string) => (
    <button
      onClick={() => onChange(m)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        mode === m ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
      {seg('manual', 'Manual (today)')}
      {seg('ai', 'AI-enabled (future)')}
    </div>
  )
}

const TONE_CHIP: Record<StepTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  approve: 'bg-emerald-100 text-emerald-800',
  reject: 'bg-red-100 text-red-800',
  hitl: 'bg-amber-100 text-amber-800',
}

const PATH_CHIP: Record<AuthCase['pathTone'], string> = {
  approve: 'bg-emerald-100 text-emerald-800',
  hitl: 'bg-amber-100 text-amber-800',
  reject: 'bg-red-100 text-red-800',
}

function UrgencyChip({ urgency }: { urgency: 'Standard' | 'Expedited' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${urgency === 'Expedited' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
      <Timer className="h-3 w-3" /> {urgency}
    </span>
  )
}

// ── Case picker ─────────────────────────────────────────────────────────────

function CasePicker({ mode, onMode, onPick }: { mode: SimMode; onMode: (m: SimMode) => void; onPick: (id: string) => void }) {
  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold text-slate-900">Case Simulation</h1>
        <p className="mt-2 text-slate-500">
          Pick an authorization request from the queue and step through it in either process mode —
          today's manual workflow, or the AI-enabled future state with its human-in-the-loop review.
          Fictitious data throughout.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Process mode:</span>
        <ModeToggle mode={mode} onChange={onMode} />
        <span className="text-xs text-slate-400">
          {mode === 'manual' ? 'Fax intake, manual review queues, mailed letters — decisions in days.' : 'Agent triage with human-in-the-loop review — decisions in minutes.'}
        </span>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {authCases.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-400 hover:shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-400">{c.requestId}</span>
              <UrgencyChip urgency={c.service.urgency} />
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-800">{c.label}</h2>
            <p className="mt-1 text-sm text-slate-500">{c.member.name} · {c.service.code} · {c.service.units}</p>
            <p className="mt-1 text-xs text-slate-400">{c.service.diagnoses.map((d) => d.code).join(', ')} — {c.service.diagnoses[0].label}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PATH_CHIP[c.pathTone]}`}>{mode === 'manual' ? c.manualBadge : c.pathBadge}</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 opacity-0 transition group-hover:opacity-100">
                Run case <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Approvals may be automated; adverse determinations are always made by a licensed clinical reviewer — the AI only assembles evidence and drafts notices.
      </p>
    </div>
  )
}

// ── Determination panels ────────────────────────────────────────────────────

function ApprovalPanel({ authCase, manual }: { authCase: AuthCase; manual: boolean }) {
  const a = manual ? (authCase.manualApproval ?? authCase.approval) : authCase.approval
  if (!a) return null
  return (
    <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-5 w-5" /> Authorization Approved
        </span>
        <span className="font-mono text-sm font-semibold text-emerald-900">{a.authNumber}</span>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-medium text-slate-500">Service approved</dt><dd className="text-slate-800">{a.approvedService}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Units / duration</dt><dd className="text-slate-800">{a.units}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Valid from</dt><dd className="text-slate-800">{a.validFrom}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Valid through</dt><dd className="text-slate-800">{a.validTo}</dd></div>
      </dl>
      <ul className="mt-4 space-y-1 border-t border-emerald-200 pt-3 text-xs text-slate-600">
        {a.notes.map((n) => <li key={n}>• {n}</li>)}
      </ul>
    </div>
  )
}

function DenialPanel({ authCase, manual }: { authCase: AuthCase; manual: boolean }) {
  const d = manual ? (authCase.manualDenial ?? authCase.denial) : authCase.denial
  if (!d) return null
  return (
    <div className="mt-4 rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Notice of Adverse Benefit Determination</p>
          <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">Your request was not approved</h3>
        </div>
        <FileText className="h-6 w-6 shrink-0 text-slate-300" />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Request {authCase.requestId} · {authCase.member.name} (ID {authCase.member.memberId}) · {authCase.service.description}
      </p>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
        {d.reasons.map((r) => <p key={r}>{r}</p>)}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-600">Criteria applied</p>
          <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
            {d.criteriaCited.map((c) => <li key={c}>• {c}</li>)}
          </ul>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-800">What was missing</p>
          <ul className="mt-1.5 space-y-1 text-xs text-red-900/80">
            {d.missing.map((m) => <li key={m}>• {m}</li>)}
          </ul>
        </div>
      </div>
      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="text-xs font-semibold text-slate-600">Your appeal rights</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{d.appealRights}</p>
      </div>
      <p className="mt-4 text-xs text-slate-400">
        {manual
          ? 'Template letter generated by the UM system · Mailed to the member and faxed to the facility'
          : 'Drafted by the Determination & Notification Agent · Reviewed and signed by a licensed clinical peer reviewer'}
      </p>
    </div>
  )
}

// ── HITL decision card ──────────────────────────────────────────────────────

function DecisionCard({ authCase, onDecide }: { authCase: AuthCase; onDecide: (d: 'a' | 'd') => void }) {
  const dp = authCase.decision!
  return (
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/60 p-5">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
        <UserRound className="h-4.5 w-4.5" /> Human in the loop — clinical reviewer decision required
      </span>
      <p className="mt-2 text-sm text-slate-700">{dp.summary}</p>
      <ul className="mt-3 space-y-2">
        {dp.criteria.map((c) => (
          <li key={c.text} className="flex items-start gap-2 text-sm">
            {c.met
              ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
            <span className="text-slate-800">
              {c.text}
              {c.note && <span className="block text-xs text-slate-500">{c.note}</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-lg bg-white/70 p-3 text-xs text-slate-600">
        <span className={`mr-2 rounded-full px-2 py-0.5 font-semibold ${dp.recommendation === 'approve' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          Agent recommendation: {dp.recommendation === 'approve' ? 'Approve' : 'Deny'}
        </span>
        {dp.recommendationReason}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={() => onDecide('a')} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">
          Approve request
        </button>
        <button onClick={() => onDecide('d')} className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50">
          Issue adverse determination
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">You are acting as the licensed clinical reviewer. Either outcome is final for this simulation run.</p>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export function PriorSimulate() {
  const [params, setParams] = useSearchParams()
  const [autoPlay, setAutoPlay] = useState(false)

  const caseId = params.get('case')
  const authCase = authCases.find((c) => c.id === caseId) ?? null
  const mode: SimMode = params.get('mode') === 'manual' ? 'manual' : 'ai'
  const decision = params.get('d') === 'a' ? 'a' : params.get('d') === 'd' ? 'd' : null

  const steps: SimStep[] = useMemo(() => {
    if (!authCase) return []
    if (mode === 'manual') return authCase.manualSteps
    if (!authCase.decision || !decision) return authCase.baseSteps
    return decision === 'a'
      ? [...authCase.baseSteps, ...(authCase.approveSteps ?? [])]
      : [...authCase.baseSteps, ...(authCase.denySteps ?? [])]
  }, [authCase, mode, decision])

  const rawIdx = Number(params.get('s') ?? 0)
  const idx = Math.min(Math.max(Number.isFinite(rawIdx) ? rawIdx : 0, 0), Math.max(steps.length - 1, 0))
  const step = steps[idx]
  const atDecision = mode === 'ai' && !!authCase?.decision && !decision && idx === (authCase?.baseSteps.length ?? 0) - 1
  const atEnd = !atDecision && idx === steps.length - 1

  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) v === null ? p.delete(k) : p.set(k, v)
    setParams(p)
  }

  useEffect(() => {
    if (!autoPlay) return
    if (atDecision || atEnd || !authCase) { setAutoPlay(false); return }
    const t = setTimeout(() => update({ s: String(idx + 1) }), 2600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, idx, atDecision, atEnd, authCase])

  if (!authCase || !step) {
    return (
      <PriorLayout>
        <CasePicker
          mode={mode}
          onMode={(m) => setParams(m === 'manual' ? { mode: 'manual' } : {})}
          onPick={(id) => setParams({ case: id, s: '0', ...(mode === 'manual' ? { mode: 'manual' } : {}) })}
        />
      </PriorLayout>
    )
  }

  const visited = steps.slice(0, idx + 1).map((s) => s.nodeId)
  const tone = step.tone ?? 'neutral'

  return (
    <PriorLayout>
      {/* Case header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-400">{authCase.requestId}</span>
            <UrgencyChip urgency={authCase.service.urgency} />
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PATH_CHIP[authCase.pathTone]}`}>{mode === 'manual' ? authCase.manualBadge : authCase.pathBadge}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold text-slate-900">{authCase.label}</h1>
          <p className="mt-1 text-sm text-slate-500">{authCase.tatNote}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModeToggle mode={mode} onChange={(m) => { setAutoPlay(false); update({ mode: m === 'manual' ? 'manual' : null, s: '0', d: null }) }} />
          <button onClick={() => update({ s: String(Math.max(idx - 1, 0)) })} disabled={idx === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button onClick={() => update({ s: String(idx + 1) })} disabled={atDecision || atEnd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-40">
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
          flow={mode === 'manual' ? currentFlow : futureFlow}
          title={mode === 'manual' ? 'Manual prior authorization — live case position' : 'AI-enabled prior authorization — live case position'}
          active={step.nodeId}
          visited={visited}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Current step narration */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CHIP[tone]}`}>
                {step.human || step.agent.includes('human') || step.agent.includes('Team') ? <UserRound className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                {step.agent}
              </span>
              <span className="text-xs text-slate-400">Step {idx + 1} of {steps.length}{mode === 'ai' && authCase.decision && !decision ? '+' : ''}</span>
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
            {atDecision && <DecisionCard authCase={authCase} onDecide={(d) => update({ d, s: String(idx + 1) })} />}
            {step.render === 'approval' && <ApprovalPanel authCase={authCase} manual={mode === 'manual'} />}
            {step.render === 'denial' && <DenialPanel authCase={authCase} manual={mode === 'manual'} />}
          </div>
        </div>

        {/* Right rail: pipeline + request summary */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><ClipboardList className="h-4 w-4" /> Pipeline</h3>
            <ol className="mt-3 space-y-2.5">
              {steps.map((s, i) => (
                <li key={s.id} className="flex items-start gap-2 text-sm">
                  {i < idx
                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    : i === idx
                      ? <Circle className="mt-0.5 h-4 w-4 shrink-0 fill-teal-600 text-teal-600" />
                      : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                  <span className={i === idx ? 'font-medium text-slate-800' : i < idx ? 'text-slate-600' : 'text-slate-400'}>{s.title}</span>
                </li>
              ))}
              {mode === 'ai' && authCase.decision && !decision && (
                <li className="flex items-start gap-2 text-sm">
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span className="text-amber-700">Determination — pending reviewer decision</span>
                </li>
              )}
            </ol>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">Request summary</h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div><dt className="text-xs font-medium text-slate-500">Member</dt><dd className="text-slate-800">{authCase.member.name} · {authCase.member.memberId} · DOB {authCase.member.dob}</dd></div>
              <div><dt className="text-xs font-medium text-slate-500">Plan</dt><dd className="text-slate-800">{authCase.member.plan}</dd></div>
              <div><dt className="text-xs font-medium text-slate-500">Requesting provider</dt><dd className="text-slate-800">{authCase.provider.name}<span className="block text-xs text-slate-500">NPI {authCase.provider.npi}</span></dd></div>
              <div><dt className="text-xs font-medium text-slate-500">Service</dt><dd className="text-slate-800">{authCase.service.description}<span className="block text-xs text-slate-500">{authCase.service.code} · {authCase.service.units} · from {authCase.service.startDate}</span></dd></div>
              <div><dt className="text-xs font-medium text-slate-500">Place of service</dt><dd className="text-slate-800">{authCase.service.placeOfService}</dd></div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Diagnoses</dt>
                <dd className="text-slate-800">{authCase.service.diagnoses.map((d) => <span key={d.code} className="block">{d.code} — {d.label}</span>)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Attachments</dt>
                <dd className="text-slate-800">{authCase.attachments.map((a) => <span key={a} className="block">{a}</span>)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Simulation with fictitious data. Approvals may be automated; adverse determinations are made only by licensed clinical reviewers.
      </p>
    </PriorLayout>
  )
}
