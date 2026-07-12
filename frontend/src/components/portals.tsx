import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ClipboardList, FileText, HeartPulse, Home, ListChecks, MessageCircle, ShieldQuestion, Stethoscope, UserRound, CalendarClock, Bot, Database, ExternalLink, ShieldCheck, ShieldAlert, Boxes, Workflow } from 'lucide-react'
import { PortalShell, PageHeader, type NavItem } from './Shell'
import { usePatientAuth, useClinicianAuth, useGovernanceAuth } from '../contexts/AuthContext'

// ServiceNow instance — the Governance "Tables" links open each table's list view here.
const SNOW_INSTANCE = 'https://ven04690.service-now.com'
const GOVERNANCE_NAV: NavItem[] = [
  { to: '/governance/agents', label: 'Agents Inventory', icon: <Bot className="h-4 w-4" /> },
  { to: '/governance/ai-assets', label: 'Governance', icon: <Boxes className="h-4 w-4" /> },
  { to: '/governance/output-integrity', label: 'Output Integrity', icon: <ShieldCheck className="h-4 w-4" /> },
  { to: '/governance/prompt-injection', label: 'Prompt Injection', icon: <ShieldAlert className="h-4 w-4" /> },
  { to: '/governance/fairness', label: 'Scheduling Fairness', icon: <CalendarClock className="h-4 w-4" /> },
]
const GOVERNANCE_TABLES: { table: string; label: string }[] = [
  { table: 'u_bhuc_patient', label: 'Patients' },
  { table: 'u_bhuc_screening', label: 'Screenings' },
  { table: 'u_bhuc_consent', label: 'Consents' },
  { table: 'u_bhuc_appointment', label: 'Appointments' },
  { table: 'u_bhuc_message', label: 'Messages' },
  { table: 'u_bhuc_care_plan', label: 'Care Plans / Notes' },
  { table: 'u_bhuc_prior_auth', label: 'Prior Authorizations' },
  { table: 'u_bhuc_escalation', label: 'Escalations' },
]

function GovernanceTables() {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Database className="h-3.5 w-3.5" /> Tables
      </p>
      <ul className="space-y-0.5">
        {GOVERNANCE_TABLES.map((t) => (
          <li key={t.table}>
            <a href={`${SNOW_INSTANCE}/${t.table}_list.do`} target="_blank" rel="noreferrer noopener"
              title={`Open ${t.table} in ServiceNow`}
              className="group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              {t.label}
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

const PATIENT_NAV: NavItem[] = [
  { to: '/patient/home', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { to: '/patient/screening', label: 'Screening', icon: <ClipboardList className="h-4 w-4" /> },
  { to: '/patient/coverage', label: 'Coverage', icon: <ShieldQuestion className="h-4 w-4" /> },
  { to: '/patient/appointments', label: 'Appointments', icon: <CalendarDays className="h-4 w-4" /> },
  { to: '/patient/care-plan', label: 'Care plan', icon: <HeartPulse className="h-4 w-4" /> },
  { to: '/patient/messages', label: 'Messages', icon: <MessageCircle className="h-4 w-4" /> },
  { to: '/patient/check-in', label: 'Check-in', icon: <ListChecks className="h-4 w-4" /> },
  { to: '/patient/profile', label: 'Profile', icon: <UserRound className="h-4 w-4" /> },
]

const CLINICIAN_NAV: NavItem[] = [
  { to: '/clinician/worklist', label: 'Worklist', icon: <ListChecks className="h-4 w-4" /> },
  { to: '/clinician/scheduling', label: 'Scheduling', icon: <CalendarClock className="h-4 w-4" /> },
  { to: '/clinician/calendar', label: 'Calendar', icon: <CalendarDays className="h-4 w-4" /> },
]

export function PatientShell({ title, intro, actions, children }: { title: string; intro?: string; actions?: ReactNode; children: ReactNode }) {
  const { user, logout } = usePatientAuth()
  const navigate = useNavigate()
  return (
    <PortalShell portal="Patient" user={user?.displayName} nav={PATIENT_NAV} onSignOut={() => { logout(); navigate('/patient/sign-in') }}>
      <PageHeader title={title} intro={intro} actions={actions} />
      {children}
    </PortalShell>
  )
}

export function ClinicianShell({ title, intro, actions, children }: { title: string; intro?: string; actions?: ReactNode; children: ReactNode }) {
  const { user, logout } = useClinicianAuth()
  const navigate = useNavigate()
  return (
    <PortalShell portal="Clinician" user={user?.displayName} nav={CLINICIAN_NAV} onSignOut={() => { logout(); navigate('/clinician/sign-in') }}>
      <PageHeader title={title} intro={intro} actions={actions} />
      {children}
    </PortalShell>
  )
}

// Sidebar extra for the Governance portal: an end-to-end workflow launcher (navigates to
// the full-page patient+clinician+AI journey) plus the Tables quick-links.
function GovernanceSidebarExtra() {
  const navigate = useNavigate()
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 flex items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Workflow className="h-3.5 w-3.5" /> Workflow
        </p>
        <button
          onClick={() => navigate('/governance/workflow')}
          className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          Patient &amp; Clinician Journey
          <ExternalLink className="ml-auto h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500" />
        </button>
      </div>
      <GovernanceTables />
    </div>
  )
}

export function GovernanceShell({ title, intro, actions, children }: { title: string; intro?: string; actions?: ReactNode; children: ReactNode }) {
  const { user, logout } = useGovernanceAuth()
  const navigate = useNavigate()
  return (
    <PortalShell portal="Governance" user={user?.displayName} nav={GOVERNANCE_NAV} sidebarExtra={<GovernanceSidebarExtra />}
      onSignOut={() => { logout(); navigate('/governance/sign-in') }}>
      <PageHeader title={title} intro={intro} actions={actions} />
      {children}
    </PortalShell>
  )
}

export const icons = { FileText, Stethoscope }
