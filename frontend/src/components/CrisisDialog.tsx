import { Phone, MessageSquare, X } from 'lucide-react'
import { Button } from './ui'

// Red crisis alert dialog — plan §3.1 crisis-response convention. Rendered whenever a
// server response returns crisis/escalate/distress. 988 controls first in focus order.
export function CrisisDialog({ open, onClose, onConnect, message }: {
  open: boolean; onClose: () => void; onConnect?: () => void; message?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="alertdialog" aria-modal="true" aria-label="Crisis support">
      <div className="w-full max-w-md rounded-2xl border-2 border-red-300 bg-white p-6 shadow-xl">
        <div className="mb-2 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-red-800">It sounds like you may be in crisis</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-4 text-sm text-slate-700">{message || 'Your safety matters. Please call or text 988 now — free, confidential, 24/7 — or connect with a counselor.'}</p>
        <div className="flex flex-col gap-2">
          <a href="tel:988" className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"><Phone className="h-4 w-4" /> Call 988</a>
          <a href="sms:988" className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50"><MessageSquare className="h-4 w-4" /> Text 988</a>
          {onConnect && <Button variant="secondary" onClick={onConnect}>Connect me to a counselor now</Button>}
        </div>
      </div>
    </div>
  )
}
