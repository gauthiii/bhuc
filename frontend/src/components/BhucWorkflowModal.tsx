import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import {
  Play, Flag, HelpCircle, MessageCircle, ShieldAlert, LifeBuoy, ClipboardList, Activity,
  FileText, CheckCircle2, Lock, FileCheck, CalendarClock, HeartPulse, UserRound, UserCheck,
  Stethoscope, Bot, Keyboard, Download,
} from 'lucide-react'

// End-to-end BHUC patient + clinician journey, showing where each AI agent acts.
// Adapted from the FusionCenter HealthMonitoringWorkflowModal (same node/edge/animation
// machinery); roles are shown as per-node badges; a "Crisis detected?" decision branches
// to the 988 escalation path. Export the current view as a PNG.

type NodeType = 'card' | 'circle' | 'diamond'
type FlowState = 'waiting' | 'active' | 'completed' | 'rejected'
type WorkflowNode = { type: NodeType; col: number; row: number; icon: keyof typeof ICONS; title: string; sub?: string; lblPos?: 'above' | 'below' }
type PathStep = { id: number; from: number | null; label?: 'Yes' | 'No' }
type FlowViewMode = 'summary' | 'detailed'
type RoleBadge = { icon: keyof typeof ICONS; label: string }
type FlowUiConfig = {
  gridClassName: string
  cardNodeClassName: string
  decisionNodeClassName: string
  nodeTitleClassName: string
  nodeSubClassName: string
  circleLabelClassName: string
}

const ICONS = {
  play: Play, flag: Flag, helpCircle: HelpCircle, message: MessageCircle, shieldAlert: ShieldAlert,
  lifeBuoy: LifeBuoy, clipboard: ClipboardList, activity: Activity, fileText: FileText,
  check: CheckCircle2, lock: Lock, fileCheck: FileCheck, calendar: CalendarClock, heart: HeartPulse,
  user: UserRound, userCheck: UserCheck, stethoscope: Stethoscope, bot: Bot,
}

const BRAND = { color: '#0d9488', rgb: '13 148 136' }
const SPEED_MS = 1300
// Decision gating is disabled for now: the flow auto-plays BOTH branches (care + crisis)
// so every path is shown at the end. The Yes/No buttons stay visible but disabled.
const DECISION_ENABLED = false

// ── DETAILED flow ──────────────────────────────────────────────────────────────────────
const DETAILED_NODES: Record<number, WorkflowNode> = {
  0: { type: 'circle', col: 1, row: 1, icon: 'user', title: 'Patient arrives', lblPos: 'below' },
  1: { type: 'card', col: 2, row: 1, icon: 'message', title: 'Front-Door Chat', sub: 'Facility Q&A + triage' },
  2: { type: 'diamond', col: 3, row: 1, icon: 'helpCircle', title: 'Crisis detected?' },
  3: { type: 'card', col: 4, row: 1, icon: 'clipboard', title: 'Register & Consent', sub: 'HIPAA · Part 2 · TCPA' },
  4: { type: 'card', col: 5, row: 1, icon: 'clipboard', title: 'Complete Screening', sub: 'Guided questionnaires' },
  5: { type: 'card', col: 6, row: 1, icon: 'activity', title: 'Risk Scoring', sub: 'Band · confidence · rationale' },
  6: { type: 'card', col: 7, row: 1, icon: 'userCheck', title: 'Confirm Risk', sub: 'HITL review gate' },
  7: { type: 'card', col: 8, row: 1, icon: 'fileText', title: 'Draft Clinical Note', sub: 'Grounded · flags unverified' },
  8: { type: 'card', col: 8, row: 2, icon: 'check', title: 'Review & Sign Note', sub: 'Sign gate — no unverified lines' },
  9: { type: 'card', col: 7, row: 2, icon: 'lock', title: 'Label 42 CFR Part 2', sub: 'Consent / SUD tagging' },
  10: { type: 'card', col: 6, row: 2, icon: 'fileCheck', title: 'Draft Prior-Auth', sub: 'Cited coverage packet' },
  11: { type: 'card', col: 5, row: 2, icon: 'userCheck', title: 'Attest & Submit PA', sub: 'Human submits — agent never does' },
  12: { type: 'card', col: 4, row: 2, icon: 'calendar', title: 'Schedule Visit', sub: 'Fairness-checked slots' },
  13: { type: 'card', col: 2, row: 2, icon: 'heart', title: 'Care Plan & Check-ins', sub: 'Ongoing care' },
  14: { type: 'circle', col: 1, row: 2, icon: 'flag', title: 'Care underway', lblPos: 'below' },
  15: { type: 'card', col: 3, row: 3, icon: 'lifeBuoy', title: '988 Escalation', sub: 'Subflow · on-call alert' },
  16: { type: 'card', col: 4, row: 3, icon: 'userCheck', title: 'Human Coordinator', sub: 'On-call responder' },
  17: { type: 'circle', col: 5, row: 3, icon: 'flag', title: 'Safety response', lblPos: 'below' },
}
const DETAILED_BASE_PATH: PathStep[] = [{ id: 0, from: null }, { id: 1, from: 0 }, { id: 2, from: 1 }]
const DETAILED_CARE_PATH: PathStep[] = [
  { id: 3, from: 2, label: 'No' }, { id: 4, from: 3 }, { id: 5, from: 4 }, { id: 6, from: 5 }, { id: 7, from: 6 },
  { id: 8, from: 7 }, { id: 9, from: 8 }, { id: 10, from: 9 }, { id: 11, from: 10 }, { id: 12, from: 11 },
  { id: 13, from: 12 }, { id: 14, from: 13 },
]
const DETAILED_CRISIS_PATH: PathStep[] = [{ id: 15, from: 2, label: 'Yes' }, { id: 16, from: 15 }, { id: 17, from: 16 }]
const DETAILED_ROLES: Partial<Record<number, RoleBadge>> = {
  1: { icon: 'bot', label: 'Agent 1' }, 3: { icon: 'user', label: 'Patient' }, 4: { icon: 'user', label: 'Patient' },
  5: { icon: 'bot', label: 'Agent 2' }, 6: { icon: 'stethoscope', label: 'Clinician' }, 7: { icon: 'bot', label: 'Agent 3' },
  8: { icon: 'stethoscope', label: 'Clinician' }, 9: { icon: 'bot', label: 'Agent 4' }, 10: { icon: 'bot', label: 'Agent 5' },
  11: { icon: 'stethoscope', label: 'Clinician' }, 12: { icon: 'bot', label: 'Agent 6' }, 13: { icon: 'user', label: 'Patient' },
  15: { icon: 'bot', label: 'Agent 1' }, 16: { icon: 'userCheck', label: 'On-call' },
}

// ── SUMMARY flow ───────────────────────────────────────────────────────────────────────
const SUMMARY_NODES: Record<number, WorkflowNode> = {
  0: { type: 'circle', col: 1, row: 1, icon: 'user', title: 'Patient arrives', lblPos: 'below' },
  1: { type: 'card', col: 2, row: 1, icon: 'message', title: 'Front-Door Chat', sub: 'Triage + facility info' },
  2: { type: 'diamond', col: 3, row: 1, icon: 'helpCircle', title: 'Crisis detected?' },
  3: { type: 'card', col: 4, row: 1, icon: 'clipboard', title: 'Intake & Screening', sub: 'Register, consent, screen' },
  4: { type: 'card', col: 5, row: 1, icon: 'fileText', title: 'AI Risk & Documentation', sub: 'Score + draft note' },
  5: { type: 'card', col: 6, row: 1, icon: 'check', title: 'Clinician Review & Sign', sub: 'HITL gates' },
  6: { type: 'card', col: 7, row: 1, icon: 'fileCheck', title: 'Prior-Auth & Scheduling', sub: 'Cited packet + fair slots' },
  7: { type: 'card', col: 8, row: 1, icon: 'heart', title: 'Care Plan & Follow-up', sub: 'Ongoing care' },
  8: { type: 'circle', col: 8, row: 2, icon: 'flag', title: 'Care underway', lblPos: 'below' },
  9: { type: 'card', col: 3, row: 3, icon: 'lifeBuoy', title: '988 Escalation', sub: 'Subflow · on-call alert' },
  10: { type: 'circle', col: 4, row: 3, icon: 'flag', title: 'Safety response', lblPos: 'below' },
}
const SUMMARY_BASE_PATH: PathStep[] = [{ id: 0, from: null }, { id: 1, from: 0 }, { id: 2, from: 1 }]
const SUMMARY_CARE_PATH: PathStep[] = [
  { id: 3, from: 2, label: 'No' }, { id: 4, from: 3 }, { id: 5, from: 4 }, { id: 6, from: 5 }, { id: 7, from: 6 }, { id: 8, from: 7 },
]
const SUMMARY_CRISIS_PATH: PathStep[] = [{ id: 9, from: 2, label: 'Yes' }, { id: 10, from: 9 }]
const SUMMARY_ROLES: Partial<Record<number, RoleBadge>> = {
  1: { icon: 'bot', label: 'Agent 1' }, 3: { icon: 'user', label: 'Patient' }, 4: { icon: 'bot', label: 'Agents 2·3' },
  5: { icon: 'stethoscope', label: 'Clinician' }, 6: { icon: 'bot', label: 'Agents 5·6' }, 7: { icon: 'user', label: 'Patient' },
  9: { icon: 'bot', label: 'Agent 1' },
}

const DETAILED_UI: FlowUiConfig = {
  gridClassName: 'relative mx-auto grid h-full w-full max-w-[1480px] min-h-0 grid-cols-8 grid-rows-3 gap-x-4 gap-y-16 rounded-xl px-10 pb-6 pt-14',
  cardNodeClassName: 'h-[92px] w-[150px] rounded-lg border-2 bg-white px-2 py-1',
  decisionNodeClassName: 'h-[104px] w-[104px]',
  nodeTitleClassName: 'text-[12px] font-bold leading-tight break-words',
  nodeSubClassName: 'text-[10px] leading-tight opacity-80 break-words',
  circleLabelClassName: 'text-[12px] font-bold leading-tight text-slate-700',
}
const SUMMARY_UI: FlowUiConfig = {
  gridClassName: 'relative mx-auto grid h-full w-full max-w-[1480px] min-h-0 grid-cols-8 grid-rows-3 gap-x-6 gap-y-16 rounded-xl px-10 pb-6 pt-14',
  cardNodeClassName: 'h-[96px] w-[184px] rounded-lg border-2 bg-white px-2 py-1',
  decisionNodeClassName: 'h-[108px] w-[108px]',
  nodeTitleClassName: 'text-[13px] font-bold leading-tight break-words',
  nodeSubClassName: 'text-[11px] leading-tight opacity-85 break-words',
  circleLabelClassName: 'text-[12px] font-bold leading-tight text-slate-700',
}

const stateClassMap: Record<FlowState, string> = {
  waiting: 'border-slate-300 text-slate-500 opacity-60',
  active: 'border-[var(--brand-color)] text-[var(--brand-color)] opacity-100 shadow-[0_0_0_4px_rgb(var(--brand-color-rgb)/0.2)] -translate-y-0.5',
  completed: 'border-emerald-500 text-emerald-800 opacity-100',
  rejected: 'border-rose-500 text-rose-900 opacity-100',
}

type DrawnEdge = { d: string; status: FlowState; label?: { text: string; x: number; y: number } }

// Full-page canvas (rendered inside GovernanceShell) — not a modal, so there is no
// overlay / z-index battle with the page chrome.
export function WorkflowCanvas() {
  const [flowViewMode, setFlowViewMode] = useState<FlowViewMode>('summary')
  const [isAutoMode, setIsAutoMode] = useState(true)
  const [currentPath, setCurrentPath] = useState<PathStep[]>(SUMMARY_BASE_PATH)
  const [stepIndex, setStepIndex] = useState(0)
  const [isWaitingForDecision, setIsWaitingForDecision] = useState(false)
  const [drawnEdges, setDrawnEdges] = useState<DrawnEdge[]>([])
  const [exporting, setExporting] = useState(false)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const flowConfig = useMemo(() => (flowViewMode === 'summary'
    ? { nodes: SUMMARY_NODES, basePath: SUMMARY_BASE_PATH, carePath: SUMMARY_CARE_PATH, crisisPath: SUMMARY_CRISIS_PATH, ui: SUMMARY_UI, roles: SUMMARY_ROLES, decisionNodeId: 2 }
    : { nodes: DETAILED_NODES, basePath: DETAILED_BASE_PATH, carePath: DETAILED_CARE_PATH, crisisPath: DETAILED_CRISIS_PATH, ui: DETAILED_UI, roles: DETAILED_ROLES, decisionNodeId: 2 }
  ), [flowViewMode])

  const resetFlow = () => {
    // With the decision disabled, play the whole graph (base + care + crisis) so both
    // branches animate and every node ends completed.
    const path = DECISION_ENABLED
      ? flowConfig.basePath
      : [...flowConfig.basePath, ...flowConfig.carePath, ...flowConfig.crisisPath]
    setCurrentPath(path); setStepIndex(0); setIsWaitingForDecision(false); setDrawnEdges([])
  }
  useEffect(() => { resetFlow() }, [flowConfig.basePath])

  const activeNodeId = currentPath[Math.min(stepIndex, currentPath.length - 1)]?.id
  useEffect(() => {
    if (DECISION_ENABLED && activeNodeId === flowConfig.decisionNodeId) setIsWaitingForDecision(true)
  }, [activeNodeId, flowConfig.decisionNodeId])

  useEffect(() => {
    if (!isAutoMode || isWaitingForDecision || stepIndex >= currentPath.length - 1) return
    const timer = window.setInterval(() => setStepIndex((p) => (p >= currentPath.length - 1 ? p : p + 1)), SPEED_MS)
    return () => window.clearInterval(timer)
  }, [isAutoMode, isWaitingForDecision, stepIndex, currentPath.length])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && !isWaitingForDecision) { e.preventDefault(); setStepIndex((p) => Math.min(p + 1, currentPath.length - 1)) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isWaitingForDecision, currentPath.length])

  const nodeStates = useMemo<Record<number, FlowState>>(() => {
    const states: Record<number, FlowState> = {}
    Object.keys(flowConfig.nodes).forEach((id) => { states[Number(id)] = 'waiting' })
    for (let i = 0; i <= stepIndex; i += 1) {
      const step = currentPath[i]
      if (!step) continue
      if (i === stepIndex) states[step.id] = 'active'
      else {
        const nextStep = currentPath[i + 1]
        states[step.id] = nextStep?.label === 'Yes' && step.id === flowConfig.decisionNodeId ? 'rejected' : 'completed'
      }
    }
    return states
  }, [currentPath, stepIndex, flowConfig.nodes, flowConfig.decisionNodeId])

  const handleDecision = (crisis: boolean) => {
    setIsWaitingForDecision(false)
    const extension = crisis ? flowConfig.crisisPath : flowConfig.carePath
    setCurrentPath([...flowConfig.basePath, ...extension])
    setStepIndex(flowConfig.basePath.length)
  }

  const exportPng = async () => {
    const node = timelineRef.current
    if (!node) return
    setExporting(true)
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#f1f5f9', cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `bhuc-${flowViewMode}-workflow.png`
      a.click()
    } catch (err) {
      console.error('PNG export failed', err)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const computeEdges = () => {
      const timeline = timelineRef.current
      if (!timeline) return
      const bounds = timeline.getBoundingClientRect()
      const next: DrawnEdge[] = []
      for (let i = 1; i <= stepIndex; i += 1) {
        const step = currentPath[i]
        if (!step?.from && step?.from !== 0) continue
        const fromEl = nodeRefs.current[step.from]
        const toEl = nodeRefs.current[step.id]
        if (!fromEl || !toEl) continue
        const fr = fromEl.getBoundingClientRect(); const tr = toEl.getBoundingClientRect()
        const from = { left: fr.left - bounds.left, right: fr.right - bounds.left, top: fr.top - bounds.top, bottom: fr.bottom - bounds.top, cx: fr.left - bounds.left + fr.width / 2, cy: fr.top - bounds.top + fr.height / 2 }
        const to = { left: tr.left - bounds.left, right: tr.right - bounds.left, top: tr.top - bounds.top, bottom: tr.bottom - bounds.top, cx: tr.left - bounds.left + tr.width / 2, cy: tr.top - bounds.top + tr.height / 2 }
        const fromNode = flowConfig.nodes[step.from]; const toNode = flowConfig.nodes[step.id]
        if (!fromNode || !toNode) continue
        let status: FlowState = i === stepIndex ? 'active' : 'completed'
        let d = ''; let label: DrawnEdge['label']
        if (toNode.col > fromNode.col && toNode.row === fromNode.row) {
          d = `M ${from.right} ${from.cy} L ${to.left} ${to.cy}`
          if (step.label) label = { text: step.label, x: (from.right + to.left) / 2 - 7, y: from.cy - 8 }
        } else if (toNode.col < fromNode.col && toNode.row === fromNode.row) {
          d = `M ${from.left} ${from.cy} L ${to.right} ${to.cy}`
        } else if (toNode.row > fromNode.row && toNode.col === fromNode.col) {
          d = `M ${from.cx} ${from.bottom} L ${to.cx} ${to.top}`
          if (step.label) label = { text: step.label, x: from.cx + 8, y: from.bottom + (to.top - from.bottom) / 2 + 4 }
        } else {
          // diagonal fallback: down then across
          const yMid = Math.max(from.bottom + 16, to.top - 16)
          d = `M ${from.cx} ${from.bottom} L ${from.cx} ${yMid} L ${to.cx} ${yMid} L ${to.cx} ${to.top}`
          if (step.label) label = { text: step.label, x: from.cx + 8, y: yMid - 6 }
        }
        if (d) next.push({ d, status, label })
      }
      setDrawnEdges(next)
    }
    const raf = window.requestAnimationFrame(computeEdges)
    const ro = new ResizeObserver(() => computeEdges())
    if (timelineRef.current) ro.observe(timelineRef.current)
    window.addEventListener('resize', computeEdges)
    return () => { window.cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('resize', computeEdges) }
  }, [currentPath, stepIndex, flowConfig.nodes])

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm"
      style={{ ['--brand-color' as string]: BRAND.color, ['--brand-color-rgb' as string]: BRAND.rgb } as React.CSSProperties}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(['summary', 'detailed'] as FlowViewMode[]).map((m) => (
            <button key={m} type="button" onClick={() => setFlowViewMode(m)}
              className={`rounded-md px-2.5 py-1 text-[13px] font-bold capitalize transition-colors ${flowViewMode === m ? 'bg-[var(--brand-color)] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {m} flow
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>Auto</span>
            <input type="checkbox" checked={isAutoMode} onChange={(e) => setIsAutoMode(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
          </label>
          <span className="hidden items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-500 sm:inline-flex">
            <Keyboard className="h-3.5 w-3.5" /> Space
          </span>
          <button type="button" onClick={resetFlow} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Reset</button>
          <button type="button" onClick={exportPng} disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
            <Download className="h-3.5 w-3.5" /> {exporting ? 'Exporting…' : 'Export PNG'}
          </button>
        </div>
      </div>

      <div className="relative h-[68vh] min-h-[560px] overflow-auto bg-slate-100/80 p-3">
        <div ref={timelineRef} className={flowConfig.ui.gridClassName}>
              <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-visible">
                <defs>
                  {(['waiting', 'active', 'completed', 'rejected'] as const).map((s) => (
                    <marker key={s} id={`bhuc-arrow-${s}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M 0 0 L 6 3 L 0 6 z" fill={s === 'active' ? BRAND.color : s === 'completed' ? '#10b981' : s === 'rejected' ? '#ef4444' : '#cbd5e1'} />
                    </marker>
                  ))}
                </defs>
                {drawnEdges.map((edge, i) => (
                  <g key={`${edge.d}-${i}`}>
                    <path d={edge.d} fill="none"
                      stroke={edge.status === 'active' ? BRAND.color : edge.status === 'rejected' ? '#ef4444' : '#10b981'}
                      strokeWidth={2} markerEnd={`url(#bhuc-arrow-${edge.status})`}
                      strokeDasharray={edge.status === 'active' ? '6 6' : undefined}
                      className={edge.status === 'active' ? 'animate-[bhucdash_0.6s_linear_infinite]' : undefined} />
                    {edge.label ? <text x={edge.label.x} y={edge.label.y} fontSize="12" fontWeight="700" fill={edge.status === 'rejected' ? '#ef4444' : '#10b981'}>{edge.label.text}</text> : null}
                  </g>
                ))}
              </svg>

              {Object.entries(flowConfig.nodes).map(([key, node]) => {
                const id = Number(key)
                const state = nodeStates[id] ?? 'waiting'
                const Icon = ICONS[node.icon]
                const isDecision = node.type === 'diamond'
                const isCircle = node.type === 'circle'
                const roleBadge = flowConfig.roles[id]
                const RoleIcon = roleBadge ? ICONS[roleBadge.icon] : null
                return (
                  <div key={id} style={{ gridColumn: node.col, gridRow: node.row }}
                    className={`relative z-10 flex items-center justify-center ${id === flowConfig.decisionNodeId && isWaitingForDecision ? 'z-40' : ''}`}>
                    <div ref={(el) => { nodeRefs.current[id] = el }}
                      className={[
                        'relative flex flex-col items-center justify-center text-center transition-all duration-300',
                        isCircle ? 'h-[50px] w-[50px] rounded-full border-2 bg-white' : '',
                        isDecision ? flowConfig.ui.decisionNodeClassName : '',
                        !isCircle && !isDecision ? flowConfig.ui.cardNodeClassName : '',
                        isDecision ? '' : stateClassMap[state],
                      ].join(' ')}>
                      {roleBadge && RoleIcon && (
                        <div className={`pointer-events-none absolute -top-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 shadow-sm ${
                          state === 'completed' ? 'border border-emerald-600 bg-emerald-600 text-white'
                            : state === 'active' ? 'border border-[var(--brand-color)] bg-[var(--brand-color)] text-white'
                              : state === 'rejected' ? 'border border-rose-600 bg-rose-600 text-white'
                                : 'border border-slate-200 bg-white/95 text-slate-700'}`}>
                          <RoleIcon className={`h-3 w-3 ${state === 'waiting' ? 'text-slate-600' : 'text-white'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${state === 'waiting' ? 'text-slate-700' : 'text-white'}`}>{roleBadge.label}</span>
                        </div>
                      )}
                      {isDecision && <div className={['absolute inset-2 rotate-45 rounded-lg border-2 bg-white transition-all duration-300', stateClassMap[state]].join(' ')} />}
                      <div className={isCircle ? 'relative z-10' : 'relative z-10 mb-1'}><Icon className="h-4 w-4" /></div>
                      <div className="relative z-10 w-full">
                        <p className={flowConfig.ui.nodeTitleClassName}>
                          {isCircle ? '' : id === flowConfig.decisionNodeId ? <>Crisis<br />detected?</> : node.title}
                        </p>
                        {node.sub && !isCircle && <p className={flowConfig.ui.nodeSubClassName}>{node.sub}</p>}
                        {isCircle && node.lblPos === 'below' && (
                          <p className={['absolute -bottom-9 left-1/2 w-24 -translate-x-1/2', flowConfig.ui.circleLabelClassName].join(' ')}>{node.title}</p>
                        )}
                      </div>
                      {DECISION_ENABLED && id === flowConfig.decisionNodeId && isWaitingForDecision && (
                        <div className="absolute -bottom-11 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
                          <button type="button" onClick={() => handleDecision(true)} className="rounded-md bg-rose-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-rose-700">Yes</button>
                          <button type="button" onClick={() => handleDecision(false)} className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700">No</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
  )
}
