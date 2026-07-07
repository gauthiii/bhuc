// Typed client for the BHUC backend Cognito router (/api/aws/*).
// Mirrors the careatlas awsAuth service.
const API_BASE = (import.meta.env.VITE_AWS_API_BASE as string | undefined) ?? '/api'

export interface AwsAuthTokens {
  status: 'AUTH_SUCCESS'
  id_token: string
  access_token: string
  refresh_token?: string | null
}
export interface AwsMfaSetupRequired { status: 'MFA_SETUP_REQUIRED'; session: string }
export interface AwsMfaRequired { status: 'MFA_REQUIRED'; session: string }
export interface AwsChallenge { status: 'CHALLENGE'; challenge_name: string; session: string }
export type AwsLoginResponse = AwsAuthTokens | AwsMfaSetupRequired | AwsMfaRequired | AwsChallenge

export interface AwsRegisterResponse { status: 'SIGNUP_AND_CONFIRMED'; user_sub: string }
export interface AwsMfaSetupStartResponse {
  status: 'MFA_SETUP_TOKEN_CREATED'; secret: string; session: string; otpauth_url: string; qr_image_data_url: string
}
export interface AwsValidatedUser { status: 'VALID'; username: string; attributes: Record<string, string> }

async function readError(res: Response): Promise<string> {
  try { const b = await res.json(); return b?.detail || JSON.stringify(b) } catch { return res.statusText }
}
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as T
}

export const registerAws = (name: string, email: string, password: string, role: 'patient' | 'clinician') =>
  postJson<AwsRegisterResponse>('/aws/register', { name, email, password, role })
export const loginAws = (username: string, password: string) =>
  postJson<AwsLoginResponse>('/aws/login', { username, password })
export const completeNewPasswordAws = (session: string, username: string, newPassword: string, name: string) =>
  postJson<AwsLoginResponse>('/aws/login/new-password', { session, username, new_password: newPassword, name })
export const startMfaSetupAws = (session: string, username: string) =>
  postJson<AwsMfaSetupStartResponse>('/aws/mfa/setup/start', { session, username })
export const verifyMfaSetupAws = (session: string, username: string, code: string) =>
  postJson<AwsAuthTokens>('/aws/mfa/setup/verify', { session, username, code })
export const verifyLoginMfaAws = (session: string, username: string, code: string) =>
  postJson<AwsAuthTokens>('/aws/login/verify-mfa', { session, username, code })
export const forgotPasswordAws = (username: string) =>
  postJson<{ status: string }>('/aws/password/forgot', { username })
export const resetPasswordAws = (username: string, code: string, newPassword: string) =>
  postJson<{ status: string }>('/aws/password/reset', { username, code, new_password: newPassword })
export const validateTokenAws = (accessToken: string) =>
  postJson<AwsValidatedUser>('/aws/token/validate', { access_token: accessToken })
export const logoutAws = (accessToken: string) =>
  postJson<{ status: string }>('/aws/logout', { access_token: accessToken })
