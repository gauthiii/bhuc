// Canonical BHUC facility facts — the single source of truth for the app.
// These MUST match the "BHUC Facility Information" knowledge base in ServiceNow
// (the Front-Door Security Agent's Search Retrieval source). If you change a value
// here, update the matching KB article, and vice-versa.
export const FACILITY = {
  name: 'Behavioral Health Urgent Care',
  shortName: 'BHUC',
  address: '1420 Riverside Drive, Suite 200, Austin, TX 78704',
  phone: '(512) 555-0100',
  phoneTel: '+15125550100',
  hours: {
    walkIn: 'Mon–Fri 8:00 AM – 8:00 PM · Sat–Sun 10:00 AM – 6:00 PM (Central)',
    telehealth: 'Daily 7:00 AM – 10:00 PM',
    crisis: '24/7 via 988',
  },
  insurers: ['Blue Shield', 'Aetna', 'UnitedHealthcare', 'Cigna', 'Texas Medicaid (STAR)', 'Medicare'],
  selfPay: 'Sliding-scale self-pay available; a financial counselor can review costs before your visit.',
  services: [
    'Crisis stabilization and safety planning',
    'Suicide-risk & mental-health screening (C-SSRS, PHQ-9, GAD-7)',
    'Medication management',
    'Brief therapy and counseling',
    'Substance use disorder (SUD) support — protected under 42 CFR Part 2',
    'Prior-authorization and coverage help',
    'Care coordination, referrals, and follow-up',
  ],
  whatToBring: ['A photo ID', 'Your insurance card (if you have one)', 'A list of current medications and doses', "An emergency contact's name and phone"],
  telehealth: 'Telehealth visits daily 7:00 AM – 10:00 PM; a secure video link appears on your Appointments screen ~15 minutes before your visit.',
  crisisLine: '988',
  emergency: '911',
} as const
