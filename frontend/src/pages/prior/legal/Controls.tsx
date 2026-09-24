import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDown, ArrowRight, Bot, Database, FileText, Fingerprint, KeyRound, Laptop, Lock, MessageSquareText,
  ScrollText, ShieldCheck, Tag, UserRound, Users,
} from 'lucide-react'
import { LegalLayout } from './Layout'
import {
  DATA_ELEMENTS, LENSES, PERSPECTIVES, REQUIREMENTS, reqById, type ReqId, type TenantPart,
} from '../../../lib/legalGovernance'

// /prior/legal/controls: deck slides 6 and 8 to 12. Follow the data, look at the risk
// through seven lenses, turn it into six requirements, then show where each requirement
// runs in the Microsoft 365 tenant. The selected requirement lives in ?r= for deep links.

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold tracking-widest text-brand-500 uppercase">{children}</p>
}

function ReqTag({ id, active }: { id: ReqId; active?: boolean }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-700'}`}>
      {id} {reqById(id).area}
    </span>
  )
}

function Perspectives() {
  return (
    <section className="grid items-center gap-4 lg:grid-cols-[1fr_auto_16rem]">
      <div className="grid gap-3 sm:grid-cols-3">
        {PERSPECTIVES.map((p) => (
          <div key={p.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-brand-800">{p.name}</div>
            <p className="mt-1 text-xs text-slate-500">{p.items}</p>
          </div>
        ))}
      </div>
      <ArrowRight className="hidden h-6 w-6 text-brand-400 lg:block" aria-hidden />
      <div className="rounded-2xl bg-brand-800 p-4 text-white">
        <div className="text-sm font-semibold">Three lenses. One set of requirements.</div>
        <p className="mt-1 text-xs text-brand-100">Not three frameworks run in parallel. Each adds obligations the others would miss.</p>
      </div>
    </section>
  )
}

function FollowTheData() {
  const flowing = [
    { icon: MessageSquareText, label: 'Prompt' },
    { icon: FileText, label: 'Documents' },
    { icon: Fingerprint, label: 'User identity' },
    { icon: Tag, label: 'Metadata' },
    { icon: Bot, label: 'Generated response' },
  ]
  return (
    <section>
      <Eyebrow>Assess · Follow the data</Eyebrow>
      <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">Privacy depends on the data, not the app name</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-[5fr_6fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center text-xs font-semibold text-slate-700">
            <div className="rounded-xl bg-slate-100 px-2 py-3"><UserRound className="mx-auto mb-1 h-5 w-5 text-slate-600" />Legal user</div>
            <ArrowRight className="h-4 w-4 text-brand-400" aria-hidden />
            <div className="rounded-xl border border-dashed border-brand-400 bg-brand-50 px-2 py-3"><Bot className="mx-auto mb-1 h-5 w-5 text-brand-600" />Copilot</div>
            <ArrowRight className="h-4 w-4 text-brand-400" aria-hidden />
            <div className="rounded-xl bg-brand-800 px-2 py-3 text-white"><Database className="mx-auto mb-1 h-5 w-5 text-brand-200" />Microsoft 365</div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {flowing.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                <Icon className="h-3.5 w-3.5 text-brand-500" /> {label}
              </span>
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">Sensitive information can be present at every hop</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {DATA_ELEMENTS.map((d) => (
            <div key={d.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">{d.name}</span>
                <ReqTag id={d.req} />
              </div>
              <p className="mt-1 text-sm text-slate-500">{d.q}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SevenLenses() {
  return (
    <section>
      <Eyebrow>Assess · Risk through the NIST AI RMF</Eyebrow>
      <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">What could go wrong?</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {[['Govern', 'Accountability & policy'], ['Map', 'Context & sources of risk'], ['Measure', 'Analyze & assess'], ['Manage', 'Prioritize & act']].map(([k, v]) => (
          <span key={k} className="rounded-full bg-brand-800 px-3 py-1 text-xs text-white"><strong>{k}</strong> <span className="text-brand-200">{v}</span></span>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LENSES.map((l) => (
          <div key={l.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-brand-800">{l.name}</div>
            <p className="mt-1 text-sm text-slate-500">{l.q}</p>
          </div>
        ))}
        <div className="rounded-2xl bg-brand-50 p-4">
          <div className="text-sm font-semibold text-brand-800">The assessment identifies</div>
          <p className="mt-1 text-sm text-slate-600">Obligations · Risks · Existing safeguards · Gaps · Required actions · Evidence needed</p>
        </div>
      </div>
    </section>
  )
}

function Trace({ id }: { id: ReqId }) {
  const r = reqById(id)
  const steps = [
    { n: 1, k: 'Risk', body: <p>{r.risk}</p> },
    { n: 2, k: 'Requirement', body: <p className="font-semibold text-slate-900">{r.must}</p> },
    { n: 3, k: 'Control function', body: <><p className="font-semibold text-slate-900">{r.func}</p><p className="text-xs text-slate-500">{r.funcDetail}</p></> },
    { n: 4, k: 'Implementation', body: <ul className="space-y-1">{r.impl.map((x) => <li key={x}>{x}</li>)}</ul> },
    { n: 5, k: 'Evidence', body: <ul className="space-y-1">{r.evidence.map((x) => <li key={x}>{x}</li>)}</ul> },
  ]
  return (
    <div className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700">Following {r.id} through the chain</h3>
        <Link to={r.proof.to} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-600">
          Proven in: {r.proof.label} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <ol className="mt-4 grid gap-3 md:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.k} className="relative rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold tracking-wide text-brand-600 uppercase">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-[10px] text-white">{s.n}</span>{s.k}
            </div>
            {s.body}
            {i < steps.length - 1 && <ArrowRight className="absolute top-4 -right-3 z-10 hidden h-4 w-4 text-brand-400 md:block" aria-hidden />}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-slate-500">
        Risk tells us what could go wrong. The requirement tells us what must be true. Only then do we choose technology.
      </p>
    </div>
  )
}

function Part({ id, on, icon: Icon, label, reqs }: { id: TenantPart; on: TenantPart[]; icon: typeof Users; label: string; reqs: ReqId[] }) {
  const lit = on.includes(id)
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition ${lit ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-sm ring-2 ring-brand-200' : 'border-slate-200 bg-white text-slate-500'}`}>
      <span className="inline-flex items-center gap-2"><Icon className={`h-4 w-4 ${lit ? 'text-brand-600' : 'text-slate-400'}`} />{label}</span>
      <span className="flex gap-1">{reqs.map((r) => <span key={r} className={`rounded px-1 text-[10px] font-bold ${lit ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{r}</span>)}</span>
    </div>
  )
}

function TenantMap({ id }: { id: ReqId }) {
  const on = reqById(id).parts
  const govLit = on.includes('governance')
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">Where {id} operates</h3>
      <div className={`mt-3 rounded-xl border-2 px-4 py-3 transition ${govLit ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-xs font-bold tracking-wider uppercase ${govLit ? 'text-brand-700' : 'text-slate-500'}`}>Governance layer</span>
          <span className="flex gap-1"><ReqTag id="R4" active={govLit && id === 'R4'} /><ReqTag id="R6" active={govLit && id === 'R6'} /></span>
        </div>
        <p className="mt-1 text-sm text-slate-600">AI inventory · Risk assessment · Governance approval · Human oversight of AI output · Monitoring</p>
      </div>
      <ArrowDown className="mx-auto my-1 h-4 w-4 text-slate-300" aria-hidden />
      <div className="rounded-xl border-2 border-brand-800 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs font-bold tracking-wider text-brand-800 uppercase">BCBSVT Microsoft 365 tenant</span>
          <span className="text-xs text-slate-500">Enterprise-managed access boundary</span>
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_1.3fr_1fr]">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600"><KeyRound className="h-4 w-4 text-brand-500" /> Microsoft Entra ID <span className="font-normal text-slate-400">· who gets in</span></div>
            <div className="space-y-2">
              <Part id="group" on={on} icon={Users} label="Legal Department group" reqs={['R1']} />
              <Part id="ca" on={on} icon={ShieldCheck} label="Conditional Access" reqs={['R1']} />
              <Part id="mfa" on={on} icon={Fingerprint} label="MFA" reqs={['R1']} />
              <Part id="device" on={on} icon={Laptop} label="Compliant device" reqs={['R1']} />
            </div>
          </div>
          <div className="flex flex-col justify-center gap-2 rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-700"><UserRound className="h-4 w-4" /> Legal user</div>
            <ArrowDown className="mx-auto h-4 w-4 text-slate-300" aria-hidden />
            <Part id="copilot" on={on} icon={Bot} label="Microsoft Copilot" reqs={['R2', 'R4']} />
            <ArrowDown className="mx-auto h-4 w-4 text-slate-300" aria-hidden />
            <Part id="sharepoint" on={on} icon={Lock} label="SharePoint legal repositories" reqs={['R2']} />
            <p className="text-center text-[11px] text-slate-400">SharePoint permissions decide what Copilot can use</p>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600"><ShieldCheck className="h-4 w-4 text-brand-500" /> Microsoft Purview <span className="font-normal text-slate-400">· what it can use</span></div>
            <div className="space-y-2">
              <Part id="labels" on={on} icon={Tag} label="Sensitivity labels" reqs={['R3']} />
              <Part id="dlp" on={on} icon={Lock} label="DLP policies" reqs={['R3']} />
              <Part id="audit" on={on} icon={ScrollText} label="Audit / activity records" reqs={['R5']} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-brand-800 px-4 py-3 text-sm text-white">
        <span className="font-semibold text-brand-200">Evidence out: </span>
        Sign-in logs · Policy results · Group membership · Label and DLP matches · Activity / audit records
        <ArrowRight className="mx-1 inline h-4 w-4 text-brand-200" aria-hidden /> governance decision
      </div>
    </div>
  )
}

function Requirements() {
  const [params, setParams] = useSearchParams()
  const sel = (REQUIREMENTS.find((r) => r.id === params.get('r'))?.id ?? 'R1') as ReqId
  return (
    <section>
      <Eyebrow>Control · From risk to requirement</Eyebrow>
      <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">Six requirements: what must be true</h2>
      <p className="mt-1 text-sm text-slate-500">Select a requirement to follow it through the chain and see where it runs in the tenant.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" role="tablist" aria-label="Requirements">
        {REQUIREMENTS.map((r) => {
          const active = r.id === sel
          return (
            <button
              key={r.id}
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ r: r.id }, { replace: true })}
              className={`rounded-2xl border p-4 text-left transition ${active ? 'border-brand-500 bg-brand-500 text-white shadow' : 'border-slate-200 bg-white hover:border-brand-300'}`}
            >
              <div className={`text-xs font-bold tracking-wider uppercase ${active ? 'text-brand-100' : 'text-brand-600'}`}>{r.id} · {r.area}</div>
              <p className={`mt-1 text-sm ${active ? 'text-white' : 'text-slate-700'}`}>{r.must}</p>
            </button>
          )
        })}
      </div>
      <div className="mt-4 space-y-4">
        <Trace id={sel} />
        <div>
          <Eyebrow>Implement · Where the controls operate</Eyebrow>
          <div className="mt-2"><TenantMap id={sel} /></div>
        </div>
      </div>
    </section>
  )
}

export function LegalControls() {
  return (
    <LegalLayout>
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold text-slate-900">Requirements and Controls</h1>
        <p className="mt-2 text-slate-500">
          Controls are derived, not selected. We follow the data, name what could go wrong, state what must be true, and only
          then pick the technology that enforces it.
        </p>
      </div>
      <div className="mt-8 space-y-12">
        <Perspectives />
        <FollowTheData />
        <SevenLenses />
        <Requirements />
      </div>
    </LegalLayout>
  )
}
