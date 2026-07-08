export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export function formatTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString(undefined, { timeStyle: 'short' })
}

// Compact "time ago" (e.g. "just now", "5 min ago", "3 h ago", "2 d ago").
export function timeAgo(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (s < 45) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days} d ago`
  const mo = Math.floor(days / 30)
  if (mo < 12) return `${mo} mo ago`
  return `${Math.floor(mo / 12)} y ago`
}

export function currency(n?: number, code = 'USD'): string {
  if (n == null) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(n)
}

export function riskTone(band: string): 'danger' | 'warning' | 'success' | 'neutral' {
  switch (band) {
    case 'high':
      return 'danger'
    case 'moderate':
      return 'warning'
    case 'low':
      return 'success'
    default:
      return 'neutral'
  }
}
