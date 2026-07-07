import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { CrisisBanner } from './CrisisBanner'
import { IS_MOCK } from '../services/api'

export interface NavItem { to: string; label: string; icon?: ReactNode }

// Portal shell: sticky top bar + persistent 988 banner + optional side nav.
// Used by both the patient and clinician portals (careatlas PatientShell pattern).
export function PortalShell({ portal, user, nav, sidebarExtra, onSignOut, children }: {
  portal: 'Patient' | 'Clinician' | 'Governance'
  user?: string
  nav?: NavItem[]
  sidebarExtra?: ReactNode
  onSignOut?: () => void
  children: ReactNode
}) {
  const [remaining, setRemaining] = useState(30 * 60)
  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const low = remaining <= 5 * 60

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">B</span>
            <span className="font-display text-lg font-semibold text-slate-800">BHUC Care</span>
            <span className="ml-2 hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 sm:inline">{portal} Portal</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {IS_MOCK && <span className="hidden rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 sm:inline">Demo data</span>}
            <span className={`hidden rounded-full px-2 py-0.5 text-xs sm:inline ${low ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`} title="Session timeout">
              {mm}:{ss}
            </span>
            {user && <span className="hidden text-slate-600 sm:inline">{user}</span>}
            {onSignOut && (
              <button onClick={onSignOut} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            )}
          </div>
        </div>
        <CrisisBanner />
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6 sm:px-6">
        {(nav || sidebarExtra) && (
          <nav className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-28 space-y-4">
              {nav && (
                <ul className="space-y-1">
                  {nav.map((n) => (
                    <li key={n.to}>
                      <NavLink to={n.to} end
                        className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-teal-50 font-semibold text-teal-800' : 'text-slate-600 hover:bg-slate-100'}`}>
                        {n.icon}{n.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
              {sidebarExtra}
            </div>
          </nav>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

// Page header used inside the shell.
export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-900">{title}</h1>
        {intro && <p className="mt-1 max-w-2xl text-sm text-slate-500">{intro}</p>}
      </div>
      {actions}
    </div>
  )
}

// Supervised / human-in-the-loop banner (plan HITL gates, C4/C5/C6).
export function HumanInLoopNote({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
