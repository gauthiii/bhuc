import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

// Hover/focus help beside a label: what the thing is and what belongs in it. Opens on pointer
// hover, on keyboard focus, and on click (so it works on touch), and closes on Escape.
// `align` flips the popover to the right edge when the label sits near the right of its
// container, so the panel never pushes the tooltip out of view.
export function HelpTip({ label, help, align = 'left' }: {
  label: string
  help: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
        className="text-slate-300 transition hover:text-teal-600 focus:text-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute top-full z-50 mt-1.5 w-72 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-slate-100 shadow-xl ring-1 ring-black/10 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {help}
        </span>
      )}
    </span>
  )
}
