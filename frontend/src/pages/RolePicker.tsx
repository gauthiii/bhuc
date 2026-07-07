import { Link } from 'react-router-dom'
import { UserRound, Stethoscope, ShieldCheck } from 'lucide-react'
import { CrisisBanner } from '../components/CrisisBanner'

// Dev/demo entry: choose which portal to view. In production each portal is a separate
// iframe route (/patient, /clinician) hosted in ServiceNow SP pages (plan §2.9).
export function RolePicker() {
  return (
    <div className="min-h-screen">
      <header className="bg-white/90">
        <div className="flex h-16 items-center px-6">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">B</span>
          <span className="ml-2 font-display text-lg font-semibold text-slate-800">BHUC Care</span>
        </div>
        <CrisisBanner />
      </header>
      <div className="mx-auto grid max-w-3xl gap-6 px-6 py-16">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold text-slate-900">Behavioral Health Urgent Care</h1>
          <p className="mt-2 text-slate-500">Choose a portal to continue.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link to="/patient/sign-in" className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-400 hover:shadow">
            <UserRound className="h-8 w-8 text-teal-700" />
            <h2 className="mt-3 text-lg font-semibold text-slate-800">Patient Portal</h2>
            <p className="mt-1 text-sm text-slate-500">Register, complete screening, view your care plan, message your team.</p>
          </Link>
          <Link to="/clinician/sign-in" className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-400 hover:shadow">
            <Stethoscope className="h-8 w-8 text-teal-700" />
            <h2 className="mt-3 text-lg font-semibold text-slate-800">Clinician Portal</h2>
            <p className="mt-1 text-sm text-slate-500">Risk-stratified worklist, chart review, documentation, prior-auth, scheduling.</p>
          </Link>
          <Link to="/governance/sign-in" className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-400 hover:shadow">
            <ShieldCheck className="h-8 w-8 text-teal-700" />
            <h2 className="mt-3 text-lg font-semibold text-slate-800">Governance Portal</h2>
            <p className="mt-1 text-sm text-slate-500">Review the BHUC data-model tables and test the AI agents over A2A.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
