import { Link } from 'react-router-dom'
import { ArrowRight, Bot, CheckCircle2, FolderLock, GitCompareArrows, Gavel, Quote, UserCheck, XCircle } from 'lucide-react'
import { LegalLayout } from './Layout'
import { Swimlane } from '../Swimlane'
import { legalCurrentFlow, legalFutureFlow } from '../../../lib/legalCopilotFlows'
import { legalCases } from '../../../lib/legalCopilotDemo'

// /prior/legal: Legal Department research with Microsoft Copilot (BeccaBot).
// Home page: today's manual research flow next to the Copilot-assisted flow, plus the
// workbook's volume and value figures and the four safeguards that keep a person in charge.

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-6 rounded border border-emerald-500 bg-white" /> Person does this step
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-6 rounded border border-dashed border-blue-600 bg-white" /> Copilot does this step
      </span>
    </div>
  )
}

// Figures from the CPRM Sprint 2 workbook, sheets 02 and 03.
const TODAY = [
  { value: '~50', label: 'research requests a month' },
  { value: '1 to 3', label: 'business days per researched answer' },
  { value: '~6', label: 'attorneys doing the research' },
  { value: '$45,000', label: 'a year of attorney time on manual research' },
]

const TARGET = [
  { value: '2 hrs', label: 'saved per attorney each week' },
  { value: '$15,000', label: 'investment' },
  { value: '$55,000', label: 'expected annual benefit' },
  { value: '$150,000', label: 'net value over three years' },
]

const SAFEGUARDS = [
  { icon: Quote, title: 'Every answer cites its sources', text: 'Copilot links each point to the document on the Z: drive it came from, so the attorney can check it.' },
  { icon: UserCheck, title: 'An attorney reviews every output', text: 'Nothing Copilot produces is relied on until an attorney has checked it. Legal decisions stay with the attorney.' },
  { icon: FolderLock, title: 'Scope stays on the Z: legal drive', text: 'Copilot only reads the Z: drive and only what the attorney can already open. Web search and plugins are off.' },
  { icon: Gavel, title: 'External release needs CLO approval', text: 'Copilot-assisted work product going outside BCBSVT is approved by the Chief Legal Officer first.' },
]

// Points shown beside each flow: today's problems (red) and how the Copilot flow
// answers each one (green), in the same order. Drawn from workbook sheets 01 to 03.
const CURRENT_POINTS = [
  'Hard to find: material is spread across folders on the Z: drive',
  'Hard to reuse: prior memos and templates get missed',
  'Research and drafting are done by hand',
  'Business units wait 1 to 3 business days for an answer',
  'Outside research services add cost',
]

const FUTURE_POINTS = [
  'Copilot searches the Z: drive for the attorney',
  'Prior memos and templates are found and cited in every answer',
  'Copilot summarizes and drafts first; the attorney checks and finalizes',
  'Faster answers to business units',
  'Less spend on outside legal research',
]

function FlowPoints({ title, points, good }: { title: string; points: string[]; good: boolean }) {
  const Icon = good ? CheckCircle2 : XCircle
  return (
    <div className={`rounded-xl border p-4 ${good ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50/60'}`}>
      <h3 className={`text-sm font-semibold ${good ? 'text-emerald-800' : 'text-red-800'}`}>{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${good ? 'text-emerald-600' : 'text-red-600'}`} /> {p}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="font-display text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  )
}

function Figures() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Today</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {TODAY.map((s) => <Stat key={s.label} {...s} />)}
        </div>
      </section>
      <section className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-teal-800">Business case</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {TARGET.map((s) => <Stat key={s.label} {...s} />)}
        </div>
      </section>
    </div>
  )
}

// Case-by-case comparison. Values match the step data in legalCopilotDemo.ts; the
// request arrives on day 1 and the attorney picks it up at the same time in both modes.
interface CompareRow { measure: string; manual: string; copilot: string }

const COMPARISON: { caseId: string; rows: CompareRow[] }[] = [
  {
    caseId: 'vendor-data-return',
    rows: [
      { measure: 'Answer delivered', manual: 'Day 2, 4:30 PM', copilot: 'Day 1, 3:30 PM (same afternoon)' },
      { measure: 'Finding the material', manual: 'Attorney searches folder by folder; 11 files opened', copilot: "Copilot searches the Z: drive within the attorney's permissions" },
      { measure: 'Checking the sources', manual: 'Attorney reads each file found', copilot: 'Attorney verifies 3 Copilot citations' },
      { measure: 'Approval before release', manual: 'None needed (internal use)', copilot: 'None needed (internal use)' },
    ],
  },
  {
    caseId: 'broker-file-retention',
    rows: [
      { measure: 'Answer delivered', manual: 'Day 3, 2:00 PM', copilot: 'Day 2, 10:20 AM' },
      { measure: 'Finding the material', manual: 'Attorney finds the 2019 memo first; the current schedule only after a colleague mentions it; 9 files opened', copilot: 'Copilot returns the 2019 memo; a follow-up search finds the current schedule' },
      { measure: 'Checking the sources', manual: 'Attorney resolves the conflict by hand', copilot: 'Attorney rejects the outdated memo and verifies the current schedule' },
      { measure: 'Approval before release', manual: 'None needed (internal use)', copilot: 'None needed (internal use)' },
    ],
  },
  {
    caseId: 'license-renewal-letter',
    rows: [
      { measure: 'Answer delivered', manual: 'Day 3, 11:30 AM (letter ready)', copilot: 'Day 2, 9:20 AM if approved; 11:00 AM if returned once' },
      { measure: 'Finding the material', manual: 'Agreement filed under the vendor\'s old name; found via the vendor register; 14 files opened', copilot: 'Copilot finds the agreement under the old name' },
      { measure: 'Checking the sources', manual: 'Attorney reads each file found', copilot: 'Attorney verifies 3 Copilot citations' },
      { measure: 'Approval before release', manual: 'Not covered by the workbook', copilot: 'Chief Legal Officer approves release' },
    ],
  },
]

const COMPARISON_TOTAL: CompareRow[] = [
  { measure: 'Answer delivered', manual: 'Day 2 to day 3', copilot: 'Day 1 to day 2' },
  { measure: 'Who searches', manual: 'The attorney, by hand', copilot: 'Copilot, with the attorney checking the results' },
  { measure: 'Who decides', manual: 'The attorney', copilot: 'The attorney; the Chief Legal Officer for external release' },
]

function ComparisonTable() {
  const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide'
  const td = 'px-4 py-3 align-top text-sm'
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] border-collapse">
        <thead className="bg-slate-50">
          <tr>
            <th className={`${th} w-56 text-slate-500`}>Case</th>
            <th className={`${th} w-44 text-slate-500`}>Measure</th>
            <th className={`${th} text-slate-600`}>Manual (today)</th>
            <th className={`${th} text-teal-800`}>With Copilot (future)</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON.map(({ caseId, rows }) => {
            const c = legalCases.find((x) => x.id === caseId)!
            return rows.map((r, i) => (
              <tr key={`${caseId}-${r.measure}`} className={i === 0 ? 'border-t border-slate-200' : ''}>
                {i === 0 && (
                  <td rowSpan={rows.length} className={`${td} border-r border-slate-100`}>
                    <div className="font-mono text-xs text-slate-400">{c.requestId}</div>
                    <div className="mt-0.5 font-semibold text-slate-800">{c.label}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{c.requester.unit} · {c.use} use</div>
                  </td>
                )}
                <td className={`${td} font-medium text-slate-600`}>{r.measure}</td>
                <td className={`${td} text-slate-700`}>{r.manual}</td>
                <td className={`${td} bg-teal-50/40 text-slate-800`}>{r.copilot}</td>
              </tr>
            ))
          })}
          {COMPARISON_TOTAL.map((r, i) => (
            <tr key={`total-${r.measure}`} className={i === 0 ? 'border-t-2 border-slate-300 bg-slate-50' : 'bg-slate-50'}>
              {i === 0 && (
                <td rowSpan={COMPARISON_TOTAL.length} className={`${td} border-r border-slate-100 font-semibold text-slate-800`}>
                  Across all three
                </td>
              )}
              <td className={`${td} font-medium text-slate-600`}>{r.measure}</td>
              <td className={`${td} font-medium text-slate-700`}>{r.manual}</td>
              <td className={`${td} font-medium text-teal-900`}>{r.copilot}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LegalHome() {
  return (
    <LegalLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl font-semibold text-slate-900">
            Legal Research and Work Product with Copilot
          </h1>
          <p className="mt-2 text-slate-500">
            Attorneys answer legal questions from business units using material on the Z: legal drive.
            Compare how that works today with how it works when Copilot finds, summarizes and helps draft,
            and an attorney stays in charge of every answer.
          </p>
        </div>
        <Link to="/prior/legal/simulate" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800">
          Run a case simulation <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Volume and value */}
      <div className="mt-6"><Figures /></div>

      <div className="mt-6"><Legend /></div>

      {/* Current state */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <GitCompareArrows className="h-3.5 w-3.5" /> Current state
          </span>
          <h2 className="text-lg font-semibold text-slate-800">Manual legal research</h2>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 [&_svg]:h-auto [&_svg]:min-w-0 [&_svg]:max-w-full">
            <Swimlane flow={legalCurrentFlow} title="Current state: manual legal research" />
          </div>
          <div className="lg:w-72 lg:shrink-0">
            <FlowPoints title="Problems today" points={CURRENT_POINTS} good={false} />
          </div>
        </div>
      </section>

      {/* Figures repeated next to the future state */}
      <div className="mt-6"><Figures /></div>

      {/* Future state */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
            <Bot className="h-3.5 w-3.5" /> Future state
          </span>
          <h2 className="text-lg font-semibold text-slate-800">Legal research with Copilot</h2>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 [&_svg]:h-auto [&_svg]:min-w-0 [&_svg]:max-w-full">
            <Swimlane flow={legalFutureFlow} title="Future state: legal research with Copilot" />
          </div>
          <div className="lg:w-72 lg:shrink-0">
            <FlowPoints title="How Copilot solves them" points={FUTURE_POINTS} good />
          </div>
        </div>
      </section>

      {/* Safeguards */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-slate-800">What keeps it safe</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SAFEGUARDS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-6 w-6 text-teal-700" />
              <h3 className="mt-2 text-sm font-semibold text-slate-800">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Case comparison */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-slate-800">Case by case: today and with Copilot</h2>
        <p className="mt-1 text-sm text-slate-500">
          The three simulated requests from the case simulation. Each request arrives on day 1 and the attorney
          picks it up at the same time in both modes. Illustrative simulation, fictitious data.
        </p>
        <div className="mt-3"><ComparisonTable /></div>
      </section>

      <p className="mt-6 text-xs text-slate-400">
        Source: Microsoft Copilot (BeccaBot) CPRM Sprint 2 workbook, sheets 01, 02, 03 and 09. Figures are the
        workbook's estimates and targets. Case times are illustrative.
      </p>
    </LegalLayout>
  )
}
