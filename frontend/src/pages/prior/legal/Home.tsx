import { Link } from 'react-router-dom'
import { ArrowRight, Bot, FolderLock, GitCompareArrows, Gavel, Quote, UserCheck } from 'lucide-react'
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="font-display text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
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
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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

      <div className="mt-6"><Legend /></div>

      {/* Current state */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <GitCompareArrows className="h-3.5 w-3.5" /> Current state
          </span>
          <h2 className="text-lg font-semibold text-slate-800">Manual legal research</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Material on the Z: drive is hard to find and reuse, research is done by hand, and business units
          wait for answers.
        </p>
        <div className="mt-4">
          <Swimlane flow={legalCurrentFlow} title="Current state: manual legal research" />
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
        <p className="mt-1 text-sm text-slate-500">
          Copilot does the searching, summarizing and first draft. The attorney checks every citation and
          owns the final answer. Work product going outside BCBSVT is approved by the Chief Legal Officer.
        </p>
        <div className="mt-4">
          <Swimlane flow={legalFutureFlow} title="Future state: legal research with Copilot" />
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
