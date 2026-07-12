import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { usePatientAuth, useClinicianAuth, useGovernanceAuth } from './contexts/AuthContext'

import { RolePicker } from './pages/RolePicker'
import { PatientSignIn } from './pages/patient/SignIn'
import { PatientHome } from './pages/patient/Home'
import { PatientRegistration } from './pages/patient/Registration'
import { PatientProfile } from './pages/patient/Profile'
import { PatientScreening } from './pages/patient/Screening'
import { PatientCoverage } from './pages/patient/Coverage'
import { PatientAppointments } from './pages/patient/Appointments'
import { PatientCarePlan } from './pages/patient/CarePlan'
import { PatientMessages } from './pages/patient/Messages'
import { PatientCheckIn } from './pages/patient/CheckIn'
import { ClinicianSignIn } from './pages/clinician/SignIn'
import { ClinicianWorklist } from './pages/clinician/Worklist'
import { ClinicianChart } from './pages/clinician/Chart'
import { ClinicianRiskConfirm } from './pages/clinician/RiskConfirm'
import { ClinicianDocumentation } from './pages/clinician/Documentation'
import { ClinicianPriorAuth } from './pages/clinician/PriorAuth'
import { ClinicianDisposition } from './pages/clinician/Disposition'
import { ClinicianScheduling } from './pages/clinician/Scheduling'
import { ClinicianCalendarPage } from './pages/clinician/Calendar'
import { ClinicianEscalations } from './pages/clinician/Escalations'
import { GovernanceSignIn } from './pages/governance/SignIn'
import { GovernanceAgentsInventory } from './pages/governance/AgentsInventory'
import { GovernanceOutputIntegrity } from './pages/governance/OutputIntegrity'
import { GovernanceAIAssets } from './pages/governance/AIAssetManagement'
import { GovernanceAIAssetDetail } from './pages/governance/AIAssetDetail'
import { GovernanceWorkflow } from './pages/governance/Workflow'
import { GovernancePromptInjection } from './pages/governance/PromptInjection'
import { GovernanceFairness } from './pages/governance/Fairness'

function PatientGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = usePatientAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/patient/sign-in" replace />
}
function ClinicianGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useClinicianAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/clinician/sign-in" replace />
}
function GovernanceGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useGovernanceAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/governance/sign-in" replace />
}

export default function App() {
  return (
    <Routes>
      <Route index element={<RolePicker />} />

      {/* Patient portal */}
      <Route path="/patient/sign-in" element={<PatientSignIn />} />
      <Route path="/patient/home" element={<PatientGuard><PatientHome /></PatientGuard>} />
      <Route path="/patient/register" element={<PatientGuard><PatientRegistration /></PatientGuard>} />
      <Route path="/patient/profile" element={<PatientGuard><PatientProfile /></PatientGuard>} />
      <Route path="/patient/screening" element={<PatientGuard><PatientScreening /></PatientGuard>} />
      <Route path="/patient/coverage" element={<PatientGuard><PatientCoverage /></PatientGuard>} />
      <Route path="/patient/appointments" element={<PatientGuard><PatientAppointments /></PatientGuard>} />
      <Route path="/patient/care-plan" element={<PatientGuard><PatientCarePlan /></PatientGuard>} />
      <Route path="/patient/messages" element={<PatientGuard><PatientMessages /></PatientGuard>} />
      <Route path="/patient/check-in" element={<PatientGuard><PatientCheckIn /></PatientGuard>} />

      {/* Clinician portal */}
      <Route path="/clinician/sign-in" element={<ClinicianSignIn />} />
      <Route path="/clinician/worklist" element={<ClinicianGuard><ClinicianWorklist /></ClinicianGuard>} />
      <Route path="/clinician/chart/:patientId" element={<ClinicianGuard><ClinicianChart /></ClinicianGuard>} />
      <Route path="/clinician/risk/:screeningId" element={<ClinicianGuard><ClinicianRiskConfirm /></ClinicianGuard>} />
      <Route path="/clinician/documentation/:id" element={<ClinicianGuard><ClinicianDocumentation /></ClinicianGuard>} />
      <Route path="/clinician/prior-auth/:patientId" element={<ClinicianGuard><ClinicianPriorAuth /></ClinicianGuard>} />
      <Route path="/clinician/disposition/:id" element={<ClinicianGuard><ClinicianDisposition /></ClinicianGuard>} />
      <Route path="/clinician/scheduling" element={<ClinicianGuard><ClinicianScheduling /></ClinicianGuard>} />
      <Route path="/clinician/calendar" element={<ClinicianGuard><ClinicianCalendarPage /></ClinicianGuard>} />
      <Route path="/clinician/escalations" element={<ClinicianGuard><ClinicianEscalations /></ClinicianGuard>} />

      {/* Governance portal */}
      <Route path="/governance/sign-in" element={<GovernanceSignIn />} />
      <Route path="/governance" element={<Navigate to="/governance/agents" replace />} />
      <Route path="/governance/agents" element={<GovernanceGuard><GovernanceAgentsInventory /></GovernanceGuard>} />
      <Route path="/governance/ai-assets" element={<GovernanceGuard><GovernanceAIAssets /></GovernanceGuard>} />
      <Route path="/governance/ai-assets/:id" element={<GovernanceGuard><GovernanceAIAssetDetail /></GovernanceGuard>} />
      <Route path="/governance/output-integrity" element={<GovernanceGuard><GovernanceOutputIntegrity /></GovernanceGuard>} />
      <Route path="/governance/prompt-injection" element={<GovernanceGuard><GovernancePromptInjection /></GovernanceGuard>} />
      <Route path="/governance/fairness" element={<GovernanceGuard><GovernanceFairness /></GovernanceGuard>} />
      <Route path="/governance/workflow" element={<GovernanceGuard><GovernanceWorkflow /></GovernanceGuard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
