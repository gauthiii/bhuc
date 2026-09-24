import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, Ban, Bot, CheckCircle2, CircleDashed, FileCheck2, Fingerprint, KeyRound, Laptop,
  Loader2, LogIn, MapPin, MinusCircle, Play, RotateCcw, ShieldCheck, SkipForward, UserRound, Users, XCircle,
} from 'lucide-react'
import { LegalLayout } from './Layout'
import { DemoNote, ProveHeader } from './ProveParts'
import {
  IDENTITY_CHECKS, IDENTITY_SCENARIOS, type CheckId, type CheckResult, type IdentityScenario,
} from '../../../lib/legalGovernance'
import { addEvidence, fmtTime, useEvidence } from '../../../lib/legalEvidence'

// /prior/legal/demo/identity: deck slide 13, "Demo 1: Who can use Copilot?".
// Runs a sign-in through the Entra ID checks one at a time and writes the resulting
// sign-in record to the evidence pack. Scenario in ?sc=. Simulated, fictitious data.

const CHECK_ICON: Record<CheckId, typeof Users> = {
  identity: UserRound, group: Users, ca: ShieldCheck, mfa: Fingerprint, device: Laptop, signin: LogIn,
}
const STEP_MS = 750

type Status = CheckResult | 'pending' | 'checking'

function CheckRow({ id, label, detail, status, note }: { id: CheckId; label: string; detail: string; status: Status; note?: string }) {
  const Icon = CHECK_ICON[id]
  const style = {
    pending: 'border-slate-200 bg-white text-slate-400',
    checking: 'border-brand-400 bg-brand-50 text-brand-800 ring-2 ring-brand-200',
    pass: 'border-emerald-200 bg-emerald-50/60 text-slate-800',
    fail: 'border-red-300 bg-red-50 text-slate-800',
    skip: 'border-slate-200 bg-slate-50 text-slate-400',
  }[status]
  return (
    <li className={`flex items-start gap-3 rounded-xl border p-3 transition ${style}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${status === 'pass' ? 'bg-emerald-100 text-emerald-700' : status === 'fail' ? 'bg-red-100 text-red-700' : status === 'checking' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{label}</div>
        <div className={`text-xs ${status === 'fail' ? 'font-medium text-red-700' : 'text-slate-500'}`}>{status === 'fail' && note ? note : detail}</div>
      </div>
      <span className="shrink-0 pt-1">
        {status === 'pending' && <CircleDashed className="h-5 w-5 text-slate-300" />}
        {status === 'checking' && <Loader2 className="h-5 w-5 animate-spin text-brand-500" />}
        {status === 'pass' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        {status === 'fail' && <XCircle className="h-5 w-5 text-red-600" />}
        {status === 'skip' && <span className="inline-flex items-center gap-1 text-xs text-slate-400"><MinusCircle className="h-4 w-4" /> Not reached</span>}
      </span>
    </li>
  )
}

function logFields(s: IdentityScenario) {
  const r = s.results
  return [
    { k: 'User', v: s.upn },
    { k: 'Application', v: 'Microsoft 365 Copilot' },
    { k: 'Status', v: s.outcome === 'granted' ? 'Success' : `Failure (${s.errorCode})` },
    { k: 'Group membership', v: r.group === 'pass' ? 'Legal Department: member' : 'Legal Department: not a member' },
    { k: 'Conditional Access', v: r.ca === 'pass' ? (s.outcome === 'granted' ? 'CA-Legal-Copilot: Success' : 'CA-Legal-Copilot: Failure') : 'Not applied (user out of scope)' },
    { k: 'MFA', v: r.mfa === 'pass' ? 'Satisfied (Authenticator push)' : r.mfa === 'fail' ? 'Denied by user' : 'Not reached' },
    { k: 'Device', v: r.device === 'pass' ? 'Managed, compliant' : r.device === 'fail' ? 'Unmanaged, not compliant' : 'Not evaluated' },
    { k: 'Location', v: s.location },
  ]
}

function ResultScreen({ s }: { s: IdentityScenario }) {
  if (s.outcome === 'granted') {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" /> Access granted</div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Bot className="h-5 w-5 text-brand-500" /> Microsoft 365 Copilot</div>
          <p className="mt-2 text-sm text-slate-600">Good morning, Maria. What can I help you research today?</p>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400">Ask Copilot about your legal documents…</div>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-red-300 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-red-800"><Ban className="h-5 w-5" /> Access blocked</div>
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-800">You can't open Microsoft 365 Copilot from here</div>
        <p className="mt-1 text-sm text-slate-600">{s.failNote}</p>
        <p className="mt-2 font-mono text-xs text-slate-400">Error code {s.errorCode}</p>
      </div>
    </div>
  )
}

function SignInLog({ s, time }: { s: IdentityScenario; time: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><KeyRound className="h-4 w-4 text-brand-500" /> Entra ID sign-in log</span>
        <span className="text-xs text-slate-400">{fmtTime(time)}</span>
      </div>
      <dl className="grid gap-x-4 gap-y-2 px-5 py-4 text-sm sm:grid-cols-[9rem_1fr]">
        {logFields(s).map((f) => (
          <div key={f.k} className="contents">
            <dt className="text-xs font-medium text-slate-500">{f.k}</dt>
            <dd className={f.k === 'Status' ? `font-semibold ${s.outcome === 'granted' ? 'text-emerald-700' : 'text-red-700'}` : 'text-slate-800'}>{f.v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-2xl bg-brand-50 px-5 py-3 text-sm">
        <span className="inline-flex items-center gap-2 font-medium text-brand-800"><FileCheck2 className="h-4 w-4" /> Added to the evidence pack for R1 and R5</span>
        <Link to="/prior/legal/decision" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-800">View pack <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  )
}

export function LegalDemoIdentity() {
  const [params, setParams] = useSearchParams()
  const s = IDENTITY_SCENARIOS.find((x) => x.id === params.get('sc')) ?? IDENTITY_SCENARIOS[0]
  // progress = number of checks already evaluated; -1 = not started.
  const [progress, setProgress] = useState(-1)
  const [running, setRunning] = useState(false)
  const [doneAt, setDoneAt] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { records } = useEvidence()
  const attempts = records.filter((r) => r.demo === 'identity')

  // Checks up to and including the first failure are evaluated; the rest are skipped.
  const lastEvaluated = (() => {
    const i = IDENTITY_CHECKS.findIndex((c) => s.results[c.id] !== 'pass')
    const failAt = i >= 0 && s.results[IDENTITY_CHECKS[i].id] === 'fail' ? i : -1
    return failAt >= 0 ? failAt : IDENTITY_CHECKS.length - 1
  })()
  const done = progress > lastEvaluated

  const reset = () => {
    if (timer.current) clearTimeout(timer.current)
    setRunning(false); setProgress(-1); setDoneAt(null)
  }
  useEffect(reset, [s.id])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  useEffect(() => {
    if (!running) return
    if (done) { setRunning(false); return }
    timer.current = setTimeout(() => setProgress((p) => p + 1), STEP_MS)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [running, progress, done])

  useEffect(() => {
    if (!done || doneAt) return
    const at = new Date().toISOString()
    setDoneAt(at)
    addEvidence({
      demo: 'identity', scenario: s.id, title: `${s.who}: ${s.title.toLowerCase()}`,
      outcome: s.outcome, reqs: ['R1', 'R5'], source: 'Entra ID sign-in log', fields: logFields(s),
    })
  }, [done, doneAt, s])

  const statusOf = (i: number): Status => {
    if (done) return s.results[IDENTITY_CHECKS[i].id]
    if (progress < 0 || i > progress) return 'pending'
    if (i === progress) return running ? 'checking' : 'pending'
    return s.results[IDENTITY_CHECKS[i].id]
  }

  const start = () => { if (progress < 0) setProgress(0); setRunning(true) }
  const step = () => { setRunning(false); setProgress((p) => (p < 0 ? 1 : p + 1)) }

  return (
    <LegalLayout>
      <ProveHeader
        n={1} title="Who can use Copilot?" product="Microsoft Entra ID"
        req="R1 · Only authorized users can access Copilot" control="Identity & access management"
        impl="Entra ID group, Conditional Access, MFA, compliant device" evidence="Group membership + sign-in + policy result"
      />

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700">Choose a sign-in attempt</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {IDENTITY_SCENARIOS.map((x, i) => {
            const active = x.id === s.id
            const ran = attempts.some((a) => a.scenario === x.id)
            return (
              <button
                key={x.id}
                onClick={() => setParams({ sc: x.id }, { replace: true })}
                className={`rounded-2xl border p-4 text-left transition ${active ? 'border-brand-500 bg-white shadow ring-2 ring-brand-200' : 'border-slate-200 bg-white hover:border-brand-300'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold tracking-wider text-brand-600 uppercase">Scenario {i + 1}</span>
                  {ran && <CheckCircle2 className="h-4 w-4 text-brand-500" aria-label="Already run" />}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{x.title}</div>
                <div className="mt-1 text-xs text-slate-500">{x.who} · {x.device.split(' (')[0]}</div>
                <span className={`mt-3 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${x.outcome === 'granted' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  Expected: {x.outcome === 'granted' ? 'access granted' : 'blocked'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{s.who}</h2>
              <p className="text-sm text-slate-500">{s.role}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={start} disabled={running || done} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-40">
                <Play className="h-4 w-4" /> {progress < 0 ? 'Run sign-in' : 'Continue'}
              </button>
              <button onClick={step} disabled={done} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
                <SkipForward className="h-4 w-4" /> Step
              </button>
              <button onClick={reset} disabled={progress < 0} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40" aria-label="Reset">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <dl className="mt-4 grid gap-x-4 gap-y-1.5 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-[6rem_1fr]">
            <dt className="text-xs font-medium text-slate-500">Account</dt><dd className="font-mono text-xs text-slate-800">{s.upn}</dd>
            <dt className="text-xs font-medium text-slate-500">Device</dt><dd className="text-slate-800">{s.device}</dd>
            <dt className="text-xs font-medium text-slate-500">Location</dt><dd className="inline-flex items-center gap-1 text-slate-800"><MapPin className="h-3.5 w-3.5 text-slate-400" />{s.location}</dd>
          </dl>
          <h3 className="mt-5 text-xs font-bold tracking-wider text-slate-500 uppercase">Entra ID checks · identity boundary</h3>
          <ol className="mt-2 space-y-2">
            {IDENTITY_CHECKS.map((c, i) => (
              <CheckRow key={c.id} id={c.id} label={`${i + 1}. ${c.label}`} detail={c.detail} status={statusOf(i)} note={s.failNote} />
            ))}
          </ol>
        </section>

        <section className="space-y-4">
          {done && doneAt ? (
            <>
              <ResultScreen s={s} />
              <SignInLog s={s} time={doneAt} />
              <p className="rounded-2xl bg-brand-800 p-4 text-sm text-white"><strong className="text-brand-200">Why it matters: </strong>{s.takeaway}</p>
            </>
          ) : (
            <div className="grid h-full min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
              <div>
                <LogIn className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">Run the sign-in to see what Entra ID decides</p>
                <p className="mt-1 text-xs text-slate-400">The outcome and the sign-in record appear here.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {attempts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700">Sign-in attempts recorded this session</h2>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr><th className="px-4 py-2 font-medium">Time</th><th className="px-4 py-2 font-medium">Attempt</th><th className="px-4 py-2 font-medium">Result</th><th className="px-4 py-2 font-medium">Policy</th></tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-500">{fmtTime(a.at)}</td>
                    <td className="px-4 py-2 text-slate-800">{a.title}</td>
                    <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.outcome === 'granted' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{a.outcome === 'granted' ? 'Granted' : 'Blocked'}</span></td>
                    <td className="px-4 py-2 text-slate-600">{a.fields.find((f) => f.k === 'Conditional Access')?.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-slate-500">The governance requirement has become an enforceable identity boundary, and every decision it makes is on record.</p>
        </section>
      )}

      <DemoNote />
    </LegalLayout>
  )
}
