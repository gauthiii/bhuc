import { Phone, MessageSquare } from 'lucide-react'

// Persistent 988 crisis banner — plan §3.1: appears on EVERY screen, works even
// unauthenticated (no JWT), never dismissible, both controls live.
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
    </div>
  )
}
