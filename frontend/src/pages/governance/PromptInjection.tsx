import { useEffect, useState } from 'react'
import { ExternalLink, ShieldAlert, ShieldCheck, Info, X } from 'lucide-react'
import { GovernanceShell } from '../../components/portals'
import { Panel, StatusBadge, Spinner, ErrorState, Button } from '../../components/ui'
import { api } from '../../services/api'
import type { PromptInjectionSummary } from '../../lib/types'

// AI Control Tower — the native Agent-goal-deviation / Output-screening guardrails
// (already Active, GOV-2) record deviations on the Security & privacy tab.
const AICT_SECURITY = 'https://ven04690.service-now.com/now/ai-control-tower/home'

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

const CATEGORY_BLURB: Record<string, string> = {
  prompt_leak: 'Reply revealed the agent’s instructions, role, or tool names.',
  clinical_advice: 'Reply gave diagnosis, medication, or dosing — outside the front-door’s non-clinical scope.',
  jailbreak: 'Reply accepted a role change or agreed to ignore its rules.',
  exfil_markup: 'Reply referenced records / SQL / system internals, or emitted unsafe links or markup.',
}

function DetectionModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Info className="h-5 w-5 text-teal-700" /> How prompt injection is detected
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              The Front-Door agent (Agent 1) is public and non-clinical. Every reply it produces is
              screened by a <strong>deterministic output filter</strong> in the backend broker
              (<code className="rounded bg-slate-100 px-1">prompt_injection.py</code>) — no second
              LLM, so it always runs and can’t itself hallucinate a verdict. A flagged reply is
              blocked and replaced with a fixed safe refusal.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(CATEGORY_BLURB).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-100 p-3">
                <p className="text-sm font-semibold text-slate-800">{k}</p>
                <p className="mt-1 text-xs text-slate-500">{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            The <strong>988 crisis path is exempt</strong> from the clinical/jailbreak checks so a
            legitimate safety reply is never blocked. Input attempts are also counted (detective only —
            they don’t gate the request; enforcement is output-side). This is defense-in-depth:
            the strongest control is the agent’s narrow charter — it has no patient-record or
            write access. Counters are in-process (reset on restart). See prompt_injection_usecase.md.
          </p>
        </div>
      </div>
    </div>
  )
}

export function GovernancePromptInjection() {
  const [data, setData] = useState<PromptInjectionSummary | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    let alive = true
    api.getPromptInjection()
      .then((d) => { if (alive) { setData(d); setPhase('ready') } })
      .catch(() => { if (alive) setPhase('error') })
    return () => { alive = false }
  }, [])

  return (
    <GovernanceShell
      title="Prompt Injection"
      intro="Agent 1 (Front-Door) is a public, non-clinical chatbot. A deterministic output filter blocks any reply that leaks the prompt/tools, gives clinical advice, complies with a jailbreak, or exfiltrates data — replacing it with a safe refusal. Detective metrics here; enforcement is server-side."
    >
      {phase === 'loading' && <Spinner label="Loading prompt-injection metrics…" />}
      {phase === 'error' && <ErrorState message="Couldn't load the metrics." onRetry={() => window.location.reload()} />}

      {phase === 'ready' && data && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <AictLink href={AICT_SECURITY}><ShieldCheck className="h-3.5 w-3.5" /> Open AI Control Tower (Security &amp; privacy)</AictLink>
            <StatusBadge tone={data.guardrailsActive ? 'success' : 'warning'}>
              Native guardrails {data.guardrailsActive ? 'active' : 'off'}
            </StatusBadge>
            <Button variant="secondary" className="ml-auto px-3 py-1.5 text-sm" onClick={() => setShowInfo(true)}>
              <Info className="h-4 w-4" /> How is this detected?
            </Button>
          </div>

          {showInfo && <DetectionModal onClose={() => setShowInfo(false)} />}

          <Panel
            title="Front-Door output filter"
            subtitle="Agent 1 · deterministic, app-side · blocks + safe refusal"
            actions={data.total > 0
              ? <StatusBadge tone="warning" icon={<ShieldAlert className="h-3.5 w-3.5" />}>{data.total} blocked</StatusBadge>
              : <StatusBadge tone="success">None blocked</StatusBadge>}
          >
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Replies blocked" value={data.total} hint="lifetime" tone={data.total > 0 ? 'warn' : 'good'} />
              <Tile label="Input attempts" value={data.inputAttempts} hint="suspicious msgs" />
              {data.byCategory.map((c) => (
                <Tile key={c.category} label={c.label} value={c.count} tone={c.count > 0 ? 'warn' : 'neutral'} />
              ))}
            </div>
          </Panel>

          <Panel title="Recent blocked replies" subtitle="most recent first · matched signal + the input that triggered it">
            {data.recent.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-slate-400">No prompt-injection attempts have been blocked yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                      <th className="py-2 pr-3 font-medium">When</th>
                      <th className="py-2 pr-3 font-medium">Category</th>
                      <th className="py-2 pr-3 font-medium">Matched</th>
                      <th className="py-2 font-medium">Visitor input</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r, i) => (
                      <tr key={i} className="border-b border-slate-50 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap text-xs text-slate-500">{r.at}</td>
                        <td className="py-2 pr-3"><StatusBadge tone="neutral">{r.label}</StatusBadge></td>
                        <td className="py-2 pr-3"><code className="rounded bg-slate-100 px-1 text-xs text-rose-700">{r.matched}</code></td>
                        <td className="py-2 text-xs text-slate-600">{r.input || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <p className="px-1 text-xs text-slate-400">
            Detective metrics — the preventive layer is Agent 1&apos;s hardened instructions + the native
            AICT guardrails; the enforcing block is server-side in the backend broker. The 988 crisis path
            is exempt from clinical/jailbreak checks. See prompt_injection_usecase.md §9.
          </p>
        </div>
      )}
    </GovernanceShell>
  )
}
