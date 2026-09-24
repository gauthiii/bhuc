import { Info } from 'lucide-react'

// Shared pieces for the two Prove screens (deck slides 13 and 14).

export function ProveHeader({ n, title, product, req, control, impl, evidence }: {
  n: number; title: string; product: string; req: string; control: string; impl: string; evidence: string
}) {
  return (
    <div>
      <p className="text-xs font-bold tracking-widest text-brand-500 uppercase">Prove · Live demo {n} · On screen: {product}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-slate-900">{title}</h1>
      <div className="mt-4 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-4">
        {[['Requirement', req], ['Control', control], ['Implementation', impl], ['Evidence', evidence]].map(([k, v], i) => (
          <div key={k} className={`relative p-4 ${i > 0 ? 'border-t border-slate-100 sm:border-t-0 sm:border-l' : ''}`}>
            <div className="text-[11px] font-bold tracking-wider text-brand-600 uppercase">{k}</div>
            <div className="mt-1 text-sm font-medium text-slate-800">{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DemoNote() {
  return (
    <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
      <Info className="h-4 w-4 shrink-0" />
      Simulated for the demonstration. Accounts, devices and log entries are fictitious; with a live tenant, show the same
      scenario in the admin center and use this screen as the map.
    </p>
  )
}
