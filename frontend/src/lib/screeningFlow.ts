// Adaptive screening administration order (SBIRT model). Mirrors the rules in the
// "Instrument selection and administration order" KB article and server risk.py:
// every patient completes the core spine; SUD instruments unlock from the NIDA
// Quick Screen and from AUDIT/DAST-10 positives. Branching is administration logic
// only — scoring authority stays server-side with the Risk Identification Agent.

import type { Instrument } from './types'

export const INSTRUMENT_NAMES: Record<Instrument, string> = {
  c_ssrs: 'C-SSRS',
  phq9: 'PHQ-9',
  gad7: 'GAD-7',
  nida_qs: 'NIDA Quick Screen',
  audit: 'AUDIT (Alcohol)',
  dast10: 'DAST-10 (Drugs)',
  craving: 'Craving & Triggers',
  sows: 'SOWS (Withdrawal)',
  bam: 'BAM (Recovery Monitor)',
  socrates8: 'SOCRATES (Readiness)',
}

export type AnswerMap = Record<string, number | string>
export type AllAnswers = Partial<Record<Instrument, AnswerMap>>

const CORE: Instrument[] = ['c_ssrs', 'phq9', 'gad7', 'nida_qs']

const num = (v: unknown) => Number(v) || 0
const sum = (m: AnswerMap | undefined) =>
  Object.values(m ?? {}).reduce<number>((a, b) => a + num(b), 0)

/**
 * Returns the full administration path given the answers of the instruments
 * completed so far. Gates only consider completed instruments, so the path grows
 * as gating answers arrive (4-item NIDA Quick Screen):
 *  - NIDA q1 (heavy drinking) > 0              → AUDIT
 *  - NIDA q3/q4 (rx non-medical / illegal) > 0 → DAST-10
 *  - AUDIT total ≥ 8                            → Craving & Triggers
 *  - DAST-10 total ≥ 3                          → SOWS (withdrawal)
 *  - AUDIT ≥ 8 or DAST-10 ≥ 3                    → BAM + SOCRATES
 */
export function computeAdaptivePath(answers: AllAnswers, completed: Instrument[]): Instrument[] {
  const path: Instrument[] = [...CORE]
  if (!completed.includes('nida_qs')) return path

  const qs = answers.nida_qs ?? {}
  const alcohol = num(qs.q1) > 0
  const drugs = num(qs.q3) > 0 || num(qs.q4) > 0

  if (alcohol) path.push('audit')
  if (drugs) path.push('dast10')

  const auditPositive = alcohol && completed.includes('audit') && sum(answers.audit) >= 8
  const dastPositive = drugs && completed.includes('dast10') && sum(answers.dast10) >= 3

  if (auditPositive) path.push('craving')
  if (dastPositive) path.push('sows')
  if (auditPositive || dastPositive) path.push('bam', 'socrates8')
  return path
}

/** SOCRATES uses drug wording (8D) when the drug path fired, else alcohol (8A). */
export function socratesVariant(answers: AllAnswers): 'alcohol' | 'drug' {
  const qs = answers.nida_qs ?? {}
  const drugs = num(qs.q3) > 0 || num(qs.q4) > 0
  const dastPositive = completedSum(answers.dast10) >= 3
  return drugs && dastPositive ? 'drug' : 'alcohol'
}

const completedSum = (m: AnswerMap | undefined) => sum(m)
