import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { GovernanceShell } from '../../components/portals'
import { Panel, Spinner, ErrorState } from '../../components/ui'
import { api } from '../../services/api'
import type { FairnessMetrics, FairnessGroup } from '../../lib/types'

const rateText = (r: number) => (r >= 90 ? 'text-teal-700' : r >= 75 ? 'text-amber-600' : 'text-rose-600')
const rateBar = (r: number) => (r >= 90 ? 'bg-teal-500' : r >= 75 ? 'bg-amber-500' : 'bg-rose-500')

// One demographic axis: a horizontal bar per group (count) + avg wait, and the parity rate.
function Dimension({ title, groups, rate }: { title: string; groups: FairnessGroup[]; rate: number }) {
  const maxCount = Math.max(1, ...groups.map((g) => g.count))
  return (
    <Panel title={title} actions={<span className={`text-sm font-semibold ${rateText(rate)}`}>{rate}% parity</span>}>
      {groups.length === 0 ? (
        <p className="text-sm text-slate-500">No scheduled appointments yet.</p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li key={g.group}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{g.group}</span>
                <span className="text-slate-500">{g.count} appt{g.count === 1 ? '' : 's'} · avg wait {g.avgWaitDays}d</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.round((g.count / maxCount) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

// Governance → Scheduling Fairness. Monitors that scheduling OUTCOMES are equitable across
// demographics even though the Scheduling Agent blinds its DECISION to them.
export function GovernanceFairness() {
  const [data, setData] = useState<FairnessMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true); setError(null)
    api.getFairness().then(setData).catch(() => setError("Couldn't load fairness metrics.")).finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <GovernanceShell
      title="Scheduling Fairness"
      intro="Distribution of scheduled appointments and wait-time parity across age, gender, and ethnicity. The Scheduling Agent excludes these protected attributes from its decisions — this page verifies the outcomes stay equitable."
      actions={
        <a href="https://ven04690.service-now.com/now/ai-control-tower" target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline">
          AI Control Tower <ExternalLink className="h-3.5 w-3.5" />
        </a>
      }
    >
      {loading ? (
        <Spinner label="Computing fairness metrics…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data ? (
        <div className="grid gap-4">
          <Panel title="Overall scheduling fairness">
            <div className="flex flex-wrap items-center gap-5">
              <div className={`font-display text-5xl font-bold ${rateText(data.fairnessRate.overall)}`}>{data.fairnessRate.overall}%</div>
              <div className="max-w-xl text-sm text-slate-600">
                <p>Wait-time parity across age, gender, and ethnicity over <span className="font-semibold text-slate-800">{data.total}</span> confirmed/completed appointments.</p>
                <p className="mt-1 text-slate-500">100% means every group waits equally from requested time to scheduled slot. A drop flags a group being pushed further out — a scheduling-bias signal to investigate.</p>
              </div>
            </div>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${rateBar(data.fairnessRate.overall)} transition-[width] duration-700`} style={{ width: `${data.fairnessRate.overall}%` }} />
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-3">
            <Dimension title="By gender" groups={data.byGender} rate={data.fairnessRate.gender} />
            <Dimension title="By ethnicity" groups={data.byEthnicity} rate={data.fairnessRate.ethnicity} />
            <Dimension title="By age band" groups={data.byAge} rate={data.fairnessRate.age} />
          </div>
        </div>
      ) : null}
    </GovernanceShell>
  )
}
