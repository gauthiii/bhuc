import { useEffect, useState } from 'react'
import { Video } from 'lucide-react'
import { api } from '../../services/api'
import type { Appointment, AvailabilitySlot } from '../../lib/types'
import { PatientShell } from '../../components/portals'
import { Panel, Button, StatusBadge, Spinner, ErrorState, EmptyState, Select, Textarea, Field, type Tone } from '../../components/ui'
import { formatDateTime, formatTime } from '../../lib/format'

const REASONS = [
  { value: 'crisis', label: 'Urgent / crisis' },
  { value: 'medication', label: 'Medication' },
  { value: 'therapy', label: 'Therapy' },
  { value: 'intake', label: 'New patient / intake' },
  { value: 'other', label: 'Other' },
]

const STATUS_TONE: Record<string, Tone> = { confirmed: 'success', pending: 'warning', proposed: 'warning', cancelled: 'neutral', completed: 'neutral', no_show: 'neutral' }

function ApptCard({ a }: { a: Appointment }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-semibold text-slate-900">{formatDateTime(a.start)}</p>
          <p className="text-sm text-slate-600">{a.visitType} · {a.modality === 'telehealth' ? 'Telehealth' : 'In person'}</p>
          {a.clinician && <p className="text-sm text-slate-500">{a.clinician}</p>}
        </div>
        <StatusBadge tone={STATUS_TONE[a.status] ?? 'neutral'}>{a.status[0].toUpperCase() + a.status.slice(1)}</StatusBadge>
      </div>
      {a.modality === 'telehealth' && a.status === 'confirmed' && a.telehealthUrl && (
        <div className="mt-3">
          <Button variant="primary"><Video className="h-4 w-4" /> Join telehealth</Button>
        </div>
      )}
    </div>
  )
}

export function PatientAppointments() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [data, setData] = useState<{ upcoming: Appointment[]; past: Appointment[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [booking, setBooking] = useState(false)
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [reasonCategory, setReasonCategory] = useState('crisis')
  const [reasonText, setReasonText] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api.getAppointments()
      .then(setData)
      .catch(() => setError('Couldn’t load your appointments.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function openBooking() {
    setBooking(true)
    setSelected(null)
    setSlotsLoading(true)
    try {
      setSlots(await api.getAvailability())
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  async function confirm() {
    if (!selected) return
    setConfirming(true)
    try {
      const slot = slots?.find((s) => s.slotId === selected)
      const appt = await api.bookAppointment({ slotId: selected, start: slot?.start, reasonCategory, reasonText })
      setData((d) => d ? { ...d, upcoming: [appt, ...d.upcoming] } : d)
      setBooking(false)
      setTab('upcoming')
      setReasonText('')
      // Booked as a request: the care team's scheduling agent proposes a confirmed time.
      setToast(`Request submitted for ${formatDateTime(appt.start)}. Your care team will confirm a time.`)
      setTimeout(() => setToast(null), 6000)
    } catch {
      setError('That time just changed. Please pick another slot.')
    } finally {
      setConfirming(false)
    }
  }

  const list = data ? data[tab] : []

  return (
    <PatientShell
      title="Appointments"
      intro="View your visits and book a new one."
      actions={<Button onClick={openBooking}>Book a visit</Button>}
    >
      {toast && <div role="status" aria-live="polite" className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">{toast}</div>}

      <div className="mx-auto max-w-3xl space-y-5">
        {booking && (
          <Panel title="Request a visit" subtitle="Tell us why and pick a preferred time — your care team confirms the final slot." actions={<Button variant="ghost" onClick={() => setBooking(false)}>Cancel</Button>}>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <Field label="Reason for visit" required>
                <Select value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)}>
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
              </Field>
              <Field label="Anything else? (optional)">
                <Textarea rows={2} maxLength={500} value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder="e.g. medication side effects since last visit" />
              </Field>
            </div>
            <p className="mb-2 text-sm font-medium text-slate-700">Preferred time</p>
            {slotsLoading && <Spinner label="Finding available times…" />}
            {!slotsLoading && slots && slots.length === 0 && (
              <EmptyState title="No times available for this date" hint="Try another day, or if you need help sooner, call or text 988." />
            )}
            {!slotsLoading && slots && slots.length > 0 && (
              <>
                <div role="radiogroup" aria-label="Available times" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {slots.map((s) => (
                    <button
                      key={s.slotId}
                      role="radio"
                      aria-checked={selected === s.slotId}
                      onClick={() => setSelected(s.slotId)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium ${selected === s.slotId ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                      {formatTime(s.start)}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex justify-end">
                  <Button onClick={confirm} disabled={!selected || confirming}>{confirming ? 'Submitting…' : 'Submit request'}</Button>
                </div>
              </>
            )}
          </Panel>
        )}

        <Panel title="Your visits">
          <div role="tablist" aria-label="Appointments" className="mb-4 flex gap-2">
            {(['upcoming', 'past'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${tab === t ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {t === 'upcoming' ? 'Upcoming' : 'Past'}
              </button>
            ))}
          </div>

          {loading && <Spinner />}
          {error && !loading && <ErrorState message={error} onRetry={load} />}
          {!loading && !error && list.length === 0 && (
            <EmptyState
              title={tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments yet'}
              action={tab === 'upcoming' ? <Button onClick={openBooking}>Book a visit</Button> : undefined}
            />
          )}
          {!loading && list.length > 0 && (
            <div className="space-y-3">{list.map((a) => <ApptCard key={a.id} a={a} />)}</div>
          )}
        </Panel>
      </div>
    </PatientShell>
  )
}
