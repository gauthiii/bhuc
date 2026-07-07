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
