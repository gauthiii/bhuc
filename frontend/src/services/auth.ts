// Auth service — real AWS Cognito (via the backend /api/aws router) with a demo fallback.
import {
  loginAws, verifyLoginMfaAws, startMfaSetupAws, verifyMfaSetupAws, validateTokenAws,
  logoutAws, registerAws, completeNewPasswordAws, type AwsAuthTokens, type AwsLoginResponse,
} from './awsAuth'

export type PortalRole = 'patient' | 'clinician' | 'governance'

export interface AuthUser {
  username: string
  displayName: string
  role: PortalRole
  mfa: boolean
}

interface StoredAuth { user: AuthUser; accessToken: string; idToken?: string; refreshToken?: string | null }

const KEY = (role: PortalRole) => `bhuc.auth.${role}`
let accessTokenMemo: string | null = null

export function getAccessToken(): string | null {
  if (accessTokenMemo) return accessTokenMemo
  for (const role of ['patient', 'clinician', 'governance'] as PortalRole[]) {
    const raw = localStorage.getItem(KEY(role))
    if (raw) { try { accessTokenMemo = (JSON.parse(raw) as StoredAuth).accessToken; return accessTokenMemo } catch { /* */ } }
  }
  return null
}

export function loadStored(role: PortalRole): AuthUser | null {
  const raw = localStorage.getItem(KEY(role))
  if (!raw) return null
  try { return (JSON.parse(raw) as StoredAuth).user } catch { return null }
}

// Current signed-in email (== Cognito username) for the given portal role. Used by the
// service layer to identify the patient on open/pre-auth CRUD endpoints (email -> u_bhuc_patient).
export function currentEmail(role: PortalRole = 'patient'): string {
  return loadStored(role)?.username ?? ''
}

function persist(role: PortalRole, tokens: AwsAuthTokens, username: string, displayName: string): AuthUser {
  const user: AuthUser = { username, displayName, role, mfa: role === 'clinician' }
  localStorage.setItem(KEY(role), JSON.stringify({ user, accessToken: tokens.access_token, idToken: tokens.id_token, refreshToken: tokens.refresh_token } satisfies StoredAuth))
  accessTokenMemo = tokens.access_token
  return user
}

function nameFromEmail(email: string): string {
  const p = email.split('@')[0]
  return p.charAt(0).toUpperCase() + p.slice(1)
}

// ---- Cognito flow --------------------------------------------------------
export type SignInOutcome =
  | { kind: 'success'; user: AuthUser }
  | { kind: 'mfa'; session: string; username: string }
  | { kind: 'mfa_setup'; session: string; username: string }
  | { kind: 'new_password'; session: string; username: string }

export async function cognitoSignIn(role: PortalRole, email: string, password: string): Promise<SignInOutcome> {
  const resp: AwsLoginResponse = await loginAws(email, password)
  if (resp.status === 'AUTH_SUCCESS') return { kind: 'success', user: persist(role, resp, email, nameFromEmail(email)) }
  if (resp.status === 'MFA_REQUIRED') return { kind: 'mfa', session: resp.session, username: email }
  if (resp.status === 'MFA_SETUP_REQUIRED') return { kind: 'mfa_setup', session: resp.session, username: email }
  return { kind: 'new_password', session: resp.session, username: email }
}

export async function cognitoVerifyLoginMfa(role: PortalRole, session: string, username: string, code: string): Promise<AuthUser> {
  const tokens = await verifyLoginMfaAws(session, username, code)
  return persist(role, tokens, username, nameFromEmail(username))
}

export async function cognitoStartMfaSetup(session: string, username: string) {
  return startMfaSetupAws(session, username)
}
export async function cognitoCompleteMfaSetup(role: PortalRole, session: string, username: string, code: string): Promise<AuthUser> {
  const tokens = await verifyMfaSetupAws(session, username, code)
  return persist(role, tokens, username, nameFromEmail(username))
}

export async function cognitoRegister(role: PortalRole, name: string, email: string, password: string) {
  return registerAws(name, email, password, role)
}
export async function cognitoCompleteNewPassword(role: PortalRole, session: string, username: string, newPassword: string, name: string): Promise<SignInOutcome> {
  const resp = await completeNewPasswordAws(session, username, newPassword, name)
  if (resp.status === 'AUTH_SUCCESS') return { kind: 'success', user: persist(role, resp, username, name || nameFromEmail(username)) }
  if (resp.status === 'MFA_SETUP_REQUIRED') return { kind: 'mfa_setup', session: resp.session, username }
  if (resp.status === 'MFA_REQUIRED') return { kind: 'mfa', session: resp.session, username }
  return { kind: 'new_password', session: resp.session, username }
}

// Re-validate a stored token on app load; returns the user or null if expired.
export async function hydrate(role: PortalRole): Promise<AuthUser | null> {
  const token = (() => { const raw = localStorage.getItem(KEY(role)); if (!raw) return null; try { return (JSON.parse(raw) as StoredAuth).accessToken } catch { return null } })()
  if (!token) return null
  if (token.startsWith('demo.')) return loadStored(role) // demo token — trust local
  try { await validateTokenAws(token); accessTokenMemo = token; return loadStored(role) }
  catch { localStorage.removeItem(KEY(role)); return null }
}

// ---- Demo fallback (when backend/Cognito is unavailable) ----
export async function demoLogin(role: PortalRole, name?: string): Promise<AuthUser> {
  const user: AuthUser = {
    username: role === 'patient' ? 'maya@example.com' : 'dr.finch@bhuc.example',
    displayName: name || (role === 'patient' ? 'Maya' : 'Dr. Finch'),
    role, mfa: role === 'clinician',
  }
  const token = `demo.${role}.${Date.now()}`
  localStorage.setItem(KEY(role), JSON.stringify({ user, accessToken: token } satisfies StoredAuth))
  accessTokenMemo = token
  return user
}

export function logout(role: PortalRole) {
  const raw = localStorage.getItem(KEY(role))
  if (raw) { try { const t = (JSON.parse(raw) as StoredAuth).accessToken; if (t && !t.startsWith('demo.')) void logoutAws(t).catch(() => {}) } catch { /* */ } }
  localStorage.removeItem(KEY(role))
  accessTokenMemo = null
}
