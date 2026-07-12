import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, UserPlus, ClipboardList, CalendarDays, ShieldAlert } from 'lucide-react'
import { api } from '../services/api'
import type { NotificationItem } from '../lib/types'
import { timeAgo } from '../lib/format'

const SEEN_KEY = 'bhuc_notif_seen'
const ICON: Record<NotificationItem['type'], typeof Bell> = {
  registration: UserPlus, screening: ClipboardList, appointment: CalendarDays, escalation: ShieldAlert,
}

// Clinician notification bell: aggregates registrations, screenings, appointments, and
// escalations. Unread = items newer than the last time the bell was opened (localStorage).
export function NotificationBell() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [lastSeen, setLastSeen] = useState<string>(() => localStorage.getItem(SEEN_KEY) || '')
  const ref = useRef<HTMLDivElement>(null)

  const load = () => { api.getNotifications().then(setItems).catch(() => {}) }
  useEffect(() => { load(); const t = window.setInterval(load, 45000); return () => window.clearInterval(t) }, [])
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const unread = items.filter((i) => i.at > lastSeen).length
  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && items.length) { localStorage.setItem(SEEN_KEY, items[0].at); setLastSeen(items[0].at) }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">Notifications</span>
            <span className="text-xs text-slate-400">{items.length}</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">No recent activity.</p>
            ) : items.map((n) => {
              const Icon = ICON[n.type]
              const isNew = n.at > lastSeen
              return (
                <button key={n.id} onClick={() => { if (n.link) { setOpen(false); navigate(n.link) } }}
                  className={`flex w-full items-start gap-2 border-b border-slate-50 px-3 py-2 text-left hover:bg-slate-50 ${isNew ? 'bg-teal-50/40' : ''}`}>
                  <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${n.urgent ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800">{n.title}</span>
                    <span className="block truncate text-xs text-slate-500">{n.detail}</span>
                    <span className="block text-[11px] text-slate-400">{timeAgo(n.at)}</span>
                  </span>
                  {isNew && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
