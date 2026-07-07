# BHUC Payer Policy Library

> Sample payer coverage, prior-authorization, and formulary policies for the BHUC Prior-Auth Compliance Agent. Demo data consistent with the BHUC app.


## Accepted payers and coverage overview

<p><em>Sample/demo data authored for the BHUC reference build — not a real payer or provider record. Kept consistent with the BHUC app fixtures.</em></p><p><strong>Payers accepted at BHUC</strong></p><table border="1"><thead><tr><th>Payer</th><th>Behavioral health coverage</th></tr></thead><tbody><tr><td>Blue Shield</td><td>PPO/HMO plans; outpatient BH and IOP covered with prior auth for higher levels of care</td></tr><tr><td>Aetna</td><td>Outpatient BH covered; IOP/PHP require prior authorization</td></tr><tr><td>UnitedHealthcare</td><td>Outpatient BH covered; step-up levels require authorization via Optum BH</td></tr><tr><td>Cigna</td><td>Outpatient BH covered; MOUD covered; PHP/inpatient require authorization</td></tr><tr><td>Texas Medicaid (STAR)</td><td>Outpatient BH, crisis services, and MOUD covered per state BH benefit</td></tr><tr><td>Medicare</td><td>Part B outpatient BH; psychiatric diagnostic eval and psychotherapy covered</td></tr></tbody></table><p>Self-pay patients receive a sliding-scale estimate; a financial counselor reviews costs before the visit.</p>


## Blue Shield Behavioral Health Policy BH-204 — Levels of Care

<p><em>Sample/demo data authored for the BHUC reference build — not a real payer or provider record. Kept consistent with the BHUC app fixtures.</em></p><p><strong>Policy BH-204 §3.2 — Levels of Care</strong></p><p>Intensive outpatient program (IOP) is covered when a psychiatric diagnostic evaluation and a documented step-up from routine outpatient are on file. Prior authorization is required before the first IOP session.</p><ul><li><strong>§3.2.1</strong> Routine outpatient — no prior authorization.</li><li><strong>§3.2.2</strong> Intensive outpatient (IOP) — prior authorization required; documented outpatient trial or clinical justification.</li><li><strong>§3.2.3</strong> Partial hospitalization (PHP) — prior authorization required; safety and acuity justification.</li><li><strong>§3.2.4</strong> Inpatient / crisis stabilization — concurrent review; medical-necessity criteria.</li></ul>


## Prior authorization requirements by service

<p><em>Sample/demo data authored for the BHUC reference build — not a real payer or provider record. Kept consistent with the BHUC app fixtures.</em></p><table border="1"><thead><tr><th>Service</th><th>Prior auth?</th><th>Typical requirement</th></tr></thead><tbody><tr><td>Routine outpatient therapy</td><td>No</td><td>Covered as a standard benefit</td></tr><tr><td>Intensive outpatient (IOP)</td><td>Yes</td><td>Diagnostic eval + step-up documentation</td></tr><tr><td>Partial hospitalization (PHP)</td><td>Yes</td><td>Acuity + safety justification</td></tr><tr><td>Inpatient / crisis stabilization</td><td>Concurrent review</td><td>Medical-necessity criteria met</td></tr><tr><td>MOUD (buprenorphine)</td><td>Varies</td><td>Covered by most plans; some require formulary step or ID</td></tr><tr><td>Psychological testing</td><td>Yes (some plans)</td><td>Referring diagnosis + testing rationale</td></tr></tbody></table><p>The BHUC Prior-Auth Compliance Agent drafts the packet with citations to the exact policy section; a human always submits.</p>


## Formulary and step-therapy (psychiatric medications)

<p><em>Sample/demo data authored for the BHUC reference build — not a real payer or provider record. Kept consistent with the BHUC app fixtures.</em></p><p><strong>Formulary highlights</strong></p><ul><li>First-line SSRIs (sertraline, escitalopram, fluoxetine) — covered, typically no step therapy.</li><li><strong>Extended-release bupropion</strong> — covered <em>with step therapy</em>: documentation of two prior SSRIs is required (matches BHUC coverage-answer example).</li><li>SNRIs (venlafaxine XR, duloxetine) — covered; some plans prefer a formulary alternative first.</li><li>Buprenorphine/naloxone (MOUD) — covered; X-waiver no longer required; some plans apply quantity limits.</li></ul><p>Coverage answers cite the plan formulary section (e.g., 'Plan formulary 2026 §4.2') and the step-therapy policy.</p>


## Self-pay, sliding scale, and financial assistance

<p><em>Sample/demo data authored for the BHUC reference build — not a real payer or provider record. Kept consistent with the BHUC app fixtures.</em></p><p>BHUC offers sliding-scale self-pay based on household size and income. A financial counselor reviews estimated costs before the visit and can set up a payment plan or screen for charitable-care eligibility. Self-pay estimates are provided in writing and are estimates only.</p>


## 42 CFR Part 2 handling in prior-authorization submissions

<p><strong>Protecting SUD information in coverage workflows</strong></p><p>Prior-auth packets that would disclose substance-use treatment information are subject to 42 CFR Part 2. The Prior-Auth Compliance Agent honors the Part 2 access labels set by the Consent &amp; Data Protection Agent: protected SUD specifics are redacted from coverage answers and drafted packets unless a valid Part 2 consent authorizing that disclosure is on file. Coverage answers set a 'protected details omitted' notice when specifics are withheld.</p>
