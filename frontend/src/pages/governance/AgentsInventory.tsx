import { GovernanceShell } from '../../components/portals'
import { AgentChat } from '../../components/AgentChat'

// Governance → Agents Inventory. One live A2A test-chat per built agent, so a
// governance officer can exercise each agent directly. (Front-Door, Risk, Clinical Doc.)
const AGENTS: { key: string; name: string; subtitle: string; examples: { label: string; prompt: string }[] }[] = [
  {
    key: 'frontdoor',
    name: 'BHUC Front-Door Security Agent',
    subtitle: 'Use Case 1 · crisis classifier + facility KB + 988 escalation',
    examples: [
      { label: 'Hours & insurance', prompt: 'What are your hours and do you take insurance?' },
      { label: 'Crisis phrase', prompt: 'I don’t want to be alive anymore.' },
      { label: 'How to register', prompt: 'How do I register as a new patient?' },
    ],
  },
  {
    key: 'risk',
    name: 'BHUC Risk Identification Agent',
    subtitle: 'Use Case 2 · scores C-SSRS / PHQ-9 / GAD-7',
    examples: [
      { label: 'Score C-SSRS', prompt: 'Score this C-SSRS and give the risk band, confidence, and rationale (do not write to any record): item1 wish to be dead = yes; item2 active thoughts = yes; item3 methods = yes; item4 intent = yes; item5 plan = no; behavior = no.' },
      { label: 'Score PHQ-9', prompt: 'Score this PHQ-9 and give the risk band and rationale (do not write to any record): q1=3, q2=3, q3=2, q4=2, q5=1, q6=2, q7=1, q8=1, q9=2.' },
    ],
  },
  {
    key: 'clinicaldoc',
    name: 'BHUC Clinical Documentation Agent',
    subtitle: 'Use Case 2 · drafts a grounded note + ICD-10/CPT codes',
    examples: [
      { label: 'Draft a note', prompt: 'Draft a clinical note (do not write to any record) for this encounter and tag unverified lines: Follow-up, 30F, depressed mood ~3 weeks, poor sleep, passive suicidal ideation without plan, on sertraline 50 mg. Include Chief Complaint, HPI, MSE, Assessment, Plan, and suggest ICD-10/CPT codes.' },
      { label: 'Suggest codes', prompt: 'Suggest ICD-10 and CPT codes for a moderate major depressive episode with an initial psychiatric diagnostic evaluation.' },
    ],
  },
]

export function GovernanceAgentsInventory() {
  return (
    <GovernanceShell
      title="Agents Inventory"
      intro="Test each built BHUC AI agent directly over A2A. Messages are relayed live to the ServiceNow agent; replies are shown as they return."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {AGENTS.map((a) => (
          <AgentChat key={a.key} agentKey={a.key} agentName={a.name} subtitle={a.subtitle} examples={a.examples} />
        ))}
      </div>
    </GovernanceShell>
  )
}
