import { useEffect, useState } from 'react'
import { ExternalLink, Boxes, ShieldCheck, CircleDot } from 'lucide-react'
import { GovernanceShell } from '../../components/portals'
import { Panel, StatusBadge, Spinner, ErrorState, EmptyState, type Tone } from '../../components/ui'
import { api } from '../../services/api'
import type { AIAssetSummary, AIAssetRow } from '../../lib/types'

// AI Control Tower — Managed / Unmanaged assets live here (this page mirrors that inventory).
const AICT_HOME = 'https://ven04690.service-now.com/now/ai-control-tower/home'

function Tile({ label, value, hint, tone = 'neutral' }: { label: string; value: string | number; hint?: string; tone?: 'neutral' | 'good' | 'warn' }) {
  const color = tone === 'warn' ? 'text-amber-700' : tone === 'good' ? 'text-teal-700' : 'text-slate-800'
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

// Risk classification → tone. AICT choice values: Low / Medium / High / To be determined.
function RiskBadge({ risk }: { risk: string }) {
  const r = risk.toLowerCase()
  const tone: Tone = r.includes('high') ? 'danger' : r.includes('medium') ? 'warning' : r.includes('low') ? 'success' : 'neutral'
  return <StatusBadge tone={tone}>{risk}</StatusBadge>
}

function AssetTable({ rows }: { rows: AIAssetRow[] }) {
  if (rows.length === 0) return <EmptyState title="No assets in this state." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-3 font-medium">Agent</th>
            <th className="py-2 pr-3 font-medium">Type</th>
            <th className="py-2 pr-3 font-medium">Built by</th>
            <th className="py-2 pr-3 font-medium">Lifecycle state</th>
            <th className="py-2 font-medium">Risk classification</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-slate-50 align-middle">
              <td className="py-2.5 pr-3 font-medium text-slate-800">{r.name}</td>
              <td className="py-2.5 pr-3"><StatusBadge tone="neutral">{r.type}</StatusBadge></td>
              <td className="py-2.5 pr-3 text-slate-600">{r.builtBy}</td>
              <td className="py-2.5 pr-3 text-slate-700">{r.lifecycle}</td>
              <td className="py-2.5"><RiskBadge risk={r.risk} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function GovernanceAIAssets() {
  const [data, setData] = useState<AIAssetSummary | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    api.getAIAssets()
      .then((d) => { if (alive) { setData(d); setPhase('ready') } })
      .catch(() => { if (alive) setPhase('error') })
    return () => { alive = false }
  }, [])

  const bhucManaged = data?.bhuc.managed.length ?? 0
  const bhucTotal = bhucManaged + (data?.bhuc.unmanaged.length ?? 0)

  return (
    <GovernanceShell
      title="AI Asset Management"
      intro="The BHUC agents in the AI Control Tower's AI Asset Inventory, split into Managed and Unmanaged assets — with who built each agent, its lifecycle state, and its risk classification. Live from the AICT tables; instance-wide totals shown for context."
    >
      {phase === 'loading' && <Spinner label="Loading the AI asset inventory…" />}
      {phase === 'error' && <ErrorState message="Couldn't load the AI asset inventory." onRetry={() => window.location.reload()} />}

      {phase === 'ready' && data && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <a href={AICT_HOME} target="_blank" rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              <ShieldCheck className="h-3.5 w-3.5" /> Open AI Control Tower <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
            <StatusBadge tone="info">{bhucTotal} BHUC agents</StatusBadge>
          </div>

          {/* Instance-wide + BHUC totals */}
          <Panel title="Inventory summary" subtitle="AI Control Tower · AI Asset Inventory (live)">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Tile label="AI systems (instance)" value={data.instance.totalSystems} hint="all assets in the tower" />
              <Tile label="Managed (instance)" value={data.instance.managed} tone="good" />
              <Tile label="Unmanaged (instance)" value={data.instance.unmanaged} />
              <Tile label="BHUC · Managed" value={bhucManaged} tone="good" hint={`of ${bhucTotal} agents`} />
              <Tile label="BHUC · Unmanaged" value={data.bhuc.unmanaged.length} tone={data.bhuc.unmanaged.length > 0 ? 'warn' : 'neutral'} />
            </div>
          </Panel>

          {/* Managed */}
          <Panel
            title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-700" /> Managed AI Assets</span>}
            subtitle="Under AICT governance — lifecycle, risk, value, security & privacy apply"
            actions={<StatusBadge tone="success">{data.bhuc.managed.length}</StatusBadge>}
          >
            <AssetTable rows={data.bhuc.managed} />
          </Panel>

          {/* Unmanaged */}
          <Panel
            title={<span className="flex items-center gap-2"><CircleDot className="h-4 w-4 text-slate-400" /> Unmanaged AI Assets</span>}
            subtitle="In the inventory but not yet marked managed by an AI steward"
            actions={<StatusBadge tone="neutral">{data.bhuc.unmanaged.length}</StatusBadge>}
          >
            <AssetTable rows={data.bhuc.unmanaged} />
          </Panel>

          <p className="px-1 text-xs text-slate-400">
            Source: <code className="rounded bg-slate-100 px-1">alm_ai_system_digital_asset</code> joined to{' '}
            <code className="rounded bg-slate-100 px-1">sn_ai_governance_asset_governance_details</code> (managed flag,
            lifecycle phase, risk classification). Only AI stewards move assets between Managed and Unmanaged, in the AI Control Tower.
          </p>
        </div>
      )}
    </GovernanceShell>
  )
}
