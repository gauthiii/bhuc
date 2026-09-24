// Security and governance data for /prior/legal/security, generated from the
// Microsoft Copilot (BeccaBot) CPRM Sprint 2 workbook (sheets 01 and 04 to 09).
// Text is verbatim except: people shown by role only, workbook sheet cross-references
// removed, and the conflicting low-severity gap counts (five vs ten) dropped.

export const securityData = {
 "processes": [
  {
   "fn": "IDENTIFY",
   "name": "Hardware Inventory",
   "ref": "CSF 2.0 ID.AM-01",
   "check": "Attorney devices used with Copilot are on the BCBSVT hardware inventory.",
   "why": "Copilot adds no hardware; existing endpoint inventory applies.",
   "current": "Endpoints inventoried under enterprise asset management with MDM enforced.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "IDENTIFY",
   "name": "Software and AI System Inventory",
   "ref": "CSF 2.0 ID.AM-02",
   "check": "Copilot and its connected components are recorded in the BCBSVT software and AI system inventory with an owner, version and support status.",
   "why": "Copilot cannot be governed, monitored or retired if it is not on the record. The inventory is the anchor for every later control.",
   "current": "AI Inventory Record registers Microsoft Copilot (BeccaBot) with owner (Chief Legal Officer), Tier 3, no PHI, vendor Microsoft, and deployment status.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Data Flow Mapping",
   "ref": "CSF 2.0 ID.AM-03",
   "check": "The flow of legal material from the Z: legal drive into Copilot and back to the attorney is documented, including where it leaves BCBSVT.",
   "why": "Attorney work product is privileged. Knowing exactly where it travels is what allows BCBSVT to say with confidence that it stays inside the Microsoft tenant.",
   "current": "Data flow mapped in the DPIA: attorney prompt, retrieval from Z: drive, processing in the Microsoft 365 tenant, response returned to the attorney. No flow to other systems.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Third-Party Service Inventory",
   "ref": "CSF 2.0 ID.AM-04",
   "check": "Microsoft Copilot and the SHI reseller relationship are listed in the vendor and business associate service inventory.",
   "why": "Microsoft processes BCBSVT legal material. The vendor register is what triggers annual review and contract oversight.",
   "current": "Microsoft (via MPSA and SHI Cloud Solution Provider agreement) recorded as the service provider for Copilot.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Asset Criticality",
   "ref": "CSF 2.0 ID.AM-05",
   "check": "The importance of Copilot to BCBSVT operations is rated and recorded.",
   "why": "A realistic rating keeps effort proportionate. Legal research support is useful but not a member-critical service.",
   "current": "Rated low criticality: internal assistance tool, indirect staff impact, 0 members affected, manual research remains available.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Data Inventory and Classification",
   "ref": "CSF 2.0 ID.AM-07",
   "check": "The data Copilot can reach on the Z: legal drive is inventoried and classified, and the absence of PHI is confirmed.",
   "why": "The no PHI determination drives the Tier 3 rating and the whole control set. It has to rest on an actual review of the drive, not an assumption.",
   "current": "Z: legal drive content classified as confidential and attorney-client privileged legal research material. Data readiness checklist confirms no PHI or PII present.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "External Dependencies",
   "ref": "CSF 2.0 GV.OC-05",
   "check": "The services BCBSVT depends on to run Copilot (Microsoft 365, Entra identity, SHI licensing) are identified.",
   "why": "If Microsoft 365 is unavailable, Copilot is unavailable. Naming the dependency lets Legal plan the fallback.",
   "current": "Dependency on Microsoft 365 tenant, Okta and Entra identity, and SHI license supply documented. Fallback is manual research.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "System Boundary",
   "ref": "RMF Task P-11",
   "check": "The boundary of the Copilot deployment is defined: which data, users and services are inside it.",
   "why": "A clear boundary is what the authorization decision covers. Anything outside it (other drives, other departments) is not approved for use.",
   "current": "Boundary defined under intake INT-001: Copilot licensed to Legal Department attorneys, grounding limited to the Z: legal drive within the BCBSVT Microsoft 365 tenant.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Weakness Identification",
   "ref": "CSF 2.0 ID.RA-01",
   "check": "Weaknesses in the Copilot deployment and its configuration are identified and tracked.",
   "why": "Most exposure in a SaaS AI tool comes from configuration, not code. Regular review finds settings that drift or were never set.",
   "current": "Microsoft vulnerability management verified through SOC 2 report. Tenant configuration reviewed at intake. Low-severity gaps logged in the SSP workbook.",
   "direct": true,
   "status": "In Progress"
  },
  {
   "fn": "IDENTIFY",
   "name": "Threat Intelligence",
   "ref": "CSF 2.0 ID.RA-02",
   "check": "Threat intelligence relevant to AI assistants reaches the team overseeing Copilot.",
   "why": "General AI threat awareness comes through the enterprise threat intelligence function.",
   "current": "Enterprise threat intelligence program in place. AI-relevant items shared with the Office of AI Governance.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "IDENTIFY",
   "name": "Threat Identification",
   "ref": "CSF 2.0 ID.RA-03",
   "check": "The realistic threats to Copilot in the Legal context are named.",
   "why": "Threats specific to a legal assistant differ from threats to a claims system. Naming them focuses the safeguards.",
   "current": "Threats documented: invalid or biased output, inappropriate use, privilege and confidentiality exposure, prompt injection through retrieved content.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Likelihood and Impact",
   "ref": "CSF 2.0 ID.RA-04",
   "check": "Each identified risk is scored for likelihood and impact.",
   "why": "Scoring turns a list of concerns into a decision. It is the basis for the Tier 3 rating.",
   "current": "Risk assessment scored five factors: clinical, member, data sensitivity, autonomy, scale. Weighted score 27 of 100.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Risk Prioritization",
   "ref": "CSF 2.0 ID.RA-05",
   "check": "Copilot risks are ranked against other BCBSVT AI opportunities.",
   "why": "Ranking makes sure governance attention goes where it is needed most and low-risk quick wins are not slowed unnecessarily.",
   "current": "Portfolio prioritization ranked BeccaBot first as a Quick Win (priority score 4.6, value 4, risk 1, feasibility 5).",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Change and Exception Risk",
   "ref": "CSF 2.0 ID.RA-07",
   "check": "Enabling Copilot on the legal drive, and any later changes to its scope, go through change and exception review.",
   "why": "Expanding Copilot to another drive or department would change the risk picture. Change review catches that before it happens.",
   "current": "Initial enablement recorded through intake and change advisory board. Scope expansion requires a new intake.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "External Vulnerability Reports",
   "ref": "CSF 2.0 ID.RA-08",
   "check": "Vulnerabilities reported about Copilot are received and acted on.",
   "why": "Copilot vulnerabilities are handled by Microsoft; BCBSVT receives notices through the vendor channel.",
   "current": "Enterprise vulnerability disclosure process. Microsoft security advisories monitored.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "IDENTIFY",
   "name": "Vendor Risk Before Purchase",
   "ref": "CSF 2.0 ID.RA-10",
   "check": "Microsoft was assessed as an AI vendor before Copilot was licensed.",
   "why": "The assessment is what allows BCBSVT to rely on Microsoft certifications rather than testing the platform itself.",
   "current": "Vendor risk assessment completed: SOC 2 Type II, HITRUST, ISO 27001, HIPAA BAA and DPA in place.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Vendor Criticality",
   "ref": "CSF 2.0 GV.SC-04",
   "check": "Microsoft is ranked for criticality based on the data it can access.",
   "why": "Tenant-wide access to legal material makes Microsoft a critical vendor for this use case regardless of the low risk tier.",
   "current": "Microsoft tiered as a critical vendor under the third-party risk program.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Vendor Due Diligence",
   "ref": "CSF 2.0 GV.SC-06",
   "check": "Due diligence on Microsoft was completed before the relationship was formalized.",
   "why": "Due diligence confirms the vendor can meet the contract terms BCBSVT relies on.",
   "current": "Certifications reviewed, MPSA and SHI CSP agreement terms confirmed, data processing addendum reviewed.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Ongoing Vendor Risk",
   "ref": "CSF 2.0 GV.SC-07",
   "check": "Microsoft is reassessed through the life of the relationship, including changes to how Copilot handles data.",
   "why": "Microsoft changes Copilot frequently. Annual review catches changes to training clauses, data residency or features.",
   "current": "Annual SOC 2 review scheduled under vendor policy. Training opt-out clause verified in BAA.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Impact Level Assignment",
   "ref": "RMF Task C-2",
   "check": "Copilot is assigned a formal impact level based on the data it processes.",
   "why": "The impact level sets the control baseline and the approval authority.",
   "current": "Assigned Tier 3 (Low). Departmental sign-off is the approval authority.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Harmful Bias Testing",
   "ref": "AI RMF MEASURE 2.11",
   "check": "Copilot output is checked for bias that could affect people or groups.",
   "why": "Copilot does not make decisions about members, so bias risk is limited to the quality of research summaries. It still needs to be reviewed.",
   "current": "Bias risk scored 3 of 5. Mitigation is attorney review of every output before use.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Explainability",
   "ref": "AI RMF MEASURE 2.9",
   "check": "Attorneys can see where a Copilot answer came from.",
   "why": "A legal answer without a source cannot be relied on. Source citations let attorneys verify the reasoning.",
   "current": "Copilot responses cite the source documents on the Z: drive. Attorneys verify against the original before use.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Reliability Under Real Conditions",
   "ref": "AI RMF MEASURE 2.5",
   "check": "Copilot is shown to perform reliably on real BCBSVT legal research tasks before full deployment.",
   "why": "A pilot on real questions is the only way to know the tool saves time rather than creates rework.",
   "current": "Pilot Gate and Deployment Gate metrics defined: time saved, response speed, quality of citations.",
   "direct": true,
   "status": "In Progress"
  },
  {
   "fn": "IDENTIFY",
   "name": "Harm Assessment",
   "ref": "AI RMF MAP 5.1",
   "check": "The potential harm of Copilot to staff, members and the public is assessed.",
   "why": "Even a low-risk tool needs a documented harm assessment so the low rating can be defended to regulators.",
   "current": "Harm assessment: staff affected indirectly, 0 members affected, magnitude Low, likelihood Low.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Externally Sourced AI Risk",
   "ref": "AI RMF MANAGE 3.1",
   "check": "The risks of relying on a Microsoft-provided model and service are assessed.",
   "why": "BCBSVT does not control the model. The assessment defines what BCBSVT relies on Microsoft for and how that is verified.",
   "current": "Microsoft model and service assessed. Contract confirms tenant data is not used for model training. Microsoft controls for prompt injection and output filtering documented.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "Audit Findings",
   "ref": "CSF 2.0 ID.IM-01",
   "check": "Audit findings about AI governance feed improvements.",
   "why": "No Copilot-specific audit findings yet. Enterprise audit process applies.",
   "current": "Enterprise audit finding tracking in place.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "IDENTIFY",
   "name": "Test and Exercise Results",
   "ref": "CSF 2.0 ID.IM-02",
   "check": "Security test results feed improvements.",
   "why": "Enterprise testing covers the Microsoft 365 tenant that hosts Copilot.",
   "current": "Annual penetration test and bi-weekly vulnerability assessments.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "IDENTIFY",
   "name": "Learning from Operating Experience",
   "ref": "CSF 2.0 ID.IM-03",
   "check": "Attorney feedback and near misses are collected and turned into improvements.",
   "why": "The attorneys are the quality control. Their feedback is the main signal that the tool is working or drifting.",
   "current": "Monthly review of AI outputs and attorney feedback defined. First review cycle scheduled after pilot start.",
   "direct": true,
   "status": "In Progress"
  },
  {
   "fn": "IDENTIFY",
   "name": "Independent Assessment",
   "ref": "RMF Task A-1",
   "check": "An assessor independent of the Legal Department confirmed the controls work as described.",
   "why": "Independence is what gives the sign-off weight with the Governance Committee and regulators.",
   "current": "Security assessment by the Information Security and Data Privacy Audit Team. Annual recertification defined.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "IDENTIFY",
   "name": "AI Test and Evaluation",
   "ref": "AI RMF MEASURE 1.1",
   "check": "A test plan defines how Copilot trustworthiness is measured at each gate.",
   "why": "Without agreed measures, the pilot cannot be judged a success or failure.",
   "current": "Metrics defined for Pilot Gate and Deployment Gate: 2 hours per week per attorney saved, faster response to business units, reduced external research spend.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Identity and Credential Lifecycle",
   "ref": "CSF 2.0 PR.AA-01",
   "check": "Copilot licenses and access are granted when an attorney joins Legal and removed when they leave.",
   "why": "A former employee with a live Copilot license could still reach privileged material.",
   "current": "Licenses assigned through Okta and Entra groups tied to the Legal Department. Quarterly access review by department managers.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Identity Proofing",
   "ref": "CSF 2.0 PR.AA-02",
   "check": "Attorney identities are proofed before credentials are issued.",
   "why": "Done at employee onboarding; nothing new for Copilot.",
   "current": "Enterprise onboarding identity proofing.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "PROTECT",
   "name": "Authentication",
   "ref": "CSF 2.0 PR.AA-03",
   "check": "Access to Copilot and the Z: drive requires strong authentication.",
   "why": "Privileged legal material warrants the same authentication strength as production systems.",
   "current": "FIDO2 hardware token MFA mandatory. SSO through Okta.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Identity Federation",
   "ref": "CSF 2.0 PR.AA-04",
   "check": "Identity assertions between Okta and Entra are protected.",
   "why": "Copilot reuses the existing federation.",
   "current": "Okta to Entra SSO federation in place with signed assertions.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "PROTECT",
   "name": "Least Privilege and Minimum Necessary",
   "ref": "CSF 2.0 PR.AA-05",
   "check": "Copilot can only retrieve what the signed-in attorney is already allowed to see, and only from the legal drive.",
   "why": "This is the single most important safeguard. Copilot inherits Z: drive permissions, so those permissions must be correct.",
   "current": "Access limited to Legal Department. Copilot honors existing Z: drive permissions. RBAC and least privilege enforced.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Security Awareness Training",
   "ref": "CSF 2.0 PR.AT-01",
   "check": "All staff receive security and privacy awareness training.",
   "why": "Enterprise program; attorneys already trained.",
   "current": "100% completion of HIPAA and AI security awareness modules.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "PROTECT",
   "name": "Role-Based Training",
   "ref": "CSF 2.0 PR.AT-02",
   "check": "Attorneys receive training on how to use Copilot, its limits and privilege handling.",
   "why": "Most AI misuse is unintentional. Training on what not to paste and how to verify output prevents it.",
   "current": "Attorney training on Copilot use completed for pilot users. Refresher scheduled with policy release.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Data at Rest",
   "ref": "CSF 2.0 PR.DS-01",
   "check": "Legal material stored on Z: and within the Microsoft tenant is encrypted.",
   "why": "Encryption at rest is the baseline expectation for privileged material.",
   "current": "Microsoft 365 service encryption at rest verified through SOC 2. Z: drive storage encrypted under BCBSVT standard.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Data in Transit",
   "ref": "CSF 2.0 PR.DS-02",
   "check": "Traffic between attorneys, the tenant and Copilot is encrypted.",
   "why": "Prevents interception of prompts and responses that contain privileged content.",
   "current": "TLS 1.3 enforced for all Copilot traffic.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Data in Use During AI Processing",
   "ref": "CSF 2.0 PR.DS-10",
   "check": "Legal material processed by Copilot is not retained by Microsoft or used to train models.",
   "why": "If Microsoft trained on BCBSVT prompts, privileged material could surface elsewhere. The contract must rule this out.",
   "current": "Microsoft commercial data protection confirmed: tenant data not used for model training. Opt-out clause verified in BAA and DPA.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Backups",
   "ref": "CSF 2.0 PR.DS-11",
   "check": "Legal drive data is backed up and restorable.",
   "why": "Copilot holds no primary data; Z: drive backups already exist.",
   "current": "Enterprise backup with disaster recovery tested bi-annually.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "PROTECT",
   "name": "Minimum Necessary Scoping",
   "ref": "PF 1.1 CT.PO-P1",
   "check": "Copilot is limited to the legal drive and does not reach other BCBSVT data.",
   "why": "Scoping keeps the no PHI determination true. If Copilot could reach claims or member data the risk tier would change.",
   "current": "Grounding scoped to the Z: legal drive only. Web grounding and other connectors disabled for the Legal Copilot configuration.",
   "direct": true,
   "status": "In Progress"
  },
  {
   "fn": "PROTECT",
   "name": "Secure Configuration Baseline",
   "ref": "CSF 2.0 PR.PS-01",
   "check": "The Copilot tenant settings are set to an agreed baseline and checked for drift.",
   "why": "Copilot ships with many features on by default. The baseline records which are permitted.",
   "current": "Baseline defined: web grounding off, third-party plugins off, sensitivity labels applied, DLP policy on, retention set to 7 years. Drift check to be added to quarterly review.",
   "direct": true,
   "status": "In Progress"
  },
  {
   "fn": "PROTECT",
   "name": "Software Maintenance",
   "ref": "CSF 2.0 PR.PS-02",
   "check": "Copilot is kept current.",
   "why": "Microsoft maintains the service; BCBSVT monitors change notices.",
   "current": "Vendor-managed updates. Microsoft 365 message center monitored.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "PROTECT",
   "name": "Audit Logging",
   "ref": "CSF 2.0 PR.PS-04",
   "check": "Copilot prompts, responses and file access are logged and retained.",
   "why": "Logs are how BCBSVT would investigate a privilege exposure or misuse report.",
   "current": "Copilot audit logs captured through Microsoft Purview. Retained 7 years in WORM storage. Z: drive access logging active.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Sanctioned AI Tools Only",
   "ref": "CSF 2.0 PR.PS-05",
   "check": "Only the approved Copilot deployment is available to Legal, and unsanctioned AI tools are blocked.",
   "why": "Approving Copilot creates an expectation that attorneys will not paste material into other AI tools. Blocking makes that enforceable.",
   "current": "Copilot licensed only to Legal Department. Unsanctioned AI tools blocked at the web gateway under BCBSVT policy.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "System Lifecycle Management",
   "ref": "CSF 2.0 ID.AM-08",
   "check": "Copilot is managed from acquisition through to retirement.",
   "why": "A tool with no end-of-life plan tends to be forgotten rather than retired.",
   "current": "Lifecycle tracked from intake INT-001. Decommissioning steps defined.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Human Review of AI Output",
   "ref": "AI RMF GOVERN 3.2",
   "check": "Every Copilot output is reviewed by an attorney before it is relied on, and external release requires CLO approval.",
   "why": "Attorney judgment is the control that makes a Tier 3 rating defensible. Removing it would change the risk profile.",
   "current": "Legal decisions made by attorney professional judgment. Chief Legal Officer approves external release of any Copilot-assisted work product.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Controlled Retirement",
   "ref": "AI RMF GOVERN 1.7",
   "check": "Copilot can be switched off or scoped back if it is not performing or is no longer needed.",
   "why": "A defined off switch is a safeguard in itself.",
   "current": "Deactivation procedure defined: remove licenses, disable Z: grounding, retain logs.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "PROTECT",
   "name": "Network Protection",
   "ref": "CSF 2.0 PR.IR-01",
   "check": "Networks carrying Copilot traffic are protected.",
   "why": "No new network zones; enterprise segmentation applies.",
   "current": "Micro-segmentation and web gateway controls in place.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "PROTECT",
   "name": "Resilience",
   "ref": "CSF 2.0 PR.IR-03",
   "check": "Legal can continue if Copilot is unavailable.",
   "why": "Fallback is manual research; no resilience engineering needed.",
   "current": "Contingency documented: manual research.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "PROTECT",
   "name": "Capacity",
   "ref": "CSF 2.0 PR.IR-04",
   "check": "Enough Copilot licenses exist for Legal.",
   "why": "Capacity is license count.",
   "current": "Licenses provisioned for Legal Department attorneys.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "DETECT",
   "name": "Network Monitoring",
   "ref": "CSF 2.0 DE.CM-01",
   "check": "Network traffic is monitored for adversary activity.",
   "why": "Enterprise monitoring covers Copilot traffic.",
   "current": "Enterprise SIEM and network monitoring.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "DETECT",
   "name": "Workforce Use Monitoring",
   "ref": "CSF 2.0 DE.CM-03",
   "check": "How attorneys use Copilot is monitored for inappropriate use.",
   "why": "Inappropriate use is a named risk. Monitoring is what detects it.",
   "current": "Copilot usage reports and Purview activity reviewed monthly by the Sr. Governance Manager.",
   "direct": true,
   "status": "In Progress"
  },
  {
   "fn": "DETECT",
   "name": "Vendor Activity Monitoring",
   "ref": "CSF 2.0 DE.CM-06",
   "check": "Microsoft service activity in the BCBSVT tenant is visible and reviewed.",
   "why": "BCBSVT should be able to see what the vendor service accesses, not just trust that it behaves.",
   "current": "Microsoft 365 audit and Copilot activity reports available in Purview. Included in monthly review.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "DETECT",
   "name": "Endpoint Monitoring",
   "ref": "CSF 2.0 DE.CM-09",
   "check": "Attorney endpoints are monitored for compromise.",
   "why": "Enterprise EDR covers attorney devices.",
   "current": "EDR and automated vulnerability scanning deployed.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "DETECT",
   "name": "AI Output Quality and Drift",
   "ref": "AI RMF MEASURE 2.4",
   "check": "Copilot answer quality is tracked over time for decline or unexpected behavior.",
   "why": "Microsoft updates the model without notice. Attorney feedback is how BCBSVT notices a change in quality.",
   "current": "Attorney feedback log and monthly quality review defined. Baseline to be set during pilot.",
   "direct": true,
   "status": "In Progress"
  },
  {
   "fn": "DETECT",
   "name": "Event Analysis",
   "ref": "CSF 2.0 DE.AE-02",
   "check": "Adverse events involving Copilot are analyzed.",
   "why": "Enterprise security operations process.",
   "current": "Centralized logging with daily automated analysis.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "DETECT",
   "name": "Event Correlation",
   "ref": "CSF 2.0 DE.AE-03",
   "check": "Copilot logs are correlated with other signals.",
   "why": "Purview logs feed the enterprise SIEM.",
   "current": "Enterprise correlation in place.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "DETECT",
   "name": "Impact Estimation",
   "ref": "CSF 2.0 DE.AE-04",
   "check": "The spread of a Copilot event can be estimated.",
   "why": "Applies only if an incident occurs; enterprise process.",
   "current": "Enterprise incident scoping process.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "DETECT",
   "name": "Event Routing",
   "ref": "CSF 2.0 DE.AE-06",
   "check": "Copilot event information reaches the right people.",
   "why": "Enterprise routing; AI Governance Council added as recipient.",
   "current": "Enterprise process with AI Governance Council on distribution.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "DETECT",
   "name": "Event Enrichment",
   "ref": "CSF 2.0 DE.AE-07",
   "check": "Events are enriched with context before judgment.",
   "why": "Enterprise process.",
   "current": "Enterprise process.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "DETECT",
   "name": "Incident Declaration",
   "ref": "CSF 2.0 DE.AE-08",
   "check": "Copilot incidents are declared on defined criteria.",
   "why": "Enterprise criteria apply.",
   "current": "Enterprise incident declaration criteria.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RESPOND",
   "name": "AI Incident Procedure",
   "ref": "CSF 2.0 RS.MA-01",
   "check": "A procedure exists for a Copilot incident such as privilege exposure or harmful output, coordinated with Microsoft.",
   "why": "The general incident plan does not say who decides to disable Copilot. The AI addendum does.",
   "current": "AI incident response procedures defined. Microsoft support escalation path recorded.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "RESPOND",
   "name": "Incident Triage",
   "ref": "CSF 2.0 RS.MA-02",
   "check": "Reports of Copilot issues are triaged.",
   "why": "Enterprise triage process.",
   "current": "Enterprise service desk and security triage.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RESPOND",
   "name": "Incident Categorization",
   "ref": "CSF 2.0 RS.MA-03",
   "check": "Copilot incidents are categorized and prioritized.",
   "why": "Enterprise process.",
   "current": "Enterprise categorization scheme.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RESPOND",
   "name": "Executive Escalation",
   "ref": "CSF 2.0 RS.MA-04",
   "check": "Copilot incidents are escalated to the accountable executive.",
   "why": "The CLO owns the benefit and the risk. Incidents must reach the CLO promptly.",
   "current": "Escalation to the Chief Legal Officer and the AI Governance Council within defined timeframes.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "RESPOND",
   "name": "Recovery Start Criteria",
   "ref": "CSF 2.0 RS.MA-05",
   "check": "Criteria define when Copilot can be re-enabled after an incident.",
   "why": "Enterprise criteria; reactivation approved by CLO.",
   "current": "Enterprise process with CLO approval for reactivation.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RESPOND",
   "name": "Root Cause",
   "ref": "CSF 2.0 RS.AN-03",
   "check": "Root cause of a Copilot incident is established.",
   "why": "Enterprise process.",
   "current": "Enterprise root cause process.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RESPOND",
   "name": "Investigation Records",
   "ref": "CSF 2.0 RS.AN-06",
   "check": "Investigative actions are recorded.",
   "why": "Enterprise process.",
   "current": "Enterprise case management.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RESPOND",
   "name": "Evidence Preservation",
   "ref": "CSF 2.0 RS.AN-07",
   "check": "Evidence is preserved.",
   "why": "Enterprise process; Purview logs retained.",
   "current": "Enterprise forensic process.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RESPOND",
   "name": "Incident Information Sharing",
   "ref": "CSF 2.0 RS.CO-03",
   "check": "Incident information is shared with Microsoft and other parties as required.",
   "why": "Only if an incident occurs.",
   "current": "Enterprise process; Microsoft support path recorded.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RESPOND",
   "name": "Containment",
   "ref": "CSF 2.0 RS.MI-01",
   "check": "Copilot can be contained quickly by removing licenses or grounding.",
   "why": "Containment for a SaaS tool is administrative. It must be rehearsed so it takes minutes, not days.",
   "current": "Containment steps documented: revoke Legal Copilot licenses, disable Z: grounding. Owner assigned.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "RESPOND",
   "name": "Eradication",
   "ref": "CSF 2.0 RS.MI-02",
   "check": "Defective components are removed.",
   "why": "Enterprise process.",
   "current": "Enterprise eradication process.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RECOVER",
   "name": "Recovery Execution",
   "ref": "CSF 2.0 RC.RP-01",
   "check": "Recovery is executed once authorized.",
   "why": "Enterprise process.",
   "current": "Enterprise recovery plan.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RECOVER",
   "name": "Recovery Sequencing",
   "ref": "CSF 2.0 RC.RP-02",
   "check": "Recovery is sequenced against objectives.",
   "why": "Legal research is not member-critical; low priority in sequencing.",
   "current": "Enterprise recovery objectives.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RECOVER",
   "name": "Backup Verification",
   "ref": "CSF 2.0 RC.RP-03",
   "check": "Backups are verified before restore.",
   "why": "Z: drive backups are enterprise-managed.",
   "current": "Enterprise backup verification.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RECOVER",
   "name": "Function Restoration",
   "ref": "CSF 2.0 RC.RP-04",
   "check": "Functions are restored in priority order.",
   "why": "No member or provider function involved.",
   "current": "Enterprise process.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RECOVER",
   "name": "Post-Restore Verification",
   "ref": "CSF 2.0 RC.RP-05",
   "check": "Restored systems are verified.",
   "why": "Enterprise process.",
   "current": "Enterprise verification.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RECOVER",
   "name": "Recovery Closure",
   "ref": "CSF 2.0 RC.RP-06",
   "check": "Recovery is declared complete and documented.",
   "why": "Enterprise process.",
   "current": "Enterprise closure process.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "RECOVER",
   "name": "Recovery Reporting",
   "ref": "CSF 2.0 RC.CO-03",
   "check": "Recovery progress is reported to leadership.",
   "why": "Leadership reporting only; no external stakeholders.",
   "current": "Enterprise reporting.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Mission Alignment",
   "ref": "CSF 2.0 GV.OC-01",
   "check": "Copilot use aligns with the BCBSVT mission.",
   "why": "Organizational mission is a given.",
   "current": "Strategic alignment recorded: operational efficiency, legal service delivery, staff experience.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Stakeholder Expectations",
   "ref": "CSF 2.0 GV.OC-02",
   "check": "Stakeholder expectations on AI use are understood.",
   "why": "No member or regulator expectations specific to an internal legal tool.",
   "current": "Enterprise stakeholder engagement.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Legal and Regulatory Obligations",
   "ref": "CSF 2.0 GV.OC-03",
   "check": "The obligations that apply to Copilot in Legal are identified and documented.",
   "why": "Bulletin 229 and the NAIC bulletin expect insurers to document AI use even when the risk is low.",
   "current": "Obligations documented: Vermont Insurance Bulletin No. 229, NAIC AI Model Bulletin (Exhibits A and D), attorney-client privilege, MPSA and DPA terms.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Critical Services",
   "ref": "CSF 2.0 GV.OC-04",
   "check": "Critical services are identified.",
   "why": "Legal research is not a member-critical service.",
   "current": "Enterprise critical service list.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Risk Program Objectives",
   "ref": "CSF 2.0 GV.RM-01",
   "check": "Risk program objectives are agreed.",
   "why": "Enterprise-set.",
   "current": "Enterprise AI governance program objectives.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Risk Appetite",
   "ref": "CSF 2.0 GV.RM-02",
   "check": "Risk appetite and tier thresholds are set.",
   "why": "Enterprise-set; Tier 3 threshold applied to Copilot.",
   "current": "Tier thresholds: Tier 1 at 70 or above, Tier 2 at 40 to 69, Tier 3 below 40.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Integration into Enterprise Risk Reporting",
   "ref": "CSF 2.0 GV.RM-03",
   "check": "Copilot appears in the AI portfolio dashboard and board-level risk reporting.",
   "why": "Regulators expect the board to have sight of AI use. Reporting is the evidence.",
   "current": "BeccaBot included in the monthly AI Portfolio Dashboard and quarterly Risk Tier Distribution Report.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Risk Treatment Decisions",
   "ref": "CSF 2.0 GV.RM-04",
   "check": "Each Copilot risk has an agreed treatment: mitigate, accept, transfer or avoid.",
   "why": "Documented treatment decisions show that risks were considered, not overlooked.",
   "current": "Invalid output: mitigate through attorney review. Inappropriate use: mitigate through access limits and monitoring. Privilege exposure: mitigate through access controls. Residual risk accepted at Tier 3.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Risk Communication Channels",
   "ref": "CSF 2.0 GV.RM-05",
   "check": "Standing channels carry Copilot risk information.",
   "why": "Enterprise channels apply.",
   "current": "Monthly AI Governance Committee meeting.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Standard Risk Method",
   "ref": "CSF 2.0 GV.RM-06",
   "check": "Risk is scored the same way across the portfolio.",
   "why": "Enterprise rubric applied, not defined, for Copilot.",
   "current": "Standard scoring references applied.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Value and Opportunity",
   "ref": "CSF 2.0 GV.RM-07",
   "check": "The expected benefit of Copilot is quantified alongside the risk.",
   "why": "Governance should enable good use, not only prevent bad use. The value case justifies the effort.",
   "current": "Business case: $15,000 investment, $55,000 expected annual benefit, $150,000 three-year net value.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Risk Response Tracking",
   "ref": "CSF 2.0 ID.RA-06",
   "check": "Each Copilot risk response is tracked to closure.",
   "why": "Untracked responses quietly become unmanaged risk.",
   "current": "Risk mitigation plan maintained in the risk assessment. Status reviewed monthly.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Open Findings Tracking",
   "ref": "RMF Task M-3",
   "check": "Findings that cannot be fixed immediately have an owner, a date and evidence.",
   "why": "Low findings with no owner become forgotten findings.",
   "current": "Low-severity gaps recorded in the SSP dashboard with owners and target dates.",
   "direct": true,
   "status": "In Progress"
  },
  {
   "fn": "GOVERN",
   "name": "Senior Accountability",
   "ref": "CSF 2.0 GV.RR-01",
   "check": "A named executive is accountable for Copilot in Legal.",
   "why": "Accountability is the first thing a regulator or auditor asks for.",
   "current": "The Chief Legal Officer is Benefit Owner and Executive Sponsor.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Roles and Decision Rights",
   "ref": "CSF 2.0 GV.RR-02",
   "check": "Governance roles for Copilot are assigned and understood.",
   "why": "Everyone involved knows who approves, who monitors and who reports.",
   "current": "Roster: Head of AI Governance (Value Realization Lead), Sr. Governance Manager (secretariat), Finance Lead (ROI tracking), Information Security (security assessment).",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Resources",
   "ref": "CSF 2.0 GV.RR-03",
   "check": "Budget and people are allocated to run Copilot safely.",
   "why": "Controls that no one is funded to operate do not get operated.",
   "current": "$15,000 pilot budget approved by Finance. Governance time allocated within Office of AI Governance.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "HR Practices",
   "ref": "CSF 2.0 GV.RR-04",
   "check": "Risk expectations are built into HR practices.",
   "why": "Enterprise practice.",
   "current": "Enterprise HR practices.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "AI Use Policy",
   "ref": "CSF 2.0 GV.PO-01",
   "check": "A written policy tells attorneys what Copilot may and may not be used for.",
   "why": "The policy is the reference point for training, monitoring and any misuse discussion.",
   "current": "Gate 5 Copilot acceptable-use policy for Legal drafted. Covers permitted uses, review requirement, external release approval, prohibited content.",
   "direct": true,
   "status": "In Progress"
  },
  {
   "fn": "GOVERN",
   "name": "Policy Review",
   "ref": "CSF 2.0 GV.PO-02",
   "check": "Policy is reviewed as regulation and technology change.",
   "why": "Enterprise cadence; annual review of AI policy.",
   "current": "Annual policy review cadence.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Incident and Contingency Plans",
   "ref": "CSF 2.0 ID.IM-04",
   "check": "Incident and contingency plans cover Copilot and a Microsoft service failure.",
   "why": "A vendor outage or a Copilot incident should not leave Legal improvising.",
   "current": "AI incident plan defined. Contingency: revert to manual research. Microsoft support path documented.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Control Baseline Selection",
   "ref": "RMF Task S-2",
   "check": "The control baseline applied to Copilot matches its Tier 3 classification.",
   "why": "A baseline that is too heavy wastes effort. One that is too light misses privilege risk. Tier 3 with privilege-specific additions is the right fit.",
   "current": "Tier 3 baseline selected and tailored with access, logging and human review controls for privileged material.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Documented Control Plan and Approval",
   "ref": "RMF Task S-6",
   "check": "The planned controls were documented and approved before deployment.",
   "why": "Approval before deployment is what makes this a governed rollout rather than a shadow tool.",
   "current": "Security assessment and DPIA documented and approved on 2026-09-02 and 2026-09-03 before pilot start.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Strategy Outcome Review",
   "ref": "CSF 2.0 GV.OV-01",
   "check": "Leadership reviews whether the AI risk strategy is working.",
   "why": "Strategy-level review.",
   "current": "Quarterly Value Realization Status report.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Strategy Adjustment",
   "ref": "CSF 2.0 GV.OV-02",
   "check": "Strategy is adjusted for emerging risk.",
   "why": "Strategy-level review.",
   "current": "Annual charter review.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Performance Measures",
   "ref": "CSF 2.0 GV.OV-03",
   "check": "Copilot is measured against agreed indicators.",
   "why": "Measures show whether the value case is real and whether risk controls are working.",
   "current": "Indicators defined: hours saved per attorney, response time to business units, external research spend, attorney quality feedback. Measurement begins at pilot.",
   "direct": true,
   "status": "In Progress"
  },
  {
   "fn": "GOVERN",
   "name": "Authorization to Operate",
   "ref": "RMF Task R-4",
   "check": "A senior decision formally accepted the residual risk before Copilot went live.",
   "why": "This decision is the record that leadership knowingly accepted the risk.",
   "current": "Approved for pilot by the AI Governance Council on 2026-09-01. Departmental sign-off by CLO.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Ongoing Authorization",
   "ref": "RMF Task M-5",
   "check": "The approval is kept current as Copilot and its use change.",
   "why": "Copilot in a year will not be the Copilot approved today.",
   "current": "Annual recertification framework defined. Any scope change triggers re-intake.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Third-Party Risk Program",
   "ref": "CSF 2.0 GV.SC-01",
   "check": "A third-party risk program exists.",
   "why": "Enterprise program applies to Microsoft.",
   "current": "Enterprise third-party risk program.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Third-Party Risk Roles",
   "ref": "CSF 2.0 GV.SC-02",
   "check": "Third-party risk roles are assigned.",
   "why": "Enterprise roles.",
   "current": "Enterprise third-party risk roles.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Third-Party Risk Integration",
   "ref": "CSF 2.0 GV.SC-03",
   "check": "Third-party risk is integrated into enterprise risk.",
   "why": "Enterprise integration.",
   "current": "Enterprise process.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Contract Requirements",
   "ref": "CSF 2.0 GV.SC-05",
   "check": "Security, privacy and AI requirements are written into the Microsoft agreements.",
   "why": "Contract terms are the only enforceable control over a vendor.",
   "current": "MPSA, HIPAA BAA, DPA and no-training clause in place. Audit rights through SOC 2 reporting.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Vendors in Incident Planning",
   "ref": "CSF 2.0 GV.SC-08",
   "check": "Microsoft is included in incident planning.",
   "why": "Covered under existing business associate incident planning.",
   "current": "Enterprise business associate incident planning.",
   "direct": false,
   "status": "Enterprise"
  },
  {
   "fn": "GOVERN",
   "name": "Acquisition Lifecycle",
   "ref": "CSF 2.0 GV.SC-09",
   "check": "Copilot was acquired through the third-party security process.",
   "why": "Buying through the process is what triggered the vendor assessment and contract review.",
   "current": "Acquired through SHI Cloud Solution Provider under existing MPSA. Third-party review completed at intake.",
   "direct": true,
   "status": "Closed"
  },
  {
   "fn": "GOVERN",
   "name": "Exit and Data Return",
   "ref": "CSF 2.0 GV.SC-10",
   "check": "When Copilot is retired, licenses are revoked and any retained data is removed.",
   "why": "Exit is the last control. It closes the relationship cleanly.",
   "current": "Exit steps defined: revoke licenses, confirm Microsoft data deletion under DPA, retain audit logs.",
   "direct": true,
   "status": "In Progress"
  }
 ],
 "functionNotApplicable": {
  "IDENTIFY": 1,
  "PROTECT": 9,
  "DETECT": 1,
  "RESPOND": 2,
  "RECOVER": 1,
  "GOVERN": 2
 },
 "functionDescriptions": {
  "IDENTIFY": "Understand the estate and what could go wrong",
  "PROTECT": "Apply and sustain safeguards",
  "DETECT": "Monitor and analyze events",
  "RESPOND": "Act on declared incidents",
  "RECOVER": "Restore operations",
  "GOVERN": "Decide risk appetite, accountability and policy"
 },
 "risks": [
  {
   "risk": "Invalid or biased output",
   "mitigation": "Professional expertise of BCBSVT attorneys to recognize invalid output. Source citations on every response. Monthly quality review.",
   "owner": "Chief Legal Officer",
   "target": "Ongoing",
   "status": "In Progress",
   "refs": "Human Review of AI Output (GOVERN 3.2); AI Output Quality and Drift (MEASURE 2.4)"
  },
  {
   "risk": "Inappropriate use",
   "mitigation": "Use limited to attorneys in the Legal Department. Acceptable-use policy (Gate 5). Copilot usage monitored monthly.",
   "owner": "Chief Legal Officer",
   "target": "Ongoing",
   "status": "In Progress",
   "refs": "Sanctioned AI Tools Only (PR.PS-05); Workforce Use Monitoring (DE.CM-03); AI Use Policy (GV.PO-01)"
  },
  {
   "risk": "Privilege and confidentiality exposure",
   "mitigation": "Access controls on the legal drive; Copilot honors existing permissions; attorney review and CLO approval before external release; no model training on tenant data.",
   "owner": "Chief Legal Officer",
   "target": "Ongoing",
   "status": "Closed",
   "refs": "Least Privilege and Minimum Necessary (PR.AA-05); Data in Use During AI Processing (PR.DS-10)"
  },
  {
   "risk": "Prompt injection through retrieved content",
   "mitigation": "Grounding restricted to the Z: legal drive; web grounding and third-party plugins disabled; Microsoft prompt injection protections.",
   "owner": "Information Security",
   "target": "2026-10-16",
   "status": "In Progress",
   "refs": "Secure Configuration Baseline (PR.PS-01); Minimum Necessary Scoping (CT.PO-P1)"
  }
 ],
 "scoreFactors": [
  {
   "factor": "Clinical/Patient Safety",
   "score": 1,
   "weight": 0.3,
   "points": 6,
   "rationale": "No clinical content or clinical decision. Legal research only."
  },
  {
   "factor": "Member Impact",
   "score": 1,
   "weight": 0.2,
   "points": 4,
   "rationale": "No member interaction. 0 members affected. Indirect staff impact only."
  },
  {
   "factor": "Data Sensitivity",
   "score": 2,
   "weight": 0.2,
   "points": 8,
   "rationale": "No PHI or PII. Attorney-client privileged material is confidential and warrants a score above minimum."
  },
  {
   "factor": "Autonomy",
   "score": 2,
   "weight": 0.15,
   "points": 6,
   "rationale": "Copilot drafts and summarizes; an attorney reviews every output. No autonomous action."
  },
  {
   "factor": "Scale",
   "score": 1,
   "weight": 0.15,
   "points": 3,
   "rationale": "Approximately 6 attorneys in one department. About 50 requests per month."
  }
 ],
 "trust": [
  {
   "name": "Valid & Reliable",
   "rating": 3,
   "note": "Copilot responses cite the original source documents so attorneys can verify every answer. Reliability baseline to be confirmed at the Pilot Gate."
  },
  {
   "name": "Safe",
   "rating": 4,
   "note": "Use limited to attorneys in the Legal Department. Professional expertise recognizes invalid output. No member-facing effect."
  },
  {
   "name": "Secure & Resilient",
   "rating": 4,
   "note": "Microsoft SOC 2, HITRUST, ISO 27001 certified. MPSA, BAA and DPA in place. FIDO2 MFA and TLS 1.3 enforced."
  },
  {
   "name": "Accountable & Transparent",
   "rating": 3,
   "note": "Named benefit owner and governance roster. Copilot activity logged in Purview. Source attribution on every response."
  },
  {
   "name": "Explainable & Interpretable",
   "rating": 3,
   "note": "Response attribution enables attorney verification of outputs against the source on the Z: drive."
  },
  {
   "name": "Privacy-Enhanced",
   "rating": 4,
   "note": "No PHI involved. Legal drive access controlled. Tenant data not used for model training."
  },
  {
   "name": "Fair with Harmful Bias Managed",
   "rating": 3,
   "note": "No decisions about individuals. Attorney review mitigates biased output risk in research summaries."
  }
 ],
 "hipaa": [
  {
   "group": "Introductory",
   "control": "AI System Inventory",
   "status": "Yes",
   "evidence": "AI Inventory Record registers BeccaBot with system name, owner (Chief Legal Officer), Tier 3, no PHI, vendor Microsoft and deployment status.",
   "refs": "Software and AI System Inventory (CSF 2.0 ID.AM-02); System Lifecycle Management (ID.AM-08)"
  },
  {
   "group": "Administrative",
   "control": "AI-Specific Risk Analysis",
   "status": "Yes",
   "evidence": "BeccaBot included in the annual enterprise risk assessment. Threats evaluated: invalid output, inappropriate use, privilege exposure, prompt injection.",
   "refs": "Threat Identification (ID.RA-03); Likelihood and Impact (ID.RA-04); Harm Assessment (AI RMF MAP 5.1)"
  },
  {
   "group": "Administrative",
   "control": "AI Vendor Risk Assessment",
   "status": "Yes",
   "evidence": "Microsoft assessed: MPSA and SHI CSP agreement; SOC 2, HITRUST, ISO 27001; HIPAA BAA and DPA in place.",
   "refs": "Vendor Risk Before Purchase (ID.RA-10); Vendor Due Diligence (GV.SC-06); Externally Sourced AI Risk (AI RMF MANAGE 3.1)"
  },
  {
   "group": "Administrative",
   "control": "Security Management Process",
   "status": "Yes",
   "evidence": "Annual risk assessment executed. Weighted score 27, Tier 3 (Low). Risk register maintained.",
   "refs": "Risk Prioritization (ID.RA-05); Risk Response Tracking (ID.RA-06)"
  },
  {
   "group": "Administrative",
   "control": "Risk Analysis",
   "status": "Yes",
   "evidence": "Threat modeling completed for the Copilot deployment and legal drive integration.",
   "refs": "Weakness Identification (ID.RA-01); Threat Identification (ID.RA-03)"
  },
  {
   "group": "Administrative",
   "control": "Workforce Training",
   "status": "Yes",
   "evidence": "100% completion of HIPAA and AI security awareness. Attorney training on Copilot use delivered to pilot users.",
   "refs": "Role-Based Training (PR.AT-02); Security Awareness Training (PR.AT-01)"
  },
  {
   "group": "Administrative",
   "control": "Contingency Planning",
   "status": "Yes",
   "evidence": "Disaster recovery plan tested bi-annually. Copilot contingency is manual research.",
   "refs": "Incident and Contingency Plans (ID.IM-04); Resilience (PR.IR-03)"
  },
  {
   "group": "Physical",
   "control": "Facility Access Controls",
   "status": "Yes",
   "evidence": "Microsoft data centers certified SOC 2 Type II and ISO 27001 with biometric access.",
   "refs": "Vendor Due Diligence (GV.SC-06). Physical access is Microsoft responsibility."
  },
  {
   "group": "Physical",
   "control": "Workstation Security",
   "status": "Yes",
   "evidence": "MDM enforced on attorney devices: screen lock, disk encryption, USB block.",
   "refs": "Hardware Inventory (ID.AM-01); Endpoint Monitoring (DE.CM-09)"
  },
  {
   "group": "Physical",
   "control": "Device and Media Controls",
   "status": "Yes",
   "evidence": "Media sanitization policy NIST 800-88 compliant.",
   "refs": "Enterprise program. No Copilot-specific media."
  },
  {
   "group": "Technical",
   "control": "Access Control",
   "status": "Yes",
   "evidence": "RBAC and FIDO2 MFA mandatory. Copilot licensed only to Legal Department. Copilot honors Z: drive permissions.",
   "refs": "Least Privilege and Minimum Necessary (PR.AA-05); Authentication (PR.AA-03); Identity and Credential Lifecycle (PR.AA-01)"
  },
  {
   "group": "Technical",
   "control": "Audit Controls",
   "status": "Yes",
   "evidence": "Copilot activity logged through Microsoft Purview and retained 7 years in WORM storage. Z: drive access logging active.",
   "refs": "Audit Logging (PR.PS-04); Vendor Activity Monitoring (DE.CM-06)"
  },
  {
   "group": "Technical",
   "control": "Integrity Controls",
   "status": "Yes",
   "evidence": "Microsoft integrity controls for the service verified through SOC 2. Response citations allow attorneys to verify output against source.",
   "refs": "Explainability (AI RMF MEASURE 2.9); Externally Sourced AI Risk (MANAGE 3.1)"
  },
  {
   "group": "Technical",
   "control": "Transmission Security",
   "status": "Yes",
   "evidence": "TLS 1.3 enforced for all Copilot traffic.",
   "refs": "Data in Transit (PR.DS-02)"
  }
 ],
 "nist80053": [
  {
   "group": "AC (Access Control)",
   "control": "AC-2, AC-3, AC-6",
   "status": "Yes",
   "evidence": "Least privilege enforced. Access limited to Legal Department. Quarterly access review.",
   "refs": "Least Privilege and Minimum Necessary (PR.AA-05); Identity and Credential Lifecycle (PR.AA-01)"
  },
  {
   "group": "AU (Audit & Accountability)",
   "control": "AU-2, AU-6, AU-12",
   "status": "Yes",
   "evidence": "Centralized logging with daily automated analysis. Copilot logs in Purview.",
   "refs": "Audit Logging (PR.PS-04); Event Analysis (DE.AE-02)"
  },
  {
   "group": "IA (Identification & Authentication)",
   "control": "IA-2, IA-5, IA-8",
   "status": "Yes",
   "evidence": "SSO through Okta with mandatory hardware token MFA.",
   "refs": "Authentication (PR.AA-03); Identity Federation (PR.AA-04)"
  },
  {
   "group": "SC (System & Comms Protection)",
   "control": "SC-7, SC-8, SC-13",
   "status": "Yes",
   "evidence": "FIPS 140-3 validated cryptography. TLS 1.3 in transit. Service encryption at rest.",
   "refs": "Data at Rest (PR.DS-01); Data in Transit (PR.DS-02); Network Protection (PR.IR-01)"
  },
  {
   "group": "SI (System & Info Integrity)",
   "control": "SI-2, SI-4, SI-10",
   "status": "Yes",
   "evidence": "Automated vulnerability scanning and EDR on endpoints. Microsoft output filtering on the service.",
   "refs": "Endpoint Monitoring (DE.CM-09); Weakness Identification (ID.RA-01)"
  },
  {
   "group": "RA (Risk Assessment)",
   "control": "RA-3, RA-5",
   "status": "Yes",
   "evidence": "Risk assessment completed. Vulnerability assessments bi-weekly; penetration test annually.",
   "refs": "Likelihood and Impact (ID.RA-04); Test and Exercise Results (ID.IM-02)"
  },
  {
   "group": "SA (System & Services Acquisition)",
   "control": "SA-4, SA-9",
   "status": "Yes",
   "evidence": "Acquired through SHI CSP under MPSA with security and privacy terms. External service provider requirements in BAA and DPA.",
   "refs": "Acquisition Lifecycle (GV.SC-09); Contract Requirements (GV.SC-05)"
  },
  {
   "group": "CM (Configuration Management)",
   "control": "CM-2, CM-6, CM-8",
   "status": "Yes",
   "evidence": "Copilot tenant baseline defined: web grounding off, plugins off, sensitivity labels, DLP, 7-year retention. Drift check being added to quarterly review.",
   "refs": "Secure Configuration Baseline (PR.PS-01); Change and Exception Risk (ID.RA-07)"
  },
  {
   "group": "SR (Supply Chain Risk)",
   "control": "SR-3, SR-6",
   "status": "Yes",
   "evidence": "Microsoft assessed and tiered as a critical vendor. Annual SOC 2 review.",
   "refs": "Vendor Criticality (GV.SC-04); Ongoing Vendor Risk (GV.SC-07)"
  }
 ],
 "hitrust": [
  {
   "group": "Access Control",
   "control": "Control 01.a, 01.b",
   "status": "Yes",
   "evidence": "User access reviews conducted quarterly by department managers.",
   "refs": "Identity and Credential Lifecycle (PR.AA-01)"
  },
  {
   "group": "Audit Logging",
   "control": "Control 09.aa",
   "status": "Yes",
   "evidence": "Logs retained 7 years in WORM storage.",
   "refs": "Audit Logging (PR.PS-04)"
  },
  {
   "group": "Network Protection",
   "control": "Control 09.m",
   "status": "Yes",
   "evidence": "Micro-segmentation active. Unsanctioned AI tools blocked at the web gateway.",
   "refs": "Network Protection (PR.IR-01); Sanctioned AI Tools Only (PR.PS-05)"
  },
  {
   "group": "Information Protection",
   "control": "Control 09.a",
   "status": "Yes",
   "evidence": "Data classification applied to the Z: legal drive. Automated DLP.",
   "refs": "Data Inventory and Classification (ID.AM-07); Minimum Necessary Scoping (PF 1.1 CT.PO-P1)"
  },
  {
   "group": "Risk Management",
   "control": "Control 03.a",
   "status": "Yes",
   "evidence": "Enterprise risk framework aligned with HITRUST v9.6.",
   "refs": "Standard Risk Method (GV.RM-06); Risk Treatment Decisions (GV.RM-04)"
  },
  {
   "group": "Third-Party Assurance",
   "control": "Control 05.i",
   "status": "Yes",
   "evidence": "Vendor policy requires annual SOC 2 Type II review of Microsoft.",
   "refs": "Ongoing Vendor Risk (GV.SC-07); Third-Party Risk Program (GV.SC-01)"
  },
  {
   "group": "Continuous Monitoring",
   "control": "Control 09.bc",
   "status": "Yes",
   "evidence": "Automated compliance monitoring tracks security posture. Copilot usage reviewed monthly.",
   "refs": "Workforce Use Monitoring (DE.CM-03); AI Output Quality and Drift (AI RMF MEASURE 2.4)"
  }
 ],
 "aiControls": [
  {
   "group": "Prompt Injection Detection",
   "control": "OWASP LLM01",
   "status": "Yes",
   "evidence": "Microsoft Copilot prompt injection protections. Grounding limited to the legal drive reduces exposure to untrusted content.",
   "refs": "Externally Sourced AI Risk (MANAGE 3.1); Minimum Necessary Scoping (CT.PO-P1)",
   "sustain": "Keep grounding limited to the Z: legal drive. Confirm web grounding and third-party plugins remain disabled at each quarterly configuration review. Review Microsoft security advisories monthly."
  },
  {
   "group": "Output Filtering",
   "control": "OWASP LLM05",
   "status": "Yes",
   "evidence": "Microsoft Copilot output filtering. Attorney review of every output.",
   "refs": "Human Review of AI Output (AI RMF GOVERN 3.2)",
   "sustain": "Rely on Microsoft output filtering and mandatory attorney review. Record any filtered or inappropriate output in the attorney feedback log for monthly review."
  },
  {
   "group": "Hallucination Detection",
   "control": "Source attribution",
   "status": "Yes",
   "evidence": "Responses cite source documents on the Z: drive for attorney verification.",
   "refs": "Explainability (MEASURE 2.9); Reliability Under Real Conditions (MEASURE 2.5)",
   "sustain": "Require attorneys to verify each cited source before relying on an answer. Track citation accuracy as a Pilot Gate metric and set an acceptance threshold before the Deployment Gate."
  },
  {
   "group": "Model Drift Detection",
   "control": "Attorney feedback and monthly review",
   "status": "In Progress",
   "evidence": "Feedback log and monthly quality review defined. Baseline to be set during pilot.",
   "refs": "AI Output Quality and Drift (MEASURE 2.4); Learning from Operating Experience (ID.IM-03)",
   "sustain": "Establish a quality baseline during the pilot using a fixed set of reference questions. Re-run the set monthly and after any Microsoft model update notice. Escalate a decline to the AI Governance Council."
  },
  {
   "group": "Data Poisoning Monitoring",
   "control": "Vendor controls",
   "status": "Yes",
   "evidence": "Microsoft vendor controls. BCBSVT data is not used for model training.",
   "refs": "Data in Use During AI Processing (PR.DS-10)",
   "sustain": "Confirm annually through the SOC 2 review and the BAA that tenant data is not used for model training. Restrict write access to the Z: drive to Legal Department staff."
  },
  {
   "group": "Adversarial Testing",
   "control": "Vendor controls",
   "status": "Yes",
   "evidence": "Microsoft red-teaming and adversarial testing verified through certifications.",
   "refs": "Externally Sourced AI Risk (MANAGE 3.1)",
   "sustain": "Rely on Microsoft adversarial testing evidenced in certifications. Include a short internal misuse test (attempted access outside the legal drive, attempted PHI retrieval) before the Deployment Gate."
  },
  {
   "group": "Human Oversight and Deactivation",
   "control": "Attorney review; off switch",
   "status": "Yes",
   "evidence": "Attorney review required. CLO approves external release. Deactivation procedure defined.",
   "refs": "Human Review of AI Output (GOVERN 3.2); Controlled Retirement (GOVERN 1.7); Containment (RS.MI-01)",
   "sustain": "Publish the Gate 5 acceptable-use policy. Rehearse the deactivation procedure (license revocation and grounding removal) once before deployment and record the time taken."
  },
  {
   "group": "Bias and Fairness Review",
   "control": "Attorney review",
   "status": "Yes",
   "evidence": "Bias risk scored 3 of 5. No member-facing decisions. Attorney review mitigates.",
   "refs": "Harmful Bias Testing (MEASURE 2.11)",
   "sustain": "Include a bias check in the monthly quality review. Because Copilot makes no decisions about individuals, the review focuses on balanced treatment of legal positions in summaries."
  }
 ],
 "contractControls": [
  {
   "control": "Consent Documentation",
   "status": "N/A",
   "evidence": "Internal legal staff use only. No patient or member consent required.",
   "refs": "Not applicable to this use case"
  },
  {
   "control": "SOC 2 Type II Certification",
   "status": "Yes",
   "evidence": "SOC 2 Type II Report (valid through 2027)",
   "refs": "Vendor Due Diligence (GV.SC-06)"
  },
  {
   "control": "HITRUST Certification",
   "status": "Yes",
   "evidence": "HITRUST CSF Certificate (current)",
   "refs": "Vendor Due Diligence (GV.SC-06)"
  },
  {
   "control": "ISO 27001 Certification",
   "status": "Yes",
   "evidence": "ISO 27001 certificate (current)",
   "refs": "Vendor Due Diligence (GV.SC-06)"
  },
  {
   "control": "HIPAA BAA Executed",
   "status": "Yes",
   "evidence": "Executed Business Associate Agreement dated 2026-08-15",
   "refs": "Contract Requirements (GV.SC-05)"
  },
  {
   "control": "Data Processing Addendum",
   "status": "Yes",
   "evidence": "Microsoft DPA under the MPSA",
   "refs": "Contract Requirements (GV.SC-05)"
  },
  {
   "control": "Data Use Restrictions (No Model Retraining)",
   "status": "Yes",
   "evidence": "MPSA commercial data protection: BCBSVT data is not used to train foundation models",
   "refs": "Data in Use During AI Processing (PR.DS-10)"
  },
  {
   "control": "Right to Audit Clause",
   "status": "Yes",
   "evidence": "MPSA clause: annual third-party audit rights included",
   "refs": "Ongoing Vendor Risk (GV.SC-07)"
  },
  {
   "control": "AI-Specific Indemnification",
   "status": "Yes",
   "evidence": "MPSA addendum: AI IP and data breach indemnity included",
   "refs": "Contract Requirements (GV.SC-05)"
  },
  {
   "control": "Transparency Requirements",
   "status": "Yes",
   "evidence": "Microsoft discloses model updates and service lifecycle through the Microsoft 365 message center",
   "refs": "Software Maintenance (PR.PS-02)"
  },
  {
   "control": "Regulatory Cooperation",
   "status": "Yes",
   "evidence": "Microsoft cooperates with regulatory inquiries and examinations",
   "refs": "Legal and Regulatory Obligations (GV.OC-03)"
  },
  {
   "control": "Subprocessor Transparency",
   "status": "Yes",
   "evidence": "Microsoft MPSA discloses subprocessors. SHI Cloud Solution Provider agreement.",
   "refs": "Third-Party Service Inventory (ID.AM-04)"
  },
  {
   "control": "Incident Notification",
   "status": "Yes",
   "evidence": "Security incident notification obligations in the BAA and DPA",
   "refs": "AI Incident Procedure (RS.MA-01); Vendors in Incident Planning (GV.SC-08)"
  },
  {
   "control": "Termination for Cause and Exit",
   "status": "Yes",
   "evidence": "Termination for material breach including security incidents; data deletion on exit under the DPA",
   "refs": "Exit and Data Return (GV.SC-10)"
  }
 ],
 "vendorProfile": [
  {
   "field": "Vendor Name",
   "value": "Microsoft",
   "notes": "Primary AI service provider. Purchased through SHI Cloud Solution Provider under the MPSA."
  },
  {
   "field": "AI Product Name",
   "value": "Microsoft Copilot (BeccaBot)",
   "notes": "AI assistant for legal research and work product generation."
  },
  {
   "field": "Vendor Criticality Rating",
   "value": "Critical",
   "notes": "Rated critical because the service can access privileged legal material across the Legal Department."
  },
  {
   "field": "Data Accessed by Vendor Service",
   "value": "Legal Drive (Z:) only. Copilot retrieves documents from the legal drive. No health system data.",
   "notes": "Grounding scope verified in tenant configuration. Web grounding and plugins disabled."
  },
  {
   "field": "Model Training on BCBSVT Data",
   "value": "No. Tenant data is not used to train Microsoft models.",
   "notes": "Verified in MPSA commercial data protection terms and the DPA."
  },
  {
   "field": "PHI Handling Process",
   "value": "No PHI involved. Legal research materials only.",
   "notes": "Confirmed by the DPIA."
  },
  {
   "field": "Data Minimization Practices",
   "value": "Grounding limited to the Z: legal drive.",
   "notes": "Confirmed in Copilot tenant baseline."
  },
  {
   "field": "Data Retention Policy",
   "value": "7 years post-matter closure. Copilot audit logs retained 7 years.",
   "notes": "Verified through tenant retention settings and SOC 2 report."
  }
 ],
 "vendorEvaluation": [
  {
   "item": "Contractual Controls in Place",
   "result": "13 of 13 applicable controls",
   "notes": "Consent documentation is not applicable and is excluded from the count."
  },
  {
   "item": "Overall Vendor Risk Rating",
   "result": "Low",
   "notes": "Vendor satisfies all SOC 2, HITRUST, ISO 27001, BAA and DPA requirements."
  },
  {
   "item": "Assessment Recommendation",
   "result": "Approved for Integration",
   "notes": "Proceed with deployment under the current MPSA, BAA and DPA."
  },
  {
   "item": "Re-Assessment Frequency",
   "result": "Annual, or upon major model release",
   "notes": "Next scheduled review: September 2027."
  },
  {
   "item": "Assessed By",
   "result": "Information Security (CISSP)",
   "notes": "Assessment date 2026-09-02."
  }
 ],
 "dataElements": [
  {
   "id": "DE-001",
   "name": "Legal Research Materials",
   "source": "Legal Drive (Z:)",
   "storage": "Z: Legal Drive",
   "access": "Attorneys (Legal Department)",
   "flow": "File access and Microsoft Copilot retrieval over TLS 1.3",
   "leaves": "No. Processed within the Microsoft 365 tenant",
   "classification": "Confidential",
   "sensitivity": "Medium",
   "note": "Internal legal research materials. Attorney-client privileged."
  },
  {
   "id": "DE-002",
   "name": "Attorney Work Product",
   "source": "Legal Drive (Z:)",
   "storage": "Z: Legal Drive",
   "access": "Attorneys (Legal Department)",
   "flow": "File access and Microsoft Copilot retrieval over TLS 1.3",
   "leaves": "No. Processed within the Microsoft 365 tenant",
   "classification": "Confidential",
   "sensitivity": "Medium",
   "note": "Internal attorney work product. Attorney-client privileged."
  },
  {
   "id": "DE-003",
   "name": "Legal Questions from Business Units",
   "source": "Email / Ticketing System",
   "storage": "Z: Legal Drive",
   "access": "Attorneys (Legal Department)",
   "flow": "Email / Ticketing System; entered as Copilot prompts",
   "leaves": "No. Processed within the Microsoft 365 tenant",
   "classification": "Confidential",
   "sensitivity": "Medium",
   "note": "Internal business communications requesting legal advice."
  }
 ],
 "approvals": [
  {
   "role": "Benefit Owner / Executive Sponsor",
   "by": "Chief Legal Officer",
   "date": "2026-09-01",
   "status": "Approved"
  },
  {
   "role": "AI Governance Council",
   "by": "Head of AI Governance",
   "date": "2026-09-01",
   "status": "Approved"
  },
  {
   "role": "Security Assessment",
   "by": "Information Security (CISSP)",
   "date": "2026-09-02",
   "status": "Approved"
  },
  {
   "role": "DPIA and Risk Assessment",
   "by": "Sr. Governance Manager (JD, CIPP/US)",
   "date": "2026-09-03",
   "status": "Approved"
  },
  {
   "role": "Finance Lead",
   "by": "Finance Lead (Designate)",
   "date": "2026-09-01",
   "status": "Approved"
  }
 ]
}
