import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button, Field, Input } from './ui'
import type { AuthUser, SignInOutcome } from '../services/auth'

// Minimal structural interface both auth contexts satisfy.
export interface AuthLike {
  signIn: (email: string, password: string) => Promise<SignInOutcome>
  verifyLoginMfa: (session: string, username: string, code: string) => Promise<AuthUser>
  startMfaSetup: (session: string, username: string) => Promise<{ qr_image_data_url: string; session: string; secret: string }>
  completeMfaSetup: (session: string, username: string, code: string) => Promise<AuthUser>
  register: (name: string, email: string, password: string) => Promise<unknown>
  completeNewPassword: (session: string, username: string, newPassword: string, name: string) => Promise<SignInOutcome>
  demoLogin: (name?: string) => Promise<AuthUser>
}

type Stage = 'password' | 'mfa' | 'mfa_setup' | 'new_password'

export function SignInFlow({ auth, allowSignup, onDone }: { auth: AuthLike; allowSignup?: boolean; onDone: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [stage, setStage] = useState<Stage>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [session, setSession] = useState('')
  const [qr, setQr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function fail(e: unknown) { setError(e instanceof Error ? e.message : String(e)); setBusy(false) }

  async function advance(outcome: SignInOutcome) {
    if (outcome.kind === 'success') { onDone(); return }
    setSession(outcome.session)
    if (outcome.kind === 'mfa') setStage('mfa')
    else if (outcome.kind === 'new_password') setStage('new_password')
    else if (outcome.kind === 'mfa_setup') {
      const qrResp = await auth.startMfaSetup(outcome.session, outcome.username)
      setSession(qrResp.session); setQr(qrResp.qr_image_data_url); setStage('mfa_setup')
    }
    setBusy(false)
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true)
    try {
      if (mode === 'signup') await auth.register(name || email.split('@')[0], email, password)
      await advance(await auth.signIn(email, password))
    } catch (e) { fail(e) }
  }
  async function onMfa(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true)
    try { await auth.verifyLoginMfa(session, email, code); onDone() } catch (e) { fail(e) }
  }
  async function onMfaSetup(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true)
    try { await auth.completeMfaSetup(session, email, code); onDone() } catch (e) { fail(e) }
  }
  async function onNewPassword(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true)
    try { await advance(await auth.completeNewPassword(session, email, newPassword, name)) } catch (e) { fail(e) }
  }

  return (
    <div>
      {allowSignup && stage === 'password' && (
        <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1 text-sm" role="tablist">
          <button role="tab" aria-selected={mode === 'signin'} onClick={() => setMode('signin')} className={`rounded-md px-3 py-1.5 ${mode === 'signin' ? 'bg-white font-semibold shadow-sm' : 'text-slate-500'}`}>Sign in</button>
          <button role="tab" aria-selected={mode === 'signup'} onClick={() => setMode('signup')} className={`rounded-md px-3 py-1.5 ${mode === 'signup' ? 'bg-white font-semibold shadow-sm' : 'text-slate-500'}`}>Create account</button>
        </div>
      )}

      {error && <div role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {stage === 'password' && (
        <form onSubmit={onPassword} className="grid gap-4">
          {mode === 'signup' && <Field label="Full name" required><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>}
          <Field label="Email address" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Password" required><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></Field>
          <Button type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</Button>
        </form>
      )}

      {stage === 'mfa' && (
        <form onSubmit={onMfa} className="grid gap-4">
          <p className="flex items-center gap-1 text-sm text-slate-600"><ShieldCheck className="h-4 w-4" /> Enter the 6-digit code from your authenticator app.</p>
          <Field label="Authentication code" required><Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="••••••" /></Field>
          <Button type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify & sign in'}</Button>
        </form>
      )}

      {stage === 'mfa_setup' && (
        <form onSubmit={onMfaSetup} className="grid gap-4">
          <p className="text-sm text-slate-600">Scan this QR code with your authenticator app, then enter the code it shows.</p>
          {qr && <img src={qr} alt="MFA setup QR code" className="mx-auto h-40 w-40 rounded-lg border border-slate-200" />}
          <Field label="Authentication code" required><Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="••••••" /></Field>
          <Button type="submit" disabled={busy}>{busy ? 'Finishing…' : 'Finish setup & sign in'}</Button>
        </form>
      )}

      {stage === 'new_password' && (
        <form onSubmit={onNewPassword} className="grid gap-4">
          <p className="text-sm text-slate-600">Set a new password to continue.</p>
          <Field label="New password" required><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></Field>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Set password'}</Button>
        </form>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3 text-center">
        <button onClick={() => auth.demoLogin().then(onDone)} className="text-xs font-medium text-slate-500 underline hover:text-slate-700">
          Backend unavailable? Continue in demo mode
        </button>
      </div>
    </div>
  )
}
