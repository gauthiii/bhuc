import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, Clock, Lightbulb, MonitorPlay, Play, RotateCcw } from 'lucide-react'
import mountains from '../../../assets/brand/bcbsvt-mountains.jpg'
import { LegalLayout } from './Layout'
import { CHAIN, DEMO_STOPS, LIFECYCLE, slidesLabel, type Phase } from '../../../lib/legalGovernance'
import { resetEvidence, useEvidence } from '../../../lib/legalEvidence'

// /prior/legal: landing page and run of show for the Copilot governance demo.
// Follows deck slides 1 to 4, then lists every screen in presentation order.

const QUESTIONS: { q: string; tag: 'Assess' | 'Control' | 'Implement' | 'Prove' | 'Decide' }[] = [
  { q: 'Where can AI be used?', tag: 'Assess' },
  { q: 'Who can use it?', tag: 'Assess' },
  { q: 'What data will it access?', tag: 'Assess' },
  { q: 'What could go wrong?', tag: 'Assess' },
  { q: 'What regulatory and policy obligations apply?', tag: 'Assess' },
  { q: 'What controls are required?', tag: 'Control' },
  { q: 'How are those controls implemented?', tag: 'Implement' },
  { q: 'How do we prove they actually work?', tag: 'Prove' },
  { q: 'Who makes the governance decision?', tag: 'Decide' },
]

const TAG_STYLE: Record<string, string> = {
  Assess: 'bg-brand-50 text-brand-700',
  Control: 'bg-brand-100 text-brand-800',
  Implement: 'bg-brand-200 text-brand-900',
  Prove: 'bg-brand-500 text-white',
  Decide: 'bg-brand-800 text-white',
}

// Deck slide 4: the chain applied to Copilot for Legal.
const CHAIN_EXAMPLE = [
  { stage: 'Assess', step: 'Business need', text: 'Legal teams need faster research, summarization and drafting.' },
  { stage: 'Assess', step: 'AI use case', text: 'Microsoft Copilot for Legal, working with internal legal information.' },
  { stage: 'Assess', step: 'Data & users', text: 'Attorneys and legal operations; confidential and privileged documents, prompts and responses.' },
  { stage: 'Assess', step: 'Risk', text: 'Unauthorized access to, or disclosure of, privileged information.' },
  { stage: 'Control', step: 'Obligations', text: 'Attorney-client privilege, information-protection obligations, AI governance policy.' },
  { stage: 'Control', step: 'Control requirement', text: 'Only authorized users can access Copilot and the information they are permitted to see.' },
  { stage: 'Implement', step: 'Technology controls', text: 'Entra ID, Conditional Access, MFA, SharePoint permissions, Purview labels and DLP.' },
  { stage: 'Prove', step: 'Evidence', text: 'Group membership, sign-in records, policy results, DLP and activity records.' },
  { stage: 'Decide', step: 'Governance decision', text: 'Copilot for Legal is approved on evidence, not on intent.' },
]

const PHASE_CHIP: Record<Phase, string> = {
  Start: 'bg-slate-100 text-slate-700',
  Assess: TAG_STYLE.Assess,
  'Control & Implement': TAG_STYLE.Control,
  Prove: TAG_STYLE.Prove,
  Decide: TAG_STYLE.Decide,
}

function Hero() {
  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-brand-500 bg-cover bg-bottom px-8 pt-10 pb-28 text-white shadow-sm md:px-12"
      style={{ backgroundImage: `url(${mountains})` }}
    >
      <p className="text-xs font-bold tracking-widest text-brand-100 uppercase">AI Governance Framework · Live demonstration</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight font-semibold md:text-5xl">From AI Use Case to Controlled Copilot</h1>
      <p className="mt-4 max-w-2xl text-lg text-brand-50">
        How Blue Cross and Blue Shield of Vermont decides whether Microsoft Copilot for Legal can operate under conditions
        it can enforce and prove.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link to="/prior/legal/use-case" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-800 shadow-sm transition hover:bg-brand-50">
          <Play className="h-4 w-4" /> Start the demo
        </Link>
        <Link to="/prior/legal/demo/identity" className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/25">
          Go straight to the live demos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
        {[['4', 'framework stages'], ['6', 'requirements'], ['2', 'live control demos'], ['1', 'decision on evidence']].map(([v, l]) => (
          <div key={l}>
            <dt className="sr-only">{l}</dt>
            <dd><span className="font-display text-3xl font-semibold">{v}</span> <span className="text-sm text-brand-100">{l}</span></dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function TheQuestion() {
  return (
    <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <div className="rounded-2xl bg-brand-800 p-6 text-white">
        <p className="text-xs font-bold tracking-widest text-brand-200 uppercase">What most organizations ask</p>
        <p className="mt-3 font-display text-3xl">"Can we deploy Copilot?"</p>
        <p className="mt-2 text-sm text-brand-100">That is a technology question.</p>
        <p className="mt-5 border-t border-white/15 pt-5 text-base leading-relaxed">
          The real decision is whether this AI use case can operate under conditions the organization can
          <strong className="text-brand-200"> enforce</strong> and <strong className="text-brand-200">prove</strong>.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">The questions that actually decide it</p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {QUESTIONS.map(({ q, tag }, i) => (
            <li key={q} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-700"><span className="mr-2 text-slate-400">{i + 1}</span>{q}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${TAG_STYLE[tag]}`}>{tag}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Lifecycle() {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold text-slate-900">One lifecycle from AI use case to governance decision</h2>
      <ol className="mt-4 grid gap-3 md:grid-cols-4">
        {LIFECYCLE.map((s, i) => (
          <li key={s.name} className="relative">
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold text-brand-500">{s.n}</span>
                <span className="text-sm font-bold tracking-wider text-brand-800 uppercase">{s.name}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{s.q}</p>
              <p className="mt-4 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Output</p>
              <p className="text-sm font-medium text-slate-800">{s.out}</p>
            </div>
            {i < LIFECYCLE.length - 1 && <ChevronRight className="absolute top-1/2 -right-3 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-slate-50 text-brand-400 md:block" aria-hidden />}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-brand-50 px-5 py-4">
        {CHAIN.map((c, i) => (
          <span key={c.k} className="inline-flex items-center gap-2">
            <span className="rounded-lg bg-white px-3 py-1.5 text-sm shadow-sm">
              <span className="font-semibold text-brand-800">{c.k}</span>
              <span className="ml-1.5 text-xs text-slate-500">{c.q}</span>
            </span>
            {i < CHAIN.length - 1 && <ArrowRight className="h-4 w-4 text-brand-400" aria-hidden />}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-500">
        We don't start by choosing technology controls. We start with the use case, determine what must be true, then make it
        enforceable and provable.
      </p>
    </section>
  )
}

function ChainExample() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-2xl font-semibold text-slate-900">Every control starts with the use case</h2>
      <p className="mt-1 text-sm text-slate-500">The governance chain, applied to Microsoft Copilot for Legal.</p>
      <ol className="mt-5 space-y-0">
        {CHAIN_EXAMPLE.map((c, i) => (
          <li key={c.step} className="grid grid-cols-[6.5rem_1.5rem_1fr] items-stretch gap-3 sm:grid-cols-[7rem_1.5rem_11rem_1fr]">
            <span className={`self-center justify-self-start rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${TAG_STYLE[c.stage]} ${i > 0 && CHAIN_EXAMPLE[i - 1].stage === c.stage ? 'invisible' : ''}`}>{c.stage}</span>
            <span className="relative flex justify-center" aria-hidden>
              <span className={`absolute w-px bg-brand-200 ${i === 0 ? 'top-1/2 bottom-0' : i === CHAIN_EXAMPLE.length - 1 ? 'top-0 bottom-1/2' : 'inset-y-0'}`} />
              <span className={`relative z-10 mt-[0.9rem] h-3 w-3 rounded-full ring-4 ring-white ${c.stage === 'Decide' ? 'bg-brand-800' : 'bg-brand-500'}`} />
            </span>
            <span className="hidden py-2 text-sm font-semibold text-slate-800 sm:block">{c.step}</span>
            <span className="py-2 text-sm text-slate-600"><span className="font-semibold text-slate-800 sm:hidden">{c.step}: </span>{c.text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function RunOfShow() {
  const { records } = useEvidence()
  const total = DEMO_STOPS.reduce((s, x) => s + x.minutes, 0)
  const core = DEMO_STOPS.filter((s) => !s.optional).reduce((s, x) => s + x.minutes, 0)
  return (
    <section id="run-of-show">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900">How to run this demo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Each screen follows a section of the deck. About {core} minutes for the core path, {total} with the optional stops.
          </p>
        </div>
        <button
          onClick={resetEvidence}
          disabled={records.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" /> Reset evidence ({records.length})
        </button>
      </div>
      <ol className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {DEMO_STOPS.map((s, i) => (
          <li key={s.to} className="grid items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[2.5rem_9.5rem_1fr_7rem_auto]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-800 text-sm font-semibold text-white">{i + 1}</span>
            <span className={`justify-self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${PHASE_CHIP[s.phase]}`}>{s.phase}</span>
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {s.label}{s.optional && <span className="ml-2 text-xs font-normal text-slate-400">optional</span>}
              </div>
              <p className="text-sm text-slate-500">{s.purpose}</p>
            </div>
            <div className="text-xs text-slate-500">
              <div>{slidesLabel(s)}</div>
              {s.minutes > 0 && <div className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> ~{s.minutes} min</div>}
            </div>
            <Link to={s.to} className="inline-flex items-center gap-1 justify-self-start rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 md:justify-self-end">
              Open <ArrowRight className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ol>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { icon: MonitorPlay, title: 'Presenter notes', text: 'Turn on Presenter notes in the header for what to show and say on each screen. Your choice is remembered on this device.' },
          { icon: Lightbulb, title: 'Evidence carries forward', text: 'Each scenario you run in Demo 1 and Demo 2 adds a record to the evidence pack. The decision page unlocks once R1 and R3 have evidence.' },
          { icon: Play, title: 'Live tenant or simulator', text: 'With a live tenant, show Entra ID and Purview there and use these screens as the map. Without one, the simulators run the same scenarios.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
            <div>
              <div className="text-sm font-semibold text-slate-800">{title}</div>
              <p className="mt-0.5 text-sm text-slate-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function LegalGuide() {
  return (
    <LegalLayout>
      <div className="space-y-10">
        <Hero />
        <TheQuestion />
        <Lifecycle />
        <ChainExample />
        <RunOfShow />
      </div>
    </LegalLayout>
  )
}
