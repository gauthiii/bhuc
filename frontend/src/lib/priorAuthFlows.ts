import type { LucideIcon } from 'lucide-react'
import { HandCoins, HandHelping, UserCog, UserRound } from 'lucide-react'

// Prior-authorization swimlane flows, transcribed verbatim from the 507/510 kickoff
// deck (507-510-project-kickoff.md, slides 13-14). Frontend-only demo data.

export type FlowNodeKind = 'step' | 'ai'
export type EdgeTone = 'neutral' | 'approve' | 'reject'
export type EdgeRoute = 'auto' | 'side' | 'over'

export interface FlowLane {
  name: string
  icon: LucideIcon
}

export interface FlowNode {
  id: string
  lane: number
  col: number
  text: string
  kind?: FlowNodeKind
}

export interface FlowEdge {
  from: string
  to: string
  label?: string
  tone?: EdgeTone
  route?: EdgeRoute
  /** Horizontal offset (px) applied to the start point, to fan out edges leaving the same node. */
  offset?: number
}

export interface Flow {
  lanes: FlowLane[]
  cols: number
  nodes: FlowNode[]
  edges: FlowEdge[]
}

const LANES: FlowLane[] = [
  { name: 'Customer', icon: UserRound },
  { name: 'Provider', icon: HandHelping },
  { name: 'Specialist', icon: UserCog },
  { name: 'Payer', icon: HandCoins },
]

/** Slide 13 — current (manual) state. */
export const currentFlow: Flow = {
  lanes: LANES,
  cols: 6,
  nodes: [
    { id: 'submit', lane: 1, col: 0, text: 'Submit prior-authorization for patient treatment / prescription' },
    { id: 'receive', lane: 3, col: 0, text: 'Receive request and verify documents' },
    { id: 'checks', lane: 3, col: 1, text: 'Clinical team checks eligibility with benefits plan, claim / medical history' },
    { id: 'escalate', lane: 3, col: 2, text: 'If determination not made, case is escalated for further clinical review' },
    { id: 'determine', lane: 3, col: 3, text: 'Make determination and issue decision' },
    { id: 'rejectLetter', lane: 0, col: 3, text: 'Receive rejection letter with summary of benefits and instructions for appeal' },
    { id: 'treatment', lane: 0, col: 4, text: 'Receive treatment / prescription' },
    { id: 'monitor', lane: 3, col: 5, text: 'Clinical team monitors treatment and conducts post-care review' },
  ],
  edges: [
    { from: 'submit', to: 'receive' },
    { from: 'receive', to: 'checks' },
    { from: 'checks', to: 'escalate' },
    { from: 'escalate', to: 'determine' },
    { from: 'determine', to: 'rejectLetter', label: 'Rejected', tone: 'reject' },
    { from: 'determine', to: 'treatment', label: 'Approved', tone: 'approve', route: 'side' },
    { from: 'treatment', to: 'monitor', route: 'side' },
  ],
}

/** Slide 14 — AI-enabled future state. */
export const futureFlow: Flow = {
  lanes: LANES,
  cols: 6,
  nodes: [
    { id: 'ehr', lane: 1, col: 0, kind: 'ai', text: 'AI Agent within EHR system determines if prior authorization for treatment is needed, and submits' },
    { id: 'analyze', lane: 3, col: 0, kind: 'ai', text: 'AI Agent analyzes file, medical codes, non-standard narrative text against policy and benefits plan' },
    { id: 'autoApprove', lane: 3, col: 1, kind: 'ai', text: 'For cases that closely match benefit rules, AI Agent approves' },
    { id: 'flag', lane: 3, col: 2, kind: 'ai', text: 'Flag highly complex or likely-to-deny cases for Human in the Loop' },
    { id: 'escalated', lane: 3, col: 3, text: 'Escalated to clinical team to make final determination and issue decision' },
    { id: 'treatment', lane: 0, col: 1, text: 'Receive treatment / prescription' },
    { id: 'denial', lane: 0, col: 5, kind: 'ai', text: 'AI agent generates plain-language denial letters citing exact clinical criteria and specific missing requirements' },
    { id: 'monitor', lane: 3, col: 4, kind: 'ai', text: 'AI agent monitors EHR feeds to predict discharge readiness dates and suggest post-acute placements' },
    { id: 'crosscheck', lane: 3, col: 5, kind: 'ai', text: 'AI agent cross checks bill codes with physician documentation to flag discrepancies' },
  ],
  edges: [
    { from: 'ehr', to: 'analyze' },
    { from: 'analyze', to: 'autoApprove' },
    { from: 'autoApprove', to: 'treatment', label: 'Approved', tone: 'approve' },
    { from: 'autoApprove', to: 'flag' },
    { from: 'flag', to: 'escalated' },
    { from: 'escalated', to: 'treatment', label: 'Approved', tone: 'approve', offset: -16 },
    { from: 'escalated', to: 'denial', label: 'Rejected', tone: 'reject', offset: 16 },
    { from: 'treatment', to: 'monitor', route: 'over' },
    { from: 'monitor', to: 'crosscheck' },
  ],
}
