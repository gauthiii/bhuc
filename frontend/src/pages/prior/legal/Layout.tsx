import { useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Clock, Megaphone, MonitorPlay, X } from 'lucide-react'
import logo from '../../../assets/brand/bcbsvt-logo-white.png'
import { DEMO_STOPS, PHASES, slidesLabel } from '../../../lib/legalGovernance'

// Shared chrome for the /prior/legal demo: BCBSVT header, tabs grouped by framework
// phase (Assess, Control & Implement, Prove, Decide), presenter notes for the current
// screen, and a Previous / Next footer that walks the demo in presentation order.

const NOTES_KEY = 'bcbsvt-presenter-notes'

function readNotesPref() {
  try { return localStorage.getItem(NOTES_KEY) === '1' } catch { return false }
}

function PresenterNotes({ onClose }: { onClose: () => void }) {
  const { pathname } = useLocation()
  const stop = DEMO_STOPS.find((s) => s.to === pathname)
  if (!stop) return null
  return (
    <aside className="fixed right-4 bottom-4 z-40 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-brand-200 bg-white shadow-xl print:hidden">
      <div className="flex items-center justify-between rounded-t-2xl bg-brand-800 px-4 py-2.5 text-white">
        <span className="inline-flex items-center gap-2 text-sm font-semibold"><Megaphone className="h-4 w-4" /> Presenter notes</span>
        <button onClick={onClose} aria-label="Hide presenter notes" className="rounded p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>
      <div className="max-h-[55vh] overflow-y-auto p-4 text-sm">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-800">{stop.phase}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{slidesLabel(stop)}</span>
          {stop.minutes > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600"><Clock className="h-3 w-3" /> ~{stop.minutes} min</span>}
        </div>
        <h3 className="mt-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">Show</h3>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">{stop.show.map((s) => <li key={s}>{s}</li>)}</ul>
        <h3 className="mt-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">Say</h3>
        <ul className="mt-1 space-y-2">{stop.say.map((s) => <li key={s} className="border-l-2 border-brand-300 pl-3 text-slate-700 italic">{s}</li>)}</ul>
      </div>
    </aside>
  )
}

function FlowFooter() {
  const { pathname } = useLocation()
  const i = DEMO_STOPS.findIndex((s) => s.to === pathname)
  if (i < 0) return null
  const prev = DEMO_STOPS[i - 1]
  const next = DEMO_STOPS[i + 1]
  return (
    <nav className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 print:hidden" aria-label="Demo flow">
      {prev ? (
        <Link to={prev.to} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> <span><span className="text-slate-400">{prev.phase} · </span>{prev.label}</span>
        </Link>
      ) : <span />}
      <span className="text-xs text-slate-400">Step {i + 1} of {DEMO_STOPS.length} in the demo flow</span>
      {next ? (
        <Link to={next.to} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600">
          <span><span className="text-brand-100">Next: </span>{next.label}{next.optional ? ' (optional)' : ''}</span> <ArrowRight className="h-4 w-4" />
        </Link>
      ) : <span />}
    </nav>
  )
}

export function LegalLayout({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState(readNotesPref)
  const toggleNotes = (v: boolean) => {
    setNotes(v)
    try { localStorage.setItem(NOTES_KEY, v ? '1' : '0') } catch { /* per-viewer convenience only */ }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand-800 text-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <Link to="/prior/legal" className="flex min-w-0 items-center gap-4" aria-label="Blue Cross and Blue Shield of Vermont, Copilot governance demo home">
            <img src={logo} alt="Blue Cross and Blue Shield of Vermont" className="h-9 w-auto shrink-0" />
            <span className="hidden h-8 w-px bg-white/25 md:block" aria-hidden />
            <span className="hidden min-w-0 leading-tight md:block">
              <span className="block truncate text-sm font-semibold">AI Governance Framework</span>
              <span className="block truncate text-xs text-brand-200">Microsoft Copilot for Legal</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleNotes(!notes)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${notes ? 'bg-white text-brand-800' : 'bg-white/10 text-white hover:bg-white/20'}`}
              aria-pressed={notes}
            >
              <MonitorPlay className="h-3.5 w-3.5" /> Presenter notes
            </button>
            <Link to="/" className="hidden rounded-full px-3 py-1.5 text-xs text-brand-100 hover:bg-white/10 sm:inline">All demos</Link>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white" aria-label="Demo sections">
        <div className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-6">
          {PHASES.map((phase) => (
            <div key={phase} className="shrink-0 pt-2">
              <div className="px-2 text-[10px] font-bold tracking-wider text-brand-500 uppercase">{phase}</div>
              <div className="flex">
                {DEMO_STOPS.filter((s) => s.phase === phase).map((s) => (
                  <NavLink
                    key={s.to}
                    to={s.to}
                    end
                    className={({ isActive }) =>
                      `border-b-2 px-2 pt-1 pb-2 text-sm font-medium whitespace-nowrap transition ${
                        isActive ? 'border-brand-500 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`
                    }
                  >
                    {s.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
        <FlowFooter />
      </main>

      {notes && <PresenterNotes onClose={() => toggleNotes(false)} />}
    </div>
  )
}
