# BHUC Consent and 42 CFR Part 2 Reference

> Reference on 42 CFR Part 2 and HIPAA for SUD data protection, supporting the BHUC Consent & Data Protection Agent's labeling. Reference material (Agent 4 has no Search tool wired; citeable reference).


## 42 CFR Part 2 — overview

<p><strong>What Part 2 protects</strong></p><p>42 CFR Part 2 is the U.S. federal regulation protecting the confidentiality of substance use disorder (SUD) treatment records created by federally assisted SUD programs. It is more restrictive than HIPAA: it generally prohibits disclosure of SUD records without the patient's specific written consent, even for treatment, payment, or health-care operations, absent an exception.</p>


## Valid Part 2 consent — required elements

<p><strong>A written Part 2 consent must specify</strong></p><ol><li>The patient's name.</li><li>The specific name(s) or general designation of the program(s) permitted to disclose.</li><li>How much and what kind of information may be disclosed.</li><li>The name(s) of the recipient(s) authorized to receive the information.</li><li>The purpose of the disclosure.</li><li>The patient's right to revoke, and how.</li><li>An expiration date, event, or condition.</li><li>The patient's signature and date.</li></ol>


## HIPAA and Part 2 — how they interact

<p>HIPAA governs protected health information (PHI) broadly; 42 CFR Part 2 adds a stricter layer specifically for SUD records. Where both apply, the more protective rule controls: Part 2's specific-consent requirement generally governs disclosure of SUD treatment records. BHUC treats SUD content as Part 2-protected by default (deny-by-default labeling).</p>


## Redisclosure prohibition and required notice

<p>Information disclosed under Part 2 may not be redisclosed by the recipient except as permitted by the patient's consent or a Part 2 exception. Part 2 disclosures must be accompanied by a notice prohibiting redisclosure. BHUC applies this to any downstream export (e.g., prior-auth packets) containing protected SUD detail.</p>


## BHUC data-handling rules for Part 2 content

<p><strong>How BHUC operationalizes Part 2</strong></p><ul><li>The Consent &amp; Data Protection Agent labels content <strong>part2</strong> or <strong>standard</strong>, deny-by-default.</li><li>Part 2-labeled fields render masked on clinician screens (chart C3, prior-auth C6) unless consent and role permit.</li><li>Masking is enforced server-side by access labels, not client-side.</li><li>The Prior-Auth Compliance Agent redacts protected specifics from coverage answers and packets unless a valid Part 2 consent authorizing the disclosure is on file.</li><li>This is reference material; the governance authority document 'BHUC Healthcare Compliance — HIPAA &amp; 42 CFR Part 2' is the GRC control of record.</li></ul>
