# BHUC Clinical Coding and Documentation

> ICD-10-CM and CPT reference for behavioral health, plus BHUC clinical note templates and documentation-integrity rules, for the BHUC Clinical Documentation Agent.


## ICD-10-CM — common behavioral health diagnosis codes

<p><strong>Frequently used ICD-10-CM codes at BHUC</strong></p><table border="1"><thead><tr><th>Code</th><th>Description</th></tr></thead><tbody><tr><td>F32.0</td><td>Major depressive disorder, single episode, mild</td></tr><tr><td>F32.1</td><td>Major depressive disorder, single episode, moderate</td></tr><tr><td>F32.2</td><td>Major depressive disorder, single episode, severe without psychotic features</td></tr><tr><td>F33.1</td><td>Major depressive disorder, recurrent, moderate</td></tr><tr><td>F41.1</td><td>Generalized anxiety disorder</td></tr><tr><td>F41.0</td><td>Panic disorder</td></tr><tr><td>F43.10</td><td>Post-traumatic stress disorder, unspecified</td></tr><tr><td>F43.23</td><td>Adjustment disorder with mixed anxiety and depressed mood</td></tr><tr><td>F31.9</td><td>Bipolar disorder, unspecified</td></tr><tr><td>F10.20</td><td>Alcohol dependence, uncomplicated (42 CFR Part 2)</td></tr><tr><td>F11.20</td><td>Opioid dependence, uncomplicated (42 CFR Part 2)</td></tr><tr><td>F14.20</td><td>Cocaine dependence, uncomplicated (42 CFR Part 2)</td></tr></tbody></table><p>Substance-use (F10–F19) diagnoses are 42 CFR Part 2-protected — see the SUD coding article.</p>


## CPT — behavioral health service codes

<p><strong>Common CPT codes for BHUC encounters</strong></p><table border="1"><thead><tr><th>Code</th><th>Description</th></tr></thead><tbody><tr><td>90791</td><td>Psychiatric diagnostic evaluation (no medical services)</td></tr><tr><td>90792</td><td>Psychiatric diagnostic evaluation with medical services</td></tr><tr><td>90832</td><td>Psychotherapy, 30 minutes</td></tr><tr><td>90834</td><td>Psychotherapy, 45 minutes</td></tr><tr><td>90837</td><td>Psychotherapy, 60 minutes</td></tr><tr><td>90853</td><td>Group psychotherapy</td></tr><tr><td>90839</td><td>Psychotherapy for crisis, first 60 minutes</td></tr><tr><td>90840</td><td>Psychotherapy for crisis, each additional 30 minutes</td></tr><tr><td>99213</td><td>Office/outpatient E/M, established patient, low complexity</td></tr><tr><td>99214</td><td>Office/outpatient E/M, established patient, moderate complexity</td></tr></tbody></table>


## BHUC clinical note template (urgent behavioral encounter)

<p><strong>Standard note structure</strong></p><ol><li><strong>Chief complaint</strong> — patient's stated reason for the visit.</li><li><strong>History of present illness (HPI)</strong> — onset, duration, severity, context, prior treatment.</li><li><strong>Screening results</strong> — PHQ-9 / GAD-7 / C-SSRS scores and risk band (clinician-facing).</li><li><strong>Mental status exam (MSE)</strong> — appearance, mood/affect, thought process/content, cognition, insight/judgment, safety.</li><li><strong>Assessment</strong> — diagnostic impression with ICD-10 code(s).</li><li><strong>Plan</strong> — interventions, medications, safety plan, disposition, follow-up, referrals.</li></ol><p>The BHUC Clinical Documentation Agent drafts this note; a human clinician must sign it. Nothing enters the record until signed.</p>


## Documentation integrity and grounding rules

<p><strong>How the agent keeps notes trustworthy</strong></p><ul><li>Every drafted line is tagged <strong>grounded</strong> (supported by encounter data) or <strong>unverified</strong>.</li><li>The agent never fabricates clinical detail, vitals, history, or codes.</li><li>Coding suggestions are proposals with a confidence score; the clinician adds or dismisses each.</li><li>At least one ICD-10 diagnosis is required before the note can be signed.</li><li>The agent never signs — a human clinician signs; risk must be confirmed first.</li></ul>


## Coding and documentation for SUD (42 CFR Part 2)

<p><strong>Handling substance-use content</strong></p><p>Substance-use diagnoses (ICD-10 F10–F19) and any SUD treatment detail are protected under 42 CFR Part 2. In the BHUC UI these fields render masked unless the patient's consent and the clinician's role permit disclosure (enforced server-side by the Part 2 access labels set by the BHUC Consent &amp; Data Protection Agent).</p><p>When drafting notes that touch SUD, the documentation agent honors the Part 2 label: protected specifics are access-gated, and downstream exports (e.g., prior-auth packets) redact protected details unless a valid Part 2 consent is on file.</p>
