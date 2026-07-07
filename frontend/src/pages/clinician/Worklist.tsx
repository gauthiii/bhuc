import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, RefreshCw, FileText } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { Panel, RiskBadge, StatusBadge, Spinner, ErrorState, EmptyState, Button } from '../../components/ui'
import { api } from '../../services/api'
import { riskTone } from '../../lib/format'
import type { WorklistItem, RiskBand } from '../../lib/types'

const RISK_RANK: Record<RiskBand, number> = { high: 0, moderate: 1, low: 2, unknown: 3 }

// C2 — Clinical Worklist. Queue ordered by AI risk stratification.
export function ClinicianWorklist() {
  const [data, setData] = useState<WorklistItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsConfirmOnly, setNeedsConfirmOnly] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const items = await api.getWorklist()
      setData([...items].sort((a, b) => RISK_RANK[a.riskBand] - RISK_RANK[b.riskBand] || b.confidence - a.confidence))
    } catch {
      setError("Couldn't load the worklist.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const rows = (data ?? []).filter((r) => !needsConfirmOnly || r.requiresConfirmation)
  const counts = {
    needsConfirm: (data ?? []).filter((r) => r.requiresConfirmation).length,
    high: (data ?? []).filter((r) => r.riskBand === 'high').length,
    total: (data ?? []).length,
  }

  return (
    <ClinicianShell
      title="Worklist"
      intro="Your patient queue, ordered by AI risk stratification. Rows flagged for confirmation await your review so nothing AI-drafted proceeds unreviewed."
      actions={
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge tone="warning" icon={<AlertTriangle className="h-3.5 w-3.5" />}>Requires your confirmation: {counts.needsConfirm}</StatusBadge>
        <StatusBadge tone="danger">High risk: {counts.high}</StatusBadge>
        <StatusBadge tone="neutral">Total: {counts.total}</StatusBadge>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={needsConfirmOnly} onChange={(e) => setNeedsConfirmOnly(e.target.checked)} className="accent-teal-700" />
          Needs my confirmation
        </label>
      </div>

      <Panel title="Patient queue">
        {loading ? (
          <Spinner label="Loading worklist…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState title="You're all caught up" hint="Nothing in this view awaits your confirmation." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4">Risk band</th>
                  <th className="py-2 pr-4">Confidence</th>
                  <th className="py-2 pr-4">Wait</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.screeningId} className="border-b border-slate-50 hover:bg-slate-50/70">
                    <td className="py-3 pr-4">
                      <Link to={`/clinician/chart/${r.patientId}`} className="font-medium text-slate-800 hover:text-teal-800 hover:underline">
                        {r.patientName}
                      </Link>
                      <div className="text-xs text-slate-400">{r.patientNumber || '—'}</div>
                    </td>
                    <td className="py-3 pr-4"><RiskBadge band={r.riskBand} /></td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2" title="Model confidence in this stratification">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${riskTone(r.riskBand) === 'danger' ? 'bg-red-500' : 'bg-teal-600'}`} style={{ width: `${r.confidence}%` }} />
                        </div>
                        <span className="tabular-nums text-slate-600">{(r.confidence / 100).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-600">{r.waitMinutes} min</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {r.requiresConfirmation
                          ? <StatusBadge tone="warning" icon={<AlertTriangle className="h-3.5 w-3.5" />}>Confirm risk</StatusBadge>
                          : <StatusBadge tone="success">Confirmed</StatusBadge>}
                        {(r.noteCount ?? 0) > 0 && (
                          <StatusBadge tone="info" icon={<FileText className="h-3.5 w-3.5" />}>{r.noteCount} note{r.noteCount === 1 ? '' : 's'}</StatusBadge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        {r.requiresConfirmation && (
                          <Link to={`/clinician/risk/${r.screeningId}`}>
                            <Button variant="secondary" className="px-3 py-1.5 text-xs">Confirm risk</Button>
                          </Link>
                        )}
                        <Link to={`/clinician/chart/${r.patientId}`}>
                          <Button variant="ghost" className="px-3 py-1.5 text-xs">Open chart</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </ClinicianShell>
  )
}
