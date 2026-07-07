import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ClipboardList, FileText, HeartPulse, Home, ListChecks, MessageCircle, ShieldQuestion, Stethoscope, UserRound, CalendarClock } from 'lucide-react'
import { PortalShell, PageHeader, type NavItem } from './Shell'
import { usePatientAuth, useClinicianAuth } from '../contexts/AuthContext'

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

export const icons = { FileText, Stethoscope }
