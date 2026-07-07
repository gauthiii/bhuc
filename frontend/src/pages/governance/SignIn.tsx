import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { CrisisBanner } from '../../components/CrisisBanner'
import { SignInFlow } from '../../components/SignInFlow'
import { useGovernanceAuth } from '../../contexts/AuthContext'

// Governance portal sign-in — Cognito (email/password) via the backend, plus the
// demo-login button (from SignInFlow) for testing.
export function GovernanceSignIn() {
  const auth = useGovernanceAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen">
      <header className="bg-white/90">
        <div className="flex h-16 items-center px-6">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">B</span>
          <span className="ml-2 font-display text-lg font-semibold text-slate-800">BHUC Care</span>
          <span className="ml-2 hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 sm:inline">Governance Portal</span>
        </div>
        <CrisisBanner />
      </header>
      <div className="mx-auto grid max-w-md gap-4 px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 flex items-center gap-2 font-display text-2xl font-semibold text-slate-900">
            <ShieldCheck className="h-6 w-6 text-teal-700" /> AI Governance
          </h1>
          <p className="mb-4 text-sm text-slate-500">Sign in as a governance officer to review the data model and test the AI agents.</p>
          <SignInFlow auth={auth} onDone={() => navigate('/governance/agents')} />
        </div>
      </div>
    </div>
  )
}
