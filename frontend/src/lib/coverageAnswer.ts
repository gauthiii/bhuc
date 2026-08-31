// ─────────────────────────────────────────────────────────────────────────────────────────
// Hardcoded answer for "What is my insurance coverage?" in the patient front-door chat.
//
// This is the ONLY message the chat short-circuits: everything else still goes through the
// prompt-injection screen and on to the Front-Door agent unchanged. The benefit figures are
// fictitious, and the plan matches the one already recorded for the mock patient in
// services/mockData.ts ("Blue Shield PPO 500").
//
// Formatting note: the chat renders with react-markdown WITHOUT remark-gfm, and Tailwind's
// preflight flattens heading sizes — so tables and `#` headings do not render. Only bold,
// paragraphs, lists and links survive, which is what this answer uses.
// ─────────────────────────────────────────────────────────────────────────────────────────

// Normalised phrasings that trigger the answer. Matching is exact against this list after
// normalisation, so unrelated coverage questions ("what insurance do you accept?") still go
// to the agent and get its own facility answer.
const TRIGGERS = new Set([
  'what is my insurance coverage',
  'whats my insurance coverage',
  'what is my insurance',
  'whats my insurance',
  'what is my coverage',
  'whats my coverage',
  'what is my insurance plan',
  'whats my insurance plan',
  'what is my plan',
  'whats my plan',
  'what does my insurance cover',
])

/** Lowercase, strip punctuation and apostrophes, collapse whitespace. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isCoverageQuestion(text: string): boolean {
  return TRIGGERS.has(normalise(text))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const asOf = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`

/** The coverage answer, as Markdown. `name` is the signed-in patient's first name. */
export function coverageAnswer(name: string): string {
  const today = asOf(new Date())
  return `Hello ${name} — here's what I have on file for your behavioral health coverage.

**Your plan**

- **Plan:** Blue Shield PPO 500 — Behavioral Health
- **Member ID:** BSA229184700
- **Group:** GRP-441037
- **Status:** Active, verified ${today}

**What you'll pay**

- **Therapy or counseling visit:** $25 copay per session
- **Psychiatry and medication management:** $40 copay per visit
- **Walk-in urgent care here at BHUC:** $50 copay
- **Telehealth:** the same copay as the equivalent in-person visit
- **Crisis services and the 988 line:** $0, always covered
- **Deductible:** $500 individual — $340 met so far this plan year
- **Out-of-pocket maximum:** $3,000 individual — $612 met so far

**Prior authorization**

- Routine outpatient therapy: not required for your first 20 visits this plan year, and you have used 6
- Intensive outpatient, partial hospitalization, or residential treatment: required before your first session
- Medication for substance use disorder: not required

We're in network for your plan, so you'll only owe the copay at check-in — nothing up front.

Would you like me to check what a specific visit would cost, or start a coverage verification before your next appointment?

[Source: Member benefits — Blue Shield PPO 500 · verified ${today}]`
}
