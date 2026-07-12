import { GovernanceShell } from '../../components/portals'
import { WorkflowCanvas } from '../../components/BhucWorkflowModal'

export function GovernanceWorkflow() {
  return (
    <GovernanceShell
      title="Patient & Clinician Journey"
      intro="End-to-end BHUC workflow — how a patient and clinician move through care and where each AI agent acts. Toggle Summary/Detailed, step through the crisis decision, and export the diagram as a PNG."
    >
      <WorkflowCanvas />
    </GovernanceShell>
  )
}
