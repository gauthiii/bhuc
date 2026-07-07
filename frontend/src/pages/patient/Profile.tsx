import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserRound, ShieldCheck } from 'lucide-react'
import { api } from '../../services/api'
import type { MeResponse } from '../../lib/types'
import { usePatientAuth } from '../../contexts/AuthContext'
import { PatientShell } from '../../components/portals'
import { Panel, Button, StatusBadge, Spinner } from '../../components/ui'

// Shown to a registered patient in place of the registration flow.
export function PatientProfile() {
  const { user } = usePatientAuth()
  const email = user?.username ?? ''
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    api.getMe(email).then((m) => { if (alive) { setMe(m); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
  }, [email])

  if (loading) return <PatientShell title="Your profile"><Spinner label="Loading your profile…" /></PatientShell>

  // not registered yet → send them to registration
  if (!me?.registered || !me.profile) {
    return (
      <PatientShell title="Your profile" intro="Complete your registration to unlock your profile and screening.">
        <div className="mx-auto max-w-2xl">
          <Panel title="You're almost set up">
            <p className="text-sm text-slate-600">You haven't finished registration yet. It takes a few minutes and includes your consent choices.</p>
            <div className="mt-5 flex justify-end">
              <Link to="/patient/register"><Button>Complete registration</Button></Link>
            </div>
          </Panel>
        </div>
      </PatientShell>
    )
  }

  const p = me.profile
  const consentItems: { key: 'hipaa' | 'part2' | 'tcpa'; label: string; granted: boolean }[] = [
    { key: 'hipaa', label: 'HIPAA consent', granted: p.hipaaConsent },
    { key: 'part2', label: '42 CFR Part 2 (SUD) consent', granted: p.part2Consent },
    { key: 'tcpa', label: 'Text message (TCPA) consent', granted: p.tcpaSmsConsent },
  ]

  async function toggleConsent(key: 'hipaa' | 'part2' | 'tcpa', granted: boolean) {
    setMe((m) => m && m.profile ? { ...m, profile: { ...m.profile,
      hipaaConsent: key === 'hipaa' ? granted : m.profile.hipaaConsent,
      part2Consent: key === 'part2' ? granted : m.profile.part2Consent,
      tcpaSmsConsent: key === 'tcpa' ? granted : m.profile.tcpaSmsConsent } } : m)
    try {
      await api.setConsent({ email, patientId: p.patientId, consent: key, granted })
    } catch {
      // revert on failure
      setMe((m) => m && m.profile ? { ...m, profile: { ...m.profile,
        hipaaConsent: key === 'hipaa' ? !granted : m.profile.hipaaConsent,
        part2Consent: key === 'part2' ? !granted : m.profile.part2Consent,
        tcpaSmsConsent: key === 'tcpa' ? !granted : m.profile.tcpaSmsConsent } } : m)
    }
  }

  const rows: [string, string][] = [
    ['Full name', `${p.firstName} ${p.lastName}`.trim()],
    ['Preferred name', p.preferredName || '—'],
    ['Date of birth', p.dateOfBirth || '—'],
    ['Email', p.email],
    ['Phone', p.phone || '—'],
    ['Insurance', p.selfPay ? 'Self-pay' : (p.insuranceProvider || '—')],
    ['Member ID', p.insuranceMemberId || '—'],
  ]
  return (
    <PatientShell
      title="Your profile"
      intro="Your registration details and consent choices."
      actions={<StatusBadge tone={p.registrationStatus === 'verified' ? 'success' : 'warning'}>{p.registrationStatus === 'verified' ? 'Registered' : p.registrationStatus}</StatusBadge>}
    >
      <div className="mx-auto grid max-w-2xl gap-4">
        <Panel title={<span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-teal-700" /> {p.number || 'Patient'}</span>}>
          <dl className="grid gap-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-700" /> Consents</span>}>
          <p className="mb-3 text-xs text-slate-500">You control these. Unchecking a consent revokes it — your care team can no longer view data that depends on it (e.g. 42 CFR Part 2 substance‑use information).</p>
          <ul className="grid gap-2">
            {consentItems.map((c) => (
              <li key={c.key} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={c.granted} onChange={(e) => toggleConsent(c.key, e.target.checked)} className="accent-teal-700" />
                  {c.label}
                </label>
                <StatusBadge tone={c.granted ? 'success' : 'warning'}>{c.granted ? 'Granted' : 'Revoked'}</StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="flex justify-end gap-2">
          <Link to="/patient/screening"><Button variant="secondary">Start a screening</Button></Link>
          <Link to="/patient/home"><Button variant="secondary">Home</Button></Link>
        </div>
      </div>
    </PatientShell>
  )
}
