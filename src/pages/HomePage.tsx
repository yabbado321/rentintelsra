import { BarChart3, TrendingUp, Calculator, Shield, Zap, FileText, ArrowRight } from "lucide-react";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

const features = [
  { icon: <BarChart3 size={24} />, title: "Quick Deal Analyzer", desc: "Evaluate properties in seconds with ROI, Cap Rate, Cash Flow, and auto-scoring.", page: "deal" },
  { icon: <TrendingUp size={24} />, title: "Multi-Year ROI", desc: "Forecast long-term returns with appreciation, equity growth, and tax projections.", page: "roi" },
  { icon: <Calculator size={24} />, title: "Break-Even Calculator", desc: "Find the minimum rent needed to cover all costs.", page: "deal" },
  { icon: <Shield size={24} />, title: "Monte Carlo Simulator", desc: "Stress-test deals across thousands of randomized scenarios.", page: "advanced" },
  { icon: <Zap size={24} />, title: "Sensitivity Analysis", desc: "See how ROI shifts as rent and expenses change ±20%.", page: "advanced" },
  { icon: <FileText size={24} />, title: "Export & Reports", desc: "Download CSV/PDF reports for lenders and partners.", page: "deal" },
];

const competitors = [
  { feature: "Quick Deal Analyzer", rentintel: true, bp: true, stessa: false, dealcheck: true },
  { feature: "Monte Carlo Simulator", rentintel: true, bp: false, stessa: false, dealcheck: false },
  { feature: "Score System (0–100)", rentintel: true, bp: false, stessa: false, dealcheck: false },
  { feature: "Multi-Year ROI + Tax", rentintel: true, bp: true, stessa: true, dealcheck: true },
  { feature: "Break-Even Calculator", rentintel: true, bp: false, stessa: false, dealcheck: false },
  { feature: "Property Comparison", rentintel: true, bp: false, stessa: false, dealcheck: true },
  { feature: "Sensitivity Analysis", rentintel: true, bp: false, stessa: false, dealcheck: false },
  { feature: "Rehab & Refi Tools", rentintel: true, bp: false, stessa: true, dealcheck: false },
];

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-12 space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="gradient-text">Smart Rental</span>{" "}
          <span className="text-foreground">Analysis</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Analyze rental deals with institutional-grade tools. ROI projections, Monte Carlo simulations,
          tax insights, and more — all in one place.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => onNavigate("deal")}
            className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-all glow-primary flex items-center gap-2"
          >
            Analyze a Deal <ArrowRight size={16} />
          </button>
          <button
            onClick={() => onNavigate("zip")}
            className="px-6 py-3 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-all flex items-center gap-2"
          >
            ZIP Rent Lookup
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section>
        <h2 className="text-2xl font-bold mb-6">🔑 Core Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <button
              key={f.title}
              onClick={() => onNavigate(f.page)}
              className="metric-card text-left group hover:border-primary/40 transition-all"
            >
              <div className="text-primary mb-3">{f.icon}</div>
              <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-card rounded-xl p-8 border border-border">
        <h2 className="text-2xl font-bold mb-6">💬 What Users Are Saying</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <blockquote className="bg-secondary/50 rounded-lg p-5 border border-border">
            <p className="text-sm text-foreground italic mb-3">
              "RentIntel has completely transformed how I analyze properties. The projections and ROI tools make it easy to make confident decisions."
            </p>
            <footer className="text-xs text-muted-foreground">— Sarah J., Real Estate Investor</footer>
          </blockquote>
          <blockquote className="bg-secondary/50 rounded-lg p-5 border border-border">
            <p className="text-sm text-foreground italic mb-3">
              "The Break-Even Calculator helped me understand how much I need to rent my properties for, even in a down market."
            </p>
            <footer className="text-xs text-muted-foreground">— Tom L., Property Manager</footer>
          </blockquote>
        </div>
      </section>

      {/* Competitor Comparison */}
      <section>
        <h2 className="text-2xl font-bold mb-6">🆚 How We Stack Up</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/80">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Feature</th>
                <th className="px-4 py-3 text-primary font-bold">RentIntel</th>
                <th className="px-4 py-3 text-muted-foreground font-medium">BiggerPockets</th>
                <th className="px-4 py-3 text-muted-foreground font-medium">Stessa</th>
                <th className="px-4 py-3 text-muted-foreground font-medium">DealCheck</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c) => (
                <tr key={c.feature} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 text-foreground">{c.feature}</td>
                  <td className="px-4 py-3 text-center">{c.rentintel ? "✅" : "❌"}</td>
                  <td className="px-4 py-3 text-center">{c.bp ? "✅" : "❌"}</td>
                  <td className="px-4 py-3 text-center">{c.stessa ? "✅" : "❌"}</td>
                  <td className="px-4 py-3 text-center">{c.dealcheck ? "✅" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
