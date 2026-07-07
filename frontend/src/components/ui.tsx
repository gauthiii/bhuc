import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

// ---- Panel (card) ----
export function Panel({ title, subtitle, actions, children, tone = 'default' }: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <section className={`rounded-2xl border bg-white/90 shadow-sm ${tone === 'danger' ? 'border-red-200' : 'border-slate-200'}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-800">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

// ---- Status badge (plan §3.1 semantics: amber/teal/red + neutral) ----
export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'
const TONES: Record<Tone, string> = {
  success: 'bg-teal-50 text-teal-800 ring-teal-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  danger: 'bg-red-50 text-red-800 ring-red-600/20',
  info: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-400/20',
}
export function StatusBadge({ tone = 'neutral', children, icon }: { tone?: Tone; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}>
      {icon}
      {children}
    </span>
  )
}

export function RiskBadge({ band }: { band: string }) {
  const tone: Tone = band === 'high' ? 'danger' : band === 'moderate' ? 'warning' : band === 'low' ? 'success' : 'neutral'
  const label = band === 'unknown' ? 'Not scored' : `${band[0].toUpperCase()}${band.slice(1)} risk`
  return <StatusBadge tone={tone}>{label}</StatusBadge>
}

// ---- Button ----
export function Button({ variant = 'primary', children, className = '', ...props }: {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
  const styles: Record<string, string> = {
    primary: 'bg-teal-700 text-white hover:bg-teal-800',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-700 text-white hover:bg-red-800',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }
  return <button className={`${base} ${styles[variant]} ${className}`} {...props}>{children}</button>
}

// ---- Form fields ----
export function Field({ label, hint, error, required, children }: {
  label: string; hint?: string; error?: string; required?: boolean; children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-600 ${props.className || ''}`} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-600 ${props.className || ''}`} />
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-600 ${props.className || ''}`} />
}

export function RadioGroup<T extends string | number>({ name, value, onChange, options }: {
  name: string; value: T | undefined; onChange: (v: T) => void; options: { value: T; label: string }[]
}) {
  return (
    <div role="radiogroup" className="grid gap-2">
      {options.map((o) => (
        <label key={String(o.value)} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${value === o.value ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="accent-teal-700" />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )
}

// ---- Stepper ----
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap gap-2" role="list">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? 'step' : undefined}
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${i === current ? 'bg-teal-700 text-white' : i < current ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>
          <span className="grid h-4 w-4 place-items-center rounded-full bg-white/30 text-[10px]">{i < current ? '✓' : i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  )
}

// ---- States ----
export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> {label}</div>
}
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-slate-300 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-500">{hint}</p>}
      {action}
    </div>
  )
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {message} {onRetry && <button onClick={onRetry} className="ml-2 font-semibold underline">Retry</button>}
    </div>
  )
}
