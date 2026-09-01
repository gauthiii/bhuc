// ─────────────────────────────────────────────────────────────────────────────────────────
// PDF export for a prior-authorization packet.
//
// The packet is structured section/field data, so the document is drawn programmatically
// rather than screenshotted: the text stays selectable and searchable, pagination breaks
// between rows instead of through them, and a redaction is a real filled rectangle over a
// value that was never written into the file.
//
// Two variants: the full packet, and the 42 CFR Part 2 redacted packet in which every
// SUD-revealing field is withheld. The redacted variant NEVER writes the protected value into
// the PDF — the bar is not an overlay that could be selected or copied out from underneath.
//
// The output-integrity assessment is deliberately not part of the document: it is a check on
// the draft, not content for the payer.
// ─────────────────────────────────────────────────────────────────────────────────────────

import { jsPDF } from 'jspdf'
import { DEMO_FACILITY, DEMO_PAYER, REDISCLOSURE_NOTICE, type DemoPacket, type DemoField } from './priorAuthDemoData'

const PAGE_W = 595.28          // A4 portrait, points
const PAGE_H = 841.89
const M = 48                   // margin
const TOP = 56
const BOTTOM = 58              // reserved for the footer
const LABEL_W = 150
const GAP = 14
const VALUE_X = M + LABEL_W + GAP
const VALUE_W = PAGE_W - M - VALUE_X

const INK = [30, 41, 59] as const        // slate-800
const MUTED = [100, 116, 139] as const   // slate-500
const FAINT = [148, 163, 184] as const   // slate-400
const RULE = [203, 213, 225] as const    // slate-300
const BAR = [15, 23, 42] as const        // slate-900

export interface PdfOptions {
  /** Clinician edits not yet folded into the packet, keyed by field id. */
  values?: Record<string, string>
  /** false → every Part 2-sensitive field is withheld from the file. */
  part2Access: boolean
}

export function packetPdfFilename(packet: DemoPacket, part2Access: boolean): string {
  return part2Access ? `${packet.id}.pdf` : `${packet.id}_Part2-redacted.pdf`
}

export function downloadPacketPdf(packet: DemoPacket, opts: PdfOptions): void {
  const { values = {}, part2Access } = opts
  const redactedDoc = packet.part2Gated && !part2Access
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  let y = TOP

  const setInk = (c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])
  const isRedacted = (f: DemoField) => redactedDoc && !!f.sensitive
  const valueOf = (f: DemoField) => values[f.id] ?? f.value

  /** Break to a new page when `needed` points will not fit above the footer. */
  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - BOTTOM) { doc.addPage(); y = TOP }
  }

  /** Wrap a value that may itself contain newlines. */
  const wrap = (text: string, width: number): string[] =>
    text.split('\n').flatMap((line) => (line.trim() === '' ? [''] : (doc.splitTextToSize(line, width) as string[])))

  // ── Letterhead ─────────────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); setInk(INK)
  doc.text('Prior Authorization Request', PAGE_W / 2, y, { align: 'center' })
  y += 16
  doc.setFontSize(9.5); setInk(MUTED)
  doc.text('BEHAVIORAL HEALTH', PAGE_W / 2, y, { align: 'center', charSpace: 1.2 })
  y += 14
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); setInk(MUTED)
  doc.text(`${DEMO_FACILITY.name} · ${DEMO_FACILITY.address} · NPI ${DEMO_FACILITY.npi}`, PAGE_W / 2, y, { align: 'center' })
  y += 12

  if (redactedDoc) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(190, 18, 60)
    doc.text('42 CFR PART 2 PROTECTED CONTENT WITHHELD — RECIPIENT HOLDS NEITHER THE PART 2 ACCESS ROLE NOR A PATIENT CONSENT',
      PAGE_W / 2, y, { align: 'center', maxWidth: PAGE_W - 2 * M })
    y += 12
  }
  doc.setDrawColor(RULE[0], RULE[1], RULE[2]); doc.setLineWidth(0.8)
  doc.line(M, y, PAGE_W - M, y)
  y += 18

  // ── Payer submission block ─────────────────────────────────────────────────────────────
  const payerRows: [string, string][] = [
    ['Submit to', `${DEMO_PAYER.name} — Behavioral Health Utilization Management`],
    ['Form', DEMO_PAYER.formId],
    ['PA fax', DEMO_PAYER.paFax],
    ['PA phone', DEMO_PAYER.paPhone],
  ]
  const payerH = payerRows.length * 12 + 12
  doc.setFillColor(248, 250, 252)
  doc.rect(M, y - 10, PAGE_W - 2 * M, payerH, 'F')
  doc.setFontSize(7.5)
  payerRows.forEach(([k, v], i) => {
    const ry = y + i * 12
    doc.setFont('helvetica', 'bold'); setInk(INK)
    doc.text(`${k}:`, M + 8, ry)
    const labelW = doc.getTextWidth(`${k}:  `)   // measured in bold, the font it was drawn in
    doc.setFont('helvetica', 'normal'); setInk(MUTED)
    doc.text(v, M + 8 + labelW, ry)
  })
  y += payerH + 6

  // ── Sections ───────────────────────────────────────────────────────────────────────────
  for (const section of packet.sections) {
    ensure(48)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); setInk(INK)
    doc.text(section.title.toUpperCase(), M, y, { charSpace: 0.6 })
    y += 5
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]); doc.setLineWidth(0.6)
    doc.line(M, y, PAGE_W - M, y)
    y += 14

    // 42 CFR § 2.32 notice — only where Part 2 content is actually disclosed.
    if (section.id === 'sud') {
      const notice = redactedDoc
        ? 'Withheld under 42 CFR Part 2. This recipient holds neither the Part 2 access role nor a patient consent on file, so no substance use disorder information is disclosed and the § 2.32 redisclosure notice does not apply.'
        : REDISCLOSURE_NOTICE
      const title = redactedDoc ? 'SUBSTANCE USE DISORDER CONTENT WITHHELD' : 'NOTICE PROHIBITING REDISCLOSURE — 42 CFR § 2.32'
      doc.setFontSize(7)
      const lines = doc.splitTextToSize(notice, PAGE_W - 2 * M - 16) as string[]
      const boxH = 16 + lines.length * 8.5
      ensure(boxH + 8)
      doc.setDrawColor(BAR[0], BAR[1], BAR[2]); doc.setLineWidth(redactedDoc ? 0.6 : 1.2)
      doc.rect(M, y - 8, PAGE_W - 2 * M, boxH, 'S')
      doc.setFont('helvetica', 'bold'); setInk(INK)
      doc.text(title, M + 8, y + 2, { charSpace: 0.5 })
      doc.setFont('helvetica', 'normal'); setInk(MUTED)
      doc.text(lines, M + 8, y + 13)
      y += boxH + 10
    }

    for (const f of section.fields) {
      const labelLines = doc.setFont('helvetica', 'bold').setFontSize(7)
        .splitTextToSize(f.label.toUpperCase(), LABEL_W) as string[]
      const redacted = isRedacted(f)
      const valueLines = redacted ? [''] : wrap(valueOf(f) || '—', VALUE_W)
      const rowH = Math.max(labelLines.length * 8.5, redacted ? 14 : valueLines.length * 11) + 7
      ensure(rowH)

      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); setInk(FAINT)
      doc.text(labelLines, M, y, { charSpace: 0.4 })

      if (redacted) {
        // The value is never written to the file — the bar is the only thing drawn here.
        doc.setFillColor(BAR[0], BAR[1], BAR[2])
        doc.rect(VALUE_X, y - 7.5, 168, 11, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255)
        doc.text('REDACTED', VALUE_X + 84, y, { align: 'center', charSpace: 1.4 })
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); setInk(MUTED)
        doc.text('42 CFR PART 2', VALUE_X + 178, y, { charSpace: 0.4 })
      } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setInk(INK)
        doc.text(valueLines, VALUE_X, y)
      }
      y += rowH
    }
    y += 8
  }

  // ── Supporting documentation ───────────────────────────────────────────────────────────
  ensure(48)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); setInk(INK)
  doc.text('SUPPORTING DOCUMENTATION ATTACHED', M, y, { charSpace: 0.6 })
  y += 5
  doc.setDrawColor(RULE[0], RULE[1], RULE[2]); doc.line(M, y, PAGE_W - M, y)
  y += 14
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  for (const a of packet.attachments) {
    ensure(13)
    setInk(FAINT); doc.text('•', M, y)
    setInk(INK); doc.text(a, M + 10, y, { maxWidth: PAGE_W - 2 * M - 10 })
    y += 13
  }

  // ── Footer on every page ───────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i)
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]); doc.setLineWidth(0.5)
    doc.line(M, PAGE_H - 42, PAGE_W - M, PAGE_H - 42)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); setInk(FAINT)
    doc.text(`${packet.id} · ${DEMO_FACILITY.name} · drafted ${packet.dateOfRequest}`, M, PAGE_H - 30)
    doc.text(`Page ${i} of ${pages}`, PAGE_W - M, PAGE_H - 30, { align: 'right' })
    if (redactedDoc) {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(190, 18, 60)
      doc.text('42 CFR Part 2 — protected content withheld from this copy', M, PAGE_H - 20)
    }
  }

  doc.save(packetPdfFilename(packet, part2Access))
}
