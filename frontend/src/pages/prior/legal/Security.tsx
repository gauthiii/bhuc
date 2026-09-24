import { useMemo, useState } from 'react'
import {
  BadgeCheck, Building2, CheckCircle2, ChevronDown, CircleDashed, Clock, FileLock2, Handshake,
  Layers, MinusCircle, ShieldCheck, Stamp, Target,
} from 'lucide-react'
import { LegalLayout } from './Layout'
import { securityData } from '../../../lib/legalCopilotSecurityData'

// /prior/legal/security: security and governance posture of Microsoft Copilot for the
// Legal Department, from the CPRM Sprint 2 workbook. Every figure on this page is read
// from legalCopilotSecurityData.ts; nothing is estimated here.

type Fn = 'GOVERN' | 'IDENTIFY' | 'PROTECT' | 'DETECT' | 'RESPOND' | 'RECOVER'
type Process = (typeof securityData.processes)[number]
interface ControlRow { group: string; control: string; status: string; evidence: string; refs: string; sustain?: string }

const RING: Fn[] = ['IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER']
const TITLE: Record<Fn, string> = {
  GOVERN: 'Govern', IDENTIFY: 'Identify', PROTECT: 'Protect', DETECT: 'Detect', RESPOND: 'Respond', RECOVER: 'Recover',
}

const procs = securityData.processes
const direct = procs.filter((p) => p.direct)
const closed = direct.filter((p) => p.status === 'Closed').length
const inProgress = direct.filter((p) => p.status === 'In Progress').length
const open = direct.filter((p) => p.status === 'Open').length
const totalWeighted = securityData.scoreFactors.reduce((s, f) => s + Number(f.points), 0)
const contractApplicable = securityData.contractControls.filter((c) => c.status !== 'N/A')
const contractMet = contractApplicable.filter((c) => c.status === 'Yes').length
const vendorRisk = securityData.vendorEvaluation.find((v) => v.item === 'Overall Vendor Risk Rating')?.result ?? ''
const vendorCriticality = securityData.vendorProfile.find((v) => v.field === 'Vendor Criticality Rating')?.value ?? ''
const trustAvg = securityData.trust.reduce((s, t) => s + Number(t.rating), 0) / securityData.trust.length

function fnStats(fn: Fn) {
  const rows = procs.filter((p) => p.fn === fn)
  const d = rows.filter((p) => p.direct)
  return {
    direct: d.length,
    closed: d.filter((p) => p.status === 'Closed').length,
    inProgress: d.filter((p) => p.status === 'In Progress').length,
    enterprise: rows.length - d.length,
    na: securityData.functionNotApplicable[fn],
  }
}

// ── Small pieces ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: typeof CheckCircle2; label: string }> = {
    Closed: { cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: CheckCircle2, label: 'Closed' },
    Yes: { cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: CheckCircle2, label: 'Implemented' },
    Approved: { cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: CheckCircle2, label: 'Approved' },
    'In Progress': { cls: 'bg-amber-50 text-amber-800 ring-amber-200', icon: Clock, label: 'In progress' },
    Enterprise: { cls: 'bg-slate-100 text-slate-700 ring-slate-200', icon: Building2, label: 'Enterprise program' },
    'N/A': { cls: 'bg-slate-50 text-slate-500 ring-slate-200', icon: MinusCircle, label: 'Not applicable' },
  }
  const s = map[status] ?? map['N/A']
  const Icon = s.icon
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${s.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {s.label}
    </span>
  )
}

function Section({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <div className="text-xs font-semibold uppercase tracking-wider text-brand-500">{eyebrow}</div>
      <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">{title}</h2>
      {intro && <p className="mt-1 max-w-3xl text-sm text-slate-500">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

// ── 1. Posture ──────────────────────────────────────────────────────────────

function Posture() {
  const tiles = [
    { icon: Target, value: 'Tier 3', unit: 'Risk tier (Low)', label: `Weighted risk score ${totalWeighted} of 100` },
    { icon: BadgeCheck, value: `${Math.round((closed / direct.length) * 100)}%`, unit: 'Conformance', label: `${closed} of ${direct.length} directly applicable processes closed` },
    { icon: Clock, value: String(inProgress), unit: 'In progress', label: `${open} open (not started)` },
    { icon: Handshake, value: `${contractMet}/${contractApplicable.length}`, unit: 'Contract controls', label: 'In the Microsoft agreements' },
    { icon: Building2, value: vendorRisk, unit: 'Vendor risk', label: `Vendor criticality: ${vendorCriticality}` },
    { icon: FileLock2, value: 'None', unit: 'PHI in scope', label: `${securityData.dataElements.length} confidential data elements, none leave the tenant` },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map(({ icon: Icon, value, unit, label }) => (
        <Card key={unit} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{unit}</span>
            <Icon className="h-4 w-4 text-brand-500" />
          </div>
          <div className="mt-2 font-display text-3xl font-semibold text-slate-900">{value}</div>
          <p className="mt-1 text-xs text-slate-500">{label}</p>
        </Card>
      ))}
    </div>
  )
}

// ── 2. CSF wheel + process table ────────────────────────────────────────────

const CX = 170, CY = 170, R_OUT = 160, R_IN = 82, R_CORE = 74

function arcPath(a0: number, a1: number) {
  const p = (r: number, a: number) => [CX + r * Math.cos(a), CY + r * Math.sin(a)]
  const [x0, y0] = p(R_OUT, a0), [x1, y1] = p(R_OUT, a1), [x2, y2] = p(R_IN, a1), [x3, y3] = p(R_IN, a0)
  return `M ${x0} ${y0} A ${R_OUT} ${R_OUT} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${R_IN} ${R_IN} 0 0 0 ${x3} ${y3} Z`
}

function Wheel({ selected, onSelect }: { selected: Fn | null; onSelect: (f: Fn | null) => void }) {
  const step = (2 * Math.PI) / RING.length
  const gap = 0.02
  return (
    <svg viewBox="0 0 340 340" className="mx-auto w-full max-w-[340px]" role="img" aria-label="NIST CSF 2.0 functions">
      {RING.map((fn, i) => {
        const a0 = -Math.PI / 2 - step / 2 + i * step + gap
        const a1 = a0 + step - 2 * gap
        const mid = (a0 + a1) / 2
        const lx = CX + ((R_OUT + R_IN) / 2) * Math.cos(mid)
        const ly = CY + ((R_OUT + R_IN) / 2) * Math.sin(mid)
        const s = fnStats(fn)
        const active = selected === fn
        return (
          <g key={fn} onClick={() => onSelect(active ? null : fn)} className="cursor-pointer">
            <title>{`${TITLE[fn]}: ${s.direct} direct, ${s.enterprise} enterprise program, ${s.na} not applicable`}</title>
            <path d={arcPath(a0, a1)} fill={active ? '#0079cf' : '#f1f5f9'} stroke="#ffffff" strokeWidth={2} className="transition-colors hover:fill-brand-100" style={active ? { fill: '#0079cf' } : undefined} />
            <text x={lx} y={ly - 4} textAnchor="middle" fontSize={14} fontWeight={700} fill={active ? '#ffffff' : '#1e293b'} pointerEvents="none">{TITLE[fn]}</text>
            <text x={lx} y={ly + 13} textAnchor="middle" fontSize={11} fill={active ? '#e8f2fb' : '#64748b'} pointerEvents="none">{s.direct} direct</text>
          </g>
        )
      })}
      <g onClick={() => onSelect(selected === 'GOVERN' ? null : 'GOVERN')} className="cursor-pointer">
        <title>{`Govern: ${fnStats('GOVERN').direct} direct, ${fnStats('GOVERN').enterprise} enterprise program`}</title>
        <circle cx={CX} cy={CY} r={R_CORE} fill={selected === 'GOVERN' ? '#0079cf' : '#ffffff'} stroke={selected === 'GOVERN' ? '#0079cf' : '#cbd5e1'} strokeWidth={2} className="transition-colors hover:fill-brand-50" style={selected === 'GOVERN' ? { fill: '#0079cf' } : undefined} />
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={16} fontWeight={700} fill={selected === 'GOVERN' ? '#ffffff' : '#1e293b'} pointerEvents="none">Govern</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize={11} fill={selected === 'GOVERN' ? '#e8f2fb' : '#64748b'} pointerEvents="none">{fnStats('GOVERN').direct} direct</text>
      </g>
    </svg>
  )
}

function FunctionSummary({ fn }: { fn: Fn | null }) {
  const s = fn ? fnStats(fn) : {
    direct: direct.length, closed, inProgress, enterprise: procs.length - direct.length,
    na: Object.values(securityData.functionNotApplicable).reduce((a, b) => a + b, 0),
  }
  const total = s.direct + s.enterprise + s.na
  const segs = [
    { key: 'Closed', n: s.closed, cls: 'bg-emerald-500', label: 'Closed' },
    { key: 'In Progress', n: s.inProgress, cls: 'bg-amber-400', label: 'In progress' },
    { key: 'Enterprise', n: s.enterprise, cls: 'bg-slate-400', label: 'Enterprise program' },
    { key: 'N/A', n: s.na, cls: 'bg-slate-200', label: 'Not applicable' },
  ]
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{fn ? 'Function' : 'All six functions'}</div>
      <h3 className="mt-1 text-xl font-semibold text-slate-900">{fn ? TITLE[fn] : 'CPRM process model'}</h3>
      <p className="mt-1 text-sm text-slate-500">
        {fn ? securityData.functionDescriptions[fn] : `${total} processes reviewed against this system across Govern, Identify, Protect, Detect, Respond and Recover.`}
      </p>
      <div className="mt-5 flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold text-slate-900">{s.direct ? `${Math.round((s.closed / s.direct) * 100)}%` : 'n/a'}</span>
        <span className="text-sm text-slate-500">{s.direct ? `of ${s.direct} directly applicable processes closed` : 'no processes apply directly; covered by the enterprise program'}</span>
      </div>
      <div className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Process status breakdown">
        {segs.filter((g) => g.n > 0).map((g) => (
          <div key={g.key} className={g.cls} style={{ width: `${(g.n / total) * 100}%` }} title={`${g.label}: ${g.n}`} />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {segs.map((g) => (
          <div key={g.key} className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${g.cls}`} />
            <dt className="text-slate-600">{g.label}</dt>
            <dd className="ml-auto font-semibold text-slate-900">{g.n}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-slate-400">Select a function on the wheel to filter the processes below. Select it again to show all.</p>
    </div>
  )
}

type Filter = 'all' | 'direct' | 'progress' | 'enterprise'

function ProcessTable({ fn }: { fn: Fn | null }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [openRow, setOpenRow] = useState<string | null>(null)
  const base = fn ? procs.filter((p) => p.fn === fn) : procs
  const rows = base.filter((p: Process) =>
    filter === 'all' ? true : filter === 'direct' ? p.direct : filter === 'progress' ? p.status === 'In Progress' : !p.direct)
  const chips: { key: Filter; label: string; n: number }[] = [
    { key: 'all', label: 'All', n: base.length },
    { key: 'direct', label: 'Applies directly', n: base.filter((p) => p.direct).length },
    { key: 'progress', label: 'In progress', n: base.filter((p) => p.status === 'In Progress').length },
    { key: 'enterprise', label: 'Enterprise program', n: base.filter((p) => !p.direct).length },
  ]
  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
        <span className="mr-1 text-sm font-semibold text-slate-700">{fn ? TITLE[fn] : 'All functions'}</span>
        {chips.map((c) => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === c.key ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {c.label} <span className="opacity-70">{c.n}</span>
          </button>
        ))}
      </div>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {!fn && <th className="px-4 py-2.5">Function</th>}
              <th className="px-4 py-2.5">Process</th>
              <th className="px-4 py-2.5">What is checked</th>
              <th className="px-4 py-2.5">Current state</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const key = `${p.fn}-${p.ref}-${p.name}`
              const isOpen = openRow === key
              return (
                <tr key={key} onClick={() => setOpenRow(isOpen ? null : key)} className="cursor-pointer border-t border-slate-100 align-top hover:bg-slate-50/70">
                  {!fn && <td className="px-4 py-3 text-xs font-semibold text-slate-500">{TITLE[p.fn as Fn]}</td>}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1.5 font-medium text-slate-800">
                      <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} /> {p.name}
                    </div>
                    <div className="ml-5.5 font-mono text-xs text-slate-400">{p.ref}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.check}
                    {isOpen && <p className="mt-2 rounded-lg bg-brand-50/60 p-2 text-xs text-brand-900"><span className="font-semibold">Why it matters: </span>{p.why}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.current}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── 3. Risk register + score ────────────────────────────────────────────────

function RiskRegister() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {securityData.risks.map((r, i) => (
        <Card key={r.risk}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 font-mono text-xs font-semibold text-white">R{i + 1}</span>
              <h3 className="pt-1 text-base font-semibold text-slate-900">{r.risk}</h3>
            </div>
            <StatusBadge status={r.status} />
          </div>
          <p className="mt-3 text-sm text-slate-600">{r.mitigation}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
            <div><dt className="text-xs text-slate-400">Owner</dt><dd className="font-medium text-slate-800">{r.owner}</dd></div>
            <div><dt className="text-xs text-slate-400">Target</dt><dd className="font-medium text-slate-800">{r.target}</dd></div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.refs.split(';').map((ref) => (
              <span key={ref} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{ref.trim()}</span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function ScoreBuild() {
  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">How the risk score is built</h3>
          <p className="mt-1 text-sm text-slate-500">Five factors scored 1 to 5 and weighted. Weighted points = score x weight x 20. Segments follow the table order below.</p>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-semibold text-slate-900">{totalWeighted}<span className="text-base text-slate-400"> / 100</span></div>
          <div className="text-xs font-semibold text-emerald-700">Tier 3 (Low), below 40</div>
        </div>
      </div>

      {/* 0 to 100 scale with tier bands */}
      <div className="mt-6">
        <div className="relative h-8">
          <div className="absolute inset-0 flex overflow-hidden rounded-lg">
            <div className="h-full bg-slate-50" style={{ width: '40%' }} />
            <div className="h-full bg-slate-100" style={{ width: '30%' }} />
            <div className="h-full bg-slate-200" style={{ width: '30%' }} />
          </div>
          <div className="absolute inset-x-0 inset-y-1 flex gap-0.5 px-0.5">
            {securityData.scoreFactors.map((f) => (
              <div key={f.factor} className="grid h-full shrink-0 place-items-center rounded bg-brand-500 text-[11px] font-semibold text-white" style={{ width: `${Number(f.points)}%` }} title={`${f.factor}: ${f.points} points`}>{f.points}</div>
            ))}
          </div>
        </div>
        <div className="relative mt-1 h-4 text-[11px] text-slate-500">
          <span className="absolute left-0">0</span>
          <span className="absolute -translate-x-1/2" style={{ left: '40%' }}>40</span>
          <span className="absolute -translate-x-1/2" style={{ left: '70%' }}>70</span>
          <span className="absolute right-0">100</span>
        </div>
        <div className="mt-1 grid grid-cols-[40fr_30fr_30fr] text-center text-[11px] font-medium text-slate-500">
          <span>Tier 3 (Low)</span><span>Tier 2</span><span>Tier 1</span>
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr className="border-b border-slate-200">
            <th className="py-2 pr-4">Factor</th><th className="py-2 pr-4">Score</th><th className="py-2 pr-4">Weight</th><th className="py-2 pr-4">Points</th><th className="hidden py-2 md:table-cell">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {securityData.scoreFactors.map((f) => (
            <tr key={f.factor} className="border-b border-slate-100 align-top">
              <td className="py-2.5 pr-4 font-medium text-slate-800">{f.factor}</td>
              <td className="py-2.5 pr-4 text-slate-700">{f.score} / 5</td>
              <td className="py-2.5 pr-4 text-slate-700">{Math.round(Number(f.weight) * 100)}%</td>
              <td className="py-2.5 pr-4 font-semibold text-slate-900">{f.points}</td>
              <td className="hidden py-2.5 text-slate-500 md:table-cell">{f.rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

// ── 4. Framework crosswalk ──────────────────────────────────────────────────

const FRAMEWORKS: { key: string; label: string; groupLabel: string; rows: ControlRow[] }[] = [
  { key: 'hipaa', label: 'HIPAA Security Rule', groupLabel: 'Safeguard', rows: securityData.hipaa },
  { key: 'nist', label: 'NIST SP 800-53', groupLabel: 'Control family', rows: securityData.nist80053 },
  { key: 'hitrust', label: 'HITRUST CSF', groupLabel: 'Domain', rows: securityData.hitrust },
  { key: 'ai', label: 'AI-specific (OWASP LLM)', groupLabel: 'AI control', rows: securityData.aiControls as ControlRow[] },
]

function Crosswalk() {
  const [tab, setTab] = useState(FRAMEWORKS[0].key)
  const fw = FRAMEWORKS.find((f) => f.key === tab)!
  const implemented = fw.rows.filter((r) => r.status === 'Yes').length
  return (
    <Card className="p-0">
      <div className="flex flex-wrap gap-1 border-b border-slate-100 px-3 pt-3">
        {FRAMEWORKS.map((f) => {
          const n = f.rows.filter((r) => r.status === 'Yes').length
          return (
            <button key={f.key} onClick={() => setTab(f.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${tab === f.key ? 'border-brand-500 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {f.label} <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{n}/{f.rows.length}</span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2 px-4 pt-4 text-sm text-slate-600">
        <ShieldCheck className="h-4 w-4 text-brand-500" />
        {implemented} of {fw.rows.length} implemented{fw.rows.length > implemented ? `, ${fw.rows.length - implemented} in progress` : ''}. Each control is traced to the NIST reference it satisfies.
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-4">{fw.groupLabel}</th><th className="py-2 pr-4">Control</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Evidence</th><th className="py-2">NIST mapping</th>
            </tr>
          </thead>
          <tbody>
            {fw.rows.map((r) => (
              <tr key={`${r.group}-${r.control}`} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 font-medium text-slate-800">{r.group}</td>
                <td className="py-3 pr-4 font-mono text-xs text-slate-600">{r.control}</td>
                <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                <td className="py-3 pr-4 text-slate-600">
                  {r.evidence}
                  {r.sustain && <p className="mt-1.5 text-xs text-slate-500"><span className="font-semibold text-slate-600">Sustainment: </span>{r.sustain}</p>}
                </td>
                <td className="py-3 text-xs text-slate-500">{r.refs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── 5. Vendor, data, trust ──────────────────────────────────────────────────

function VendorCard() {
  const certs = ['SOC 2 Type II', 'HITRUST', 'ISO 27001', 'HIPAA BAA', 'Data Processing Addendum']
  const [showAll, setShowAll] = useState(false)
  const list = showAll ? contractApplicable : contractApplicable.slice(0, 6)
  return (
    <Card>
      <div className="flex items-center gap-2"><Handshake className="h-5 w-5 text-brand-500" /><h3 className="text-base font-semibold text-slate-900">Third-party assurance: Microsoft</h3></div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {certs.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <BadgeCheck className="h-3.5 w-3.5" /> {c}
          </span>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {securityData.vendorEvaluation.filter((v) => v.item !== 'Assessed By').map((v) => (
          <div key={v.item}><dt className="text-xs text-slate-400">{v.item}</dt><dd className="font-medium text-slate-800">{v.result}</dd></div>
        ))}
        <div><dt className="text-xs text-slate-400">Vendor criticality</dt><dd className="font-medium text-slate-800">{vendorCriticality}</dd></div>
      </dl>
      <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Contract controls ({contractMet} of {contractApplicable.length})</h4>
      <ul className="mt-2 space-y-1.5">
        {list.map((c) => (
          <li key={c.control} className="flex items-start gap-2 text-sm text-slate-700" title={c.evidence}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {c.control}
          </li>
        ))}
      </ul>
      <button onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs font-semibold text-brand-500 hover:underline">
        {showAll ? 'Show fewer' : `Show all ${contractApplicable.length}`}
      </button>
    </Card>
  )
}

function DataCard() {
  return (
    <Card>
      <div className="flex items-center gap-2"><FileLock2 className="h-5 w-5 text-brand-500" /><h3 className="text-base font-semibold text-slate-900">Data protection</h3></div>
      <p className="mt-2 text-sm text-slate-500">No PHI or member personal information is processed. Copilot reads the Z: legal drive only and does not keep a separate copy.</p>
      <div className="mt-4 space-y-3">
        {securityData.dataElements.map((d) => (
          <div key={d.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">{d.name}</span>
              <span className="font-mono text-xs text-slate-400">{d.id}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">{d.classification}</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">Sensitivity: {d.sensitivity}</span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-800">Leaves tenant: {d.leaves.split('.')[0]}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{d.flow}. Access: {d.access}.</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
        {['TLS 1.3 in transit', 'Encryption at rest', 'FIDO2 MFA and RBAC', 'Purview audit logs, 7 years'].map((c) => (
          <span key={c} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {c}</span>
        ))}
      </div>
    </Card>
  )
}

function TrustCard() {
  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2"><Layers className="h-5 w-5 text-brand-500" /><h3 className="text-base font-semibold text-slate-900">NIST AI RMF trustworthy characteristics</h3></div>
        <div className="text-sm text-slate-500">Average <span className="font-semibold text-slate-900">{trustAvg.toFixed(2)}</span> of 5</div>
      </div>
      <p className="mt-1 text-sm text-slate-500">Rated 1 to 5. A rating of 3 or above means the characteristic is adequately managed for a Tier 3 system.</p>
      <div className="mt-5 space-y-3">
        {securityData.trust.map((t) => (
          <div key={t.name} className="grid grid-cols-[minmax(0,200px)_1fr_28px] items-center gap-3" title={t.note}>
            <span className="text-sm text-slate-700">{t.name}</span>
            <div className="relative h-2.5 rounded-full bg-slate-100">
              <div className="absolute inset-y-0 left-0 rounded-full bg-brand-500" style={{ width: `${(Number(t.rating) / 5) * 100}%` }} />
              <div className="absolute -inset-y-1 w-0.5 bg-slate-500" style={{ left: '60%' }} />
            </div>
            <span className="text-right text-sm font-semibold text-slate-900">{t.rating}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <span className="h-3 w-0.5 bg-slate-500" /> Adequately managed threshold (3)
      </div>
    </Card>
  )
}

// ── 6. Approval trail ───────────────────────────────────────────────────────

function Approvals() {
  const list = [...securityData.approvals].sort((a, b) => a.date.localeCompare(b.date))
  return (
    <ol className="grid gap-4 md:grid-cols-5">
      {list.map((a) => (
        <li key={a.role} className="relative">
          <Card className="h-full p-4">
            <Stamp className="h-5 w-5 text-brand-500" />
            <div className="mt-2 text-sm font-semibold text-slate-900">{a.role}</div>
            <div className="mt-0.5 text-xs text-slate-500">{a.by}</div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-500">{a.date}</span>
              <StatusBadge status={a.status} />
            </div>
          </Card>
        </li>
      ))}
    </ol>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

const NAV = [
  { id: 'posture', label: 'Posture' },
  { id: 'functions', label: 'CSF functions' },
  { id: 'risks', label: 'Risks' },
  { id: 'frameworks', label: 'Frameworks' },
  { id: 'assurance', label: 'Assurance' },
  { id: 'approvals', label: 'Approvals' },
]

export function LegalSecurity() {
  const [fn, setFn] = useState<Fn | null>(null)
  const frameworksLine = useMemo(() => ['NIST CSF 2.0', 'NIST AI RMF', 'NIST SP 800-53', 'NIST RMF', 'HIPAA Security Rule', 'HITRUST CSF', 'OWASP LLM'], [])
  return (
    <LegalLayout>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl font-semibold text-slate-900">Security and Governance</h1>
          <p className="mt-2 text-slate-500">
            How Microsoft Copilot for the Legal Department is assessed, controlled and approved under the BCBSVT
            Cybersecurity and Privacy Risk Management (CPRM) process model.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {frameworksLine.map((f) => (
              <span key={f} className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600">{f}</span>
            ))}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-xs text-slate-400">Assessment</dt><dd className="font-mono text-slate-700">CPRM-001-20260922</dd></div>
          <div><dt className="text-xs text-slate-400">Assessed</dt><dd className="text-slate-700">2026-09-22</dd></div>
          <div><dt className="text-xs text-slate-400">Deployment target</dt><dd className="text-slate-700">2026-10-16</dd></div>
          <div><dt className="text-xs text-slate-400">Status</dt><dd className="flex items-center gap-1 text-slate-700"><CircleDashed className="h-3.5 w-3.5 text-amber-600" /> Approved for pilot</dd></div>
        </dl>
      </div>

      <nav className="sticky top-0 z-20 -mx-6 mt-6 flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/95 px-6 py-2 backdrop-blur">
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900">{n.label}</a>
        ))}
      </nav>

      <Section id="posture" eyebrow="01" title="Security posture at a glance">
        <Posture />
      </Section>

      <Section id="functions" eyebrow="02" title="Coverage across the NIST CSF 2.0 functions"
        intro="Every CPRM process was reviewed against this system. Processes either apply directly and are evidenced for Copilot, are already met by the BCBSVT enterprise security and privacy program, or do not apply because there is no PHI, no member contact, no hardware and no software built in-house.">
        <div className="grid items-center gap-8 lg:grid-cols-[360px_1fr]">
          <Wheel selected={fn} onSelect={setFn} />
          <Card><FunctionSummary fn={fn} /></Card>
        </div>
        <div className="mt-6"><ProcessTable key={fn ?? 'all'} fn={fn} /></div>
      </Section>

      <Section id="risks" eyebrow="03" title="Risk register and risk tier"
        intro="The four risks identified for this system, each with its mitigation, accountable owner and the controls that address it.">
        <RiskRegister />
        <div className="mt-6"><ScoreBuild /></div>
      </Section>

      <Section id="frameworks" eyebrow="04" title="Framework crosswalk"
        intro="Controls assessed against HIPAA, NIST SP 800-53, HITRUST CSF and AI-specific threats, each traced to the CPRM process and NIST reference it satisfies.">
        <Crosswalk />
      </Section>

      <Section id="assurance" eyebrow="05" title="Vendor, data and trust">
        <div className="grid gap-6 lg:grid-cols-2">
          <VendorCard />
          <DataCard />
        </div>
        <div className="mt-6"><TrustCard /></div>
      </Section>

      <Section id="approvals" eyebrow="06" title="Approval trail"
        intro="Formal sign-offs recorded before the pilot started. Annual recertification applies, and any change in scope triggers a new intake.">
        <Approvals />
      </Section>

      <p className="mt-10 text-xs text-slate-400">
        Source: CPRM assessment CPRM-001-20260922 and AI intake INT-001-20260827 for Microsoft Copilot (BeccaBot).
      </p>
    </LegalLayout>
  )
}
