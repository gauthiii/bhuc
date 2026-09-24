import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BadgeCheck, CheckCircle2, ChevronDown, CircleDashed, FileText, Gavel, KeyRound, PauseCircle,
  RotateCcw, ScrollText, Stamp, XCircle,
} from 'lucide-react'
import mountains from '../../../assets/brand/bcbsvt-mountains.jpg'
import { LegalLayout } from './Layout'
import { BEFORE_AFTER, CHAIN, DECISION_CONDITIONS, REQUIREMENTS, type ReqId } from '../../../lib/legalGovernance'
import { fmtTime, recordDecision, resetEvidence, useEvidence, type EvidenceRecord } from '../../../lib/legalEvidence'
import { securityData } from '../../../lib/legalCopilotSecurityData'

// /prior/legal/decision: deck slides 15 to 18. Reads the evidence pack built by Demo 1
// and Demo 2, shows the status of each requirement, and lets the audience act as the
// AI Governance Council. Approval unlocks only once R1 and R3 have live evidence.

type ReqStatus = { state: 'live' | 'documented' | 'waiting'; text: string; link?: { to: string; label: string } }

function statusFor(id: ReqId, records: EvidenceRecord[]): ReqStatus {
  const withReq = records.filter((r) => r.reqs.includes(id))
  switch (id) {
    case 'R1': {
      if (!withReq.length) return { state: 'waiting', text: 'Not yet shown.', link: { to: '/prior/legal/demo/identity', label: 'Run Demo 1' } }
      const granted = withReq.filter((r) => r.outcome === 'granted').length
      const blocked = withReq.length - granted
      return { state: 'live', text: `${granted} granted, ${blocked} blocked sign-in${blocked === 1 ? '' : 's'} on record` }
    }
    case 'R2':
      return withReq.length
        ? { state: 'live', text: 'Restricted file never surfaced to Copilot' }
        : { state: 'waiting', text: 'Not yet shown.', link: { to: '/prior/legal/demo/data-protection?sc=restricted', label: 'Run Demo 2, Scenario 4' } }
    case 'R3':
      return withReq.length
        ? { state: 'live', text: `${withReq.length} label / DLP outcome${withReq.length === 1 ? '' : 's'} on record` }
        : { state: 'waiting', text: 'Not yet shown.', link: { to: '/prior/legal/demo/data-protection', label: 'Run Demo 2' } }
    case 'R4':
      return { state: 'documented', text: 'Attorney citation check and CLO release step in the process', link: { to: '/prior/legal/simulate?case=broker-file-retention&s=4', label: 'Case simulation' } }
    case 'R5':
      return records.length
        ? { state: 'live', text: `${records.length} sign-in and audit record${records.length === 1 ? '' : 's'} captured` }
        : { state: 'waiting', text: 'Produced by Demos 1 and 2' }
    case 'R6':
      return { state: 'documented', text: `AI inventory, risk assessment and ${securityData.approvals.length} sign-offs in the approval trail`, link: { to: '/prior/legal/security', label: 'Security posture' } }
  }
}

const STATE_STYLE = {
  live: { chip: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2, label: 'Proven live' },
  documented: { chip: 'bg-brand-100 text-brand-800', icon: FileText, label: 'Documented' },
  waiting: { chip: 'bg-slate-100 text-slate-600', icon: CircleDashed, label: 'Awaiting evidence' },
}

function EndToEnd({ r1Count }: { r1Count: number }) {
  const steps = [
    { k: 'Assessment finding', v: 'Copilot will be used with privileged legal information that could be exposed' },
    { k: 'Requirement', v: 'Only authorized users reach Copilot and the information they are permitted to access' },
    { k: 'Control', v: 'Identity & Access Management' },
    { k: 'Implementation', v: 'Entra ID group · Conditional Access · MFA · SharePoint permissions' },
    { k: 'Evidence', v: r1Count ? `${r1Count} sign-in record${r1Count === 1 ? '' : 's'} from Demo 1, plus group membership and access reviews` : 'Group membership · sign-in records · policy results · access reviews' },
    { k: 'Governance decision', v: 'Approval based on evidence and conditions' },
  ]
  return (
    <section>
      <p className="text-xs font-bold tracking-widest text-brand-500 uppercase">Prove · Evidence and traceability</p>
      <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">One requirement, followed end to end</h2>
      <ol className="mt-4 grid gap-3 md:grid-cols-6">
        {steps.map((s, i) => (
          <li key={s.k} className={`relative rounded-2xl p-4 text-sm ${i === steps.length - 1 ? 'bg-brand-800 text-white' : i === 4 && r1Count ? 'border border-emerald-300 bg-emerald-50 text-slate-800' : 'border border-slate-200 bg-white text-slate-700 shadow-sm'}`}>
            <div className={`text-[11px] font-bold tracking-wider uppercase ${i === steps.length - 1 ? 'text-brand-200' : 'text-brand-600'}`}>{s.k}</div>
            <p className="mt-1">{s.v}</p>
            {i < steps.length - 1 && <ArrowRight className="absolute top-5 -right-3 z-10 hidden h-4 w-4 text-brand-400 md:block" aria-hidden />}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-slate-500">Every control in the tenant can be traced back to a finding in the assessment.</p>
    </section>
  )
}

function RequirementStatus({ records }: { records: EvidenceRecord[] }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold text-slate-900">Requirement status</h2>
      <p className="mt-1 text-sm text-slate-500">Fills in as you run the demos. Live evidence comes from this session; documented evidence comes from the assessment.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Requirement</th>
              <th className="px-4 py-2.5 font-medium">Implemented control</th>
              <th className="px-4 py-2.5 font-medium">Evidence</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {REQUIREMENTS.map((r) => {
              const st = statusFor(r.id, records)
              const S = STATE_STYLE[st.state]
              return (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <div className="text-xs font-bold text-brand-600">{r.id} · {r.area}</div>
                    <div className="text-slate-800">{r.must}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.impl.slice(0, 3).join(' · ')}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {st.text}
                    {st.link && <Link to={st.link.to} className="ml-2 inline-flex items-center gap-0.5 font-semibold whitespace-nowrap text-brand-600 hover:text-brand-800">{st.link.label}<ArrowRight className="h-3.5 w-3.5" /></Link>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${S.chip}`}><S.icon className="h-3.5 w-3.5" />{S.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const OUTCOME_CHIP: Record<EvidenceRecord['outcome'], string> = {
  granted: 'bg-emerald-100 text-emerald-800',
  allowed: 'bg-emerald-100 text-emerald-800',
  'not surfaced': 'bg-emerald-100 text-emerald-800',
  notified: 'bg-amber-100 text-amber-800',
  blocked: 'bg-red-100 text-red-800',
  restricted: 'bg-red-100 text-red-800',
}

function EvidencePack({ records }: { records: EvidenceRecord[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const sorted = [...records].sort((a, b) => a.at.localeCompare(b.at))
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900">Evidence pack</h2>
          <p className="mt-1 text-sm text-slate-500">Every record the controls produced during this demonstration.</p>
        </div>
        <button onClick={resetEvidence} disabled={!records.length} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>
      {sorted.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
          <ScrollText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-600">No evidence yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Run <Link to="/prior/legal/demo/identity" className="font-semibold text-brand-600">Demo 1</Link> and{' '}
            <Link to="/prior/legal/demo/data-protection" className="font-semibold text-brand-600">Demo 2</Link>. Each scenario adds a record here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {sorted.map((r) => {
            const isOpen = open === r.id
            return (
              <li key={r.id}>
                <button onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="grid w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-slate-50 md:grid-cols-[7.5rem_12rem_1fr_auto_auto]">
                  <span className="text-xs text-slate-500">{fmtTime(r.at)}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    {r.demo === 'identity' ? <KeyRound className="h-3.5 w-3.5 text-brand-500" /> : <ScrollText className="h-3.5 w-3.5 text-brand-500" />}{r.source}
                  </span>
                  <span className="text-slate-800">{r.title}</span>
                  <span className="flex gap-1">{r.reqs.map((q) => <span key={q} className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">{q}</span>)}</span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${OUTCOME_CHIP[r.outcome]}`}>{r.outcome}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {isOpen && (
                  <dl className="grid gap-x-4 gap-y-1 bg-slate-50 px-4 py-3 text-xs sm:grid-cols-[16rem_1fr]">
                    {r.fields.map((f) => <div key={f.k} className="contents"><dt className="text-slate-500">{f.k}</dt><dd className="text-slate-800">{f.v}</dd></div>)}
                  </dl>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function DecisionPanel({ records }: { records: EvidenceRecord[] }) {
  const { decision } = useEvidence()
  const r1 = statusFor('R1', records).state === 'live'
  const r3 = statusFor('R3', records).state === 'live'
  const ready = r1 && r3

  if (decision) {
    const approved = decision.status === 'approved'
    const next = new Date(decision.at)
    next.setFullYear(next.getFullYear() + 1)
    return (
      <section className={`rounded-2xl border-2 p-6 ${approved ? 'border-emerald-400 bg-emerald-50/50' : 'border-amber-300 bg-amber-50/50'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-2 text-lg font-semibold ${approved ? 'text-emerald-800' : 'text-amber-900'}`}>
            {approved ? <BadgeCheck className="h-6 w-6" /> : <PauseCircle className="h-6 w-6" />}
            {approved ? 'Approved with conditions' : 'Deferred: more evidence needed'}
          </span>
          <button onClick={resetEvidence} className="text-sm font-medium text-slate-500 underline hover:text-slate-700">Start the demo again</button>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs font-medium text-slate-500">Decision record</dt><dd className="font-mono text-slate-800">{decision.id}</dd></div>
          <div><dt className="text-xs font-medium text-slate-500">Decided by</dt><dd className="text-slate-800">AI Governance Council</dd></div>
          <div><dt className="text-xs font-medium text-slate-500">Recorded</dt><dd className="text-slate-800">{fmtTime(decision.at)}</dd></div>
          <div><dt className="text-xs font-medium text-slate-500">Basis</dt><dd className="text-slate-800">{records.length} evidence records across {new Set(records.flatMap((r) => r.reqs)).size} requirements</dd></div>
        </dl>
        {approved && (
          <>
            <h3 className="mt-5 text-sm font-semibold text-slate-700">Conditions of approval</h3>
            <ul className="mt-2 space-y-1.5">{DECISION_CONDITIONS.map((c) => <li key={c} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{c}</li>)}</ul>
            <p className="mt-4 text-sm text-slate-600">Next review: {next.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.</p>
          </>
        )}
        <p className="mt-4 font-display text-xl text-slate-900">{approved ? 'Copilot for Legal is approved on evidence, not on intent.' : 'No evidence, no approval. The framework holds the line.'}</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-lg font-semibold text-brand-800"><Gavel className="h-6 w-6" /> Governance decision</div>
      <p className="mt-1 text-sm text-slate-600">You are acting as the AI Governance Council. Approval is available once the controls behind R1 and R3 have produced live evidence.</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {[['R1 · Identity boundary proven', r1], ['R3 · Data protection proven', r3]].map(([t, ok]) => (
          <li key={t as string} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${ok ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>
            {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{t as string}
          </li>
        ))}
      </ul>
      <h3 className="mt-5 text-sm font-semibold text-slate-700">Proposed conditions</h3>
      <ul className="mt-2 space-y-1.5">{DECISION_CONDITIONS.map((c) => <li key={c} className="flex items-start gap-2 text-sm text-slate-600"><Stamp className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />{c}</li>)}</ul>
      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={() => recordDecision('approved')} disabled={!ready} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">
          <BadgeCheck className="h-4 w-4" /> Approve with conditions
        </button>
        <button onClick={() => recordDecision('deferred')} className="inline-flex items-center gap-2 rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50">
          <PauseCircle className="h-4 w-4" /> Defer
        </button>
      </div>
      {!ready && <p className="mt-2 text-xs text-slate-500">Approval is locked until the evidence exists. That is the point: approval on evidence, not on intent.</p>}
    </section>
  )
}

function BeforeAfter() {
  return (
    <section>
      <p className="text-xs font-bold tracking-widest text-brand-500 uppercase">Technology-led versus governance-led</p>
      <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">What the assessment changes</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-2 text-xs font-bold tracking-wider uppercase">
          <div className="bg-slate-100 px-5 py-3 text-slate-500">Without governance-led assessment</div>
          <div className="bg-brand-800 px-5 py-3 text-brand-100">With governance-led assessment</div>
        </div>
        {BEFORE_AFTER.map(([a, b], i) => (
          <div key={a} className={`grid grid-cols-2 text-sm ${i === 0 ? 'font-display text-base' : ''}`}>
            <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-slate-500"><XCircle className="h-4 w-4 shrink-0 text-slate-300" />{a}</div>
            <div className="flex items-center gap-2 border-t border-brand-100 bg-brand-50 px-5 py-3 font-medium text-brand-900"><CheckCircle2 className="h-4 w-4 shrink-0 text-brand-500" />{b}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Closing() {
  return (
    <section className="overflow-hidden rounded-3xl bg-brand-500 bg-cover bg-bottom px-8 pt-10 pb-24 text-white md:px-12" style={{ backgroundImage: `url(${mountains})` }}>
      <h2 className="max-w-3xl font-display text-3xl font-semibold md:text-4xl">We don't govern AI by starting with technology</h2>
      <p className="mt-3 text-lg text-brand-50">Copilot is the demonstration. The framework is the value.</p>
      <p className="mt-4 max-w-3xl text-sm text-brand-50">
        We start with the business use case, understand the data and risk, determine what must be true, translate those
        requirements into enforceable controls, implement them in the environment, and generate evidence that supports the
        governance decision.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm font-semibold">
        {CHAIN.map((c, i) => (
          <span key={c.k} className="inline-flex items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/30">{c.k}</span>
            {i < CHAIN.length - 1 && <ArrowRight className="h-4 w-4 text-brand-100" aria-hidden />}
          </span>
        ))}
      </div>
    </section>
  )
}

export function LegalDecision() {
  const { records } = useEvidence()
  const r1Count = records.filter((r) => r.reqs.includes('R1')).length
  return (
    <LegalLayout>
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold text-slate-900">Evidence and Decision</h1>
        <p className="mt-2 text-slate-500">
          The controls have run and left records behind. Here is how each requirement is evidenced, and the decision that
          evidence supports.
        </p>
      </div>
      <div className="mt-8 space-y-12">
        <EndToEnd r1Count={r1Count} />
        <RequirementStatus records={records} />
        <EvidencePack records={records} />
        <DecisionPanel records={records} />
        <BeforeAfter />
        <Closing />
      </div>
    </LegalLayout>
  )
}
