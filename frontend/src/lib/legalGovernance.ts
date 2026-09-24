// AI Governance Framework content for the /prior/legal demo, taken from the client deck
// "Copilot Governance Framework Demonstration" (Assess, Control, Implement, Prove).
// Frontend-only. People, accounts and log entries are fictitious; error codes and
// product names are shown for illustration and are not read from a live tenant.

export type Phase = 'Start' | 'Assess' | 'Control & Implement' | 'Prove' | 'Decide'
export type ReqId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6'

// ── Demo route order ───────────────────────────────────────────────────────
// Drives the grouped tabs, the Previous / Next footer and the presenter notes.

export interface DemoStop {
  to: string
  label: string
  phase: Phase
  /** Deck slides this screen goes with. */
  slides: string
  minutes: number
  /** One-line purpose, shown in the run of show. */
  purpose: string
  /** Presenter notes: what to show, what to say. */
  show: string[]
  say: string[]
  optional?: boolean
}

export const DEMO_STOPS: DemoStop[] = [
  {
    to: '/prior/legal',
    label: 'Demo guide',
    phase: 'Start',
    slides: '1 to 4',
    minutes: 2,
    purpose: 'Frame the decision: can this AI use case operate under conditions we can enforce and prove?',
    show: ['The four-stage lifecycle', 'The governance chain from use case to decision'],
    say: [
      '"Can we deploy Copilot?" is a technology question. The real decision is whether this use case can run under conditions BCBSVT can enforce and prove.',
      'We start with the use case, work out what must be true, then make it enforceable and provable.',
    ],
  },
  {
    to: '/prior/legal/use-case',
    label: 'Use case',
    phase: 'Assess',
    slides: '5 to 7',
    minutes: 3,
    purpose: 'What exactly are we governing? The Legal research use case, today and with Copilot.',
    show: ['How it works strip', 'Today and business case figures', 'Current and future swimlanes', 'The four safeguards'],
    say: [
      'Copilot for Legal was selected from a prioritized pipeline: business value, feasibility, risk and strategic fit.',
      'Note who is involved and what the AI touches: attorneys, the Z: legal drive, privileged documents, prompts and responses.',
    ],
  },
  {
    to: '/prior/legal/simulate',
    label: 'Case simulation',
    phase: 'Assess',
    slides: '7',
    minutes: 3,
    optional: true,
    purpose: 'What the AI does in practice, and why a person stays in charge of every output.',
    show: ['LR-2026-0419 with Copilot, stop at the outdated-source step', 'Optionally LR-2026-0427 to the CLO decision'],
    say: [
      'Copilot cited a superseded memo. The attorney caught it. That is requirement R4, human oversight, working in the process.',
    ],
  },
  {
    to: '/prior/legal/controls',
    label: 'Requirements & controls',
    phase: 'Control & Implement',
    slides: '8 to 12',
    minutes: 5,
    purpose: 'Follow the data, name what could go wrong, turn risk into six requirements, and show where each control runs.',
    show: ['Follow the data', 'Seven risk lenses', 'Select R1 and walk the trace', 'Tenant map highlights where R1 runs'],
    say: [
      'Privacy depends on the data, not the app name.',
      'Risk tells us what could go wrong. The requirement tells us what must be true. Only then do we choose technology.',
      'Every control in the tenant traces back to a finding in the assessment.',
    ],
  },
  {
    to: '/prior/legal/demo/identity',
    label: 'Demo 1 · Entra ID',
    phase: 'Prove',
    slides: '13',
    minutes: 4,
    purpose: 'Who can use Copilot? R1 becomes an enforceable identity boundary that leaves evidence.',
    show: ['Scenario 1: Maria on her managed laptop, access granted', 'Scenario 2: same user on a personal laptop, blocked', 'Scenario 3: a Claims user, blocked'],
    say: [
      'Same person, different device, different answer. The policy decides, not the user.',
      'Each attempt writes a sign-in record with the policy result. That record is the evidence.',
    ],
  },
  {
    to: '/prior/legal/demo/data-protection',
    label: 'Demo 2 · Purview',
    phase: 'Prove',
    slides: '14',
    minutes: 5,
    purpose: 'What happens to sensitive information? R2 and R3 operating inside Copilot, with audit evidence.',
    show: ['Scenario 1: Confidential memo, summary carries the label', 'Scenario 2: Privileged file, excluded by DLP', 'Scenario 3: privileged text sent outside, policy tip or block', 'Scenario 4: a file Maria cannot open never appears'],
    say: [
      'The requirement identified in the assessment is now operating inside the technology, and it leaves evidence behind.',
    ],
  },
  {
    to: '/prior/legal/decision',
    label: 'Evidence & decision',
    phase: 'Decide',
    slides: '15 to 18',
    minutes: 3,
    purpose: 'Follow one requirement end to end, then make the governance decision on the evidence just produced.',
    show: ['Requirement status fills in from the demos', 'Approve with conditions', 'Technology-led versus governance-led'],
    say: [
      'Copilot is the demonstration. The framework is the value.',
      'Copilot for Legal is approved on evidence, not on intent.',
    ],
  },
  {
    to: '/prior/legal/security',
    label: 'Security posture',
    phase: 'Decide',
    slides: 'Appendix',
    minutes: 0,
    optional: true,
    purpose: 'Backup detail: NIST CSF 2.0 posture, risk register and crosswalks from the CPRM workbook.',
    show: ['Posture tiles', 'NIST CSF wheel', 'Approval trail'],
    say: ['Use this for questions on control coverage and framework mapping.'],
  },
]

export const slidesLabel = (s: DemoStop) => (/^\d/.test(s.slides) ? `Deck slides ${s.slides}` : s.slides)

export const PHASES: Phase[] = ['Start', 'Assess', 'Control & Implement', 'Prove', 'Decide']

// ── Lifecycle and chain (deck slides 3 and 4) ──────────────────────────────

export const LIFECYCLE = [
  { n: '01', name: 'Assess', q: 'What will the AI do, what does it touch, and what could go wrong?', out: 'Risk and requirement profile' },
  { n: '02', name: 'Control', q: 'What must be true, and which control functions make it enforceable?', out: 'Control requirements' },
  { n: '03', name: 'Implement', q: 'How are those controls built into the environment?', out: 'Configured controls' },
  { n: '04', name: 'Prove', q: 'Can we show the controls actually work?', out: 'Decision based on evidence' },
]

export const CHAIN = [
  { k: 'Use case', q: 'What will AI do?' },
  { k: 'Risk', q: 'What could go wrong?' },
  { k: 'Requirement', q: 'What must be true?' },
  { k: 'Control', q: 'How is it enforced?' },
  { k: 'Evidence', q: 'How do we prove it?' },
  { k: 'Decision', q: 'Approve on evidence' },
]

// ── Assess: follow the data (slide 8) and seven lenses (slide 9) ───────────

export const DATA_ELEMENTS = [
  { name: 'User identity', q: 'Who can access it?', req: 'R1' as ReqId },
  { name: 'Legal documents', q: 'Who is authorized to see them?', req: 'R2' as ReqId },
  { name: 'Confidential information', q: 'How is it protected?', req: 'R3' as ReqId },
  { name: 'Personal information', q: 'Is its use appropriate and necessary?', req: 'R3' as ReqId },
  { name: 'Prompt content', q: 'Could sensitive information be entered?', req: 'R5' as ReqId },
  { name: 'AI response', q: 'How is it reviewed and used?', req: 'R4' as ReqId },
]

export const LENSES = [
  { name: 'Governance', q: 'Who is accountable? Which policies and decisions apply?' },
  { name: 'Safety', q: 'Could the AI produce harmful or inappropriate outcomes?' },
  { name: 'Security', q: 'Could the capability or its data be compromised or misused?' },
  { name: 'Privacy', q: 'What personal or sensitive information is involved?' },
  { name: 'Accountability', q: 'Who owns the use case and approves its use?' },
  { name: 'Data', q: 'What information does it access and generate?' },
  { name: 'Human oversight', q: 'Who reviews AI output before consequential use?' },
]

export const PERSPECTIVES = [
  { name: 'AI Governance', items: 'Risk · Accountability · Human oversight · AI trustworthiness' },
  { name: 'Security & Privacy', items: 'Access · Data protection · Security safeguards · Privacy · Operational controls' },
  { name: 'Regulatory / Policy', items: 'Laws · Regulations · Contracts · Organizational policies' },
]

// ── Control: six requirements (slides 10, 11, 15) ──────────────────────────

/** Components on the tenant map (slide 12); each requirement lights up the ones it runs on. */
export type TenantPart =
  | 'governance' | 'group' | 'ca' | 'mfa' | 'device' | 'labels' | 'dlp' | 'audit' | 'sharepoint' | 'copilot'

export interface Requirement {
  id: ReqId
  area: string
  must: string
  risk: string
  func: string
  funcDetail: string
  impl: string[]
  evidence: string[]
  parts: TenantPart[]
  /** Where the demo proves it. */
  proof: { label: string; to: string }
}

export const REQUIREMENTS: Requirement[] = [
  {
    id: 'R1', area: 'Identity', must: 'Only authorized users can access the capability',
    risk: 'Unauthorized access to, or disclosure of, privileged legal information',
    func: 'Identity & Access Management', funcDetail: 'Establish, authenticate, authorize and continuously govern access',
    impl: ['Entra ID Legal Department group', 'Conditional Access', 'MFA', 'Compliant device'],
    evidence: ['Group membership', 'Sign-in records', 'Conditional Access policy results', 'Access reviews'],
    parts: ['group', 'ca', 'mfa', 'device'],
    proof: { label: 'Demo 1 · Entra ID', to: '/prior/legal/demo/identity' },
  },
  {
    id: 'R2', area: 'Information', must: 'Users only reach information they are authorized for',
    risk: 'Copilot surfaces legal files a user was never meant to open',
    func: 'Access control · least privilege', funcDetail: 'Copilot answers only from content the signed-in user can already open',
    impl: ['SharePoint permissions on legal repositories', 'Permission-trimmed Copilot grounding'],
    evidence: ['Site permission reports', 'Access reviews', 'Copilot returns no result for restricted files'],
    parts: ['sharepoint', 'copilot'],
    proof: { label: 'Demo 2 · Scenario 4', to: '/prior/legal/demo/data-protection?sc=restricted' },
  },
  {
    id: 'R3', area: 'Protection', must: 'Sensitive information is classified and protected',
    risk: 'Privileged content leaks through prompts, responses or onward sharing',
    func: 'Data protection · DLP', funcDetail: 'Classify content and apply policy wherever it moves',
    impl: ['Purview sensitivity labels', 'DLP policy for Microsoft 365 Copilot', 'DLP on email and Teams', 'Label inheritance on Copilot output'],
    evidence: ['Label and DLP matches', 'Policy tips and overrides', 'DLP alerts'],
    parts: ['labels', 'dlp'],
    proof: { label: 'Demo 2 · Purview', to: '/prior/legal/demo/data-protection' },
  },
  {
    id: 'R4', area: 'AI use', must: 'AI output remains subject to human oversight',
    risk: 'An inaccurate or outdated AI answer is relied on without review',
    func: 'Govern · human oversight', funcDetail: 'A named person checks every output before consequential use',
    impl: ['Citations on every answer', 'Attorney review of every output', 'CLO approval for external release'],
    evidence: ['Citation check records', 'CLO approval records'],
    parts: ['governance', 'copilot'],
    proof: { label: 'Case simulation · LR-2026-0419', to: '/prior/legal/simulate?case=broker-file-retention&s=4' },
  },
  {
    id: 'R5', area: 'Monitoring', must: 'Relevant activity can be detected and investigated',
    risk: 'Misuse or a data exposure goes unnoticed',
    func: 'Detect', funcDetail: 'Record access, AI interactions and policy events for investigation',
    impl: ['Entra sign-in logs', 'Purview Audit (Copilot interactions)', 'Activity explorer', 'DLP alerts'],
    evidence: ['Sign-in log entries', 'Audit and activity records', 'Alert history'],
    parts: ['audit'],
    proof: { label: 'Evidence captured in Demos 1 and 2', to: '/prior/legal/decision' },
  },
  {
    id: 'R6', area: 'Accountability', must: 'Ownership, approval and escalation are defined',
    risk: 'No one owns the use case or answers for its outcomes',
    func: 'Govern', funcDetail: 'Accountability, policy and approval requirements',
    impl: ['AI inventory entry', 'Risk assessment', 'Governance approval', 'Ongoing monitoring'],
    evidence: ['Assessment record', 'Approval record', 'Monitoring evidence'],
    parts: ['governance'],
    proof: { label: 'Evidence & decision', to: '/prior/legal/decision' },
  },
]

export const reqById = (id: ReqId) => REQUIREMENTS.find((r) => r.id === id)!

// ── Demo 1: Entra ID scenarios (slide 13) ──────────────────────────────────

export type CheckId = 'identity' | 'group' | 'ca' | 'mfa' | 'device' | 'signin'
export type CheckResult = 'pass' | 'fail' | 'skip'

export interface IdentityCheck {
  id: CheckId
  label: string
  detail: string
}

export const IDENTITY_CHECKS: IdentityCheck[] = [
  { id: 'identity', label: 'Corporate user identity', detail: 'An enabled Entra ID account in the BCBSVT tenant' },
  { id: 'group', label: 'Legal Department group', detail: 'Copilot is licensed and scoped to this group only' },
  { id: 'ca', label: 'Conditional Access', detail: 'Policy "CA-Legal-Copilot" applies to this sign-in' },
  { id: 'mfa', label: 'MFA', detail: 'A second factor is required and completed' },
  { id: 'device', label: 'Compliant device', detail: 'The device is Intune-managed and compliant' },
  { id: 'signin', label: 'Sign-in to Microsoft Copilot', detail: 'Access token issued inside the identity boundary' },
]

export interface IdentityScenario {
  id: string
  title: string
  who: string
  role: string
  upn: string
  device: string
  location: string
  results: Record<CheckId, CheckResult>
  /** Failure detail shown on the failing check and in the sign-in log. */
  failNote?: string
  errorCode?: string
  outcome: 'granted' | 'blocked'
  takeaway: string
}

export const IDENTITY_SCENARIOS: IdentityScenario[] = [
  {
    id: 'maria',
    title: 'Legal user on a managed laptop',
    who: 'Maria Alvarez', role: 'Attorney, Legal Department', upn: 'maria.alvarez@bcbsvt.demo',
    device: 'BCBSVT-LT-4471 (Windows 11, Intune compliant)', location: 'Berlin, VT office network',
    results: { identity: 'pass', group: 'pass', ca: 'pass', mfa: 'pass', device: 'pass', signin: 'pass' },
    outcome: 'granted',
    takeaway: 'Every condition in R1 holds, so Copilot opens. The sign-in record proves which policy allowed it.',
  },
  {
    id: 'maria-byod',
    title: 'Same user, personal laptop',
    who: 'Maria Alvarez', role: 'Attorney, Legal Department', upn: 'maria.alvarez@bcbsvt.demo',
    device: 'Personal MacBook (not enrolled in Intune)', location: 'Home broadband',
    results: { identity: 'pass', group: 'pass', ca: 'pass', mfa: 'pass', device: 'fail', signin: 'skip' },
    failNote: 'Device is not managed or compliant. Conditional Access requires a compliant device for Copilot.',
    errorCode: 'AADSTS53000',
    outcome: 'blocked',
    takeaway: 'Same person, same password, same MFA. The device fails the policy, so privileged content never reaches an unmanaged machine.',
  },
  {
    id: 'claims',
    title: 'Non-Legal user',
    who: 'Jordan Pike', role: 'Analyst, Claims Operations', upn: 'jordan.pike@bcbsvt.demo',
    device: 'BCBSVT-LT-2208 (Windows 11, Intune compliant)', location: 'Berlin, VT office network',
    results: { identity: 'pass', group: 'fail', ca: 'skip', mfa: 'skip', device: 'skip', signin: 'skip' },
    failNote: 'Not a member of the Legal Department group. Copilot for Legal is not assigned to this user.',
    errorCode: 'AADSTS53003',
    outcome: 'blocked',
    takeaway: 'A valid corporate identity is not enough. Access follows the approved use case, which is Legal only.',
  },
  {
    id: 'maria-mfa',
    title: 'Legal user, MFA not completed',
    who: 'Maria Alvarez', role: 'Attorney, Legal Department', upn: 'maria.alvarez@bcbsvt.demo',
    device: 'BCBSVT-LT-4471 (Windows 11, Intune compliant)', location: 'Unfamiliar location (Lisbon, PT)',
    results: { identity: 'pass', group: 'pass', ca: 'pass', mfa: 'fail', device: 'skip', signin: 'skip' },
    failNote: 'The MFA prompt was denied on the Authenticator app. Strong authentication was not satisfied.',
    errorCode: 'AADSTS500121',
    outcome: 'blocked',
    takeaway: 'A stolen password alone cannot open Copilot. The denied MFA prompt is also recorded for investigation (R5).',
  },
]

// ── Demo 2: Purview scenarios (slide 14) ───────────────────────────────────

export type PurviewStageId = 'open' | 'doc' | 'evaluate' | 'behavior' | 'evidence'

export const PURVIEW_STAGES: { id: PurviewStageId; label: string; detail: string }[] = [
  { id: 'open', label: 'Maria opens Copilot', detail: 'A legal user, inside the identity boundary from Demo 1' },
  { id: 'doc', label: 'Uses a legal document', detail: 'The document carries a sensitivity label' },
  { id: 'evaluate', label: 'Purview evaluates', detail: 'Sensitivity label and DLP policy are checked against the activity' },
  { id: 'behavior', label: 'Policy behavior occurs', detail: 'Allow, notify or restrict, as configured' },
  { id: 'evidence', label: 'Evidence is generated', detail: 'Policy match and activity / audit record' },
]

export type PolicyMode = 'notify' | 'restrict'

export interface PurviewScenario {
  id: string
  title: string
  req: ReqId[]
  prompt: string
  doc: { name: string; path: string; label: string; labelTone: 'general' | 'confidential' | 'privileged' | 'none' }
  evaluate: string[]
  /** Copilot or policy response shown in the chat pane, per policy mode where it differs. */
  response: Record<PolicyMode, { kind: 'answer' | 'blocked' | 'tip' | 'nothing'; text: string; footnote?: string }>
  behavior: Record<PolicyMode, { label: string; tone: 'ok' | 'warn' | 'block' }>
  audit: Record<PolicyMode, { activity: string; fields: { k: string; v: string }[] }[]>
  takeaway: string
  /** True when the policy-mode toggle changes the outcome. */
  modeMatters?: boolean
}

const COPILOT_AUDIT = (doc: string, label: string) => ({
  activity: 'CopilotInteraction',
  fields: [
    { k: 'User', v: 'maria.alvarez@bcbsvt.demo' },
    { k: 'App', v: 'Microsoft 365 Copilot (Word)' },
    { k: 'Resource referenced', v: doc },
    { k: 'Sensitivity label', v: label },
  ],
})

export const PURVIEW_SCENARIOS: PurviewScenario[] = [
  {
    id: 'confidential',
    title: 'Summarize a Confidential legal memo',
    req: ['R3', 'R5'],
    prompt: 'Summarize the vendor data-return memo and list the obligations at contract end.',
    doc: { name: 'Vendor Data Return Memo 2025.docx', path: 'Legal > Contracts > Memos', label: 'Confidential \\ Legal', labelTone: 'confidential' },
    evaluate: ['Label found: Confidential \\ Legal', 'DLP policy "Legal – Copilot privileged content": no match for this label', 'Maria has read access to the file'],
    response: {
      notify: {
        kind: 'answer',
        text: 'The memo sets three obligations at contract end: return or destroy BCBSVT data within 30 days, certify destruction in writing, and keep no copies in backups beyond the retention window. [1]',
        footnote: 'Response labeled Confidential \\ Legal, inherited from the source. [1] Vendor Data Return Memo 2025.docx',
      },
      restrict: {
        kind: 'answer',
        text: 'The memo sets three obligations at contract end: return or destroy BCBSVT data within 30 days, certify destruction in writing, and keep no copies in backups beyond the retention window. [1]',
        footnote: 'Response labeled Confidential \\ Legal, inherited from the source. [1] Vendor Data Return Memo 2025.docx',
      },
    },
    behavior: {
      notify: { label: 'Allowed · label inherited by the response', tone: 'ok' },
      restrict: { label: 'Allowed · label inherited by the response', tone: 'ok' },
    },
    audit: {
      notify: [COPILOT_AUDIT('Vendor Data Return Memo 2025.docx', 'Confidential \\ Legal')],
      restrict: [COPILOT_AUDIT('Vendor Data Return Memo 2025.docx', 'Confidential \\ Legal')],
    },
    takeaway: 'Protection travels with the content: the Copilot summary carries the same label as the memo it came from.',
  },
  {
    id: 'privileged',
    title: 'Summarize a Privileged litigation file',
    req: ['R3', 'R5'],
    prompt: 'Summarize our litigation strategy notes for the provider network dispute.',
    doc: { name: 'Provider Dispute – Strategy Notes.docx', path: 'Legal > Litigation > Privileged', label: 'Highly Confidential \\ Attorney-Client Privileged', labelTone: 'privileged' },
    evaluate: ['Label found: Highly Confidential \\ Attorney-Client Privileged', 'DLP policy "Legal – Copilot privileged content": MATCH', 'Rule: exclude items with this label from Copilot processing'],
    response: {
      notify: {
        kind: 'blocked',
        text: 'I can\'t use "Provider Dispute – Strategy Notes.docx" to answer. Your organization\'s policy excludes content with this sensitivity label from Copilot.',
        footnote: 'Maria can still open the file herself. Copilot cannot read it.',
      },
      restrict: {
        kind: 'blocked',
        text: 'I can\'t use "Provider Dispute – Strategy Notes.docx" to answer. Your organization\'s policy excludes content with this sensitivity label from Copilot.',
        footnote: 'Maria can still open the file herself. Copilot cannot read it.',
      },
    },
    behavior: {
      notify: { label: 'Restricted · excluded from Copilot processing', tone: 'block' },
      restrict: { label: 'Restricted · excluded from Copilot processing', tone: 'block' },
    },
    audit: {
      notify: [
        { activity: 'DLPRuleMatch', fields: [{ k: 'Policy', v: 'Legal – Copilot privileged content' }, { k: 'Rule', v: 'Exclude Privileged label from Copilot' }, { k: 'Location', v: 'Microsoft 365 Copilot' }, { k: 'Action', v: 'Content excluded' }] },
        COPILOT_AUDIT('Provider Dispute – Strategy Notes.docx', 'Highly Confidential \\ Attorney-Client Privileged'),
      ],
      restrict: [
        { activity: 'DLPRuleMatch', fields: [{ k: 'Policy', v: 'Legal – Copilot privileged content' }, { k: 'Rule', v: 'Exclude Privileged label from Copilot' }, { k: 'Location', v: 'Microsoft 365 Copilot' }, { k: 'Action', v: 'Content excluded' }] },
        COPILOT_AUDIT('Provider Dispute – Strategy Notes.docx', 'Highly Confidential \\ Attorney-Client Privileged'),
      ],
    },
    takeaway: 'The most sensitive tier never enters an AI response, even for an authorized attorney. The exclusion itself is logged.',
  },
  {
    id: 'external',
    title: 'Send a Copilot draft outside BCBSVT',
    req: ['R3', 'R4', 'R5'],
    prompt: 'Draft an email to outside counsel with our position on the license renewal.',
    doc: { name: 'Copilot draft (labeled Confidential \\ Legal)', path: 'Outlook > New message to counsel@outsidefirm.example', label: 'Confidential \\ Legal', labelTone: 'confidential' },
    evaluate: ['Label on message: Confidential \\ Legal (inherited from the Copilot draft)', 'Recipient is outside the BCBSVT domain', 'DLP policy "Legal – external sharing": MATCH'],
    modeMatters: true,
    response: {
      notify: {
        kind: 'tip',
        text: 'Policy tip: this message contains Confidential legal content and is addressed outside BCBSVT. Copilot-assisted work product needs Chief Legal Officer approval before external release.',
        footnote: 'Maria overrides with a business justification: "CLO approval ref. LR-2026-0427". The message is sent and the override is recorded.',
      },
      restrict: {
        kind: 'blocked',
        text: 'Message blocked: Confidential legal content can\'t be sent outside BCBSVT from this account. Route the work product for Chief Legal Officer release.',
        footnote: 'Nothing leaves the tenant. The attorney routes the draft through the CLO approval step instead.',
      },
    },
    behavior: {
      notify: { label: 'Notified · override with justification', tone: 'warn' },
      restrict: { label: 'Restricted · send blocked', tone: 'block' },
    },
    audit: {
      notify: [
        { activity: 'DLPRuleMatch', fields: [{ k: 'Policy', v: 'Legal – external sharing' }, { k: 'Location', v: 'Exchange Online' }, { k: 'Action', v: 'Policy tip shown · user override' }, { k: 'Justification', v: 'CLO approval ref. LR-2026-0427' }] },
      ],
      restrict: [
        { activity: 'DLPRuleMatch', fields: [{ k: 'Policy', v: 'Legal – external sharing' }, { k: 'Location', v: 'Exchange Online' }, { k: 'Action', v: 'Blocked' }, { k: 'Alert', v: 'Sent to Legal compliance queue' }] },
      ],
    },
    takeaway: 'The deck says "notification or restriction, as configured". Toggle the policy mode to show both, and note both leave the same kind of evidence.',
  },
  {
    id: 'restricted',
    title: 'Ask about a file Maria cannot open',
    req: ['R2', 'R5'],
    prompt: 'What did the internal investigation into the Claims department conclude?',
    doc: { name: 'Claims Investigation Report.docx', path: 'HR > Investigations (Maria has no access)', label: 'Highly Confidential \\ HR', labelTone: 'privileged' },
    evaluate: ['Copilot searches only content Maria can open', 'SharePoint permissions: no access to HR > Investigations', 'File is never retrieved, so no label or DLP check is needed'],
    response: {
      notify: {
        kind: 'nothing',
        text: 'I couldn\'t find any documents you have access to about an internal investigation into the Claims department.',
        footnote: 'Copilot does not reveal that the file exists.',
      },
      restrict: {
        kind: 'nothing',
        text: 'I couldn\'t find any documents you have access to about an internal investigation into the Claims department.',
        footnote: 'Copilot does not reveal that the file exists.',
      },
    },
    behavior: {
      notify: { label: 'Not surfaced · outside the user\'s permissions', tone: 'ok' },
      restrict: { label: 'Not surfaced · outside the user\'s permissions', tone: 'ok' },
    },
    audit: {
      notify: [{ activity: 'CopilotInteraction', fields: [{ k: 'User', v: 'maria.alvarez@bcbsvt.demo' }, { k: 'App', v: 'Microsoft 365 Copilot (Chat)' }, { k: 'Resources accessed', v: 'None' }, { k: 'Result', v: 'No permitted content found' }] }],
      restrict: [{ activity: 'CopilotInteraction', fields: [{ k: 'User', v: 'maria.alvarez@bcbsvt.demo' }, { k: 'App', v: 'Microsoft 365 Copilot (Chat)' }, { k: 'Resources accessed', v: 'None' }, { k: 'Result', v: 'No permitted content found' }] }],
    },
    takeaway: 'Copilot inherits existing permissions. It cannot see more than the attorney can, which is why permission hygiene is part of the assessment.',
  },
]

// ── Decide (slides 16 and 18) ──────────────────────────────────────────────

export const BEFORE_AFTER = [
  ['"Let\'s enable Copilot."', '"What conditions must exist?"'],
  ['Generic AI access', 'Corporate-managed access'],
  ['Data protection considered later', 'Data protection identified up front'],
  ['Controls configured independently', 'Controls trace back to risks'],
  ['Approval based on intent', 'Approval based on evidence'],
  ['Technology-led implementation', 'Governance-led implementation'],
]

export const DECISION_CONDITIONS = [
  'Access stays limited to the Legal Department group, with quarterly access reviews (R1, R2)',
  'Privileged-label exclusion and external-sharing DLP stay in force (R3)',
  'An attorney reviews every Copilot output; external release needs CLO approval (R4)',
  'Copilot audit records are retained and reviewed monthly by Legal compliance (R5)',
  'The use case owner reports to the AI Governance Council and is re-reviewed in 12 months (R6)',
]
