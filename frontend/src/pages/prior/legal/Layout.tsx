import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Scale } from 'lucide-react'

// Shared chrome for the /prior/legal demo section: header + section tabs.

const TABS = [
  { to: '/prior/legal', label: 'Overview', end: true },
  { to: '/prior/legal/simulate', label: 'Case Simulation', end: false },
  { to: '/prior/legal/security', label: 'Security & Governance', end: false },
]

export function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-white/90 shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">B</span>
            <span className="ml-2 font-display text-lg font-semibold text-slate-800">BHUC Care</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            <Scale className="h-3.5 w-3.5" /> Legal Research Copilot
          </span>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 px-6">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `border-b-2 px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  )
}
