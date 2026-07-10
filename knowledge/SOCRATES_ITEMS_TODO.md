# TODO — fill in the SOCRATES v8 item text (blocked by content filter)

The SOCRATES v8 questionnaire is **public domain** (CASAA: "a public domain instrument and may be
used without special permission"), but its 19 self-report statements trip our assistant's output
content filter, so they could not be written automatically. Everything else about SOCRATES is wired
and working — only the 38 item strings (19 alcohol + 19 drug) need to be pasted in by hand or by
another model.

## Source of truth (verbatim items)
- **Official CASAA v8 packet (PDF):** https://www.drugsandalcohol.ie/26826/1/socratesv8.pdf
  - Page 2 = **SOCRATES 8A** "Personal Drinking Questionnaire" (ALCOHOL), items 1–19.
  - Page 4 = **SOCRATES 8D** "Personal Drug Use Questionnaire" (DRUG), items 1–19.
  - (Also mirrored at casaa.unm.edu/assets/inst — same text.)
- The two versions are item-for-item parallel: 8A says "drinking"/"alcoholic"; 8D says "drug use"/"addict".

## Where to paste
File: `frontend/src/services/mockData.ts`. Two consts currently hold placeholders:

```ts
const SOCRATES_8A = Array(19).fill('***')  // alcohol wording — REPLACE
const SOCRATES_8D = Array(19).fill('***')  // drug wording — REPLACE
```

Replace each with a plain string array of the 19 verbatim items **in order** (index 0 = item 1 …
index 18 = item 19). Do NOT prefix with the item number — the UI adds numbering. Escape apostrophes
for JS single-quoted strings (e.g. `don\'t`). Shape:

```ts
const SOCRATES_8A = [
  '<item 1 verbatim, alcohol wording>',
  '<item 2 verbatim>',
  // … through item 19
]
const SOCRATES_8D = [
  '<item 1 verbatim, drug wording>',
  // … through item 19
]
```

## Do not change these (already correct)
- **Response scale (1–5):** `1 NO! Strongly disagree · 2 No, disagree · 3 ? Undecided or unsure ·
  4 Yes, agree · 5 YES! Strongly agree` — already applied in `getInstrumentQuestions`.
- **Subscale mapping (used by Agent 2 scoring + the KB article), by item number:**
  - Recognition (Re): 1, 3, 7, 10, 12, 15, 17 → range 7–35
  - Ambivalence (Am): 2, 6, 11, 16 → range 4–20
  - Taking Steps (Ts): 4, 5, 8, 9, 13, 14, 18, 19 → range 8–40
  - No reverse-scored items; each subscale is a straight sum.
- The alcohol-vs-drug choice at runtime is handled by `socratesVariant()` in
  `frontend/src/lib/screeningFlow.ts` (drug wording when the drug path fired, else alcohol).

## Verify after filling
- `SOCRATES_8A` and `SOCRATES_8D` each have exactly 19 non-`***` entries.
- `npm run build` in `frontend/` passes.
