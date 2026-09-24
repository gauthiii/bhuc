import { Link } from 'react-router-dom'
import { ArrowRight, Bot, Briefcase, Building2, CheckCircle2, ChevronRight, FolderLock, GitCompareArrows, Gavel, Quote, UserCheck, XCircle } from 'lucide-react'
import { LegalLayout } from './Layout'
import { Swimlane } from '../Swimlane'
import { legalCurrentFlow, legalFutureFlow } from '../../../lib/legalCopilotFlows'

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

// The use case in three steps, shown under the page title.
const HOW_IT_WORKS = [
  { icon: Building2, title: 'Business unit asks', text: 'A legal question comes in to the Legal Department.', ai: false },
  { icon: Bot, title: 'Copilot finds and summarizes', text: 'Searches the Z: legal drive, cites its sources and helps draft.', ai: true },
  { icon: Briefcase, title: 'Attorney checks and decides', text: 'Verifies every citation and owns the final answer.', ai: false },
]

function HowItWorks() {
  return (
    <ol className="grid gap-3 md:grid-cols-3 md:gap-8">
      {HOW_IT_WORKS.map(({ icon: Icon, title, text, ai }, i) => (
        <li key={title} className="relative">
          <div className={`flex h-full items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm ${ai ? 'border-dashed border-blue-400' : 'border-slate-200'}`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${ai ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-400">Step {i + 1}</div>
              <div className="text-sm font-semibold text-slate-800">{title}</div>
              <p className="mt-0.5 text-sm text-slate-500">{text}</p>
            </div>
          </div>
          {i < HOW_IT_WORKS.length - 1 && (
            <ChevronRight className="absolute top-1/2 -right-7 hidden h-5 w-5 -translate-y-1/2 text-slate-300 md:block" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  )
}

export function LegalHome() {
  return (
    <LegalLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-slate-900">
          Legal Research and Work Product with Copilot
        </h1>
        <Link to="/prior/legal/simulate" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800">
          Run a case simulation <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* How it works */}
      <div className="mt-6"><HowItWorks /></div>

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

      <p className="mt-6 text-xs text-slate-400">
        Source: Microsoft Copilot (BeccaBot) CPRM Sprint 2 workbook, sheets 01, 02, 03 and 09. Figures are the
        workbook's estimates and targets.
      </p>
    </LegalLayout>
  )
}
