import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { api } from '../../services/api'
import { usePatientAuth } from '../../contexts/AuthContext'
import type { ConsentRecord, ConsentType } from '../../lib/types'
import { PatientShell } from '../../components/portals'
import { Panel, Stepper, Button, Field, Input, Select } from '../../components/ui'

const STEPS = ['Personal', 'Insurance', 'HIPAA', '42 CFR Part 2', 'Communication']

const CONSENT_TEXT: Record<string, string> = {
  hipaa: 'Notice of Privacy Practices (HIPAA). This notice describes how your medical information may be used and disclosed and how you can get access to this information. BHUC Care uses and discloses your protected health information for treatment, payment, and health care operations. You have the right to inspect and request a copy of your records, to request restrictions, and to receive an accounting of disclosures. We are required by law to maintain the privacy of your health information and to notify you following a breach. By signing below you acknowledge that you have read and agree to the Notice of Privacy Practices.',
  part2_sud: 'Consent for Disclosure of Substance Use Disorder (SUD) Records — 42 CFR Part 2. Federal law (42 CFR Part 2) provides additional protection for records of the identity, diagnosis, prognosis, or treatment of any patient related to substance use disorder. This consent is separate from the HIPAA acknowledgement. By granting this consent you specifically authorize BHUC Care to use and disclose your SUD treatment records for the purpose of coordinating your care. You may revoke this consent at any time in writing, except to the extent action has already been taken in reliance on it. Declining this consent will not affect your access to crisis help, though some SUD-specific portal features may be limited.',
  tcpa_sms: 'Consent to Receive Text Messages (TCPA). By granting this optional consent you agree to receive appointment reminders and care-related messages by text message at the mobile number you provided. Message and data rates may apply. Message frequency varies. You can opt out at any time by replying STOP. This consent is optional and is not required to receive care.',
}

interface Personal { firstName: string; lastName: string; dob: string; phone: string }
const CONSENT_KEYS: ConsentType[] = ['hipaa', 'part2_sud', 'tcpa_sms']

export function PatientRegistration() {
  const navigate = useNavigate()
  const { user } = usePatientAuth()
  const [step, setStep] = useState(0)
  const [personal, setPersonal] = useState<Personal>({ firstName: '', lastName: '', dob: '', phone: '' })
  const [selfPay, setSelfPay] = useState(false)
  const [carrier, setCarrier] = useState('')
  const [memberId, setMemberId] = useState('')

  const legalName = `${personal.firstName} ${personal.lastName}`.trim()
  const today = new Date().toISOString().slice(0, 10)

  const back = () => setStep((s) => Math.max(0, s - 1))
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1))

  const personalValid = personal.firstName.trim() && personal.lastName.trim() && personal.dob && personal.phone.trim()
  const insuranceValid = selfPay || (carrier.trim() && memberId.trim())

  // On finishing the last consent, persist the patient record (marks them registered)
  // so the gate opens and the Profile page shows. Best-effort — never block the finish.
  async function completeRegistration() {
    try {
      await api.registerPatient({
        email: user?.username ?? '',
        firstName: personal.firstName, lastName: personal.lastName,
        dateOfBirth: personal.dob, phone: personal.phone,
        insuranceProvider: selfPay ? '' : carrier, insuranceMemberId: selfPay ? '' : memberId,
        selfPay, hipaaConsent: true, part2Consent: true, tcpaSmsConsent: true,
      })
    } catch { /* non-blocking */ }
    navigate('/patient/profile')
  }

  return (
    <PatientShell title="Registration & consent" intro="Set up your profile and record each consent separately. Your information is protected under HIPAA and 42 CFR Part 2.">
      <div className="mx-auto max-w-3xl space-y-5">
        <Stepper steps={STEPS} current={step} />

        {step === 0 && (
          <Panel title="Personal details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Legal first name" required>
                <Input value={personal.firstName} onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })} autoComplete="given-name" />
              </Field>
              <Field label="Legal last name" required>
                <Input value={personal.lastName} onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })} autoComplete="family-name" />
              </Field>
              <Field label="Date of birth" required>
                <Input type="date" max={today} value={personal.dob} onChange={(e) => setPersonal({ ...personal, dob: e.target.value })} />
              </Field>
              <Field label="Mobile phone" required hint="Used for appointment reminders (see Communication step).">
                <Input type="tel" placeholder="+1 512 555 0142" value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} autoComplete="tel" />
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={next} disabled={!personalValid}>Continue</Button>
            </div>
          </Panel>
        )}

        {step === 1 && (
          <Panel title="Insurance">
            <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={selfPay} onChange={(e) => setSelfPay(e.target.checked)} className="accent-teal-700" />
              I’m uninsured / self-pay
            </label>
            {!selfPay && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Insurance carrier" required>
                  <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Blue Shield" />
                </Field>
                <Field label="Member ID" required>
                  <Input value={memberId} onChange={(e) => setMemberId(e.target.value)} />
                </Field>
              </div>
            )}
            {selfPay && <p className="text-sm text-slate-500">No problem — you may be eligible for self-pay pricing. A financial counselor can help.</p>}
            <div className="mt-5 flex justify-between">
              <Button variant="secondary" onClick={back}>Back</Button>
              <Button onClick={next} disabled={!insuranceValid}>Continue</Button>
            </div>
          </Panel>
        )}

        {step >= 2 && step <= 4 && (
          <ConsentStep
            key={CONSENT_KEYS[step - 2]}
            consentType={CONSENT_KEYS[step - 2]}
            title={STEPS[step]}
            optional={CONSENT_KEYS[step - 2] === 'tcpa_sms'}
            legalName={legalName}
            phone={personal.phone}
            onBack={back}
            isLast={step === 4}
            onDone={() => (step === 4 ? completeRegistration() : next())}
          />
        )}
      </div>
    </PatientShell>
  )
}

function ConsentStep({ consentType, title, optional, legalName, phone, onBack, isLast, onDone }: {
  consentType: ConsentType; title: string; optional: boolean; legalName: string; phone: string
  onBack: () => void; isLast: boolean; onDone: () => void
}) {
  const [scrolledEnd, setScrolledEnd] = useState(false)
  const [checked, setChecked] = useState(false)
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const label: Record<ConsentType, string> = {
    hipaa: 'I have read and agree to the Notice of Privacy Practices (HIPAA).',
    part2_sud: 'I specifically consent to the use and disclosure of my substance use disorder (SUD) treatment records as described above, under 42 CFR Part 2.',
    tcpa_sms: 'I agree to receive appointment reminders and care messages by text (TCPA). Message/data rates may apply. I can opt out anytime by replying STOP.',
  }

  const signatureOk = signature.trim().toLowerCase() === legalName.toLowerCase() && legalName.length > 0
  const canGrant = scrolledEnd && checked && signatureOk

  async function submit(granted: boolean) {
    setSubmitting(true)
    setError(null)
    const record: ConsentRecord = {
      consentType, granted, version: '2026-01',
      signedAt: new Date().toISOString(),
      ...(granted ? { signature } : {}),
      ...(consentType === 'part2_sud' ? { scope: 'treatment_coordination' } : {}),
      ...(consentType === 'tcpa_sms' ? { phone } : {}),
    }
    try {
      await api.submitConsent(record)
      onDone()
    } catch {
      setError('This consent could not be recorded. Please contact the front desk.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Panel title={title} subtitle={optional ? 'Optional — you can continue without agreeing.' : 'Required to continue.'}>
      <div
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setScrolledEnd(true)
        }}
        className="mb-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700"
      >
        {CONSENT_TEXT[consentType]}
        <p className="mt-3 font-medium text-teal-800">— You’ve reached the end of this document. —</p>
      </div>
      {!scrolledEnd && <p className="mb-3 text-xs text-slate-500">Please scroll through the full document to continue.</p>}

      <label className="mb-4 flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" disabled={!scrolledEnd} checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 accent-teal-700" />
        <span>{label[consentType]}</span>
      </label>

      {checked && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type your full legal name to sign" required
            error={signature && !signatureOk ? 'Type your full legal name exactly as entered.' : undefined}>
            <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={legalName || 'Your legal name'} />
          </Field>
          <Field label="Date">
            <Input value={today} readOnly className="bg-slate-50" />
          </Field>
        </div>
      )}

      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{error}</p>}

      <div className="mt-5 flex items-center justify-between">
        <Button variant="secondary" onClick={onBack} disabled={submitting}>Back</Button>
        <div className="flex gap-2">
          {optional && (
            <Button variant="ghost" onClick={() => submit(false)} disabled={submitting}>Decline &amp; continue</Button>
          )}
          <Button onClick={() => submit(true)} disabled={!canGrant || submitting}>
            {submitting ? 'Recording…' : isLast ? 'Agree & finish' : 'Agree & continue'}
          </Button>
        </div>
      </div>
      {optional && (
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><CheckCircle2 className="h-3 w-3" /> Declining is recorded and does not affect crisis help.</p>
      )}
    </Panel>
  )
}
