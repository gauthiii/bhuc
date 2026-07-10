import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CalendarCheck2, CheckCircle2, Video, MapPin, ArrowUpRight, ArrowRight } from 'lucide-react'
import { ClinicianShell } from '../../components/portals'
import { Panel, Spinner, ErrorState, EmptyState, Button } from '../../components/ui'
import { api } from '../../services/api'
import type { ClinicianCalendar, CalendarAppointment } from '../../lib/types'
import { formatTime } from '../../lib/format'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Work in the appointment's stored (UTC) date so grouping is timezone-stable.
const dayKey = (iso: string) => (iso || '').slice(0, 10)                 // 'YYYY-MM-DD'
const utcKey = (d: Date) => d.toISOString().slice(0, 10)
const prettyDay = (key: string) => {
  const d = new Date(key + 'T12:00:00Z')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

const STATUS = {
  confirmed: { chip: 'border-teal-200 bg-teal-50 text-teal-700', dot: 'bg-teal-500', label: 'Confirmed' },
  completed: { chip: 'border-slate-200 bg-slate-100 text-slate-600', dot: 'bg-slate-400', label: 'Completed' },
} as const
const statusStyle = (s: string) => STATUS[s as keyof typeof STATUS] ?? STATUS.completed

function StatCard({ label, value, subtitle, tone = 'default', to }: { label: string; value: string | number; subtitle?: string; tone?: 'default' | 'amber' | 'teal'; to?: string }) {
  const ring = tone === 'amber' ? 'border-amber-200' : tone === 'teal' ? 'border-teal-200' : 'border-slate-200'
  const body = (
    <div className={`h-full rounded-2xl border ${ring} bg-white p-5 shadow-sm ${to ? 'transition hover:shadow-md hover:border-amber-300' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
        {to && <ArrowUpRight className="h-4 w-4 text-amber-500" />}
      </div>
      <div className={`mt-2 text-3xl font-bold ${tone === 'amber' ? 'text-amber-700' : 'text-slate-900'}`}>{value}</div>
      {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
    </div>
  )
  return to ? <Link to={to} className="block">{body}</Link> : body
}

function ApptRow({ a }: { a: CalendarAppointment }) {
  const st = statusStyle(a.status)
  return (
    <Link to={`/clinician/chart/${a.patientId}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
      <div className="flex h-10 w-14 flex-col items-center justify-center rounded-lg bg-slate-50 text-xs font-semibold text-slate-600">
        {formatTime(a.start)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-800">{a.patientName}</p>
        <p className="truncate text-xs text-slate-500">{a.reasonLabel} · {a.visitType} · {a.modality === 'telehealth' ? 'Telehealth' : 'In person'}</p>
      </div>
      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.chip}`}>{st.label}</span>
      {a.modality === 'telehealth' ? <Video className="h-4 w-4 text-slate-400" /> : <MapPin className="h-4 w-4 text-slate-400" />}
    </Link>
  )
}

export function ClinicianCalendarPage() {
  const [data, setData] = useState<ClinicianCalendar | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [])
  const [view, setView] = useState({ y: now.getUTCFullYear(), m: now.getUTCMonth() })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  function load() {
    setLoading(true); setError(null)
    api.getClinicianCalendar()
      .then((d) => { setData(d); if (!selectedDay) setSelectedDay(utcKey(now)) })
      .catch(() => setError("Couldn't load the calendar."))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const appts = data?.appointments ?? []
  const byDay = useMemo(() => {
    const m: Record<string, CalendarAppointment[]> = {}
    for (const a of appts) (m[dayKey(a.start)] ??= []).push(a)
    for (const k in m) m[k].sort((x, y) => x.start.localeCompare(y.start))
    return m
  }, [appts])

  // ---- metrics ----
  const todayKey = utcKey(now)
  const nowIso = now.toISOString()
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay()))
  const weekKeys = Array.from({ length: 7 }, (_, i) => utcKey(new Date(weekStart.getTime() + i * 864e5)))
  const thisWeek = appts.filter((a) => weekKeys.includes(dayKey(a.start))).sort((a, b) => a.start.localeCompare(b.start))
  const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const completedThisMonth = appts.filter((a) => a.status === 'completed' && dayKey(a.start).startsWith(monthPrefix)).length
  const confirmedUpcoming = appts.filter((a) => a.status === 'confirmed' && a.start >= nowIso).length
  const recentlyCompleted = appts.filter((a) => a.status === 'completed').sort((a, b) => b.start.localeCompare(a.start)).slice(0, 6)

  // ---- month grid (6 weeks) ----
  const firstWeekday = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay()
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(Date.UTC(view.y, view.m, 1 - firstWeekday + i))
    const key = utcKey(d)
    return { key, day: d.getUTCDate(), inMonth: d.getUTCMonth() === view.m, appts: byDay[key] ?? [] }
  })
  const shiftMonth = (delta: number) => setView((v) => {
    const d = new Date(Date.UTC(v.y, v.m + delta, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }
  })
  const selectedAppts = selectedDay ? (byDay[selectedDay] ?? []) : []

  return (
    <ClinicianShell title="Calendar" intro="Your confirmed and completed appointments at a glance, with pending requests waiting to be scheduled.">
      {loading ? (
        <Spinner label="Loading calendar…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="grid gap-5">
          {/* metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Pending requests" value={data?.pendingCount ?? 0} subtitle="Go to Scheduling →" tone="amber" to="/clinician/scheduling" />
            <StatCard label="This week" value={thisWeek.length} subtitle="Confirmed + completed" tone="teal" />
            <StatCard label="Completed this month" value={completedThisMonth} subtitle={MONTHS[now.getUTCMonth()]} />
            <StatCard label="Confirmed upcoming" value={confirmedUpcoming} subtitle="From now" />
          </div>

          {/* this week's appointments */}
          <Panel title="This week's appointments">
            {thisWeek.length === 0 ? (
              <EmptyState title="Nothing scheduled this week" hint="Confirmed and completed visits for the current week appear here." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">{thisWeek.map((a) => <ApptRow key={a.id} a={a} />)}</div>
            )}
          </Panel>

          {/* month calendar + day detail */}
          <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
            <Panel
              title={`${MONTHS[view.m]} ${view.y}`}
              actions={
                <div className="flex items-center gap-1">
                  <Button variant="ghost" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" onClick={() => setView({ y: now.getUTCFullYear(), m: now.getUTCMonth() })}>Today</Button>
                  <Button variant="ghost" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              }
            >
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((w) => <div key={w} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{w}</div>)}
                {cells.map((c) => {
                  const isToday = c.key === todayKey
                  const isSelected = c.key === selectedDay
                  return (
                    <button
                      key={c.key}
                      onClick={() => setSelectedDay(c.key)}
                      className={`min-h-[74px] rounded-lg border p-1.5 text-left align-top transition
                        ${isSelected ? 'border-teal-600 ring-1 ring-teal-500' : 'border-slate-100 hover:border-slate-300'}
                        ${c.inMonth ? 'bg-white' : 'bg-slate-50/60'}`}
                    >
                      <div className={`mb-1 flex items-center justify-between text-xs font-semibold ${c.inMonth ? 'text-slate-700' : 'text-slate-300'}`}>
                        <span className={isToday ? 'flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white' : ''}>{c.day}</span>
                        {c.appts.length > 0 && <span className="text-[10px] font-normal text-slate-400">{c.appts.length}</span>}
                      </div>
                      <div className="space-y-0.5">
                        {c.appts.slice(0, 2).map((a) => (
                          <div key={a.id} className={`truncate rounded px-1 py-0.5 text-[10px] ${statusStyle(a.status).chip}`}>
                            {formatTime(a.start)} {a.patientName.split(' ')[0]}
                          </div>
                        ))}
                        {c.appts.length > 2 && <div className="px-1 text-[10px] text-slate-400">+{c.appts.length - 2} more</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${STATUS.confirmed.dot}`} /> Confirmed</span>
                <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${STATUS.completed.dot}`} /> Completed</span>
              </div>
            </Panel>

            {/* selected-day detail */}
            <Panel title={selectedDay ? prettyDay(selectedDay) : 'Select a day'} actions={<CalendarCheck2 className="h-4 w-4 text-slate-400" />}>
              {selectedAppts.length === 0 ? (
                <EmptyState title="No appointments" hint="Pick a day with a marker to see its visits." />
              ) : (
                <div className="grid gap-2">{selectedAppts.map((a) => <ApptRow key={a.id} a={a} />)}</div>
              )}
            </Panel>
          </div>

          {/* recently completed */}
          <Panel title="Recently completed" actions={<CheckCircle2 className="h-4 w-4 text-slate-400" />}>
            {recentlyCompleted.length === 0 ? (
              <EmptyState title="No completed visits yet" />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {recentlyCompleted.map((a) => (
                  <li key={a.id}>
                    <Link to={`/clinician/chart/${a.patientId}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50">
                      <div className="min-w-0">
                        <span className="font-medium text-slate-800">{a.patientName}</span>
                        <span className="ml-2 text-xs text-slate-500">{a.reasonLabel} · {prettyDay(dayKey(a.start))}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </ClinicianShell>
  )
}
