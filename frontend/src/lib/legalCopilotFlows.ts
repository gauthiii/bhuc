import { Bot, Briefcase, Building2, FolderOpen, Gavel } from 'lucide-react'
import type { Flow } from './priorAuthFlows'

// Legal research swimlanes for the /prior/legal demo. Step text is drawn from the
// Copilot (BeccaBot) CPRM Sprint 2 workbook: sheet 01 (use case overview), sheet 02
// (process discovery) and sheet 09 (intake form). Frontend-only demo data.

/** Today: manual research on the Z: legal drive. */
export const legalCurrentFlow: Flow = {
  lanes: [
    { name: 'Business Unit', icon: Building2 },
    { name: 'Attorney', icon: Briefcase },
    { name: 'Z: Legal Drive', icon: FolderOpen },
  ],
  cols: 5,
  nodes: [
    { id: 'ask', lane: 0, col: 0, text: 'Sends a legal question to the Legal Department' },
    { id: 'scope', lane: 1, col: 0, text: 'Attorney reviews the question and scopes the research' },
    { id: 'search', lane: 2, col: 1, text: 'Attorney searches the Z: drive by hand for prior memos, templates and research' },
    { id: 'read', lane: 1, col: 2, text: 'Reads and compares the material; uses outside research services when internal material falls short' },
    { id: 'draft', lane: 1, col: 3, text: 'Drafts the answer or work product' },
    { id: 'received', lane: 0, col: 4, text: 'Receives the answer, typically 1 to 3 business days later' },
  ],
  edges: [
    { from: 'ask', to: 'scope' },
    { from: 'scope', to: 'search' },
    { from: 'search', to: 'read' },
    { from: 'read', to: 'draft' },
    { from: 'draft', to: 'received' },
  ],
}

/** With Copilot: retrieval and drafting support, attorney review, CLO approval for external release. */
export const legalFutureFlow: Flow = {
  lanes: [
    { name: 'Business Unit', icon: Building2 },
    { name: 'Attorney', icon: Briefcase },
    { name: 'Copilot', icon: Bot },
    { name: 'Chief Legal Officer', icon: Gavel },
  ],
  cols: 6,
  nodes: [
    { id: 'ask', lane: 0, col: 0, text: 'Sends a legal question to the Legal Department' },
    { id: 'prompt', lane: 1, col: 0, text: 'Attorney asks Copilot the question in plain language' },
    { id: 'retrieve', lane: 2, col: 1, kind: 'ai', text: 'Searches the Z: drive, returning only documents the attorney is already allowed to open' },
    { id: 'summarize', lane: 2, col: 2, kind: 'ai', text: 'Summarizes the findings with a citation to each source document' },
    { id: 'verify', lane: 1, col: 3, text: 'Checks each citation against the source document and applies professional judgment' },
    { id: 'draft', lane: 2, col: 4, kind: 'ai', text: 'Helps draft the answer or work product' },
    { id: 'finalize', lane: 1, col: 5, text: 'Edits and finalizes the work product' },
    { id: 'received', lane: 0, col: 5, text: 'Receives the answer' },
    { id: 'release', lane: 3, col: 5, text: 'Reviews and approves release of the work product outside BCBSVT' },
  ],
  edges: [
    { from: 'ask', to: 'prompt' },
    { from: 'prompt', to: 'retrieve' },
    { from: 'retrieve', to: 'summarize' },
    { from: 'summarize', to: 'verify' },
    { from: 'verify', to: 'draft' },
    { from: 'draft', to: 'finalize' },
    { from: 'finalize', to: 'received', label: 'Internal use', tone: 'approve' },
    { from: 'finalize', to: 'release', label: 'External use' },
  ],
}
