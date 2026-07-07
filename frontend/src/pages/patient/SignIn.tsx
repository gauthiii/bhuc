import { useNavigate } from 'react-router-dom'
import { CrisisBanner } from '../../components/CrisisBanner'
import { SignInFlow } from '../../components/SignInFlow'
import { usePatientAuth } from '../../contexts/AuthContext'

// P1 — Sign-In / Sign-Up. AWS Cognito (email/password + optional MFA) via the backend.
// 988 banner is functional even here (unauthenticated), per plan §3.2 P1.
export function PatientSignIn() {
  const auth = usePatientAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen">
      <header className="bg-white/90"><div className="flex h-16 items-center px-6"><span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">B</span><span className="ml-2 font-display text-lg font-semibold text-slate-800">BHUC Care</span></div><CrisisBanner /></header>
      <div className="mx-auto grid max-w-md gap-4 px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-4 font-display text-2xl font-semibold text-slate-900">Welcome to BHUC Care</h1>
          <SignInFlow auth={auth} allowSignup onDone={() => navigate('/patient/home')} />
          <p className="mt-4 text-xs text-slate-500">Your information is protected under HIPAA and 42 CFR Part 2.</p>
        </div>
      </div>
    </div>
  )
}
