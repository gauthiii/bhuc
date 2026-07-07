import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { CrisisBanner } from '../../components/CrisisBanner'
import { SignInFlow } from '../../components/SignInFlow'
import { useClinicianAuth } from '../../contexts/AuthContext'

// C1 — Clinician Sign-In. MFA-enforced (Cognito clinician pool); no anonymous path.
export function ClinicianSignIn() {
  const auth = useClinicianAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen">
      <header className="bg-white/90"><div className="flex h-16 items-center px-6"><span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">B</span><span className="ml-2 font-display text-lg font-semibold text-slate-800">BHUC Care</span><span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Clinician</span></div><CrisisBanner /></header>
      <div className="mx-auto grid max-w-md gap-4 px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="font-display text-2xl font-semibold text-slate-900">Clinician sign-in</h1>
          <p className="mb-4 mt-1 flex items-center gap-1 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> Multi-factor authentication required.</p>
          <SignInFlow auth={auth} onDone={() => navigate('/clinician/worklist')} />
        </div>
      </div>
    </div>
  )
}
