# BHUC Screening Scoring Rules

> Validated instrument scoring and risk-banding rules (PHQ-9, GAD-7, C-SSRS) for the BHUC Risk Identification Agent.


## PHQ-9 — scoring and severity bands

<p><strong>PHQ-9 (Patient Health Questionnaire-9) — depression severity</strong></p><p>Nine items, each scored 0–3 over the last two weeks: 0 = Not at all, 1 = Several days, 2 = More than half the days, 3 = Nearly every day. Total range 0–27.</p><table border="1"><thead><tr><th>Total score</th><th>Severity</th></tr></thead><tbody><tr><td>0–4</td><td>Minimal / none</td></tr><tr><td>5–9</td><td>Mild</td></tr><tr><td>10–14</td><td>Moderate</td></tr><tr><td>15–19</td><td>Moderately severe</td></tr><tr><td>20–27</td><td>Severe</td></tr></tbody></table><p><strong>Item 9 (self-harm) safety flag</strong></p><p>PHQ-9 item 9 asks about thoughts of being better off dead or self-harm. Any non-zero response on item 9 is a positive self-harm screen and triggers the BHUC crisis pathway regardless of the total score.</p><p>Clinical action thresholds: total ≥10 suggests clinically significant depression warranting clinician review; ≥20 indicates severe depression.</p>


## GAD-7 — scoring and severity bands

<p><strong>GAD-7 (Generalized Anxiety Disorder-7) — anxiety severity</strong></p><p>Seven items, each scored 0–3 over the last two weeks (same 0–3 anchors as PHQ-9). Total range 0–21.</p><table border="1"><thead><tr><th>Total score</th><th>Severity</th></tr></thead><tbody><tr><td>0–4</td><td>Minimal</td></tr><tr><td>5–9</td><td>Mild</td></tr><tr><td>10–14</td><td>Moderate</td></tr><tr><td>15–21</td><td>Severe</td></tr></tbody></table><p>A cutoff of ≥10 is the recommended threshold for further evaluation of generalized anxiety disorder. GAD-7 also screens for panic, social anxiety, and PTSD when elevated.</p>


## C-SSRS — screening version, branching, and high-risk criteria

<p><strong>Columbia Suicide Severity Rating Scale (C-SSRS) — screener</strong></p><p>The C-SSRS screener assesses suicidal ideation and behavior. Ideation is asked first; behavior questions follow.</p><p><strong>Ideation (past month)</strong></p><ol><li>Wish to be dead</li><li>Non-specific active suicidal thoughts</li><li>Active ideation with any methods (no plan) without intent to act</li><li>Active ideation with some intent to act, without specific plan</li><li>Active ideation with specific plan and intent</li></ol><p><strong>Behavior (lifetime and past 3 months)</strong></p><p>Actual attempt, interrupted attempt, aborted attempt, preparatory acts, and non-suicidal self-injurious behavior.</p><p><strong>Branching / risk logic</strong></p><ul><li>A <strong>Yes</strong> on ideation item 1 or 2 reveals items 3–5.</li><li><strong>Yes</strong> on ideation items 4 or 5, or <strong>any</strong> suicidal behavior, is a positive high-risk screen → immediate escalation.</li><li>Any positive behavior in the past 3 months is high acuity.</li></ul>


## BHUC risk banding and escalation rules

<p><strong>How instrument results map to a BHUC risk band</strong></p><table border="1"><thead><tr><th>Risk band</th><th>Criteria</th></tr></thead><tbody><tr><td>High</td><td>C-SSRS ideation item 4 or 5 positive; OR any C-SSRS suicidal behavior; OR PHQ-9 item 9 &gt; 0 with plan/intent</td></tr><tr><td>Moderate</td><td>PHQ-9 15–19 or GAD-7 15–21; OR C-SSRS ideation items 1–3 positive without intent/plan</td></tr><tr><td>Low</td><td>PHQ-9 &lt; 15 and GAD-7 &lt; 15 and C-SSRS ideation negative</td></tr></tbody></table><p><strong>Immediate escalation (988) triggers</strong></p><ul><li>Any positive C-SSRS high-risk item (ideation 4/5 or any behavior).</li><li>PHQ-9 item 9 positive.</li><li>Patient free-text indicating imminent self-harm.</li></ul><p>On any immediate-escalation trigger, the BHUC front-door / screening flow surfaces the 988 interstitial and the crisis pathway (see the BHUC 988 Escalation subflow). Raw high-risk scores are clinician-facing and are not shown to the patient.</p>


## Instrument selection and administration order

<p><strong>Which instruments run, and in what order</strong></p><ul><li><strong>C-SSRS first</strong> whenever the visit type requires suicide-risk screening; it must be completed before PHQ-9/GAD-7 unlock.</li><li>PHQ-9 for depression screening; GAD-7 for anxiety screening.</li><li>Instruments are administered one at a time; instruments are never mixed on one screen.</li><li>C-SSRS uses branching (a positive item 2 reveals items 3–6).</li></ul><p>Scoring is performed server-side by the BHUC Risk Identification Agent; no free-text scoring inputs are accepted client-side.</p>
