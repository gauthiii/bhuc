// "Maria's day" for the /prior/legal/maria page, taken from the workshop deck
// "507 & 510: Workshop_09/24 – 09/25", slides 11 to 22 (A Day in the Life of a Legal
// Professional). Deck wording is kept word for word. The demonstrations reuse the
// scenarios from /prior/legal/demo and /prior/legal/simulate, retold with Maria as the
// Legal Counsel; 9:00, 11:00, 1:30 and 2:30 carry content written for this page only.
// Frontend-only. People, accounts, documents and log entries are fictitious.

import { IDENTITY_CHECKS, IDENTITY_SCENARIOS, type IdentityScenario } from './legalGovernance'

export type StepTone = 'done' | 'pass' | 'warn' | 'fail' | 'human' | 'skip'
export type OutcomeTone = 'ok' | 'warn' | 'block'
export type LabelTone = 'confidential' | 'privileged'

export interface MariaCitation {
  doc: string
  location: string
  excerpt: string
  status: 'verified' | 'superseded'
  note?: string
}

export interface MariaStep {
  actor: string
  label: string
  detail: string
  /** Colour of the step once it has run. 'skip' steps are never reached. */
  tone: StepTone
  /** Shown once the step has run. */
  lines?: string[]
  citations?: MariaCitation[]
}

export interface MariaResponse {
  kind: 'answer' | 'nothing' | 'tip' | 'blocked' | 'granted' | 'denied'
  title?: string
  text: string[]
  footnote?: string
  label?: { name: string; tone: LabelTone }
  code?: string
}

export interface MariaScreen {
  app: string
  context?: { k: string; v: string }[]
  ask?: { from: string; text: string }
  prompt?: string
  sources?: { name: string; label?: string; tone?: LabelTone }[]
  response: MariaResponse
}

export interface MariaEvidence {
  source: string
  activity: string
  fields: { k: string; v: string }[]
}

/** What the 4:30 review reads back from each run (slide 21 questions). */
export interface MariaFacts {
  user: string
  activity: string
  information: string[]
  protections: string[]
  restricted?: string
  humanReview?: string
  action: string
}

export interface MariaOutcome {
  tone: OutcomeTone
  label: string
}

export interface MariaBranchOption {
  id: string
  label: string
  tone: OutcomeTone
  steps: MariaStep[]
  response: MariaResponse
  outcome: MariaOutcome
  evidence: MariaEvidence[]
  facts: MariaFacts
}

export interface MariaRun {
  id: string
  label: string
  screen: MariaScreen
  steps: MariaStep[]
  outcome: MariaOutcome
  evidence: MariaEvidence[]
  facts: MariaFacts
  /** A human decision that follows the last step (3:30). */
  branch?: { title: string; summary: string; checks: string[]; options: MariaBranchOption[] }
}

export interface MariaCard {
  id: string
  time: string
  title: string
  variant?: string
  headline: string
  what: { text: string[]; bullets?: string[]; after?: string[] }
  where: string[]
  basedOn?: { label: string; to: string }
  deck: { k: string; v: string[] }[]
  principle?: { k: string; v: string }
  /** The matching row of slide 22. */
  day: { activity: string; experience: string; risk: string; control: string }
  runs: MariaRun[]
  prove?: true
}

export const MARIA = { name: 'Maria Alvarez', role: 'Legal Counsel', upn: 'maria.alvarez@bcbsvt.demo' }

const SCOPE_LINES = ['Search scope: Z: legal drive only', "Permissions: Same as Maria's own Z: drive access", 'Web search: Off']

// ── 8:30 · Start Work (slide 12), built from the Demo 1 sign-in scenarios ─────

function identityFields(s: IdentityScenario) {
  const r = s.results
  return [
    { k: 'User', v: s.upn },
    { k: 'Application', v: 'Microsoft 365 Copilot' },
    { k: 'Status', v: s.outcome === 'granted' ? 'Success' : `Failure (${s.errorCode})` },
    { k: 'Group membership', v: r.group === 'pass' ? 'Legal Department: member' : 'Legal Department: not a member' },
    { k: 'Conditional Access', v: r.ca === 'pass' ? (s.outcome === 'granted' ? 'CA-Legal-Copilot: Success' : 'CA-Legal-Copilot: Failure') : 'Not applied (user out of scope)' },
    { k: 'MFA', v: r.mfa === 'pass' ? 'Satisfied (Authenticator push)' : r.mfa === 'fail' ? 'Denied by user' : 'Not reached' },
    { k: 'Device', v: r.device === 'pass' ? 'Managed, compliant' : r.device === 'fail' ? 'Unmanaged, not compliant' : 'Not evaluated' },
    { k: 'Location', v: s.location },
  ]
}

function identityRun(id: string): MariaRun {
  const s = IDENTITY_SCENARIOS.find((x) => x.id === id)!
  const isMaria = s.who === MARIA.name
  const granted = s.outcome === 'granted'
  const evaluated = IDENTITY_CHECKS.filter((c) => s.results[c.id] !== 'skip' && c.id !== 'signin' && c.id !== 'identity')
  return {
    id: 'run',
    label: s.title,
    screen: {
      app: 'Microsoft 365 sign-in',
      context: [
        { k: 'User', v: `${s.who} · ${isMaria ? MARIA.role : s.role}` },
        { k: 'Account', v: s.upn },
        { k: 'Device', v: s.device },
        { k: 'Location', v: s.location },
      ],
      response: granted
        ? { kind: 'granted', title: 'Access granted', text: ['Good morning, Maria. What can I help you research today?'] }
        : { kind: 'denied', title: "You can't open Microsoft 365 Copilot from here", text: [s.failNote ?? ''], code: s.errorCode },
    },
    steps: IDENTITY_CHECKS.map((c) => {
      const r = s.results[c.id]
      return {
        actor: 'Entra ID',
        label: c.label,
        detail: c.detail,
        tone: r === 'pass' ? 'pass' : r === 'fail' ? 'fail' : 'skip',
        lines: r === 'fail' && s.failNote ? [s.failNote] : undefined,
      }
    }),
    outcome: granted ? { tone: 'ok', label: 'Access granted' } : { tone: 'block', label: `Access blocked · ${s.errorCode}` },
    evidence: [{ source: 'Entra ID sign-in log', activity: 'Sign-in', fields: identityFields(s) }],
    facts: {
      user: s.upn,
      activity: `Start work: sign-in to Microsoft 365 Copilot (${s.title.toLowerCase()})`,
      information: [],
      protections: evaluated.map((c) => (c.id === 'ca' ? 'Conditional Access CA-Legal-Copilot' : c.label)),
      restricted: granted ? undefined : `Sign-in blocked for ${s.upn} (${s.errorCode}): ${s.failNote}`,
      action: granted ? 'Access granted to Microsoft 365 Copilot' : `Sign-in blocked (${s.errorCode})`,
    },
  }
}

const START_DECK: Pick<MariaCard, 'time' | 'title' | 'headline' | 'what' | 'where' | 'deck' | 'principle' | 'day'> = {
  time: '8:30 AM',
  title: 'Start Work',
  headline: 'Maria begins her day',
  what: { text: ['Maria signs in and begins working on matters assigned to her.', 'She needs access to the information required for her role.'] },
  where: ['Microsoft 365 sign-in', 'Microsoft Entra ID: Legal Department group, Conditional Access, MFA, compliant device'],
  deck: [
    { k: 'What could go wrong?', v: ['Someone could use AI without being properly identified or could gain access to information outside their responsibilities.'] },
    { k: 'What does the organization require?', v: ["Only an appropriately identified and authorized worker should be able to use the organization's AI capability and business information."] },
    { k: 'What does Maria experience?', v: ['She signs in and gets access to the work she is permitted to perform.'] },
  ],
  principle: { k: 'Governance behind the scene', v: 'Identity · Appropriate Access · Policy Enforcement · Evidence' },
  day: { activity: 'Start work', experience: 'Appropriate access', risk: 'Wrong person gains access', control: 'Identity & access requirements' },
}

// ── 9:00 · Review an Assigned Contract (slide 13) ───────────────────────────

const SUPPLIER_V2 = 'Supplier Agreement – Document Management Services v2 (2026).docx'
const SUPPLIER_V1 = 'Supplier Agreement – Document Management Services v1 (2023).docx'
const SUPPLIER_PATH = 'Legal > Contracts > Suppliers'
const CONF = 'Confidential \\ Legal'
const PRIV = 'Highly Confidential \\ Attorney-Client Privileged'

const copilotAudit = (app: string, resource: string, label: string) => ({
  source: 'Purview audit',
  activity: 'CopilotInteraction',
  fields: [
    { k: 'User', v: MARIA.upn },
    { k: 'App', v: app },
    { k: 'Resource referenced', v: resource },
    { k: 'Sensitivity label', v: label },
  ],
})

const openCopilot = (app: string): MariaStep => ({
  actor: 'Maria', label: `Maria opens ${app}`, detail: `Signed in as ${MARIA.upn} through CA-Legal-Copilot (8:30 AM).`, tone: 'done',
})

const contractRun: MariaRun = {
  id: 'run',
  label: 'Review the supplier agreement',
  screen: {
    app: 'Microsoft 365 Copilot (Word)',
    prompt: 'Help me review this supplier agreement. What are the termination provisions? Should the asset be returned or deleted, and within how many days? What are the supplier obligations? What are the key changes from the previous version?',
    sources: [{ name: SUPPLIER_V2, label: CONF, tone: 'confidential' }],
    response: {
      kind: 'answer',
      text: [
        "Termination: either party, 90 days' written notice (s.14.1)",
        "Returned or deleted: return all BCBSVT data or, at BCBSVT's written election, delete it (s.14.3)",
        'Within 30 days of termination',
        'Supplier obligations: certify deletion in writing; keep no copies in backups beyond the retention window',
        'Key changes from v1 (2023): notice 60 -> 90 days; written deletion certificate now required',
      ],
      label: { name: CONF, tone: 'confidential' },
      footnote: `Response labeled ${CONF}, inherited from the source. [1] ${SUPPLIER_V2}`,
    },
  },
  steps: [
    openCopilot('Copilot in Word'),
    { actor: 'Maria', label: 'Opens her assigned supplier agreement', detail: 'The document carries a sensitivity label.', tone: 'done', lines: [SUPPLIER_V2, SUPPLIER_PATH, `Label: ${CONF}`] },
    { actor: 'Copilot', label: 'Copilot works from the assigned contract', detail: 'Copilot only uses content Maria is permitted to open.', tone: 'pass', lines: ['Maria has read access to the file (assigned matter)', 'Resource referenced: the open supplier agreement only'] },
    { actor: 'Purview', label: 'Purview evaluates', detail: 'Sensitivity label and DLP policy are checked against the activity.', tone: 'pass', lines: [`Label found: ${CONF}`, 'DLP policy "Legal – Copilot privileged content": no match for this label'] },
    { actor: 'Purview', label: 'Policy behavior occurs', detail: 'Allow, notify or restrict, as configured.', tone: 'pass', lines: ['Allowed · label inherited by the response'] },
    { actor: 'Purview', label: 'Evidence is generated', detail: 'Policy match and activity / audit record.', tone: 'done', lines: ['CopilotInteraction written to Purview Audit and Activity explorer'] },
  ],
  outcome: { tone: 'ok', label: 'Allowed · label inherited by the response' },
  evidence: [copilotAudit('Microsoft 365 Copilot (Word)', SUPPLIER_V2, CONF)],
  facts: {
    user: MARIA.upn,
    activity: 'Review an assigned contract with Copilot in Word',
    information: [SUPPLIER_V2],
    protections: [`Sensitivity label ${CONF}, inherited by the response`],
    action: 'Contract review answer provided within the assigned matter',
  },
}

// ── 10:00 · Find Information (slide 14), from simulation case LR-2026-0419 ──

const brokerDocs = {
  oldMemo: 'Memo: Retention of producer and broker files (2019)',
  schedule: 'Records Retention Schedule v7 (2024)',
  template: 'Broker Agreement Template (2023)',
}

const findRun: MariaRun = {
  id: 'run',
  label: 'Retention period for closed broker files',
  screen: {
    app: 'Microsoft 365 Copilot (Chat)',
    ask: { from: 'Priya Natarajan, Compliance', text: 'Priya in Compliance asks how long closed broker agreement files must be kept.' },
    prompt: 'How long do we keep files for a broker agreement after the agreement ends?',
    sources: [{ name: brokerDocs.schedule }, { name: brokerDocs.template }],
    response: {
      kind: 'answer',
      title: 'Email reply to Priya Natarajan, Compliance',
      text: [
        'Closed broker agreement files are kept for 7 years after the agreement ends. This comes from the Records Retention Schedule v7 (2024), line "Producer and broker agreements".',
        'You may come across a 2019 memo that says 5 years. That memo was replaced by the 2024 schedule and should not be relied on.',
        'The broker agreement template (2023) points to the current retention schedule, so no contract change is needed.',
      ],
      footnote: `Sources: ${brokerDocs.schedule} · ${brokerDocs.template}`,
    },
  },
  steps: [
    { actor: 'Compliance', label: 'Question arrives by email', detail: 'Priya in Compliance asks how long closed broker agreement files must be kept.', tone: 'done' },
    { actor: 'Maria', label: 'Maria asks Copilot', detail: 'Maria asks: "How long do we keep files for a broker agreement after the agreement ends?"', tone: 'done' },
    { actor: 'Copilot', label: 'Copilot searches the Z: drive', detail: "Copilot searches the Z: legal drive within Maria's permissions and returns the 2019 memo and the broker agreement template.", tone: 'pass', lines: SCOPE_LINES },
    { actor: 'Copilot', label: 'Copilot summarizes with citations', detail: 'Copilot answers: broker agreement files are kept for 5 years after the agreement ends [1], and the template refers to the retention schedule [2].', tone: 'done' },
    {
      actor: 'Maria', label: 'Maria flags an outdated source',
      detail: 'Maria opens citation [1]. The first page of the 2019 memo is stamped "Superseded by Records Retention Schedule v7 (2024)". The 5-year answer cannot be used. This is the check that human review exists for.',
      tone: 'warn',
      citations: [
        { doc: brokerDocs.oldMemo, location: 'Page 1', excerpt: 'Producer and broker files are retained for five years after the relationship ends.', status: 'superseded', note: 'Stamped "Superseded by Records Retention Schedule v7 (2024)"' },
        { doc: brokerDocs.template, location: 'Section 11', excerpt: "Records are retained in line with the Company's current records retention schedule.", status: 'verified' },
      ],
    },
    { actor: 'Copilot', label: 'Copilot searches again', detail: 'Maria asks a follow-up: "Find the current records retention schedule and give the period for broker agreements." Copilot searches again and returns the 2024 schedule.', tone: 'done' },
    { actor: 'Copilot', label: 'Copilot gives the corrected answer', detail: 'Copilot answers: broker agreement files are kept for 7 years after the agreement ends [1]. The schedule states it replaces earlier retention guidance.', tone: 'done' },
    {
      actor: 'Maria', label: 'Maria verifies the new citation', detail: 'Maria opens the 2024 schedule, confirms the 7-year line and confirms the schedule is the current version.', tone: 'human',
      citations: [
        { doc: brokerDocs.schedule, location: 'Line "Producer and broker agreements"', excerpt: 'Retain 7 years after the agreement ends. This schedule replaces all earlier retention guidance.', status: 'verified' },
        { doc: brokerDocs.template, location: 'Section 11', excerpt: "Records are retained in line with the Company's current records retention schedule.", status: 'verified' },
      ],
    },
    { actor: 'Copilot', label: 'Copilot drafts the reply', detail: 'Copilot drafts the reply from the verified schedule. Maria asks it to add a line warning about the old memo.', tone: 'done' },
    { actor: 'Maria', label: 'Maria edits and finalizes', detail: 'Maria finalizes the reply. It is for internal use, so no further approval is needed. She also logs the outdated memo in the monthly quality feedback so the file can be archived.', tone: 'human' },
    { actor: 'Compliance', label: 'Compliance receives the answer', detail: 'Compliance has the correct answer.', tone: 'pass' },
  ],
  outcome: { tone: 'ok', label: 'Relevant information found · outdated source caught in review' },
  evidence: [
    {
      source: 'Purview audit', activity: 'CopilotInteraction',
      fields: [
        { k: 'User', v: MARIA.upn },
        { k: 'App', v: 'Microsoft 365 Copilot (Chat)' },
        { k: 'Resources referenced', v: `${brokerDocs.oldMemo}; ${brokerDocs.template}; ${brokerDocs.schedule}` },
        { k: 'Search scope', v: "Z: legal drive, within Maria's permissions" },
      ],
    },
    {
      source: 'Legal review log', activity: 'CitationCheck',
      fields: [
        { k: 'Reviewer', v: `${MARIA.name}, ${MARIA.role}` },
        { k: 'Rejected', v: `${brokerDocs.oldMemo} (superseded)` },
        { k: 'Verified', v: `${brokerDocs.schedule}; ${brokerDocs.template}` },
      ],
    },
  ],
  facts: {
    user: MARIA.upn,
    activity: 'Find information: retention period for closed broker files',
    information: [brokerDocs.oldMemo, brokerDocs.template, brokerDocs.schedule],
    protections: ["Copilot search limited to Maria's Z: drive permissions"],
    humanReview: 'Maria rejected a superseded 2019 memo and verified the 2024 schedule',
    action: 'Internal reply sent to Compliance: 7 years',
  },
}

// ── 10:30 · Work With Sensitive Information (slide 15), from Demo 2 · Scenario 2 ─

const PRIV_DOC = 'Provider Dispute – Strategy Notes.docx'
const PRIV_DLP = {
  source: 'Purview audit', activity: 'DLPRuleMatch',
  fields: [
    { k: 'Policy', v: 'Legal – Copilot privileged content' },
    { k: 'Rule', v: 'Exclude Privileged label from Copilot' },
    { k: 'Location', v: 'Microsoft 365 Copilot' },
    { k: 'Action', v: 'Content excluded' },
  ],
}

const sensitiveRun: MariaRun = {
  id: 'run',
  label: 'Summarize a Privileged litigation file',
  screen: {
    app: 'Microsoft 365 Copilot (Word)',
    prompt: 'Summarize our litigation strategy notes for the provider network dispute.',
    sources: [{ name: PRIV_DOC, label: PRIV, tone: 'privileged' }],
    response: {
      kind: 'blocked',
      text: [`I can't use "${PRIV_DOC}" to answer. Your organization's policy excludes content with this sensitivity label from Copilot.`],
      footnote: 'Maria can still open the file herself. Copilot cannot read it.',
    },
  },
  steps: [
    openCopilot('Copilot in Word'),
    { actor: 'Maria', label: 'Uses a legal document', detail: 'The document carries a sensitivity label.', tone: 'done', lines: [PRIV_DOC, 'Legal > Litigation > Privileged', `Label: ${PRIV}`] },
    { actor: 'Purview', label: 'Purview evaluates', detail: 'Sensitivity label and DLP policy are checked against the activity.', tone: 'warn', lines: [`Label found: ${PRIV}`, 'DLP policy "Legal – Copilot privileged content": MATCH', 'Rule: exclude items with this label from Copilot processing'] },
    { actor: 'Purview', label: 'Policy behavior occurs', detail: 'Allow, notify or restrict, as configured.', tone: 'fail', lines: ['Restricted · excluded from Copilot processing'] },
    { actor: 'Purview', label: 'Evidence is generated', detail: 'Policy match and activity / audit record.', tone: 'done', lines: ['DLPRuleMatch + CopilotInteraction written to Purview Audit and Activity explorer'] },
  ],
  outcome: { tone: 'block', label: 'Restricted · excluded from Copilot processing' },
  evidence: [PRIV_DLP, copilotAudit('Microsoft 365 Copilot (Word)', PRIV_DOC, PRIV)],
  facts: {
    user: MARIA.upn,
    activity: 'Work with sensitive information: privileged litigation file',
    information: [PRIV_DOC],
    protections: [`Sensitivity label ${PRIV}`, 'DLP policy "Legal – Copilot privileged content"'],
    restricted: `Privileged file excluded from Copilot by DLP (${PRIV_DOC})`,
    action: 'Copilot did not use the privileged file',
  },
}

// ── 11:00 · Use Only What Is Needed (slide 16): broad and focused runs ──────

const BROAD_DOCS = [SUPPLIER_V2, SUPPLIER_V1, '2021 billing dispute settlement', '2022 audit findings', 'Correspondence 2021–2025 (5 files)']

const broadRun: MariaRun = {
  id: 'broad',
  label: 'Broad question',
  screen: {
    app: 'Microsoft 365 Copilot (Chat)',
    prompt: 'Tell me everything about this supplier.',
    sources: BROAD_DOCS.map((name) => ({ name })),
    response: {
      kind: 'answer',
      text: ['Here is everything I found about this supplier across 9 documents: the current and previous agreements, the 2021 billing dispute settlement, the 2022 audit findings and correspondence from 2021 to 2025.'],
      footnote: '9 resources referenced.',
    },
  },
  steps: [
    { actor: 'Maria', label: 'Maria asks a broad question', detail: 'Maria asks: "Tell me everything about this supplier."', tone: 'done' },
    { actor: 'Copilot', label: 'Copilot searches every supplier file Maria can open', detail: '9 documents come into the conversation.', tone: 'done', lines: BROAD_DOCS },
    { actor: 'Copilot', label: 'Copilot summarizes the whole supplier history', detail: 'The renewal date, notice period and obligations are in the answer, alongside everything else.', tone: 'done' },
    { actor: 'Review', label: 'Compared with the task', detail: 'Does the AI need all of this information to perform this task?', tone: 'warn', lines: ['Needed: renewal date, termination notice period, supplier obligations', 'Referenced: 9 resources'] },
    { actor: 'Purview', label: 'Evidence is generated', detail: 'Activity / audit record.', tone: 'done', lines: ['CopilotInteraction written to Purview Audit: 9 resources referenced'] },
  ],
  outcome: { tone: 'warn', label: 'More than the task needs (9 resources)' },
  evidence: [{
    source: 'Purview audit', activity: 'CopilotInteraction',
    fields: [
      { k: 'User', v: MARIA.upn },
      { k: 'App', v: 'Microsoft 365 Copilot (Chat)' },
      { k: 'Resources referenced', v: '9' },
      { k: 'Resources', v: BROAD_DOCS.join('; ') },
    ],
  }],
  facts: {
    user: MARIA.upn,
    activity: 'Use only what is needed: broad question about the supplier',
    information: BROAD_DOCS,
    protections: [],
    action: 'Broad answer drawn from 9 resources',
  },
}

const focusedRun: MariaRun = {
  id: 'focused',
  label: 'Focused question',
  screen: {
    app: 'Microsoft 365 Copilot (Chat)',
    prompt: 'What are the renewal date, termination notice period and supplier obligations in the current supplier agreement?',
    sources: [{ name: SUPPLIER_V2, label: CONF, tone: 'confidential' }],
    response: {
      kind: 'answer',
      text: [
        'Renewal date: 1 March 2027',
        'Notice: 90 days',
        'Obligations: return or delete data within 30 days, certify deletion in writing',
      ],
      label: { name: CONF, tone: 'confidential' },
      footnote: `1 resource referenced. [1] ${SUPPLIER_V2}`,
    },
  },
  steps: [
    { actor: 'Maria', label: 'Maria asks a focused question', detail: 'Maria asks: "What are the renewal date, termination notice period and supplier obligations in the current supplier agreement?"', tone: 'done' },
    { actor: 'Copilot', label: 'Copilot grounds on the current agreement only', detail: '1 document comes into the conversation.', tone: 'pass', lines: [SUPPLIER_V2, `Label: ${CONF}`] },
    { actor: 'Copilot', label: 'Copilot answers the three questions', detail: 'Renewal date, notice period and supplier obligations.', tone: 'done', lines: ['Renewal date 1 March 2027', 'Notice 90 days', 'Obligations: return or delete data within 30 days, certify deletion in writing'] },
    { actor: 'Review', label: 'Compared with the task', detail: 'Does the AI need all of this information to perform this task?', tone: 'pass', lines: ['Needed: renewal date, termination notice period, supplier obligations', 'Referenced: 1 resource'] },
    { actor: 'Purview', label: 'Evidence is generated', detail: 'Activity / audit record.', tone: 'done', lines: ['CopilotInteraction written to Purview Audit: 1 resource referenced'] },
  ],
  outcome: { tone: 'ok', label: 'Focused · only what is needed (1 resource)' },
  evidence: [{
    source: 'Purview audit', activity: 'CopilotInteraction',
    fields: [
      { k: 'User', v: MARIA.upn },
      { k: 'App', v: 'Microsoft 365 Copilot (Chat)' },
      { k: 'Resources referenced', v: '1' },
      { k: 'Resources', v: SUPPLIER_V2 },
      { k: 'Sensitivity label', v: CONF },
    ],
  }],
  facts: {
    user: MARIA.upn,
    activity: 'Use only what is needed: focused question on the current agreement',
    information: [SUPPLIER_V2],
    protections: [`Sensitivity label ${CONF}, inherited by the response`],
    action: 'Focused answer drawn from 1 resource',
  },
}

// ── 12:00 · Prepare a Legal Response (slide 17), from simulation case LR-2026-0412 ─

const vendorDocs = {
  template: 'Vendor Agreement Template v4 (2025)',
  dpa: 'Data Processing Addendum Template (2025)',
  memo: 'Memo: Data return clauses in vendor contracts (2024)',
}

const responseRun: MariaRun = {
  id: 'run',
  label: 'Vendor data return at contract end',
  screen: {
    app: 'Microsoft 365 Copilot (Chat)',
    ask: { from: 'Dana Whitfield, Procurement', text: 'Dana in Procurement emails the Legal Department asking whether the standard vendor agreement covers data return at contract end.' },
    prompt: 'What does our standard vendor agreement say about returning or deleting our data at contract end? Cite the source documents.',
    sources: [{ name: vendorDocs.template }, { name: vendorDocs.dpa }, { name: vendorDocs.memo }],
    response: {
      kind: 'answer',
      title: 'Email reply to Dana Whitfield, Procurement',
      text: [
        'Yes. Section 14.3 of our standard vendor agreement (template v4, 2025) requires the vendor to return our data, or delete it and certify the deletion in writing, within 30 days of termination.',
        'The Data Processing Addendum follows the same timeline for any personal data.',
        'If the vendor keeps backups, our 2024 guidance is to ask for certified deletion rather than return. If the vendor has proposed changes to Section 14, send me the redline and I will review it.',
      ],
      footnote: `Sources: ${vendorDocs.template} · ${vendorDocs.dpa} · ${vendorDocs.memo}`,
    },
  },
  steps: [
    { actor: 'Procurement', label: 'Question arrives by email', detail: 'Dana in Procurement emails the Legal Department asking whether the standard vendor agreement covers data return at contract end.', tone: 'done' },
    { actor: 'Maria', label: 'Maria asks Copilot', detail: 'Maria types: "What does our standard vendor agreement say about returning or deleting our data at contract end? Cite the source documents."', tone: 'done' },
    { actor: 'Copilot', label: 'Copilot searches the Z: drive', detail: 'Copilot searches only the Z: legal drive and only returns documents Maria can already open. It finds the template, the addendum and the 2024 memo in the closed matter folder.', tone: 'pass', lines: SCOPE_LINES },
    { actor: 'Copilot', label: 'Copilot summarizes with citations', detail: 'Copilot answers: the vendor must return the data, or delete it and certify the deletion, within 30 days of termination [1]. The addendum follows the same timeline [2]. Prior guidance prefers certified deletion where the vendor keeps backups [3].', tone: 'done' },
    {
      actor: 'Maria', label: 'Maria verifies each citation', detail: 'Maria opens each cited document and confirms the quoted language is there, current and says what the summary says it does.', tone: 'human',
      citations: [
        { doc: vendorDocs.template, location: 'Section 14.3', excerpt: "On termination, Vendor will return all Customer Data or, at Customer's written election, securely delete it and certify the deletion in writing within 30 days.", status: 'verified' },
        { doc: vendorDocs.dpa, location: 'Section 9', excerpt: 'Return or deletion of personal data at the end of the services follows the timeline set in the governing agreement.', status: 'verified' },
        { doc: vendorDocs.memo, location: 'Page 2', excerpt: 'Where a vendor keeps backups, negotiate certified deletion rather than return.', status: 'verified' },
      ],
    },
    { actor: 'Copilot', label: 'Copilot drafts the reply', detail: 'Copilot drafts a short reply to Procurement from the verified findings, quoting Section 14.3 and naming the sources.', tone: 'done' },
    { actor: 'Maria', label: 'Maria edits and finalizes', detail: 'Maria tightens the wording and adds an offer to review any redline of Section 14. The reply is for internal use, so no further approval is needed.', tone: 'human' },
    { actor: 'Procurement', label: 'Procurement receives the answer', detail: 'Procurement has its answer the same afternoon.', tone: 'pass' },
  ],
  outcome: { tone: 'ok', label: 'Draft reviewed by Maria before use' },
  evidence: [
    {
      source: 'Purview audit', activity: 'CopilotInteraction',
      fields: [
        { k: 'User', v: MARIA.upn },
        { k: 'App', v: 'Microsoft 365 Copilot (Chat)' },
        { k: 'Resources referenced', v: `${vendorDocs.template}; ${vendorDocs.dpa}; ${vendorDocs.memo}` },
      ],
    },
    {
      source: 'Legal review log', activity: 'CitationCheck',
      fields: [
        { k: 'Reviewer', v: `${MARIA.name}, ${MARIA.role}` },
        { k: 'Verified', v: '3 of 3 citations' },
        { k: 'Use', v: 'Internal' },
      ],
    },
  ],
  facts: {
    user: MARIA.upn,
    activity: 'Prepare a legal response: vendor data return at contract end',
    information: [vendorDocs.template, vendorDocs.dpa, vendorDocs.memo],
    protections: ["Copilot search limited to Maria's Z: drive permissions"],
    humanReview: 'Maria verified 3 citations and edited the Copilot draft before use',
    action: 'Internal reply sent to Procurement',
  },
}

// ── 1:30 · A Request Falls Outside Maria's Role (slide 18) ──────────────────

const NOTES_DOC = 'Negotiation Notes.docx'
const OTHER_MATTER = 'Legal > Matters > LM-2026-0388'

const outsideRun: MariaRun = {
  id: 'run',
  label: 'Negotiation notes from another matter',
  screen: {
    app: 'Microsoft 365 Copilot (Chat)',
    ask: { from: 'A colleague', text: '"Can you use Copilot to pull the negotiation notes from that other matter?"' },
    prompt: 'Pull the negotiation notes from that other matter.',
    response: {
      kind: 'nothing',
      text: ["I couldn't find any negotiation notes you have access to for that matter."],
      footnote: 'Copilot does not reveal that the file exists.',
    },
  },
  steps: [
    { actor: 'Colleague', label: 'A colleague asks Maria', detail: '"Can you use Copilot to pull the negotiation notes from that other matter?"', tone: 'done' },
    { actor: 'Maria', label: 'Maria asks Copilot', detail: 'Maria asks: "Pull the negotiation notes from that other matter."', tone: 'done' },
    { actor: 'Copilot', label: 'Copilot searches only content Maria can open', detail: "Copilot inherits Maria's existing permissions.", tone: 'pass' },
    { actor: 'SharePoint', label: 'Matter permissions', detail: 'The notes exist, in a matter Maria is not assigned to.', tone: 'fail', lines: [NOTES_DOC, `${OTHER_MATTER} (Maria is not assigned)`, 'Maria is not a member of LM-2026-0388'] },
    { actor: 'Copilot', label: 'File is never retrieved', detail: 'File is never retrieved, so no label or DLP check is needed.', tone: 'done' },
    { actor: 'Purview', label: 'Evidence is generated', detail: 'Activity / audit record.', tone: 'done', lines: ['CopilotInteraction written to Purview Audit: no resources accessed'] },
  ],
  outcome: { tone: 'ok', label: "Not surfaced · outside Maria's permitted scope" },
  evidence: [{
    source: 'Purview audit', activity: 'CopilotInteraction',
    fields: [
      { k: 'User', v: MARIA.upn },
      { k: 'App', v: 'Microsoft 365 Copilot (Chat)' },
      { k: 'Resources accessed', v: 'None' },
      { k: 'Result', v: 'No permitted content found' },
    ],
  }],
  facts: {
    user: MARIA.upn,
    activity: 'A request falls outside Maria\'s role: negotiation notes from another matter',
    information: [],
    protections: ['Matter permissions on LM-2026-0388', 'Permission-trimmed Copilot search'],
    restricted: 'Negotiation notes in matter LM-2026-0388 not surfaced (Maria is not assigned)',
    action: 'Request restricted; nothing retrieved',
  },
}

// ── 2:30 · Prepare Information for Sharing (slide 19): notify and restrict ──

const STAKEHOLDER = 'account.manager@supplier.example'
const SHARE_QUESTION = '"Can this information be shared in this form, with this person, for this purpose?"'
const JUSTIFICATION = 'Business need: renewal discussion with the supplier'

function shareRun(mode: 'notify' | 'restrict'): MariaRun {
  const notify = mode === 'notify'
  return {
    id: 'run',
    label: notify ? 'Notify (policy tip)' : 'Restrict (block)',
    screen: {
      app: 'Outlook',
      prompt: 'Prepare a summary of the renewal position for our business stakeholder at the supplier.',
      sources: [{ name: `Message to ${STAKEHOLDER}`, label: CONF, tone: 'confidential' }],
      response: notify
        ? {
            kind: 'tip',
            text: ['Policy tip: this message contains Confidential legal content and is addressed outside BCBSVT. Copilot-assisted work product needs Chief Legal Officer approval before external release.'],
            footnote: `Maria overrides with a business justification: "${JUSTIFICATION}". The message is sent and the override is recorded.`,
          }
        : {
            kind: 'blocked',
            text: ["Message blocked: Confidential legal content can't be sent outside BCBSVT from this account. Route the work product for Chief Legal Officer release."],
            footnote: 'Nothing leaves the tenant. Maria routes the work product for Chief Legal Officer release.',
          },
    },
    steps: [
      { actor: 'Maria', label: 'Maria asks Copilot to prepare the summary', detail: 'Maria asks: "Prepare a summary of the renewal position for our business stakeholder at the supplier."', tone: 'done' },
      { actor: 'Copilot', label: 'Copilot drafts the summary', detail: 'The draft inherits the label of its source.', tone: 'done', lines: [`Label inherited: ${CONF}`] },
      { actor: 'Maria', label: 'Maria addresses the message', detail: 'Outlook > New message.', tone: 'done', lines: [`To: ${STAKEHOLDER}`] },
      { actor: 'Purview', label: 'Purview evaluates', detail: SHARE_QUESTION, tone: 'warn', lines: [`Label on message: ${CONF}`, 'Recipient is outside the BCBSVT domain', 'DLP policy "Legal – external sharing": MATCH'] },
      notify
        ? { actor: 'Purview', label: 'Policy behavior occurs', detail: 'Notify mode: policy tip.', tone: 'warn', lines: ['Notified · override with justification', `Justification: ${JUSTIFICATION}`] }
        : { actor: 'Purview', label: 'Policy behavior occurs', detail: 'Restrict mode: block.', tone: 'fail', lines: ['Restricted · send blocked', 'Alert sent to Legal compliance queue'] },
      { actor: 'Purview', label: 'Evidence is generated', detail: 'Policy match and activity / audit record.', tone: 'done', lines: ['DLPRuleMatch written to Purview Audit and Activity explorer'] },
    ],
    outcome: notify ? { tone: 'warn', label: 'Notified · override with justification' } : { tone: 'block', label: 'Restricted · send blocked' },
    evidence: [{
      source: 'Purview audit', activity: 'DLPRuleMatch',
      fields: notify
        ? [{ k: 'Policy', v: 'Legal – external sharing' }, { k: 'Location', v: 'Exchange Online' }, { k: 'Action', v: 'Policy tip shown · user override' }, { k: 'Justification', v: JUSTIFICATION }]
        : [{ k: 'Policy', v: 'Legal – external sharing' }, { k: 'Location', v: 'Exchange Online' }, { k: 'Action', v: 'Blocked' }, { k: 'Alert', v: 'Sent to Legal compliance queue' }],
    }],
    facts: {
      user: MARIA.upn,
      activity: `Prepare information for sharing with ${STAKEHOLDER} (${notify ? 'notify' : 'restrict'} mode)`,
      information: [`Copilot summary of the renewal position (${CONF})`],
      protections: [`Sensitivity label ${CONF}`, 'DLP policy "Legal – external sharing"'],
      restricted: notify ? undefined : `External send to ${STAKEHOLDER} blocked by DLP "Legal – external sharing"`,
      humanReview: notify ? `Maria gave a business justification to override the policy tip: "${JUSTIFICATION}"` : undefined,
      action: notify ? 'Message sent with a recorded override' : 'Send blocked; routed for Chief Legal Officer release',
    },
  }
}

const SHARE_DECK: Pick<MariaCard, 'time' | 'title' | 'headline' | 'what' | 'where' | 'deck' | 'day'> = {
  time: '2:30 PM',
  title: 'Prepare Information for Sharing',
  headline: 'Maria is ready to share her work',
  what: { text: ['Maria prepares information for a business stakeholder.', 'Before sending it, another question arises:', SHARE_QUESTION] },
  where: ['Outlook (Exchange Online)', 'Microsoft Purview: sensitivity labels, DLP policy "Legal – external sharing"'],
  deck: [
    { k: 'What could go wrong?', v: ['Information that is appropriate for internal legal work may not be appropriate for external or broader distribution.'] },
    { k: 'What does the organization require?', v: ['Information must be protected according to:', 'Sensitivity', 'Intended recipient', 'Business purpose', 'Applicable policy', 'Regulatory requirements'] },
    { k: 'What does Maria experience?', v: ['The organization helps prevent inappropriate disclosure while allowing legitimate business communication.'] },
  ],
  day: { activity: 'Share information', experience: 'Appropriate sharing', risk: 'Inappropriate disclosure', control: 'Sharing protections' },
}

// ── 3:30 · A Legal Decision Requires Human Judgment (slide 20), from case LR-2026-0427 ─

const licenseDocs = {
  license: 'Software License Agreement, document management vendor (2023)',
  memo: 'Memo: Required terms for technology renewals (2025)',
  template: 'Letter template: Renewal on existing terms (2024)',
}

const LETTER = [
  'Thank you for your letter proposing to renew the Software License Agreement for one additional 12-month term on current terms.',
  'We agree to the renewal under Section 3.2, subject to your written confirmation that the data return and security terms of the current agreement continue to apply during the renewal term.',
  'Please send a signed renewal amendment for our review within 15 business days.',
]
const RETURN_EDIT = 'The renewal amendment must be signed by both parties before the current term ends.'

const cloRecord = (decision: string) => ({
  source: 'Legal approval log', activity: 'ReleaseApproval',
  fields: [
    { k: 'Request', v: 'LR-2026-0427' },
    { k: 'Prepared by', v: `${MARIA.name}, ${MARIA.role}` },
    { k: 'Approver', v: 'Chief Legal Officer' },
    { k: 'Decision', v: decision },
  ],
})

const licenseCitationCheck = {
  source: 'Legal review log', activity: 'CitationCheck',
  fields: [
    { k: 'Reviewer', v: `${MARIA.name}, ${MARIA.role}` },
    { k: 'Verified', v: '3 of 3 citations' },
    { k: 'Use', v: 'External' },
  ],
}

const licenseFacts = (decision: string): MariaFacts => ({
  user: MARIA.upn,
  activity: 'Legal decision: renewal of the document management license',
  information: [licenseDocs.license, licenseDocs.memo, licenseDocs.template],
  protections: ["Copilot search limited to Maria's Z: drive permissions", 'Chief Legal Officer approval for external release'],
  humanReview: `Maria verified 3 citations; the Chief Legal Officer ${decision}`,
  action: 'Renewal letter released to the document management vendor',
})

const decisionRun: MariaRun = {
  id: 'run',
  label: 'Reply letter on a software license renewal',
  screen: {
    app: 'Microsoft 365 Copilot (Chat)',
    ask: { from: 'Tom Hadley, IT Vendor Management', text: "Tom in IT Vendor Management forwards the vendor's renewal letter and asks Legal to prepare a reply." },
    prompt: 'Can we agree to renew our document management contract and help prepare the letter',
    sources: [{ name: licenseDocs.license }, { name: licenseDocs.memo }, { name: licenseDocs.template }],
    response: { kind: 'answer', title: 'Letter to Contracts Team, document management vendor', text: LETTER },
  },
  steps: [
    { actor: 'IT Vendor Management', label: 'Request arrives by email', detail: "Tom in IT Vendor Management forwards the vendor's renewal letter and asks Legal to prepare a reply.", tone: 'done' },
    { actor: 'Maria', label: 'Maria asks Copilot', detail: 'Maria asks Copilot: "Can we agree to renew our document management contract and help prepare the letter"', tone: 'done' },
    { actor: 'Copilot', label: 'Copilot searches the Z: drive', detail: "Copilot finds the signed agreement even though it is filed under the vendor's old company name, along with the 2025 renewal memo and the letter template.", tone: 'pass', lines: SCOPE_LINES },
    { actor: 'Copilot', label: 'Copilot summarizes with citations', detail: 'Copilot answers: the agreement allows one more 12-month term by mutual written agreement [1]. Renewal guidance requires confirming the data return and security terms [2]. A renewal letter template exists [3].', tone: 'done' },
    {
      actor: 'Maria', label: 'Maria verifies each citation', detail: 'Maria opens each document, confirms the clause and the memo requirement, and confirms the agreement on file is the signed version.', tone: 'human',
      citations: [
        { doc: licenseDocs.license, location: 'Section 3.2', excerpt: 'This Agreement may be renewed for one additional 12-month term by mutual written agreement.', status: 'verified' },
        { doc: licenseDocs.memo, location: 'Page 1', excerpt: 'Renewals with vendors that hold our data must confirm that the data return and security terms continue to apply.', status: 'verified' },
        { doc: licenseDocs.template, location: 'Whole document', excerpt: 'Standard structure for accepting a renewal on existing terms, with conditions.', status: 'verified' },
      ],
    },
    { actor: 'Copilot', label: 'Copilot drafts the letter', detail: 'Copilot drafts the reply from the template, citing Section 3.2 and adding the conditions from the renewal memo.', tone: 'done' },
    { actor: 'Maria', label: 'Maria edits and finalizes', detail: 'Maria edits the draft and marks it for external use. Because it is Copilot-assisted work product going outside BCBSVT, it goes to the Chief Legal Officer before release.', tone: 'human' },
    { actor: 'Chief Legal Officer', label: 'Waiting for Chief Legal Officer review', detail: "The letter is in the Chief Legal Officer's queue with the verified citations attached.", tone: 'human' },
  ],
  outcome: { tone: 'ok', label: 'Released after Chief Legal Officer approval' },
  evidence: [],
  facts: licenseFacts('approved release'),
  branch: {
    title: 'Chief Legal Officer decision',
    summary: 'Copilot-assisted letter to an outside vendor. Release needs Chief Legal Officer approval.',
    checks: [
      'Maria verified every citation against the source document',
      'Letter only commits us to terms already in the signed agreement',
      'No privileged analysis appears in the letter',
      'Letter gives the vendor a deadline to respond',
    ],
    options: [
      {
        id: 'approve',
        label: 'Approve release',
        tone: 'ok',
        steps: [
          { actor: 'Chief Legal Officer', label: 'Release approved', detail: 'The Chief Legal Officer approves the letter. IT Vendor Management sends it to the vendor.', tone: 'pass' },
        ],
        response: { kind: 'answer', title: 'Letter to Contracts Team, document management vendor', text: LETTER, footnote: 'Released after Chief Legal Officer approval.' },
        outcome: { tone: 'ok', label: 'Released · approved by the Chief Legal Officer' },
        evidence: [licenseCitationCheck, cloRecord('Approved')],
        facts: licenseFacts('approved release'),
      },
      {
        id: 'return',
        label: 'Return with edits',
        tone: 'warn',
        steps: [
          { actor: 'Maria', label: 'Returned to Maria', detail: 'The Chief Legal Officer asks Maria to state that the renewal amendment must be signed before the current term ends. Maria adds the sentence.', tone: 'warn' },
          { actor: 'Chief Legal Officer', label: 'Release approved after edits', detail: 'The Chief Legal Officer approves the revised letter. IT Vendor Management sends it to the vendor.', tone: 'pass' },
        ],
        response: { kind: 'answer', title: 'Letter to Contracts Team, document management vendor', text: [...LETTER, RETURN_EDIT], footnote: 'Released after edits and Chief Legal Officer approval.' },
        outcome: { tone: 'ok', label: 'Released after edits · approved by the Chief Legal Officer' },
        evidence: [licenseCitationCheck, cloRecord('Returned with edits, then approved')],
        facts: licenseFacts('returned it with edits, then approved release'),
      },
    ],
  },
}

// ── The 14 cards, in the order of Maria's day ───────────────────────────────

const identityCard = (id: string, scenario: string, n: number, variant: string): MariaCard => ({
  ...START_DECK,
  id,
  variant,
  basedOn: { label: `Demo 1 · Scenario ${n}`, to: `/prior/legal/demo/identity?sc=${scenario}` },
  runs: [identityRun(scenario)],
})

export const MARIA_CARDS: MariaCard[] = [
  identityCard('0830-start', 'maria', 1, 'Managed laptop'),
  identityCard('0830-byod', 'maria-byod', 2, 'Personal laptop'),
  identityCard('0830-claims', 'claims', 3, 'Non-Legal user'),
  identityCard('0830-mfa', 'maria-mfa', 4, 'MFA not completed'),
  {
    id: '0900-contract',
    time: '9:00 AM',
    title: 'Review an Assigned Contract',
    headline: 'Maria asks Copilot to help review a contract',
    what: {
      text: ['Maria is assigned a supplier agreement.', 'She asks Copilot to help identify termination obligations :'],
      bullets: ['Should the asset be Returned or Deleted?', 'Termination provisions', 'Within how Many days ?', 'Supplier obligations', 'Key changes from the previous version'],
    },
    where: ['Microsoft 365 Copilot in Word', SUPPLIER_PATH, 'Microsoft Purview: sensitivity label, DLP for Copilot'],
    basedOn: { label: 'Demo 2 · Scenario 1 (new content on this page)', to: '/prior/legal/demo/data-protection?sc=confidential' },
    deck: [
      { k: 'What could go wrong?', v: ['AI could expose information from matters Maria is not authorized to access or combine information from unrelated work.'] },
      { k: 'What does the organization require?', v: ['AI-assisted work must remain within the information and business activities Maria is authorized to perform.'] },
      { k: 'What does Maria experience?', v: ['Copilot helps with the contract Maria is working on - without opening the door to unrelated matters.'] },
    ],
    principle: { k: 'Business outcome', v: 'Maria gets assistance within the boundaries of her work.' },
    day: { activity: 'Review contract', experience: 'Relevant assistance', risk: 'Unrelated information exposed', control: 'Authorized use' },
    runs: [contractRun],
  },
  {
    id: '1000-find',
    time: '10:00 AM',
    title: 'Find Information',
    headline: 'Maria needs information to answer a legal question',
    what: {
      text: ['Maria asks:', '“How long do we keep files for a broker agreement after the agreement ends?"', 'Copilot helps Maria locate relevant information.'],
    },
    where: ['Microsoft 365 Copilot (Chat)', 'Z: legal drive, within Maria\'s permissions'],
    basedOn: { label: 'Case simulation · LR-2026-0419', to: '/prior/legal/simulate?case=broker-file-retention' },
    deck: [
      { k: 'The question is not:', v: ['"Can Copilot find information?"'] },
      { k: 'The question is:', v: ['"Which information should Maria be able to find?"'] },
      { k: 'What does the organization require?', v: ["Information should be available according to the worker's role, business need and authorization."] },
      { k: 'What does Maria experience?', v: ['Relevant information is available. Information outside her authorized work remains outside the conversation.'] },
    ],
    principle: { k: 'Governance principle', v: 'Access should follow business responsibility - not simply information availability.' },
    day: { activity: 'Find information', experience: 'Relevant information', risk: 'Information outside role retrieved', control: 'Information access boundaries' },
    runs: [findRun],
  },
  {
    id: '1030-sensitive',
    time: '10:30 AM',
    title: 'Work With Sensitive Information',
    headline: 'Maria encounters sensitive information',
    what: {
      text: ['The contract and related documents may contain information that requires additional protection.', 'Depending on the matter, information may involve:'],
      bullets: ['Confidential legal information', 'Personal information', 'Business-sensitive information', 'Regulated information, where applicable'],
    },
    where: ['Microsoft 365 Copilot in Word', 'Legal > Litigation > Privileged', 'Microsoft Purview: sensitivity labels, DLP policy "Legal – Copilot privileged content"'],
    basedOn: { label: 'Demo 2 · Scenario 2', to: '/prior/legal/demo/data-protection?sc=privileged' },
    deck: [
      { k: 'What could go wrong?', v: ['Information could be exposed, combined, retained or shared in ways that are inconsistent with its sensitivity or applicable obligations.'] },
      { k: 'What does the organization require?', v: ['The way information is handled must reflect:', 'Sensitivity + Purpose + Applicable Policy + Regulatory Obligation'] },
      { k: 'What does Maria experience?', v: ['The information receives the level of protection required for the work she is performing.'] },
    ],
    day: { activity: 'Work with sensitive data', experience: 'Appropriate safeguards', risk: 'Inappropriate handling', control: 'Protection requirements' },
    runs: [sensitiveRun],
  },
  {
    id: '1100-needed',
    time: '11:00 AM',
    title: 'Use Only What Is Needed',
    headline: 'Maria needs an answer - not every piece of information',
    what: {
      text: ['Maria needs to understand:'],
      bullets: ['Renewal date', 'Termination notice period', 'Supplier obligations'],
      after: ["But does she need the supplier's entire legal history?"],
    },
    where: ['Microsoft 365 Copilot (Chat)', SUPPLIER_PATH, 'Purview Audit: resources referenced by each interaction'],
    deck: [
      { k: 'The question', v: ['"Does the AI need all of this information to perform this task?"'] },
      { k: 'What does the organization require?', v: ['Use information appropriate to the business purpose.', 'Avoid unnecessary exposure of information simply because it is available.'] },
      { k: 'What does Maria experience?', v: ['She can accomplish the task without unnecessarily expanding the information involved.'] },
    ],
    principle: { k: 'Business principle', v: 'Use what is needed for the work - not everything that happens to be available.' },
    day: { activity: 'Use only what is needed', experience: 'Focused information', risk: 'Unnecessary information exposed', control: 'Purpose-based use' },
    runs: [broadRun, focusedRun],
  },
  {
    id: '1200-response',
    time: '12:00 PM',
    title: 'Prepare a Legal Response',
    headline: 'Copilot helps Maria prepare a response',
    what: { text: ['Maria asks Copilot to draft a response based on the contract and relevant information.', 'Copilot produces a draft.'] },
    where: ['Microsoft 365 Copilot (Chat)', "Z: legal drive, within Maria's permissions"],
    basedOn: { label: 'Case simulation · LR-2026-0412', to: '/prior/legal/simulate?case=vendor-data-return' },
    deck: [
      { k: 'What could go wrong?', v: ['The response could contain:', 'An incorrect interpretation', 'Missing context', 'Unsupported conclusions', 'Information that should not be disclosed'] },
      { k: 'What does the organization require?', v: ['AI-generated content must be reviewed appropriately before it is relied upon for consequential legal work.'] },
      { k: 'What does Maria experience?', v: ['Copilot accelerates the work. Maria reviews the result before using it.'] },
    ],
    principle: { k: 'Key principle', v: 'AI assists the professional. It does not replace professional accountability.' },
    day: { activity: 'Prepare response', experience: 'AI-assisted drafting', risk: 'Incorrect AI-generated content', control: 'Human review' },
    runs: [responseRun],
  },
  {
    id: '1330-outside',
    time: '1:30 PM',
    title: "A Request Falls Outside Maria's Role",
    headline: 'Someone asks Maria for information from another legal matter',
    what: {
      text: ['A colleague asks:', '"Can you use Copilot to pull the negotiation notes from that other matter?"'],
      bullets: ['Maria is in the Legal department.', 'The information exists.', 'She has access to Copilot.'],
      after: ["So why shouldn't she simply retrieve it?", 'Because being able to use AI does not mean being authorized to access every piece of information.'],
    },
    where: ['Microsoft 365 Copilot (Chat)', `${OTHER_MATTER} (Maria is not assigned)`, 'SharePoint matter permissions'],
    basedOn: { label: 'Demo 2 · Scenario 4 (new content on this page)', to: '/prior/legal/demo/data-protection?sc=restricted' },
    deck: [
      { k: 'What does the organization require?', v: ['Access must reflect:', 'Who the worker is + What they are doing + Why they need the information'] },
      { k: 'What does Maria experience?', v: ['The request is restricted because the information is outside the permitted scope of her work.'] },
    ],
    principle: { k: 'Governance principle', v: 'Authorization follows the business need - not the existence of the information.' },
    day: { activity: 'Request outside role', experience: 'Request restricted', risk: 'Unauthorized access', control: 'Authorization boundary' },
    runs: [outsideRun],
  },
  {
    ...SHARE_DECK,
    id: '1430-share-notify',
    variant: 'Notify (policy tip)',
    basedOn: { label: 'Demo 2 · Scenario 3, notify mode (new content on this page)', to: '/prior/legal/demo/data-protection?sc=external' },
    runs: [shareRun('notify')],
  },
  {
    ...SHARE_DECK,
    id: '1430-share-restrict',
    variant: 'Restrict (block)',
    basedOn: { label: 'Demo 2 · Scenario 3, restrict mode (new content on this page)', to: '/prior/legal/demo/data-protection?sc=external&mode=restrict' },
    runs: [shareRun('restrict')],
  },
  {
    id: '1530-decision',
    time: '3:30 PM',
    title: 'A Legal Decision Requires Human Judgment',
    headline: 'Copilot provides a recommendation',
    what: {
      text: ['Maria asks Copilot:', '“Can we agree to renew our document management contract and help prepare the letter"', 'Copilot produces an answer.', 'Now the critical question:', 'Can Maria simply accept the AI-generated answer?'],
      after: ['No technology can remove the need for appropriate human accountability in a consequential legal decision.'],
    },
    where: ['Microsoft 365 Copilot (Chat)', "Z: legal drive, within Maria's permissions", 'Chief Legal Officer release approval'],
    basedOn: { label: 'Case simulation · LR-2026-0427', to: '/prior/legal/simulate?case=license-renewal-letter' },
    deck: [
      { k: 'What does the organization require?', v: ['The accountable Legal professional must:', 'Review the AI output', 'Validate the relevant facts', 'Apply professional judgment', 'Make or approve the consequential decision'] },
      { k: 'What does Maria experience?', v: ['Copilot assists. Maria remains accountable.'] },
    ],
    principle: { k: 'Governance principle', v: 'The more consequential the decision, the clearer the human accountability must be.' },
    day: { activity: 'Make legal decision', experience: 'Professional review', risk: 'AI replaces human judgment', control: 'Human accountability' },
    runs: [decisionRun],
  },
  // 4:30 · Can the Organization Prove What Happened: hidden for now. Uncomment to bring it back.
  // {
  //   id: '1630-prove',
  //   time: '4:30 PM',
  //   title: 'Can the Organization Prove What Happened',
  //   headline: "Maria's workday is almost over",
  //   what: {
  //     text: ['Throughout the day, AI has helped Maria:'],
  //     bullets: ['Find information', 'Review documents', 'Prepare content', 'Analyze information', 'Develop a legal response'],
  //     after: ['But governance is not complete simply because controls operated.'],
  //   },
  //   where: ["Today's sign-in, audit and review records from the cards above (this page's log)"],
  //   deck: [
  //     { k: 'The organization also needs to know:', v: ['Who used AI?', 'What business activity was being performed?', 'What information was involved?', 'What protections applied?', 'When was access restricted?', 'Where was human review required?', 'What decision or action resulted?', 'What evidence remains?'] },
  //     { k: 'The question', v: ['"Can we prove that governance operated when it mattered?"'] },
  //   ],
  //   principle: { k: 'Business outcome', v: 'The organization can demonstrate how AI was used and how the associated risks were managed.' },
  //   day: { activity: 'End the day', experience: 'Governable activity', risk: 'No evidence of governance', control: 'Monitoring & evidence' },
  //   runs: [],
  //   prove: true,
  // },
]

// ── 4:30 review: the eight questions on slide 21 ────────────────────────────

export type ProveKey = 'who' | 'activity' | 'information' | 'protections' | 'restricted' | 'review' | 'action' | 'evidence'

export const PROVE_QUESTIONS: { key: ProveKey; q: string; hint: string[] }[] = [
  { key: 'who', q: 'Who used AI?', hint: ['0830-start'] },
  { key: 'activity', q: 'What business activity was being performed?', hint: ['0900-contract', '1000-find'] },
  { key: 'information', q: 'What information was involved?', hint: ['0900-contract', '1000-find', '1100-needed'] },
  { key: 'protections', q: 'What protections applied?', hint: ['0830-start', '1030-sensitive', '1430-share-notify'] },
  { key: 'restricted', q: 'When was access restricted?', hint: ['0830-byod', '1030-sensitive', '1330-outside', '1430-share-restrict'] },
  { key: 'review', q: 'Where was human review required?', hint: ['1000-find', '1200-response', '1530-decision'] },
  { key: 'action', q: 'What decision or action resulted?', hint: ['1530-decision'] },
  { key: 'evidence', q: 'What evidence remains?', hint: ['0830-start', '1030-sensitive'] },
]

export const INTRO = {
  title: 'Meet Maria',
  subtitle: 'A Day in the Life of a Legal Professional',
  lead: 'Maria uses Copilot as part of her normal workday.',
  questions: [
    'What is Maria allowed to do?',
    'What information is appropriate to use?',
    'What protections are required?',
    'When must Maria make the decision herself?',
    'What can the organization prove afterward?',
  ],
}
