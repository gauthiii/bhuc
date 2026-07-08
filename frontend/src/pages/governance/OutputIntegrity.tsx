import { useEffect, useState } from 'react'
import { ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react'
import { GovernanceShell } from '../../components/portals'
import { Panel, StatusBadge, Spinner, ErrorState } from '../../components/ui'
import { api } from '../../services/api'
import type { OutputIntegritySummary } from '../../lib/types'

// AI Control Tower — where the guardrails, risk statement, and control objective live.
const AICT_HOME = 'https://ven04690.service-now.com/now/ai-control-tower/home'
const AIRC_RISK = 'https://ven04690.service-now.com/now/nav/ui/classic/params/target/sn_risk_risk_list.do'

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

function AictLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener"
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
      {children}<ExternalLink className="h-3.5 w-3.5 text-slate-400" />
    </a>
  )
}

export function GovernanceOutputIntegrity() {
  const [data, setData] = useState<OutputIntegritySummary | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    api.getOutputIntegrity()
      .then((d) => { if (alive) { setData(d); setPhase('ready') } })
      .catch(() => { if (alive) setPhase('error') })
    return () => { alive = false }
  }, [])

  return (
    <GovernanceShell
      title="Output Integrity"
      intro="UC2 monitoring: how each write-back agent's output is faring against the human-in-the-loop controls. Detective metrics here; the preventive gates are enforced server-side (a note can't be signed with unverified lines; a risk can't be confirmed before it's scored)."
    >
      {phase === 'loading' && <Spinner label="Loading output-integrity metrics…" />}
      {phase === 'error' && <ErrorState message="Couldn't load the metrics." onRetry={() => window.location.reload()} />}

      {phase === 'ready' && data && (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <AictLink href={AICT_HOME}><ShieldCheck className="h-3.5 w-3.5" /> Open AI Control Tower</AictLink>
            <AictLink href={AIRC_RISK}>Open AI Risk register (AIRC)</AictLink>
          </div>

          {/* Agent 2 — Risk Identification */}
          <Panel
            title={data.agent2.label}
            subtitle="Agent 2 · risk scoring → clinician confirmation (HITL)"
            actions={data.agent2.disagreeRatePct > 30
              ? <StatusBadge tone="warning" icon={<AlertTriangle className="h-3.5 w-3.5" />}>High disagree rate</StatusBadge>
              : <StatusBadge tone="success">Within range</StatusBadge>}
          >
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Scored" value={data.agent2.total} hint="total screenings" />
              <Tile label="Avg confidence" value={`${data.agent2.avgConfidence}%`} tone={data.agent2.avgConfidence < 70 ? 'warn' : 'good'} />
              <Tile label="Low confidence" value={data.agent2.lowConfidence} hint="< 70%" tone={data.agent2.lowConfidence > 0 ? 'warn' : 'neutral'} />
              <Tile label="Reviewed" value={data.agent2.reviewed} hint={`${data.agent2.pending} pending`} />
              <Tile label="Adjusted / rejected" value={`${data.agent2.adjusted} / ${data.agent2.rejected}`} hint="clinician overrode" />
              <Tile label="Disagree rate" value={`${data.agent2.disagreeRatePct}%`} tone={data.agent2.disagreeRatePct > 30 ? 'warn' : 'good'} hint="of reviewed" />
            </div>
          </Panel>

          {/* Agent 3 — Clinical Documentation */}
          <Panel
            title={data.agent3.label}
            subtitle="Agent 3 · note drafting → grounding + clinician sign (HITL)"
            actions={data.agent3.unsigned > 0
              ? <StatusBadge tone="warning">{data.agent3.unsigned} awaiting sign</StatusBadge>
              : <StatusBadge tone="success">All signed</StatusBadge>}
          >
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Notes drafted" value={data.agent3.total} />
              <Tile label="With unverified" value={data.agent3.withUnverified} hint="AI flagged lines" tone={data.agent3.withUnverified > 0 ? 'warn' : 'neutral'} />
              <Tile label="Unverified rate" value={`${data.agent3.unverifiedRatePct}%`} tone={data.agent3.unverifiedRatePct > 50 ? 'warn' : 'neutral'} />
              <Tile label="Avg flagged / note" value={data.agent3.avgUnverifiedLines} />
              <Tile label="Signed" value={data.agent3.signed} tone="good" hint="human attested" />
              <Tile label="Unsigned" value={data.agent3.unsigned} tone={data.agent3.unsigned > 0 ? 'warn' : 'neutral'} />
            </div>
          </Panel>

          <p className="px-1 text-xs text-slate-400">
            These are detective controls — they measure and surface drift. Harm prevention comes from the
            human-in-the-loop sign/confirm gates, enforced server-side. See output_integrity.md §8.
          </p>
        </div>
      )}
    </GovernanceShell>
  )
}
