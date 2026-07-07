import { Phone, MessageSquare, UserRound, Stethoscope, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

// Persistent 988 crisis banner — plan §3.1: appears on EVERY screen, works even
// unauthenticated (no JWT), never dismissible, both controls live.
// (Dev convenience: Patient/Clinician portal quick-nav on the right — remove later if not needed.)
export function CrisisBanner() {
  return (
    <div role="region" aria-label="Crisis support"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-amber-100 px-4 py-2 text-sm text-amber-900">
      <span className="font-medium">In crisis? Call or text 988 — free, confidential, 24/7.</span>
      <span className="flex items-center gap-2">
        <a href="tel:988" className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2.5 py-1 text-xs font-semibold hover:bg-amber-300">
          <Phone className="h-3.5 w-3.5" /> Call 988
        </a>
        <a href="sms:988" className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2.5 py-1 text-xs font-semibold hover:bg-amber-300">
          <MessageSquare className="h-3.5 w-3.5" /> Text 988
        </a>
      </span>

      {/* Dev quick-nav between the two portals */}
      <span className="mx-1 hidden h-4 w-px bg-amber-300/70 sm:inline-block" aria-hidden="true" />
      <nav aria-label="Portal navigation" className="flex items-center gap-2">
        <Link to="/patient/home" className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-white">
          <UserRound className="h-3.5 w-3.5" /> Patient
        </Link>
        <Link to="/clinician/worklist" className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-white">
          <Stethoscope className="h-3.5 w-3.5" /> Clinician
        </Link>
        <Link to="/governance/agents" className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-white">
          <ShieldCheck className="h-3.5 w-3.5" /> Governance
        </Link>
      </nav>
    </div>
  )
}
