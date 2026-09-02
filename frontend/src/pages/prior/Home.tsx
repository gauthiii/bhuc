import { Link } from 'react-router-dom'
import { Bot, GitCompareArrows, Sparkles, Workflow } from 'lucide-react'
import { Swimlane } from './Swimlane'
import { currentFlow, futureFlow } from '../../lib/priorAuthFlows'

// /prior — frontend-only prior-authorization demo (507/510 kickoff, slides 13-14).
// Home page: side-by-side comparison of the present (manual) and AI-enabled
// future-state process flows for "Track & Evaluate Clinical Utilization".

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-6 rounded border border-emerald-500 bg-white" /> Process step
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-6 rounded border border-dashed border-blue-600 bg-white" /> AI agent step
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-0.5 w-6 rounded bg-emerald-600" /> Approved path
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-0.5 w-6 rounded bg-red-600" /> Rejected path
      </span>
    </div>
  )
}

export function PriorHome() {
  return (
    <div className="min-h-screen">
      <header className="bg-white/90 shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">B</span>
            <span className="ml-2 font-display text-lg font-semibold text-slate-800">BHUC Care</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            <Workflow className="h-3.5 w-3.5" /> Prior Authorization Demo
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl font-semibold text-slate-900">
            Track &amp; Evaluate Clinical Utilization — Prior Authorization
          </h1>
          <p className="mt-2 text-slate-500">
            Compare today's manual prior-authorization process with the AI-enabled future state.
            Illustrative, frontend-only demo — no live data.
          </p>
        </div>

        <div className="mt-6"><Legend /></div>

        {/* Present state */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <GitCompareArrows className="h-3.5 w-3.5" /> Present state
            </span>
            <h2 className="text-lg font-semibold text-slate-800">Manual prior authorization</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Every request is received, verified and reviewed by the payer's clinical team; unresolved
            cases are escalated before a determination is issued.
          </p>
          <div className="mt-4">
            <Swimlane flow={currentFlow} title="Present state — manual prior authorization" />
          </div>
        </section>

        {/* Future state */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
              <Bot className="h-3.5 w-3.5" /> Future state
            </span>
            <h2 className="text-lg font-semibold text-slate-800">AI-enabled prior authorization</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            AI agents triage and approve rule-matching cases in real time; complex or likely-to-deny
            cases are flagged for a human in the loop, and every denial cites exact clinical criteria.
          </p>
          <div className="mt-4">
            <Swimlane flow={futureFlow} title="Future state — AI-enabled prior authorization" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              'Auto-approval for rule-matching cases',
              'Human in the loop for complex / likely-to-deny cases',
              'Plain-language denial letters with exact criteria',
              'Discharge readiness prediction',
              'Bill-code cross-checks',
            ].map((chip) => (
              <span key={chip} className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900">
                <Sparkles className="h-3 w-3" /> {chip}
              </span>
            ))}
          </div>
        </section>

        <p className="mt-6 text-xs text-slate-400">
          Source: 507 &amp; 510 AI Governance and AI Safety kickoff deck, slides 13-14 (illustrative).
        </p>
      </main>
    </div>
  )
}
