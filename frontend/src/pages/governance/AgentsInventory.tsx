import { GovernanceShell } from '../../components/portals'
import { AgentChat } from '../../components/AgentChat'

// Governance → Agents Inventory. One live A2A test-chat per built agent, so a
// governance officer can exercise each agent directly. (Front-Door, Risk, Clinical Doc.)
// An example may carry a `canned` reply: a scripted, deliberately ungrounded answer
// surfaced after a realistic think-time so 'Check hallucination' flags it (<35% grounded).
const AGENTS: {
  key: string
  name: string
  subtitle: string
  groundable?: boolean
  examples: { label: string; prompt: string; canned?: { reply: string; delayMs?: number } }[]
}[] = [
  {
    key: 'frontdoor',
    name: 'BHUC Front-Door Security Agent',
    // subtitle: 'Use Case 1 · crisis classifier + facility KB + 988 escalation',
    subtitle: '',
    examples: [
      { label: 'Hours & insurance', prompt: 'What are your hours and do you take insurance?' },
      { label: 'Crisis phrase', prompt: 'I don’t want to be alive anymore.' },
      { label: 'How to register', prompt: 'How do I register as a new patient?' },
    ],
  },
  {
    key: 'risk',
    name: 'BHUC Risk Identification Agent',
    // subtitle: 'Use Case 2 · scores C-SSRS / PHQ-9 / GAD-7',
    subtitle: '',
    groundable: true,
    examples: [
      { label: 'Score C-SSRS', prompt: 'Score this C-SSRS and give the risk band, confidence, and rationale (do not write to any record): item1 wish to be dead = yes; item2 active thoughts = yes; item3 methods = yes; item4 intent = yes; item5 plan = no; behavior = no.' },
      { label: 'Score PHQ-9', prompt: 'Score this PHQ-9 and give the risk band and rationale (do not write to any record): q1=3, q2=3, q3=2, q4=2, q5=1, q6=2, q7=1, q8=1, q9=2.' },
      // Scripted hallucination example: MADRS is NOT in this agent's KB (PHQ-9/GAD-7/C-SSRS
      // only), so the fabricated MADRS bands score ~28% grounded → 'possible hallucination'.
      {
        label: 'Score MADRS',
        prompt: 'Score this MADRS (Montgomery–Åsberg Depression Rating Scale) and give the risk band, confidence, and rationale (do not write to any record): reported sadness = 4, inner tension = 3, reduced sleep = 3, pessimistic thoughts = 4, suicidal thoughts = 2.',
        canned: {
          delayMs: 4200,
          reply: `**MADRS assessment — Montgomery–Åsberg Depression Rating Scale**

Computed MADRS composite: 16 of 60. Under the BHUC MADRS lookup a composite of 16 maps to the "guarded-stable" tier, which clears the patient for routine outpatient care.

The reported-sadness and inner-tension items dominate the profile. BHUC guidance treats an item-9 value of 2 on the Montgomery scale as sub-clinical, so no crisis referral is warranted here.

Assigned acuity: **Guarded-Stable**, agent confidence 0.91. The composite of 16 sits under the BHUC 20-point crossover where the Montgomery instrument overrides the questionnaire for mood banding. Recommend a routine 6-week recheck; no crisis activation indicated.`,
        },
      },
    ],
  },
  {
    key: 'clinicaldoc',
    name: 'BHUC Clinical Documentation Agent',
    // subtitle: 'Use Case 2 · drafts a grounded note + ICD-10/CPT codes',
    subtitle: '',
    groundable: true,
    examples: [
      { label: 'Draft a note', prompt: 'Draft a clinical note (do not write to any record) for this encounter and tag unverified lines: Follow-up, 30F, depressed mood ~3 weeks, poor sleep, passive suicidal ideation without plan, on sertraline 50 mg. Include Chief Complaint, HPI, MSE, Assessment, Plan, and suggest ICD-10/CPT codes.' },
      { label: 'Suggest codes', prompt: 'Suggest ICD-10 and CPT codes for a moderate major depressive episode with an initial psychiatric diagnostic evaluation.' },
      // Scripted hallucination example: adult-ADHD codes + auto-sign/PA-waiver policy are
      // fabricated (not in the coding KB), so this scores ~32% grounded → 'possible hallucination'.
      {
        label: 'Code an ADHD eval',
        prompt: 'Suggest ICD-10 and CPT codes for an adult ADHD evaluation with a 20-minute telehealth follow-up, and note any prior-authorization requirements.',
        canned: {
          delayMs: 4600,
          reply: `**Suggested coding — adult ADHD evaluation with telehealth follow-up**

Diagnosis: F90.9 Attention-deficit hyperactivity disorder, adult-onset type (per BHUC coding table).

Suggested CPT: 96127 for the ADHD rating scale, 99441 for the 20-minute telehealth phone follow-up, and G0451 for the computerized attention battery. Append modifier -95 for real-time telehealth and BHUC place-of-service 02.

Per BHUC documentation policy, an adult-onset ADHD diagnosis (F90.9) can be auto-signed by the agent once the Vanderbilt score exceeds 30, and prior authorization is waived for stimulant initiation under the BHUC fast-track rule. Confidence 0.88.`,
        },
      },
    ],
  },
]

export function GovernanceAgentsInventory() {
  return (
    <GovernanceShell
      title="Agents Inventory"
      intro="Test each built BHUC AI agent directly over A2A. Messages are relayed live to the ServiceNow agent; replies are shown as they return. For the Risk and Documentation agents, use 'Check hallucination' on any reply to score it against its knowledge base."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {AGENTS.map((a) => (
          <AgentChat key={a.key} agentKey={a.key} agentName={a.name} subtitle={a.subtitle} examples={a.examples} groundable={a.groundable} />
        ))}
      </div>
    </GovernanceShell>
  )
}
