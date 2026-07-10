# SOCRATES v8 item text — completed

Completed on 2026-07-10.

The SOCRATES v8 questionnaire is public domain (CASAA: "a public domain instrument and may be
used without special permission"). The official 19-item alcohol wording (SOCRATES 8A) and 19-item
drug wording (SOCRATES 8D) have been pasted into `frontend/src/services/mockData.ts`.

## Source of truth
- Official CASAA v8 packet (PDF): https://www.drugsandalcohol.ie/26826/1/socratesv8.pdf
  - Page 2 = SOCRATES 8A "Personal Drinking Questionnaire" (alcohol wording), items 1-19.
  - Page 4 = SOCRATES 8D "Personal Drug Use Questionnaire" (drug wording), items 1-19.

## Verification
- `SOCRATES_8A` has exactly 19 entries.
- `SOCRATES_8D` has exactly 19 entries.
- No SOCRATES placeholder strings remain in `frontend/src/services/mockData.ts`.
- `npm run build` in `frontend/` passes.

## Still unchanged by design
- Response scale (1-5): `1 NO! Strongly disagree`, `2 No, disagree`, `3 ? Undecided or
  unsure`, `4 Yes, agree`, `5 YES! Strongly agree`.
- Subscale mapping:
  - Recognition (Re): 1, 3, 7, 10, 12, 15, 17 -> range 7-35
  - Ambivalence (Am): 2, 6, 11, 16 -> range 4-20
  - Taking Steps (Ts): 4, 5, 8, 9, 13, 14, 18, 19 -> range 8-40
- No reverse-scored items; each subscale is a straight sum.
- Alcohol-vs-drug choice at runtime is still handled by `socratesVariant()` in
  `frontend/src/lib/screeningFlow.ts`.
