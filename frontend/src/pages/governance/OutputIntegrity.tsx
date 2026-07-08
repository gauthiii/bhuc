import { useEffect, useState } from 'react'
import { ExternalLink, ShieldCheck, AlertTriangle, Info, X } from 'lucide-react'
import { GovernanceShell } from '../../components/portals'
import { Panel, StatusBadge, Spinner, ErrorState, Button } from '../../components/ui'
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

// One documented metric: the tile label, its source field(s), and the exact formula.
function Metric({ name, source, formula }: { name: string; source: string; formula: string }) {
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <p className="text-sm font-semibold text-slate-800">{name}</p>
      <p className="mt-1 text-xs text-slate-500"><span className="font-medium text-slate-600">Source:</span> {source}</p>
      <p className="mt-0.5 text-xs text-slate-500"><span className="font-medium text-slate-600">Formula:</span> {formula}</p>
    </div>
  )
}

function DerivationModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Info className="h-5 w-5 text-teal-700" /> How these metrics are derived
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              All figures are computed live by the backend from your ServiceNow records — no fixed
              windows, aggregated over up to 1,000 rows per table.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <section>
            <h3 className="text-sm font-semibold text-slate-800">BHUC Risk Identification Agent (Agent 2)</h3>
            <p className="mt-1 text-xs text-slate-500">
              Query: <code className="rounded bg-slate-100 px-1">u_bhuc_screening</code> rows where{' '}
              <code className="rounded bg-slate-100 px-1">u_scored_by_agent = true</code>, reading{' '}
              <code className="rounded bg-slate-100 px-1">u_confidence</code> and{' '}
              <code className="rounded bg-slate-100 px-1">u_clinician_action</code>.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Metric name="Scored" source="agent-scored screening rows" formula="row count" />
              <Metric name="Avg confidence" source="u_confidence" formula="mean across scored rows" />
              <Metric name="Low confidence" source="u_confidence" formula="count where confidence < 70" />
              <Metric name="Reviewed / Pending" source="u_clinician_action" formula="reviewed = confirmed + adjusted + rejected; pending = the rest" />
              <Metric name="Adjusted / Rejected" source="u_clinician_action" formula="count of each value (clinician overrode the AI)" />
              <Metric name="Disagree rate" source="u_clinician_action" formula="(adjusted + rejected) ÷ reviewed" />
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-sm font-semibold text-slate-800">BHUC Clinical Documentation Agent (Agent 3)</h3>
            <p className="mt-1 text-xs text-slate-500">
              Query: <em>all</em> <code className="rounded bg-slate-100 px-1">u_bhuc_care_plan</code> rows,
              reading <code className="rounded bg-slate-100 px-1">u_unverified_lines</code> (a JSON array of
              AI-flagged lines) and <code className="rounded bg-slate-100 px-1">u_signed</code>.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Metric name="Notes drafted" source="care-plan rows" formula="row count" />
              <Metric name="With unverified" source="u_unverified_lines" formula="count of notes whose flagged-line array is non-empty" />
              <Metric name="Unverified rate" source="u_unverified_lines" formula="with-unverified ÷ total notes" />
              <Metric name="Avg flagged / note" source="u_unverified_lines" formula="total flagged lines ÷ notes-with-unverified (not ÷ all notes)" />
              <Metric name="Signed" source="u_signed" formula="count where signed is true (human attested)" />
              <Metric name="Unsigned" source="u_signed" formula="total − signed" />
            </div>
          </section>

          <p className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            These are <strong>detective</strong> controls — they measure and surface drift. Harm prevention
            comes from the human-in-the-loop gates, enforced server-side: a note cannot be signed while any
            line is unverified, and a risk cannot be confirmed before the agent has scored it. Counts are
            lifetime aggregates (no date window) capped at 1,000 rows per table. See output_integrity.md §8.
          </p>
        </div>
      </div>
    </div>
  )
}

export function GovernanceOutputIntegrity() {
  const [data, setData] = useState<OutputIntegritySummary | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [showInfo, setShowInfo] = useState(false)

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
          <div className="flex flex-wrap items-center gap-2">
            <AictLink href={AICT_HOME}><ShieldCheck className="h-3.5 w-3.5" /> Open AI Control Tower</AictLink>
            <AictLink href={AIRC_RISK}>Open AI Risk register (AIRC)</AictLink>
            <Button variant="secondary" className="ml-auto px-3 py-1.5 text-sm" onClick={() => setShowInfo(true)}>
              <Info className="h-4 w-4" /> How are these derived?
            </Button>
          </div>

          {showInfo && <DerivationModal onClose={() => setShowInfo(false)} />}

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
