import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, CircleDot, Wrench, FileText, Search, GitBranch, Database, ClipboardCheck } from 'lucide-react'
import { GovernanceShell } from '../../components/portals'
import { Panel, StatusBadge, Spinner, ErrorState, EmptyState, type Tone } from '../../components/ui'
import { api } from '../../services/api'
import type { AIAssetDetail, AIToolDetail } from '../../lib/types'

// display_value fields come HTML-encoded from ServiceNow; decode the common entities.
function deco(s: string): string {
  return (s || '')
    .replace(/&#34;/g, '"').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

function riskTone(risk: string): Tone {
  const r = (risk || '').toLowerCase()
  return r.includes('high') ? 'danger' : r.includes('medium') ? 'warning' : r.includes('low') ? 'success' : 'neutral'
}

function Field({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      {tone ? <div className="mt-1"><StatusBadge tone={tone}>{value}</StatusBadge></div>
        : <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>}
    </div>
  )
}

const TOOL_ICON: Record<string, React.ReactNode> = {
  Script: <FileText className="h-4 w-4" />,
  'Search Retriever': <Search className="h-4 w-4" />,
  Subflow: <GitBranch className="h-4 w-4" />,
  'Record Operation': <Database className="h-4 w-4" />,
}

function ToolCard({ tool }: { tool: AIToolDetail }) {
  const retrievalKeys = Object.keys(tool.retrieval || {})
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
          {TOOL_ICON[tool.type] ?? <Wrench className="h-4 w-4" />} {tool.name}
        </span>
        <StatusBadge tone="info">{tool.type}</StatusBadge>
        <StatusBadge tone="neutral">{tool.executionMode}</StatusBadge>
      </div>
      {tool.description && <p className="mt-2 text-sm text-slate-600">{deco(tool.description)}</p>}

      {/* Search Retriever config */}
      {retrievalKeys.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Retrieval configuration</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {retrievalKeys.map((k) => (
              <div key={k} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2.5 py-1.5 text-xs">
                <span className="text-slate-500">{k}</span>
                <code className="text-slate-800">{String(tool.retrieval[k])}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subflow */}
      {tool.subflow && (
        <p className="mt-3 text-sm"><span className="font-semibold text-slate-500">Subflow: </span><code className="rounded bg-slate-100 px-1 text-slate-800">{tool.subflow}</code></p>
      )}

      {/* Script body */}
      {tool.script && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-teal-700">View script</summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100"><code>{deco(tool.script)}</code></pre>
        </details>
      )}
    </div>
  )
}

export function GovernanceAIAssetDetail() {
  const { id } = useParams()
  const [data, setData] = useState<AIAssetDetail | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    setPhase('loading')
    api.getAIAssetDetail(id!)
      .then((d) => { if (alive) { setData(d); setPhase('ready') } })
      .catch(() => { if (alive) setPhase('error') })
    return () => { alive = false }
  }, [id])

  return (
    <GovernanceShell title="AI Asset — Agent detail" intro="AI Control Tower governance for this agent, plus its full configuration and tools.">
      <Link to="/governance/ai-assets" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to AI Asset Management
      </Link>

      {phase === 'loading' && <Spinner label="Loading agent detail…" />}
      {phase === 'error' && <ErrorState message="Couldn't load this agent." onRetry={() => window.location.reload()} />}

      {phase === 'ready' && data && (
        <div className="grid gap-4">
          {/* Header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold text-slate-800">{data.asset.name}</h2>
              {data.asset.managed
                ? <StatusBadge tone="success" icon={<ShieldCheck className="h-3.5 w-3.5" />}>Managed</StatusBadge>
                : <StatusBadge tone="neutral" icon={<CircleDot className="h-3.5 w-3.5" />}>Unmanaged</StatusBadge>}
              <StatusBadge tone="info">{data.asset.type}</StatusBadge>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Field label="Built by" value={data.asset.builtBy} />
              <Field label="Lifecycle state" value={data.asset.lifecycle} />
              <Field label="Risk classification" value={data.asset.riskScore} tone={riskTone(data.asset.riskScore)} />
              <Field label="Managed" value={data.asset.managed ? 'Yes' : 'No'} />
            </div>
          </div>

          {/* Governance: risk + assessments + approvals + controls */}
          <Panel title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-700" /> Governance (AI Control Tower)</span>}
            subtitle="Risk ratings, assessments, approvals, and attached risks & controls — live from AICT/AIRC">
            {data.airc ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Field label="Governance record" value={data.airc.number} />
                  <Field label="Risk classification" value={data.airc.riskClassification} tone={riskTone(data.airc.riskClassification)} />
                  <Field label="Inherent rating" value={data.airc.inherentRating} />
                  <Field label="Residual rating" value={data.airc.residualRating} />
                  <Field label="Control effectiveness" value={data.airc.controlEffectiveness} />
                  <Field label="State / Owner" value={`${data.airc.state} · ${data.airc.owner}`} />
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This agent is <strong>Unmanaged</strong> — it has no AI Control Tower governance record yet. Risk ratings,
                assessments, and controls apply once an AI steward marks it Managed and runs the govern lifecycle.
              </div>
            )}

            {/* Assessments (impact & risk) — number, type, status, who */}
            <h4 className="mt-5 mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><ClipboardCheck className="h-4 w-4 text-slate-400" /> Assessments (impact &amp; risk)</h4>
            {data.assessments.length === 0
              ? <EmptyState title="No assessments recorded in AICT for this asset yet." />
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                      <th className="py-2 pr-3 font-medium">Number</th><th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Assigned to</th>
                      <th className="py-2 font-medium">Opened by</th></tr></thead>
                    <tbody>{data.assessments.map((a) => (
                      <tr key={a.number} className="border-b border-slate-50">
                        <td className="py-2 pr-3 font-medium text-slate-800">{a.number}</td>
                        <td className="py-2 pr-3">{a.type}</td>
                        <td className="py-2 pr-3"><StatusBadge tone={a.state.toLowerCase().includes('complete') ? 'success' : 'neutral'}>{a.state}</StatusBadge></td>
                        <td className="py-2 pr-3 text-slate-600">{a.assignedTo}</td>
                        <td className="py-2 text-slate-600">{a.openedBy}</td>
                      </tr>))}</tbody>
                  </table>
                </div>
              )}

            {/* Risks */}
            <h4 className="mt-5 mb-2 text-sm font-semibold text-slate-700">Risks ({data.risks.length})</h4>
            {data.risks.length === 0
              ? <EmptyState title="No risks attached to this asset yet." />
              : (
                <div className="grid gap-2">{data.risks.map((r) => (
                  <div key={r.name} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">{r.name}</span>
                      <span className="flex items-center gap-2 text-xs text-slate-500">
                        <StatusBadge tone="neutral">{r.state}</StatusBadge>
                        <span>owner: {r.owner}</span>
                        {r.inherent !== '—' && <span>· inherent: {r.inherent}</span>}
                      </span>
                    </div>
                    {r.description && <p className="mt-1 text-xs text-slate-500">{deco(r.description)}</p>}
                  </div>
                ))}</div>
              )}

            {/* Controls */}
            <h4 className="mt-5 mb-2 text-sm font-semibold text-slate-700">Controls ({data.controls.length})</h4>
            {data.controls.length === 0
              ? <EmptyState title="No controls attached to this asset yet." />
              : (
                <div className="grid gap-2">{data.controls.map((c) => (
                  <div key={c.name} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">{c.name}</span>
                      <span className="flex items-center gap-2 text-xs text-slate-500">
                        <StatusBadge tone="neutral">{c.state}</StatusBadge>
                        <span>owner: {c.owner}</span>
                      </span>
                    </div>
                    {c.description && <p className="mt-1 text-xs text-slate-500">{deco(c.description)}</p>}
                  </div>
                ))}</div>
              )}
          </Panel>

          {/* Agent configuration */}
          {data.agent && (
            <Panel title="Agent configuration" subtitle={`Strategy: ${data.agent.strategy}`}>
              <div className="grid gap-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
                  <p className="text-sm text-slate-700">{deco(data.agent.description) || '—'}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Role</p>
                  <p className="text-sm text-slate-700">{deco(data.agent.role) || '—'}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Instructions</p>
                  <p className="whitespace-pre-line text-sm text-slate-700">{deco(data.agent.instructions) || '—'}</p>
                </div>
              </div>
            </Panel>
          )}

          {/* Tools */}
          <Panel title={<span className="flex items-center gap-2"><Wrench className="h-4 w-4 text-teal-700" /> Tools</span>}
            subtitle={`${data.tools.length} tool${data.tools.length === 1 ? '' : 's'} · type, execution mode, and full definition`}>
            {data.tools.length === 0 ? <EmptyState title="No tools configured." /> : (
              <div className="grid gap-3">{data.tools.map((t) => <ToolCard key={t.name} tool={t} />)}</div>
            )}
          </Panel>
        </div>
      )}
    </GovernanceShell>
  )
}
