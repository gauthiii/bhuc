import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Lock, ShieldAlert, ClipboardList } from 'lucide-react'
import { api } from '../services/api'
import { Spinner, ErrorState, StatusBadge } from './ui'
import type { LatestScreenings, ScreeningDoc, Instrument } from '../lib/types'

// Map a stored answer value to its human-readable option label for one instrument, using the
// same static question bank the patient answered against. Falls back to the raw value.
function answerLabel(instrument: Instrument, questionId: string, value: number | string): string {
  const qs = api.getInstrumentQuestions(instrument)
  const q = qs.find((x) => x.id === questionId)
  if (!q) return String(value)
  const opt = q.options.find((o) => String(o.value) === String(value))
  return opt ? opt.label : String(value)
}
function questionText(instrument: Instrument, questionId: string): string {
  const q = api.getInstrumentQuestions(instrument).find((x) => x.id === questionId)
  return q?.text ?? questionId.toUpperCase()
}

function bandTone(band?: string) {
  return band === 'high' ? 'danger' : band === 'moderate' ? 'warning' : band === 'low' ? 'success' : 'neutral'
}

// Classified-style redaction panel — shown for SUD (42 CFR Part 2) documents when the
// clinician does not hold Part 2 access. The server never sends the answers for these.
function RedactedBody({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-slate-300 bg-slate-50 p-6">
      <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span><span className="font-semibold">Protected under 42 CFR Part 2.</span> {label} is a substance-use screening. You do not hold Part 2 access, so its responses are withheld.</span>
      </div>
      <div className="space-y-3" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="mb-1.5 h-2.5 w-2/3 rounded bg-slate-200" />
            <div className="relative h-6 w-full overflow-hidden rounded bg-slate-800">
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-slate-100/80">▉▉▉▉▉ redacted ▉▉▉▉▉</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Lock className="h-3.5 w-3.5" /> Ask an administrator to grant the Part 2 case-manager role.
      </div>
    </div>
  )
}

// One instrument document: letterhead + patient block + questionnaire answers (or redaction).
function ScreeningDocument({ patient, doc }: { patient: LatestScreenings['patient']; doc: ScreeningDoc }) {
  const responses = doc.responses ?? {}
  const rows = Object.keys(responses).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10)
    const nb = parseInt(b.replace(/\D/g, ''), 10)
    return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb)
  })
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Letterhead */}
      <div className="rounded-t-xl border-b-2 border-teal-700 bg-gradient-to-r from-teal-50 to-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-bold tracking-tight text-teal-900">BHUC · Behavioral Health Urgent Care</div>
            <div className="text-xs text-slate-500">Screening &amp; Assessment Record — Confidential</div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">B</div>
        </div>
      </div>

      {/* Patient details */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-slate-100 px-6 py-4 text-sm sm:grid-cols-4">
        <div><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Patient</div><div className="font-medium text-slate-800">{patient.name}</div></div>
        <div><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">MRN</div><div className="font-medium text-slate-800">{patient.number || '—'}</div></div>
        <div><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Date of birth</div><div className="font-medium text-slate-800">{patient.dateOfBirth || '—'}</div></div>
        <div><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Coverage</div><div className="font-medium text-slate-800">{patient.insurance || '—'}</div></div>
      </div>

      {/* Instrument header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ClipboardList className="h-5 w-5 text-teal-700" /> {doc.instrumentLabel}
          {doc.part2 && <StatusBadge tone="neutral" icon={<Lock className="h-3 w-3" />}>42 CFR Part 2</StatusBadge>}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{doc.screeningId}</span>
          {doc.date && <span>· {new Date(doc.date).toLocaleDateString()}</span>}
        </div>
      </div>

      <div className="px-6 pb-6 pt-3">
        {doc.redacted ? (
          <RedactedBody label={doc.instrumentLabel} />
        ) : (
          <>
            {/* Score / band summary */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {doc.riskBand && <StatusBadge tone={bandTone(doc.riskBand)}>Risk band: {doc.riskBand}</StatusBadge>}
              {doc.score !== '' && doc.score != null && <StatusBadge tone="info">Score: {doc.score}</StatusBadge>}
              {doc.subscores && Object.entries(doc.subscores).map(([k, v]) => (
                <StatusBadge key={k} tone="neutral">{k}: {v}</StatusBadge>
              ))}
            </div>

            {/* Questionnaire answers */}
            {rows.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">No individual responses were recorded for this screening.</p>
            ) : (
              <ol className="grid gap-2">
                {rows.map((qid, i) => (
                  <li key={qid} className="rounded-lg border border-slate-100 px-3 py-2">
                    <div className="text-sm text-slate-700"><span className="mr-1.5 font-semibold text-slate-400">{i + 1}.</span>{questionText(doc.instrument, qid)}</div>
                    <div className="mt-1 text-sm font-medium text-teal-800">{answerLabel(doc.instrument, qid, responses[qid])}</div>
                  </li>
                ))}
              </ol>
            )}
            {doc.rationale && (
              <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Scoring rationale: </span>{doc.rationale}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function ScreeningResultsModal({ patientId, clinicianEmail, onClose }: {
  patientId: string; clinicianEmail?: string; onClose: () => void
}) {
  const [data, setData] = useState<LatestScreenings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [idx, setIdx] = useState(0)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    let alive = true
    api.getLatestScreenings(patientId, clinicianEmail)
      .then((d) => { if (alive) { setData(d); setIdx(0) } })
      .catch(() => { if (alive) setError("Couldn't load screening results.") })
    return () => { alive = false }
  }, [patientId, clinicianEmail])

  const docs = data?.documents ?? []
  const count = docs.length
  const go = (n: number) => setIdx((i) => Math.min(Math.max(i + n, 0), Math.max(count - 1, 0)))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Latest screening results" onClick={onClose}>
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Latest screening results</h2>
            {data && <p className="text-xs text-slate-500">{data.patient.name}{count > 0 ? ` · ${count} instrument${count > 1 ? 's' : ''}` : ''}{data.clinicianHasPart2Access ? ' · Part 2 access' : ''}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        {/* Body — one document per page */}
        <div
          className="flex-1 overflow-y-auto bg-slate-50 px-3 py-5 sm:px-6"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (touchX.current == null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
            touchX.current = null
          }}
        >
          {error ? <ErrorState message={error} onRetry={onClose} />
            : !data ? <Spinner label="Loading screening results…" />
              : count === 0 ? (
                <div className="grid h-full place-items-center text-center text-sm text-slate-500">
                  <div><ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-300" />No scored screenings on file for this patient yet.</div>
                </div>
              ) : (
                <ScreeningDocument patient={data.patient} doc={docs[idx]} />
              )}
        </div>

        {/* Swipe nav */}
        {count > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <button onClick={() => go(-1)} disabled={idx === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {docs.map((d, i) => (
                <button key={d.screeningId + i} onClick={() => setIdx(i)} title={d.instrumentLabel}
                  aria-label={`Go to ${d.instrumentLabel}`} aria-current={i === idx}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition ${i === idx ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {d.redacted && <Lock className="h-2.5 w-2.5" />}{d.instrumentLabel}
                </button>
              ))}
            </div>
            <button onClick={() => go(1)} disabled={idx >= count - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
