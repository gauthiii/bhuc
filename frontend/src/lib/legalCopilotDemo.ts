// Mock legal research requests for the /prior/legal/simulate demo. Frontend-only.
// Every person, document, clause and quote below is fictitious. No real statute,
// regulation or case law is quoted. Times are illustrative; the only sourced figure
// is the workbook's current cycle time of 1 to 3 business days (sheet 02).

export type LegalTone = 'neutral' | 'approve' | 'hitl' | 'flag'

export interface LegalFact {
  label: string
  value: string
}

export interface Citation {
  doc: string
  location: string
  excerpt: string
  status: 'verified' | 'superseded' | 'pending'
  note?: string
}

export interface LegalStep {
  id: string
  /** Node to highlight on the swimlane (legalFutureFlow ids in Copilot mode, legalCurrentFlow ids in manual mode). */
  nodeId: string
  actor: string
  /** True when the actor is a person rather than Copilot. */
  human?: boolean
  title: string
  detail: string
  facts?: LegalFact[]
  tone?: LegalTone
  render?: 'citations' | 'answer' | 'release'
  citations?: Citation[]
}

export interface WorkProduct {
  kind: 'Email reply' | 'Letter'
  to: string
  subject: string
  body: string[]
  sources: string[]
}

export interface ReleaseCheck {
  text: string
  ok: boolean
}

export interface ReleaseDecision {
  summary: string
  checks: ReleaseCheck[]
}

export interface LegalCase {
  id: string
  requestId: string
  label: string
  requester: { name: string; unit: string }
  attorney: string
  question: string
  use: 'Internal' | 'External'
  badge: string
  manualBadge: string
  tone: 'approve' | 'hitl' | 'flag'
  documents: string[]
  timeNote: { manual: string; copilot: string }
  workProduct: WorkProduct
  manualSteps: LegalStep[]
  copilotSteps: LegalStep[]
  /** External release only: the CLO decision that follows the last copilot step. */
  decision?: ReleaseDecision
  approveSteps?: LegalStep[]
  returnSteps?: LegalStep[]
  /** Sentence the attorney adds to the work product when the CLO returns it. */
  returnEdit?: string
}

const SCOPE_FACTS: LegalFact[] = [
  { label: 'Search scope', value: 'Z: legal drive only' },
  { label: 'Permissions', value: "Same as the attorney's own Z: drive access" },
  { label: 'Web search', value: 'Off' },
]

// ── Case 1: internal answer, citations verified ─────────────────────────────

const c1Docs = {
  template: 'Vendor Agreement Template v4 (2025)',
  dpa: 'Data Processing Addendum Template (2025)',
  memo: 'Memo: Data return clauses in vendor contracts (2024)',
}

const c1Citations = (status: Citation['status']): Citation[] => [
  { doc: c1Docs.template, location: 'Section 14.3', excerpt: 'On termination, Vendor will return all Customer Data or, at Customer\'s written election, securely delete it and certify the deletion in writing within 30 days.', status },
  { doc: c1Docs.dpa, location: 'Section 9', excerpt: 'Return or deletion of personal data at the end of the services follows the timeline set in the governing agreement.', status },
  { doc: c1Docs.memo, location: 'Page 2', excerpt: 'Where a vendor keeps backups, negotiate certified deletion rather than return.', status },
]

const vendorDataReturn: LegalCase = {
  id: 'vendor-data-return',
  requestId: 'LR-2026-0412',
  label: 'Vendor data return at contract end',
  requester: { name: 'Dana Whitfield', unit: 'Procurement' },
  attorney: 'Attorney R. Castillo',
  question: 'Does our standard vendor agreement require a vendor to return or delete our data when the contract ends?',
  use: 'Internal',
  badge: 'Internal answer, citations verified',
  manualBadge: 'Answer on day 2',
  tone: 'approve',
  documents: [c1Docs.template, c1Docs.dpa, c1Docs.memo],
  timeNote: {
    manual: 'Internal question from Procurement. Answered on day 2 after a manual search of the Z: drive.',
    copilot: 'Internal question from Procurement. Answered the same afternoon after the attorney verified every citation.',
  },
  workProduct: {
    kind: 'Email reply',
    to: 'Dana Whitfield, Procurement',
    subject: 'Data return at contract end',
    body: [
      'Yes. Section 14.3 of our standard vendor agreement (template v4, 2025) requires the vendor to return our data, or delete it and certify the deletion in writing, within 30 days of termination.',
      'The Data Processing Addendum follows the same timeline for any personal data.',
      'If the vendor keeps backups, our 2024 guidance is to ask for certified deletion rather than return. If the vendor has proposed changes to Section 14, send me the redline and I will review it.',
    ],
    sources: [c1Docs.template, c1Docs.dpa, c1Docs.memo],
  },
  manualSteps: [
    { id: 'm1', nodeId: 'ask', actor: 'Procurement', human: true, title: 'Question arrives by email', detail: 'Dana in Procurement emails the Legal Department asking whether the standard vendor agreement covers data return at contract end.', facts: [{ label: 'Elapsed', value: 'Day 1, 9:10 AM' }, { label: 'Channel', value: 'Email to the Legal Department' }] },
    { id: 'm2', nodeId: 'scope', actor: 'Attorney', human: true, title: 'Attorney picks up the request', detail: 'The attorney finishes current work, reads the question and decides to check the vendor template, the data processing addendum and any prior guidance.', facts: [{ label: 'Elapsed', value: 'Day 1, 2:30 PM' }] },
    { id: 'm3', nodeId: 'search', actor: 'Attorney', human: true, title: 'Manual search of the Z: drive', detail: 'The attorney browses the Contracts, Templates and Matters folders and tries several file names. Eleven files are opened before the three that apply are found. The 2024 memo sits in a closed matter folder.', facts: [{ label: 'Elapsed', value: 'Day 2, 10:00 AM' }, { label: 'Files opened', value: '11' }], tone: 'hitl' },
    { id: 'm4', nodeId: 'read', actor: 'Attorney', human: true, title: 'Reads and compares the material', detail: 'The attorney reads the termination section of the template, the deletion section of the addendum and the 2024 memo, and notes where they agree.', facts: [{ label: 'Elapsed', value: 'Day 2, 1:45 PM' }] },
    { id: 'm5', nodeId: 'draft', actor: 'Attorney', human: true, title: 'Drafts the reply', detail: 'The attorney writes the reply from scratch and copies the clause language in by hand.', facts: [{ label: 'Elapsed', value: 'Day 2, 4:20 PM' }] },
    { id: 'm6', nodeId: 'received', actor: 'Procurement', human: true, title: 'Procurement receives the answer', detail: 'Procurement has its answer on day 2, inside the usual 1 to 3 business days.', facts: [{ label: 'Elapsed', value: 'Day 2, 4:30 PM' }], tone: 'approve', render: 'answer' },
  ],
  copilotSteps: [
    { id: 'c1', nodeId: 'ask', actor: 'Procurement', human: true, title: 'Question arrives by email', detail: 'Dana in Procurement emails the Legal Department asking whether the standard vendor agreement covers data return at contract end.', facts: [{ label: 'Elapsed', value: 'Day 1, 9:10 AM' }, { label: 'Channel', value: 'Email to the Legal Department' }] },
    { id: 'c2', nodeId: 'prompt', actor: 'Attorney', human: true, title: 'Attorney asks Copilot', detail: 'The attorney picks up the request at the same time as today and types: "What does our standard vendor agreement say about returning or deleting our data at contract end? Cite the source documents."', facts: [{ label: 'Elapsed', value: 'Day 1, 2:30 PM' }] },
    { id: 'c3', nodeId: 'retrieve', actor: 'Copilot', title: 'Copilot searches the Z: drive', detail: 'Copilot searches only the Z: legal drive and only returns documents the attorney can already open. It finds the template, the addendum and the 2024 memo in the closed matter folder.', facts: [...SCOPE_FACTS, { label: 'Elapsed', value: 'Day 1, 2:31 PM' }] },
    { id: 'c4', nodeId: 'summarize', actor: 'Copilot', title: 'Copilot summarizes with citations', detail: 'Copilot answers: the vendor must return the data, or delete it and certify the deletion, within 30 days of termination [1]. The addendum follows the same timeline [2]. Prior guidance prefers certified deletion where the vendor keeps backups [3].', facts: [{ label: 'Citations', value: '3 source documents' }, { label: 'Elapsed', value: 'Day 1, 2:32 PM' }] },
    { id: 'c5', nodeId: 'verify', actor: 'Attorney', human: true, title: 'Attorney verifies each citation', detail: 'The attorney opens each cited document and confirms the quoted language is there, current and says what the summary says it does.', facts: [{ label: 'Elapsed', value: 'Day 1, 2:50 PM' }], tone: 'hitl', render: 'citations', citations: c1Citations('verified') },
    { id: 'c6', nodeId: 'draft', actor: 'Copilot', title: 'Copilot drafts the reply', detail: 'Copilot drafts a short reply to Procurement from the verified findings, quoting Section 14.3 and naming the sources.', facts: [{ label: 'Elapsed', value: 'Day 1, 3:05 PM' }] },
    { id: 'c7', nodeId: 'finalize', actor: 'Attorney', human: true, title: 'Attorney edits and finalizes', detail: 'The attorney tightens the wording and adds an offer to review any redline of Section 14. The reply is for internal use, so no further approval is needed.', facts: [{ label: 'Elapsed', value: 'Day 1, 3:25 PM' }, { label: 'Use', value: 'Internal' }] },
    { id: 'c8', nodeId: 'received', actor: 'Procurement', human: true, title: 'Procurement receives the answer', detail: 'Procurement has its answer the same afternoon.', facts: [{ label: 'Elapsed', value: 'Day 1, 3:30 PM' }], tone: 'approve', render: 'answer' },
  ],
}

// ── Case 2: attorney catches an outdated source ─────────────────────────────

const c2Docs = {
  oldMemo: 'Memo: Retention of producer and broker files (2019)',
  schedule: 'Records Retention Schedule v7 (2024)',
  template: 'Broker Agreement Template (2023)',
}

const brokerRetention: LegalCase = {
  id: 'broker-file-retention',
  requestId: 'LR-2026-0419',
  label: 'Retention period for closed broker files',
  requester: { name: 'Priya Natarajan', unit: 'Compliance' },
  attorney: 'Attorney L. Brennan',
  question: 'How long do we keep the files for a broker agreement after the agreement ends?',
  use: 'Internal',
  badge: 'Attorney catches an outdated source',
  manualBadge: 'Answer on day 3',
  tone: 'flag',
  documents: [c2Docs.oldMemo, c2Docs.schedule, c2Docs.template],
  timeNote: {
    manual: 'Internal question from Compliance. Answered on day 3 after the attorney found and resolved two conflicting sources.',
    copilot: 'Internal question from Compliance. Copilot cited an outdated memo first; the attorney caught it during verification.',
  },
  workProduct: {
    kind: 'Email reply',
    to: 'Priya Natarajan, Compliance',
    subject: 'Retention period for closed broker files',
    body: [
      'Closed broker agreement files are kept for 7 years after the agreement ends. This comes from the Records Retention Schedule v7 (2024), line "Producer and broker agreements".',
      'You may come across a 2019 memo that says 5 years. That memo was replaced by the 2024 schedule and should not be relied on.',
      'The broker agreement template (2023) points to the current retention schedule, so no contract change is needed.',
    ],
    sources: [c2Docs.schedule, c2Docs.template],
  },
  manualSteps: [
    { id: 'm1', nodeId: 'ask', actor: 'Compliance', human: true, title: 'Question arrives by email', detail: 'Priya in Compliance asks how long closed broker agreement files must be kept.', facts: [{ label: 'Elapsed', value: 'Day 1, 11:00 AM' }] },
    { id: 'm2', nodeId: 'scope', actor: 'Attorney', human: true, title: 'Attorney picks up the request', detail: 'The attorney is in a contract negotiation and gets to the request the next morning.', facts: [{ label: 'Elapsed', value: 'Day 2, 9:15 AM' }] },
    { id: 'm3', nodeId: 'search', actor: 'Attorney', human: true, title: 'Manual search of the Z: drive', detail: 'The attorney searches for "retention" and "broker" and finds the 2019 memo first. It says 5 years. A colleague mentions a newer schedule, which takes another search to locate.', facts: [{ label: 'Elapsed', value: 'Day 2, 3:40 PM' }, { label: 'Files opened', value: '9' }], tone: 'hitl' },
    { id: 'm4', nodeId: 'read', actor: 'Attorney', human: true, title: 'Resolves the conflict', detail: 'The 2024 schedule says 7 years and states that it replaces earlier guidance. The attorney confirms the schedule is the current one and checks the broker template for any conflicting clause.', facts: [{ label: 'Elapsed', value: 'Day 3, 10:30 AM' }] },
    { id: 'm5', nodeId: 'draft', actor: 'Attorney', human: true, title: 'Drafts the reply', detail: 'The attorney writes the reply and warns Compliance about the old memo.', facts: [{ label: 'Elapsed', value: 'Day 3, 1:50 PM' }] },
    { id: 'm6', nodeId: 'received', actor: 'Compliance', human: true, title: 'Compliance receives the answer', detail: 'Compliance has its answer on day 3, at the long end of the usual 1 to 3 business days.', facts: [{ label: 'Elapsed', value: 'Day 3, 2:00 PM' }], tone: 'approve', render: 'answer' },
  ],
  copilotSteps: [
    { id: 'c1', nodeId: 'ask', actor: 'Compliance', human: true, title: 'Question arrives by email', detail: 'Priya in Compliance asks how long closed broker agreement files must be kept.', facts: [{ label: 'Elapsed', value: 'Day 1, 11:00 AM' }] },
    { id: 'c2', nodeId: 'prompt', actor: 'Attorney', human: true, title: 'Attorney asks Copilot', detail: 'The attorney picks up the request at the same time as today and asks: "How long do we keep broker agreement files after the agreement ends? Cite the source documents."', facts: [{ label: 'Elapsed', value: 'Day 2, 9:15 AM' }] },
    { id: 'c3', nodeId: 'retrieve', actor: 'Copilot', title: 'Copilot searches the Z: drive', detail: 'Copilot searches the Z: legal drive within the attorney\'s permissions and returns the 2019 memo and the broker agreement template.', facts: [...SCOPE_FACTS, { label: 'Elapsed', value: 'Day 2, 9:16 AM' }] },
    { id: 'c4', nodeId: 'summarize', actor: 'Copilot', title: 'Copilot summarizes with citations', detail: 'Copilot answers: broker agreement files are kept for 5 years after the agreement ends [1], and the template refers to the retention schedule [2].', facts: [{ label: 'Citations', value: '2 source documents' }, { label: 'Elapsed', value: 'Day 2, 9:17 AM' }] },
    {
      id: 'c5', nodeId: 'verify', actor: 'Attorney', human: true, title: 'Attorney flags an outdated source',
      detail: 'The attorney opens citation [1]. The first page of the 2019 memo is stamped "Superseded by Records Retention Schedule v7 (2024)". The 5-year answer cannot be used. This is the check that attorney review exists for.',
      facts: [{ label: 'Elapsed', value: 'Day 2, 9:30 AM' }, { label: 'Result', value: '1 citation rejected' }], tone: 'flag', render: 'citations',
      citations: [
        { doc: c2Docs.oldMemo, location: 'Page 1', excerpt: 'Producer and broker files are retained for five years after the relationship ends.', status: 'superseded', note: 'Stamped "Superseded by Records Retention Schedule v7 (2024)"' },
        { doc: c2Docs.template, location: 'Section 11', excerpt: 'Records are retained in line with the Company\'s current records retention schedule.', status: 'verified' },
      ],
    },
    { id: 'c6', nodeId: 'retrieve', actor: 'Copilot', title: 'Copilot searches again', detail: 'The attorney asks a follow-up: "Find the current records retention schedule and give the period for broker agreements." Copilot searches again and returns the 2024 schedule.', facts: [{ label: 'Elapsed', value: 'Day 2, 9:32 AM' }] },
    { id: 'c7', nodeId: 'summarize', actor: 'Copilot', title: 'Copilot gives the corrected answer', detail: 'Copilot answers: broker agreement files are kept for 7 years after the agreement ends [1]. The schedule states it replaces earlier retention guidance.', facts: [{ label: 'Citations', value: '1 source document' }, { label: 'Elapsed', value: 'Day 2, 9:33 AM' }] },
    {
      id: 'c8', nodeId: 'verify', actor: 'Attorney', human: true, title: 'Attorney verifies the new citation',
      detail: 'The attorney opens the 2024 schedule, confirms the 7-year line and confirms the schedule is the current version.',
      facts: [{ label: 'Elapsed', value: 'Day 2, 9:45 AM' }], tone: 'hitl', render: 'citations',
      citations: [
        { doc: c2Docs.schedule, location: 'Line "Producer and broker agreements"', excerpt: 'Retain 7 years after the agreement ends. This schedule replaces all earlier retention guidance.', status: 'verified' },
        { doc: c2Docs.template, location: 'Section 11', excerpt: 'Records are retained in line with the Company\'s current records retention schedule.', status: 'verified' },
      ],
    },
    { id: 'c9', nodeId: 'draft', actor: 'Copilot', title: 'Copilot drafts the reply', detail: 'Copilot drafts the reply from the verified schedule. The attorney asks it to add a line warning about the old memo.', facts: [{ label: 'Elapsed', value: 'Day 2, 10:00 AM' }] },
    { id: 'c10', nodeId: 'finalize', actor: 'Attorney', human: true, title: 'Attorney edits and finalizes', detail: 'The attorney finalizes the reply. It is for internal use, so no further approval is needed. The attorney also logs the outdated memo in the monthly quality feedback so the file can be archived.', facts: [{ label: 'Elapsed', value: 'Day 2, 10:15 AM' }, { label: 'Use', value: 'Internal' }] },
    { id: 'c11', nodeId: 'received', actor: 'Compliance', human: true, title: 'Compliance receives the answer', detail: 'Compliance has the correct answer on the morning of day 2.', facts: [{ label: 'Elapsed', value: 'Day 2, 10:20 AM' }], tone: 'approve', render: 'answer' },
  ],
}

// ── Case 3: external letter, CLO approval before release ────────────────────

const c3Docs = {
  license: 'Software License Agreement, document management vendor (2023)',
  memo: 'Memo: Required terms for technology renewals (2025)',
  template: 'Letter template: Renewal on existing terms (2024)',
}

const c3Citations: Citation[] = [
  { doc: c3Docs.license, location: 'Section 3.2', excerpt: 'This Agreement may be renewed for one additional 12-month term by mutual written agreement.', status: 'verified' },
  { doc: c3Docs.memo, location: 'Page 1', excerpt: 'Renewals with vendors that hold our data must confirm that the data return and security terms continue to apply.', status: 'verified' },
  { doc: c3Docs.template, location: 'Whole document', excerpt: 'Standard structure for accepting a renewal on existing terms, with conditions.', status: 'verified' },
]

const licenseRenewal: LegalCase = {
  id: 'license-renewal-letter',
  requestId: 'LR-2026-0427',
  label: 'Reply letter on a software license renewal',
  requester: { name: 'Tom Hadley', unit: 'IT Vendor Management' },
  attorney: 'Attorney S. Moreau',
  question: 'Our document management vendor wants to renew the license for another year on current terms. Can we agree, and can Legal prepare the reply letter?',
  use: 'External',
  badge: 'External letter, CLO approval',
  manualBadge: 'Letter ready on day 3',
  tone: 'hitl',
  documents: [c3Docs.license, c3Docs.memo, c3Docs.template],
  timeNote: {
    manual: 'Letter to an outside vendor. Ready on day 3.',
    copilot: 'Letter to an outside vendor. Copilot-assisted work product needs Chief Legal Officer approval before it leaves BCBSVT.',
  },
  workProduct: {
    kind: 'Letter',
    to: 'Contracts Team, document management vendor',
    subject: 'Renewal of Software License Agreement',
    body: [
      'Thank you for your letter proposing to renew the Software License Agreement for one additional 12-month term on current terms.',
      'We agree to the renewal under Section 3.2, subject to your written confirmation that the data return and security terms of the current agreement continue to apply during the renewal term.',
      'Please send a signed renewal amendment for our review within 15 business days.',
    ],
    sources: [c3Docs.license, c3Docs.memo, c3Docs.template],
  },
  manualSteps: [
    { id: 'm1', nodeId: 'ask', actor: 'IT Vendor Management', human: true, title: 'Request arrives by email', detail: 'Tom in IT Vendor Management forwards the vendor\'s renewal letter and asks Legal to prepare a reply.', facts: [{ label: 'Elapsed', value: 'Day 1, 10:00 AM' }] },
    { id: 'm2', nodeId: 'scope', actor: 'Attorney', human: true, title: 'Attorney picks up the request', detail: 'The attorney reads the vendor letter and decides to check the license agreement, current renewal guidance and a letter template.', facts: [{ label: 'Elapsed', value: 'Day 1, 3:00 PM' }] },
    { id: 'm3', nodeId: 'search', actor: 'Attorney', human: true, title: 'Manual search of the Z: drive', detail: 'The signed agreement is filed under the vendor\'s old company name. The attorney finds it after checking the vendor register, then finds the 2025 renewal memo and the letter template.', facts: [{ label: 'Elapsed', value: 'Day 2, 11:30 AM' }, { label: 'Files opened', value: '14' }], tone: 'hitl' },
    { id: 'm4', nodeId: 'read', actor: 'Attorney', human: true, title: 'Reads and compares the material', detail: 'The attorney confirms the renewal clause allows one more 12-month term and notes the memo requires confirming data return and security terms.', facts: [{ label: 'Elapsed', value: 'Day 2, 3:15 PM' }] },
    { id: 'm5', nodeId: 'draft', actor: 'Attorney', human: true, title: 'Drafts the letter', detail: 'The attorney adapts the template by hand and adds the conditions from the memo.', facts: [{ label: 'Elapsed', value: 'Day 3, 11:00 AM' }] },
    { id: 'm6', nodeId: 'received', actor: 'IT Vendor Management', human: true, title: 'IT Vendor Management receives the letter', detail: 'The final letter is ready to send on day 3.', facts: [{ label: 'Elapsed', value: 'Day 3, 11:30 AM' }], tone: 'approve', render: 'answer' },
  ],
  copilotSteps: [
    { id: 'c1', nodeId: 'ask', actor: 'IT Vendor Management', human: true, title: 'Request arrives by email', detail: 'Tom in IT Vendor Management forwards the vendor\'s renewal letter and asks Legal to prepare a reply.', facts: [{ label: 'Elapsed', value: 'Day 1, 10:00 AM' }] },
    { id: 'c2', nodeId: 'prompt', actor: 'Attorney', human: true, title: 'Attorney asks Copilot', detail: 'The attorney picks up the request at the same time as today and asks: "Can we renew our document management license for one more year on current terms? What conditions does our renewal guidance require? Cite the sources."', facts: [{ label: 'Elapsed', value: 'Day 1, 3:00 PM' }] },
    { id: 'c3', nodeId: 'retrieve', actor: 'Copilot', title: 'Copilot searches the Z: drive', detail: 'Copilot finds the signed agreement even though it is filed under the vendor\'s old company name, along with the 2025 renewal memo and the letter template.', facts: [...SCOPE_FACTS, { label: 'Elapsed', value: 'Day 1, 3:01 PM' }] },
    { id: 'c4', nodeId: 'summarize', actor: 'Copilot', title: 'Copilot summarizes with citations', detail: 'Copilot answers: the agreement allows one more 12-month term by mutual written agreement [1]. Renewal guidance requires confirming the data return and security terms [2]. A renewal letter template exists [3].', facts: [{ label: 'Citations', value: '3 source documents' }, { label: 'Elapsed', value: 'Day 1, 3:02 PM' }] },
    { id: 'c5', nodeId: 'verify', actor: 'Attorney', human: true, title: 'Attorney verifies each citation', detail: 'The attorney opens each document, confirms the clause and the memo requirement, and confirms the agreement on file is the signed version.', facts: [{ label: 'Elapsed', value: 'Day 1, 3:25 PM' }], tone: 'hitl', render: 'citations', citations: c3Citations },
    { id: 'c6', nodeId: 'draft', actor: 'Copilot', title: 'Copilot drafts the letter', detail: 'Copilot drafts the reply from the template, citing Section 3.2 and adding the conditions from the renewal memo.', facts: [{ label: 'Elapsed', value: 'Day 1, 3:40 PM' }] },
    { id: 'c7', nodeId: 'finalize', actor: 'Attorney', human: true, title: 'Attorney edits and finalizes', detail: 'The attorney edits the draft and marks it for external use. Because it is Copilot-assisted work product going outside BCBSVT, it goes to the Chief Legal Officer before release.', facts: [{ label: 'Elapsed', value: 'Day 1, 4:10 PM' }, { label: 'Use', value: 'External' }] },
    { id: 'c8', nodeId: 'release', actor: 'Chief Legal Officer', human: true, title: 'Waiting for Chief Legal Officer review', detail: 'The letter is in the Chief Legal Officer\'s queue with the verified citations attached.', facts: [{ label: 'Elapsed', value: 'Day 2, 9:00 AM' }], tone: 'hitl' },
  ],
  decision: {
    summary: 'Copilot-assisted letter to an outside vendor. Release needs Chief Legal Officer approval.',
    checks: [
      { text: 'Attorney verified every citation against the source document', ok: true },
      { text: 'Letter only commits us to terms already in the signed agreement', ok: true },
      { text: 'No privileged analysis appears in the letter', ok: true },
      { text: 'Letter gives the vendor a deadline to respond', ok: true },
    ],
  },
  approveSteps: [
    { id: 'a1', nodeId: 'release', actor: 'Chief Legal Officer', human: true, title: 'Release approved', detail: 'The Chief Legal Officer approves the letter. IT Vendor Management sends it to the vendor.', facts: [{ label: 'Elapsed', value: 'Day 2, 9:20 AM' }], tone: 'approve', render: 'release' },
  ],
  returnSteps: [
    { id: 'r1', nodeId: 'finalize', actor: 'Attorney', human: true, title: 'Returned to the attorney', detail: 'The Chief Legal Officer asks the attorney to state that the renewal amendment must be signed before the current term ends. The attorney adds the sentence.', facts: [{ label: 'Elapsed', value: 'Day 2, 10:30 AM' }], tone: 'hitl' },
    { id: 'r2', nodeId: 'release', actor: 'Chief Legal Officer', human: true, title: 'Release approved after edits', detail: 'The Chief Legal Officer approves the revised letter. IT Vendor Management sends it to the vendor.', facts: [{ label: 'Elapsed', value: 'Day 2, 11:00 AM' }], tone: 'approve', render: 'release' },
  ],
  returnEdit: 'The renewal amendment must be signed by both parties before the current term ends.',
}

export const legalCases: LegalCase[] = [vendorDataReturn, brokerRetention, licenseRenewal]
