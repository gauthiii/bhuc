import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  cognitoSignIn, cognitoVerifyLoginMfa, cognitoStartMfaSetup, cognitoCompleteMfaSetup,
  cognitoRegister, cognitoCompleteNewPassword, demoLogin as doDemoLogin, hydrate, loadStored,
  logout as doLogout, type AuthUser, type PortalRole, type SignInOutcome,
} from '../services/auth'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isHydrating: boolean
  signIn: (email: string, password: string) => Promise<SignInOutcome>
  verifyLoginMfa: (session: string, username: string, code: string) => Promise<AuthUser>
  startMfaSetup: typeof cognitoStartMfaSetup
  completeMfaSetup: (session: string, username: string, code: string) => Promise<AuthUser>
  register: (name: string, email: string, password: string) => Promise<unknown>
  completeNewPassword: (session: string, username: string, newPassword: string, name: string) => Promise<SignInOutcome>
  demoLogin: (name?: string) => Promise<AuthUser>
  logout: () => void
}

function makeAuth(role: PortalRole) {
  const Ctx = createContext<AuthContextValue | null>(null)

  function Provider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => loadStored(role))
    const [isHydrating, setHydrating] = useState(true)

    useEffect(() => {
      let alive = true
      hydrate(role).then((u) => { if (alive) { setUser(u); setHydrating(false) } }).catch(() => { if (alive) setHydrating(false) })
      return () => { alive = false }
    }, [])

    const signIn = useCallback(async (email: string, password: string) => {
      const outcome = await cognitoSignIn(role, email, password)
      if (outcome.kind === 'success') setUser(outcome.user)
      return outcome
    }, [])
    const verifyLoginMfa = useCallback(async (session: string, username: string, code: string) => {
      const u = await cognitoVerifyLoginMfa(role, session, username, code); setUser(u); return u
    }, [])
    const completeMfaSetup = useCallback(async (session: string, username: string, code: string) => {
      const u = await cognitoCompleteMfaSetup(role, session, username, code); setUser(u); return u
    }, [])
    const register = useCallback((name: string, email: string, password: string) => cognitoRegister(role, name, email, password), [])
    const completeNewPassword = useCallback(async (session: string, username: string, newPassword: string, name: string) => {
      const outcome = await cognitoCompleteNewPassword(role, session, username, newPassword, name)
      if (outcome.kind === 'success') setUser(outcome.user)
      return outcome
    }, [])
    const demoLogin = useCallback(async (name?: string) => { const u = await doDemoLogin(role, name); setUser(u); return u }, [])
    const logout = useCallback(() => { doLogout(role); setUser(null) }, [])

    const value = useMemo<AuthContextValue>(() => ({
      user, isAuthenticated: !!user, isHydrating,
      signIn, verifyLoginMfa, startMfaSetup: cognitoStartMfaSetup, completeMfaSetup,
      register, completeNewPassword, demoLogin, logout,
    }), [user, isHydrating, signIn, verifyLoginMfa, completeMfaSetup, register, completeNewPassword, demoLogin, logout])

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
  }

  function useAuth() {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error(`use${role}Auth must be used within its provider`)
    return ctx
  }
  return { Provider, useAuth }
}

const patient = makeAuth('patient')
const clinician = makeAuth('clinician')
const governance = makeAuth('governance')

export const PatientAuthProvider = patient.Provider
export const usePatientAuth = patient.useAuth
export const ClinicianAuthProvider = clinician.Provider
export const useClinicianAuth = clinician.useAuth
export const GovernanceAuthProvider = governance.Provider
export const useGovernanceAuth = governance.useAuth
