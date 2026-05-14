import { BarChart3, TrendingUp, Calculator, Shield, Zap, FileText, ArrowRight, Sparkles, Check } from "lucide-react";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

const features = [
  { icon: BarChart3, title: "Quick Deal Analyzer", desc: "Evaluate properties in seconds with ROI, Cap Rate, Cash Flow, and a 0–100 score.", page: "deal" },
  { icon: TrendingUp, title: "Multi-Year ROI", desc: "Forecast long-term returns with appreciation, equity growth, and tax projections.", page: "roi" },
  { icon: Calculator, title: "Break-Even Calculator", desc: "Find the minimum rent needed to cover mortgage, taxes, vacancy and management.", page: "deal" },
  { icon: Shield, title: "Monte Carlo Simulator", desc: "Stress-test deals across thousands of randomized rent, expense and appreciation paths.", page: "advanced" },
  { icon: Zap, title: "Live ZIP Insights", desc: "Pull real demographics, rents, schools, comps and Street View for any address.", page: "zip" },
  { icon: FileText, title: "Side-by-Side Compare", desc: "Stack multiple properties to instantly see which delivers the strongest return.", page: "comparison" },
];

const competitors = [
  { feature: "Live ZIP / area research", rentintel: true, bp: false, stessa: false, dealcheck: false },
  { feature: "Monte Carlo simulator", rentintel: true, bp: false, stessa: false, dealcheck: false },
  { feature: "0–100 deal score", rentintel: true, bp: false, stessa: false, dealcheck: false },
  { feature: "Multi-year ROI + tax", rentintel: true, bp: true, stessa: true, dealcheck: true },
  { feature: "Break-even calculator", rentintel: true, bp: false, stessa: false, dealcheck: false },
  { feature: "Property comparison", rentintel: true, bp: false, stessa: false, dealcheck: true },
  { feature: "Rent-max strategy", rentintel: true, bp: false, stessa: false, dealcheck: false },
  { feature: "No signup, no paywall", rentintel: true, bp: false, stessa: false, dealcheck: false },
];

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative text-center pt-8 pb-12 space-y-7">
        <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(60rem_30rem_at_50%_0%,hsl(244_75%_45%/0.25),transparent_70%)]" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary/90 backdrop-blur">
          <Sparkles className="w-3.5 h-3.5" />
          Institutional-grade analytics, free for every investor
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight font-display leading-[1.05]">
          Underwrite rentals
          <br />
          <span className="gradient-text">like a pro.</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Live area data, ROI projections, Monte Carlo stress tests, tax breakdowns and rent-maximizing
          strategy — all in one sleek dashboard. No signup. No spreadsheet wrangling.
        </p>

        <div className="flex gap-3 justify-center flex-wrap pt-2">
          <button onClick={() => onNavigate("deal")} className="btn-primary">
            Analyze a Deal <ArrowRight size={16} />
          </button>
          <button onClick={() => onNavigate("zip")} className="btn-ghost">
            Try ZIP Lookup
          </button>
        </div>

        <div className="flex justify-center gap-6 text-xs text-muted-foreground pt-4">
          {["100% private", "Live web research", "No signup"].map((b) => (
            <span key={b} className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> {b}</span>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-3xl font-bold font-display">Core toolkit</h2>
          <p className="text-sm text-muted-foreground hidden md:block">Tap any card to jump in</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.title}
                onClick={() => onNavigate(f.page)}
                className="metric-card text-left group"
              >
                <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground mb-4 shadow-elegant group-hover:scale-105 transition-transform">
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="panel">
        <h2 className="text-2xl font-bold mb-6 font-display">What investors are saying</h2>
        <div className="grid md:grid-cols-2 gap-5">
          <blockquote className="rounded-xl p-5 border border-border/60 bg-secondary/30">
            <p className="text-sm text-foreground italic mb-3 leading-relaxed">
              "RentIntel changed how I underwrite — the deal score and Monte Carlo make decisions feel
              objective instead of gut-driven."
            </p>
            <footer className="text-xs text-muted-foreground">— Sarah J., Real Estate Investor</footer>
          </blockquote>
          <blockquote className="rounded-xl p-5 border border-border/60 bg-secondary/30">
            <p className="text-sm text-foreground italic mb-3 leading-relaxed">
              "The break-even calculator instantly showed me how much rent I needed to make a property
              cash-flow even in a softer market."
            </p>
            <footer className="text-xs text-muted-foreground">— Tom L., Property Manager</footer>
          </blockquote>
        </div>
      </section>

      {/* Competitor Comparison */}
      <section>
        <h2 className="text-3xl font-bold mb-6 font-display">How we stack up</h2>
        <div className="overflow-x-auto rounded-2xl border border-border/70 glass">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70">
                <th className="text-left px-5 py-4 text-muted-foreground font-medium">Feature</th>
                <th className="px-4 py-4 text-primary font-bold">RentIntel</th>
                <th className="px-4 py-4 text-muted-foreground font-medium">BiggerPockets</th>
                <th className="px-4 py-4 text-muted-foreground font-medium">Stessa</th>
                <th className="px-4 py-4 text-muted-foreground font-medium">DealCheck</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c) => (
                <tr key={c.feature} className="border-t border-border/40 hover:bg-primary/5 transition-colors">
                  <td className="px-5 py-3.5 text-foreground">{c.feature}</td>
                  <td className="px-4 py-3.5 text-center">{c.rentintel ? <Check className="w-4 h-4 text-primary inline" /> : <span className="text-muted-foreground/50">—</span>}</td>
                  <td className="px-4 py-3.5 text-center">{c.bp ? <Check className="w-4 h-4 text-success inline" /> : <span className="text-muted-foreground/50">—</span>}</td>
                  <td className="px-4 py-3.5 text-center">{c.stessa ? <Check className="w-4 h-4 text-success inline" /> : <span className="text-muted-foreground/50">—</span>}</td>
                  <td className="px-4 py-3.5 text-center">{c.dealcheck ? <Check className="w-4 h-4 text-success inline" /> : <span className="text-muted-foreground/50">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
