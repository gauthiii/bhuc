import { legalCases } from '../../../lib/legalCopilotDemo'

// Case-by-case comparison. Values match the step data in legalCopilotDemo.ts; the
// request arrives on day 1 and the attorney picks it up at the same time in both modes.
interface CompareRow { measure: string; manual: string; copilot: string }

const COMPARISON: { caseId: string; rows: CompareRow[] }[] = [
  {
    caseId: 'vendor-data-return',
    rows: [
      { measure: 'Answer delivered', manual: 'Day 2, 4:30 PM', copilot: 'Day 1, 3:30 PM (same afternoon)' },
      { measure: 'Finding the material', manual: 'Attorney searches folder by folder; 11 files opened', copilot: "Copilot searches the Z: drive within the attorney's permissions" },
      { measure: 'Checking the sources', manual: 'Attorney reads each file found', copilot: 'Attorney verifies 3 Copilot citations' },
      { measure: 'Approval before release', manual: 'None needed (internal use)', copilot: 'None needed (internal use)' },
    ],
  },
  {
    caseId: 'broker-file-retention',
    rows: [
      { measure: 'Answer delivered', manual: 'Day 3, 2:00 PM', copilot: 'Day 2, 10:20 AM' },
      { measure: 'Finding the material', manual: 'Attorney finds the 2019 memo first; the current schedule only after a colleague mentions it; 9 files opened', copilot: 'Copilot returns the 2019 memo; a follow-up search finds the current schedule' },
      { measure: 'Checking the sources', manual: 'Attorney resolves the conflict by hand', copilot: 'Attorney rejects the outdated memo and verifies the current schedule' },
      { measure: 'Approval before release', manual: 'None needed (internal use)', copilot: 'None needed (internal use)' },
    ],
  },
  {
    caseId: 'license-renewal-letter',
    rows: [
      { measure: 'Answer delivered', manual: 'Day 3, 11:30 AM (letter ready)', copilot: 'Day 2, 9:20 AM if approved; 11:00 AM if returned once' },
      { measure: 'Finding the material', manual: 'Agreement filed under the vendor\'s old name; found via the vendor register; 14 files opened', copilot: 'Copilot finds the agreement under the old name' },
      { measure: 'Checking the sources', manual: 'Attorney reads each file found', copilot: 'Attorney verifies 3 Copilot citations' },
      { measure: 'Approval before release', manual: 'Not covered by the workbook', copilot: 'Chief Legal Officer approves release' },
    ],
  },
]

const COMPARISON_TOTAL: CompareRow[] = [
  { measure: 'Answer delivered', manual: 'Day 2 to day 3', copilot: 'Day 1 to day 2' },
  { measure: 'Who searches', manual: 'The attorney, by hand', copilot: 'Copilot, with the attorney checking the results' },
  { measure: 'Who decides', manual: 'The attorney', copilot: 'The attorney; the Chief Legal Officer for external release' },
]

export function ComparisonTable() {
  const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide'
  const td = 'px-4 py-3 align-top text-sm'
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] border-collapse">
        <thead className="bg-slate-50">
          <tr>
            <th className={`${th} w-56 text-slate-500`}>Case</th>
            <th className={`${th} w-44 text-slate-500`}>Measure</th>
            <th className={`${th} text-slate-600`}>Manual (today)</th>
            <th className={`${th} text-teal-800`}>With Copilot (future)</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON.map(({ caseId, rows }) => {
            const c = legalCases.find((x) => x.id === caseId)!
            return rows.map((r, i) => (
              <tr key={`${caseId}-${r.measure}`} className={i === 0 ? 'border-t border-slate-200' : ''}>
                {i === 0 && (
                  <td rowSpan={rows.length} className={`${td} border-r border-slate-100`}>
                    <div className="font-mono text-xs text-slate-400">{c.requestId}</div>
                    <div className="mt-0.5 font-semibold text-slate-800">{c.label}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{c.requester.unit} · {c.use} use</div>
                  </td>
                )}
                <td className={`${td} font-medium text-slate-600`}>{r.measure}</td>
                <td className={`${td} text-slate-700`}>{r.manual}</td>
                <td className={`${td} bg-teal-50/40 text-slate-800`}>{r.copilot}</td>
              </tr>
            ))
          })}
          {COMPARISON_TOTAL.map((r, i) => (
            <tr key={`total-${r.measure}`} className={i === 0 ? 'border-t-2 border-slate-300 bg-slate-50' : 'bg-slate-50'}>
              {i === 0 && (
                <td rowSpan={COMPARISON_TOTAL.length} className={`${td} border-r border-slate-100 font-semibold text-slate-800`}>
                  Across all three
                </td>
              )}
              <td className={`${td} font-medium text-slate-600`}>{r.measure}</td>
              <td className={`${td} font-medium text-slate-700`}>{r.manual}</td>
              <td className={`${td} font-medium text-teal-900`}>{r.copilot}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
