import {
  ArrowRight, Sparkles, Check, TrendingUp, Wrench, MessageSquare, BarChart3, Bot, Calendar,
  Zap, Shield, DollarSign, Clock, Building2, Star, ArrowUpRight, Activity, Bell, Search,
  Home as HomeIcon, ChevronRight, CircleDot, AlertTriangle, Users, Database, CreditCard,
  Briefcase, Plug, Cpu, LineChart, TrendingDown, X, Layers
} from "lucide-react";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

const capabilities = [
  { value: "6+", label: "Workflows in one platform", sub: "pricing, maintenance, comms, analytics" },
  { value: "120+", label: "Maintenance issue types", sub: "auto-classified by severity" },
  { value: "30+", label: "Languages supported", sub: "for tenant communications" },
  { value: "<1 min", label: "Time to explore any tool", sub: "no signup required" },
];

const modules = [
  { icon: TrendingUp, title: "AI Rent Pricing", desc: "Pull live comps for every unit and apply optimized rent in one click. Fully working." , page: "pricing", tag: "Revenue", live: true },
  { icon: Wrench, title: "Maintenance Autopilot", desc: "Submit any tenant request — AI triages priority, vendor, SLA, and self-fix steps.", page: "maintenance", tag: "Operations", live: true },
  { icon: MessageSquare, title: "Tenant Comms Hub", desc: "Paste a tenant message — get an on-brand, lease-aware reply with sentiment + churn risk.", page: "comms", tag: "Retention", live: true },
  { icon: BarChart3, title: "Portfolio Dashboard", desc: "Live KPIs across every unit you've added — occupancy, revenue, NOI, AI activity feed.", page: "dashboard", tag: "Insight", live: true },
  { icon: Bot, title: "Deal Analyzer", desc: "Underwrite an acquisition with cap rate, DSCR, ROI, and our deal score.", page: "deal", tag: "Acquisition" },
  { icon: Calendar, title: "ZIP Market Lookup", desc: "Pull live rent estimates, demographics, schools, and rental demand for any US ZIP.", page: "zip", tag: "Research" },
];


export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="space-y-28">
      {/* ─────────── HERO ─────────── */}
      <section className="relative pt-6 pb-4">
        <div className="absolute inset-x-0 -top-10 -z-10 h-[42rem] bg-[radial-gradient(70rem_36rem_at_50%_0%,hsl(244_75%_45%/0.28),transparent_70%)]" />
        <div className="absolute inset-x-0 top-32 -z-10 h-96 bg-[radial-gradient(40rem_20rem_at_80%_30%,hsl(262_83%_55%/0.18),transparent_70%)]" />

        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary/90 backdrop-blur">
              <Sparkles className="w-3.5 h-3.5" />
              The AI operating system for modern property managers
            </div>

            <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold tracking-tight font-display leading-[1.02]">
              The AI operating system
              <br />
              <span className="gradient-text">for modern real estate.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              One platform to price every unit, triage every ticket, and answer every tenant —
              designed for operators of any portfolio size. Replace a stack of disconnected tools
              with a single AI-native workspace.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button onClick={() => onNavigate("dashboard")} className="btn-primary">
                Open Dashboard <ArrowRight size={16} />
              </button>
              <button onClick={() => onNavigate("pricing")} className="btn-ghost">
                <TrendingUp size={14} /> Try AI Pricing
              </button>
              <button onClick={() => onNavigate("maintenance")} className="btn-ghost">
                <Wrench size={14} /> Triage a Ticket
              </button>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground pt-3">
              {["No signup required", "Free to explore", "Every tool is live"].map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-primary" /> {b}
                </span>
              ))}
            </div>
          </div>

          {/* Hero product mockup */}
          <div className="lg:col-span-6">
            <DashboardMock />
          </div>
        </div>
      </section>

      {/* ─────────── CAPABILITIES ─────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {capabilities.map((s) => (
          <div key={s.label} className="metric-card">
            <div className="text-3xl md:text-4xl font-bold font-display gradient-text mb-1">{s.value}</div>
            <div className="text-sm font-medium text-foreground">{s.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
          </div>
        ))}
      </section>


      {/* ─────────── MODULES ─────────── */}
      <section>
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">The Platform</p>
          <h2 className="text-4xl md:text-5xl font-bold font-display mb-4">One system to run every door.</h2>
          <p className="text-muted-foreground">From the first inquiry to the renewal signature — every workflow, automated and measured.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.title} onClick={() => onNavigate(m.page)} className="metric-card text-left group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-elegant group-hover:scale-105 transition-transform">
                    <Icon size={20} />
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${m.live ? "border-success/40 text-success bg-success/10" : "border-border/70 text-muted-foreground"}`}>{m.live ? "Live tool" : m.tag}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">{m.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                <div className="flex items-center gap-1 text-xs text-primary mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ArrowUpRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─────────── PRODUCT SECTION 1: Maintenance ─────────── */}
      <section className="grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">Maintenance Autopilot</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">Tickets that triage themselves.</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Every request — from a leaky faucet text to a 2 a.m. emergency call — is classified, prioritized, dispatched
            to the right vendor, and tracked to completion. Your team stops being the help desk.
          </p>
          <ul className="space-y-3">
            {[
              "AI severity scoring across 120+ issue types",
              "Auto-dispatch to your preferred vendor network",
              "SLA tracking with escalation playbooks",
              "Tenant updates sent automatically at every stage",
            ].map((b) => (
              <li key={b} className="flex gap-2.5 text-sm text-foreground/90">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <MaintenanceMock />
      </section>

      {/* ─────────── PRODUCT SECTION 2: Tenant Comms ─────────── */}
      <section className="grid lg:grid-cols-2 gap-10 items-center">
        <div className="lg:order-2">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">Tenant Communication</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">Reply in seconds, not days.</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            One inbox across SMS, email, voice transcripts, and the tenant portal — with an AI assistant that drafts
            on-brand replies grounded in each lease, ledger, and prior thread.
          </p>
          <ul className="space-y-3">
            {[
              "Lease-aware AI replies (rent, fees, policies)",
              "Sentiment + churn risk scoring per tenant",
              "Auto-translation across 30+ languages",
              "Tone & policy guardrails baked in",
            ].map((b) => (
              <li key={b} className="flex gap-2.5 text-sm text-foreground/90">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <CommsMock />
      </section>

      {/* ─────────── PRODUCT SECTION 3: AI Pricing ─────────── */}
      <section className="grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">AI Rent Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">Stop leaving rent on the table.</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Live comps, demand signals, seasonal trends, and unit-level amenities flow into a daily price recommendation
            for every door — with a one-click apply across your listings.
          </p>
          <ul className="space-y-3">
            {[
              "Daily price refresh per unit",
              "Confidence interval + revenue at stake",
              "Auto-sync to Zillow, Apartments.com, Rently",
              "Audit trail for every price change",
            ].map((b) => (
              <li key={b} className="flex gap-2.5 text-sm text-foreground/90">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {b}
              </li>
            ))}
          </ul>
          <button onClick={() => onNavigate("pricing")} className="btn-primary mt-6">
            Try AI Pricing <ArrowRight size={14} />
          </button>
        </div>
        <PricingMock />
      </section>

      {/* ─────────── PRODUCT SECTION 4: Leasing Pipeline + Vacancy Forecast ─────────── */}
      <section className="grid lg:grid-cols-2 gap-10 items-center">
        <div className="lg:order-2">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">Leasing & Vacancy Intelligence</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">Know your vacancies 60 days before they happen.</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Renewal probability, lead velocity, and turn timing modeled per unit — so leasing teams
            stop reacting to move-outs and start filling them before the keys come back.
          </p>
          <ul className="space-y-3">
            {[
              "60-day vacancy forecast with confidence bands",
              "Auto-prioritized renewal outreach by churn risk",
              "Leasing pipeline from inquiry → signed lease",
              "Days-to-lease prediction per listing",
            ].map((b) => (
              <li key={b} className="flex gap-2.5 text-sm text-foreground/90">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <LeasingMock />
      </section>

      {/* ─────────── PRODUCT SECTION 5: Predictive Maintenance ─────────── */}
      <section className="grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">Predictive Maintenance Alerts</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">Catch failures weeks before they cost you.</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            RentIntel watches ticket history, vendor invoices, and unit metadata to flag systems
            heading for failure — HVAC, water heaters, roofs, appliances — so you replace on
            <i> your </i> schedule, not at 2 a.m.
          </p>
          <ul className="space-y-3">
            {[
              "Lifecycle risk scoring per unit system",
              "CapEx planner with cost vs. replace forecasts",
              "Vendor performance scoring on cost + SLA",
              "Warranty + parts tracking baked in",
            ].map((b) => (
              <li key={b} className="flex gap-2.5 text-sm text-foreground/90">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <PredictiveMock />
      </section>

      {/* ─────────── FRAGMENTED vs UNIFIED ─────────── */}
      <section>
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">The Shift</p>
          <h2 className="text-4xl md:text-5xl font-bold font-display mb-4">Stop running your portfolio on 6 tabs.</h2>
          <p className="text-muted-foreground">Legacy property management is reactive, fragmented, and built for the 2010s. RentIntel replaces the stack.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="panel border-destructive/30">
            <div className="flex items-center gap-2 mb-4">
              <X className="w-4 h-4 text-destructive" />
              <h3 className="font-display font-semibold text-foreground/90">The legacy stack</h3>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "AppFolio for ledger · Buildium for tickets · Zillow for pricing",
                "Tenant texts lost across 3 inboxes and 2 phone numbers",
                "Rent set once a year — leaking 8-12% in missed market gains",
                "Maintenance triaged by whoever picks up first",
                "NOI reported monthly, in a spreadsheet, two weeks late",
              ].map((b) => (
                <li key={b} className="flex gap-2.5"><X className="w-3.5 h-3.5 text-destructive/80 mt-0.5 shrink-0" />{b}</li>
              ))}
            </ul>
          </div>
          <div className="panel border-primary/40">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold gradient-text">RentIntel · one OS</h3>
            </div>
            <ul className="space-y-3 text-sm text-foreground/90">
              {[
                "Pricing, leasing, maintenance, comms, NOI — one workspace",
                "Every tenant message routed, scored, drafted in seconds",
                "Daily AI rent refresh per door with audit trail",
                "AI severity scoring + auto-dispatch to your vendor network",
                "Live portfolio dashboard. Drill into any door in two clicks.",
              ].map((b) => (
                <li key={b} className="flex gap-2.5"><Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─────────── WHY NOW ─────────── */}
      <section className="panel relative overflow-hidden">
        <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">Why Now</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-6 max-w-3xl">Real estate operations are at an inflection point.</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Users, title: "Labor shortage", body: "Property management headcount is down 14% since 2022. Portfolios still need to be run." },
              { icon: Cpu, title: "AI is finally ready", body: "Frontier models can read leases, classify tickets, and draft replies at human quality — for cents." },
              { icon: LineChart, title: "Operators are consolidating", body: "Mid-market PMCs are buying portfolios faster than they can hire. Software has to scale them." },
            ].map((c) => { const I = c.icon; return (
              <div key={c.title} className="rounded-xl bg-secondary/30 border border-border/60 p-5">
                <I className="w-5 h-5 text-primary mb-3" />
                <div className="font-semibold mb-1.5">{c.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
              </div>
            ); })}
          </div>
        </div>
      </section>

      {/* ─────────── INTEGRATIONS ECOSYSTEM ─────────── */}
      <section>
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">Ecosystem</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">Plugs into the systems you already run.</h2>
          <p className="text-muted-foreground">Two-way sync with your accounting, leasing, payments, and vendor stack — no rip-and-replace required.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { icon: DollarSign, name: "QuickBooks" },
            { icon: Database, name: "AppFolio" },
            { icon: Briefcase, name: "Yardi" },
            { icon: CreditCard, name: "Stripe" },
            { icon: Building2, name: "Zillow" },
            { icon: HomeIcon, name: "Apartments.com" },
            { icon: Plug, name: "Rently" },
            { icon: MessageSquare, name: "Twilio" },
            { icon: Layers, name: "HubSpot" },
            { icon: Wrench, name: "ServiceFusion" },
            { icon: Shield, name: "Plaid" },
            { icon: Bot, name: "Zapier" },
          ].map((i) => { const I = i.icon; return (
            <div key={i.name} className="metric-card flex items-center gap-3">
              <I className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">{i.name}</span>
            </div>
          ); })}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">Open API + webhooks · SOC 2 Type II in progress · SSO/SAML on Enterprise</p>
      </section>


      <section className="panel relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">Case Study · Northbridge Residential</p>
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4 leading-tight">
              From 86% to 96% occupancy in one quarter — without hiring.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-5">
              Northbridge replaced three legacy tools with RentIntel across their 1,800-door Midwest portfolio. AI pricing
              found $612k of annualized rent leakage in week one. Maintenance autopilot collapsed their backlog from 240
              open tickets to under 30 in 21 days.
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Stat label="Occupancy" value="86% → 96%" />
              <Stat label="NOI lift" value="+$1.4M / yr" />
              <Stat label="Backlog" value="−87%" />
              <Stat label="Payback" value="34 days" />
            </div>
          </div>
          <div className="hidden md:block">
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-6">
              <Star className="w-5 h-5 text-warning mb-3 fill-warning" />
              <p className="text-sm italic text-foreground/90 leading-relaxed mb-4">
                "It's the first piece of software our regional managers have actually thanked us for."
              </p>
              <div className="text-xs">
                <div className="font-semibold">Marcus Reilly</div>
                <div className="text-muted-foreground">COO, Northbridge Residential</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── TESTIMONIALS ─────────── */}
      <section>
        <h2 className="text-3xl md:text-4xl font-bold font-display text-center mb-10">Operators who run on RentIntel.</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <blockquote key={t.name} className="metric-card flex flex-col">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-warning fill-warning" />
                ))}
              </div>
              <p className="text-sm text-foreground/90 italic leading-relaxed flex-1">"{t.quote}"</p>
              <footer className="mt-4 text-xs">
                <div className="font-semibold">{t.name}</div>
                <div className="text-muted-foreground">{t.role}</div>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* ─────────── COMPARE ─────────── */}
      <section>
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">Why RentIntel</p>
          <h2 className="text-3xl md:text-4xl font-bold font-display">Built for operators, not for spreadsheets.</h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border/70 glass">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70">
                <th className="text-left px-5 py-4 text-muted-foreground font-medium">Capability</th>
                <th className="px-4 py-4 text-primary font-bold">RentIntel</th>
                <th className="px-4 py-4 text-muted-foreground font-medium">AppFolio</th>
                <th className="px-4 py-4 text-muted-foreground font-medium">Buildium</th>
                <th className="px-4 py-4 text-muted-foreground font-medium">Spreadsheets</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Daily AI rent pricing per unit", true, false, false, false],
                ["Auto-triage maintenance tickets", true, false, false, false],
                ["AI tenant communication assistant", true, false, false, false],
                ["Live portfolio NOI dashboard", true, true, true, false],
                ["Renewal & churn forecasting", true, false, false, false],
                ["Onboarding in <48 hours", true, false, false, true],
                ["Live in <48 hours, no implementation fee", true, false, false, true],
              ].map((row, i) => (
                <tr key={i} className="border-t border-border/40 hover:bg-primary/5 transition-colors">
                  <td className="px-5 py-3.5 text-foreground">{row[0] as string}</td>
                  {row.slice(1).map((v, j) => (
                    <td key={j} className="px-4 py-3.5 text-center">
                      {v ? <Check className={`w-4 h-4 inline ${j === 0 ? "text-primary" : "text-success"}`} /> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─────────── FINAL CTA ─────────── */}
      <section className="panel text-center relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(40rem_20rem_at_50%_0%,hsl(244_75%_45%/0.25),transparent_70%)]" />
        <Sparkles className="w-8 h-8 text-primary mx-auto mb-4" />
        <h2 className="text-4xl md:text-5xl font-bold font-display mb-4">See your portfolio on RentIntel.</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-7">
          Live demo runs against real market data. No signup, no implementation cycle — explore every workflow in under a minute.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => onNavigate("dashboard")} className="btn-primary">
            Open Dashboard <ArrowRight size={16} />
          </button>
          <button onClick={() => onNavigate("pricing")} className="btn-ghost">Try AI Pricing</button>
          <button onClick={() => onNavigate("maintenance")} className="btn-ghost">Triage a Ticket</button>
          <button onClick={() => onNavigate("comms")} className="btn-ghost">Draft a Reply</button>
          <a href="mailto:smart-rental-analyzer@outlook.com" className="btn-ghost">Talk to Sales</a>
        </div>
      </section>
    </div>
  );
}

/* ─────────────── Inline Stat ─────────────── */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-bold font-display gradient-text">{value}</div>
    </div>
  );
}

/* ─────────────── Hero Dashboard Mock ─────────────── */
function DashboardMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-accent/10 to-transparent rounded-[2rem] blur-2xl -z-10" />
      <div className="rounded-2xl border border-border/70 glass-strong p-4 shadow-elegant">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
            </div>
            <span className="text-[11px] text-muted-foreground ml-2 font-mono">app.rentintel.io / portfolio</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Search className="w-3.5 h-3.5" />
            <Bell className="w-3.5 h-3.5" />
            <div className="w-6 h-6 rounded-full gradient-primary" />
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { l: "Occupancy", v: "96.2%", d: "+2.1%" },
            { l: "Monthly NOI", v: "$487k", d: "+11%" },
            { l: "Open Tickets", v: "23", d: "−87%" },
          ].map((k) => (
            <div key={k.l} className="rounded-lg bg-secondary/40 border border-border/60 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
              <div className="font-mono text-base font-bold mt-0.5">{k.v}</div>
              <div className="text-[10px] text-success font-mono">{k.d}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-lg bg-secondary/30 border border-border/60 p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium">Portfolio NOI · Last 12 mo</span>
            <span className="text-[10px] text-success font-mono">+18.4%</span>
          </div>
          <svg viewBox="0 0 320 80" className="w-full h-20">
            <defs>
              <linearGradient id="hg" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(244 75% 60%)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="hsl(244 75% 60%)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,60 L30,55 L60,58 L90,48 L120,50 L150,40 L180,42 L210,32 L240,28 L270,22 L300,18 L320,14 L320,80 L0,80 Z" fill="url(#hg)" />
            <path d="M0,60 L30,55 L60,58 L90,48 L120,50 L150,40 L180,42 L210,32 L240,28 L270,22 L300,18 L320,14" fill="none" stroke="hsl(244 75% 65%)" strokeWidth="2" />
          </svg>
        </div>

        {/* Activity feed */}
        <div className="space-y-1.5">
          {[
            { i: Bot, t: "AI raised rent on Unit 4B by $85/mo", c: "text-primary" },
            { i: Wrench, t: "Vendor dispatched · 1142 Oak St · HVAC", c: "text-warning" },
            { i: MessageSquare, t: "Tenant inquiry resolved by AI in 12s", c: "text-success" },
          ].map((a, i) => {
            const I = a.i;
            return (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 border border-border/40">
                <I className={`w-3.5 h-3.5 ${a.c}`} />
                <span className="text-xs text-foreground/85 flex-1">{a.t}</span>
                <span className="text-[10px] font-mono text-muted-foreground">now</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Maintenance Mock ─────────────── */
function MaintenanceMock() {
  const tickets = [
    { p: "P1", c: "destructive", title: "Water leak · Unit 12C", meta: "Ace Plumbing · ETA 38 min", status: "Dispatched" },
    { p: "P2", c: "warning", title: "HVAC not cooling · 1142 Oak", meta: "Cool Air Co · scheduled 2pm", status: "Scheduled" },
    { p: "P3", c: "info", title: "Garbage disposal jam · Unit 4A", meta: "AI sent self-fix video", status: "Tenant resolved" },
    { p: "P3", c: "success", title: "Bulb replacement · Hallway B", meta: "Closed by maintenance", status: "Closed" },
  ] as const;
  return (
    <div className="rounded-2xl border border-border/70 glass-strong p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Maintenance Queue</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">23 open · SLA 96%</span>
      </div>
      <div className="space-y-2">
        {tickets.map((t, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/40 transition-colors">
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-${t.c}/15 text-${t.c}`}>{t.p}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{t.title}</div>
              <div className="text-[11px] text-muted-foreground truncate">{t.meta}</div>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">{t.status}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Bot className="w-3.5 h-3.5 text-primary" /> AI auto-classified 18 of 23 tickets in the last 24h
      </div>
    </div>
  );
}

/* ─────────────── Comms Mock ─────────────── */
function CommsMock() {
  return (
    <div className="rounded-2xl border border-border/70 glass-strong p-5 shadow-elegant">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">Tenant Inbox · Maria L. (Unit 8B)</span>
        <span className="ml-auto text-[10px] font-mono text-success">● online</span>
      </div>
      <div className="space-y-2.5">
        <Bubble side="them">Hi! When is rent due this month and is the late fee still $75?</Bubble>
        <Bubble side="ai">
          Hi Maria — your rent of <b>$2,150</b> is due <b>Nov 1</b>. Late fee is <b>$75</b> after a 5-day grace period (per §4.2 of your lease). Want me to set a reminder?
          <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1"><Bot className="w-3 h-3" /> AI draft · approved by Jordan · 0.4s</div>
        </Bubble>
        <Bubble side="them">Yes please, and can I pay by ACH?</Bubble>
        <Bubble side="ai">All set ✓ Reminder scheduled for Oct 29. ACH is enabled on your portal — I just sent the link.</Bubble>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        <Pill label="Sentiment" value="Positive" tone="success" />
        <Pill label="Churn risk" value="Low" tone="success" />
        <Pill label="Renewal" value="Likely" tone="primary" />
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "them" | "ai"; children: React.ReactNode }) {
  const isAi = side === "ai";
  return (
    <div className={`flex ${isAi ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${isAi ? "gradient-primary text-primary-foreground" : "bg-secondary/60 border border-border/60 text-foreground"}`}>
        {children}
      </div>
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: string; tone: "success" | "primary" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary";
  return (
    <div className="rounded-lg bg-secondary/40 border border-border/50 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xs font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

/* ─────────────── Pricing Mock ─────────────── */
function PricingMock() {
  const units = [
    { u: "Unit 4B · 2bd/1ba", cur: 1850, sug: 1935, conf: 92 },
    { u: "Unit 12C · 1bd/1ba", cur: 1420, sug: 1480, conf: 88 },
    { u: "Unit 7A · 3bd/2ba", cur: 2650, sug: 2740, conf: 95 },
    { u: "Unit 2D · Studio", cur: 1100, sug: 1145, conf: 84 },
  ];
  const totalLift = units.reduce((s, u) => s + (u.sug - u.cur), 0) * 12;
  return (
    <div className="rounded-2xl border border-border/70 glass-strong p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">AI Price Recommendations</span>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Annualized lift</div>
          <div className="font-mono font-bold text-success text-sm">+${totalLift.toLocaleString()}</div>
        </div>
      </div>
      <div className="space-y-2">
        {units.map((u) => {
          const delta = u.sug - u.cur;
          return (
            <div key={u.u} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
              <HomeIcon className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{u.u}</div>
                <div className="text-[10px] text-muted-foreground font-mono">${u.cur} → <span className="text-success">${u.sug}</span> · +${delta}/mo</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-muted-foreground">Conf</div>
                <div className="text-xs font-mono font-bold">{u.conf}%</div>
              </div>
              <button className="text-[10px] font-medium px-2 py-1 rounded-md gradient-primary text-primary-foreground">Apply</button>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <CircleDot className="w-3 h-3 text-primary animate-pulse" /> Refreshed 12 minutes ago · 14 comps ingested
      </div>
    </div>
  );
}

/* ─────────────── Leasing Pipeline + Vacancy Forecast Mock ─────────────── */
function LeasingMock() {
  const pipeline = [
    { stage: "Inquiries", count: 142, tone: "text-info" },
    { stage: "Tours booked", count: 48, tone: "text-primary" },
    { stage: "Applications", count: 19, tone: "text-accent" },
    { stage: "Signed leases", count: 11, tone: "text-success" },
  ];
  const forecast = [
    { d: "Wk 1", v: 4 }, { d: "Wk 2", v: 6 }, { d: "Wk 3", v: 5 },
    { d: "Wk 4", v: 9 }, { d: "Wk 5", v: 7 }, { d: "Wk 6", v: 3 },
    { d: "Wk 7", v: 2 }, { d: "Wk 8", v: 4 },
  ];
  const max = Math.max(...forecast.map((f) => f.v));
  return (
    <div className="rounded-2xl border border-border/70 glass-strong p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Leasing Pipeline · Oct</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">23% conv · ↑ 4pts</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {pipeline.map((p) => (
          <div key={p.stage} className="rounded-lg bg-secondary/30 border border-border/50 p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{p.stage}</div>
            <div className={`font-mono text-lg font-bold mt-0.5 ${p.tone}`}>{p.count}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium">Vacancy forecast · next 60 days</span>
          <span className="text-[10px] text-warning font-mono">9 expected · wk 4</span>
        </div>
        <div className="flex items-end gap-1 h-20">
          {forecast.map((f, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t gradient-primary opacity-90" style={{ height: `${(f.v / max) * 100}%` }} />
              <span className="text-[9px] text-muted-foreground font-mono">{f.d}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Bot className="w-3.5 h-3.5 text-primary" /> 7 renewals flagged high-churn · outreach drafted
      </div>
    </div>
  );
}

/* ─────────────── Predictive Maintenance Mock ─────────────── */
function PredictiveMock() {
  const alerts = [
    { sys: "HVAC · Bldg A", risk: 87, eta: "~28 days", cost: "$1,400 vs $4,200 emergency", tone: "text-destructive" },
    { sys: "Water heater · Unit 7B", risk: 71, eta: "~45 days", cost: "$650 vs $1,900", tone: "text-warning" },
    { sys: "Roof · 1142 Oak", risk: 52, eta: "~6 months", cost: "Inspect Q1", tone: "text-info" },
  ];
  return (
    <div className="rounded-2xl border border-border/70 glass-strong p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <span className="font-semibold text-sm">Predictive Risk Alerts</span>
        </div>
        <span className="text-[10px] font-mono text-success">$11.4k saved YTD</span>
      </div>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.sys} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{a.sys}</span>
              <span className={`text-[10px] font-mono font-bold ${a.tone}`}>{a.risk} risk</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden mb-2">
              <div className={`h-full rounded-full ${a.risk > 80 ? "bg-destructive" : a.risk > 60 ? "bg-warning" : "bg-info"}`} style={{ width: `${a.risk}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Est. failure {a.eta}</span><span>{a.cost}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <TrendingDown className="w-3.5 h-3.5 text-success" /> Emergency callouts down 42% since rollout
      </div>
    </div>
  );
}
