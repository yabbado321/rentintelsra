import { useState } from "react";
import { runMonteCarlo, formatPercent, formatCurrency, calculateMortgage } from "@/lib/calculations";
import MetricCard from "@/components/MetricCard";
import SummaryBar from "@/components/SummaryBar";
import ModeToggle, { type Mode } from "@/components/ModeToggle";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from "recharts";
import { Activity, GitBranch, Play, Loader2, Info } from "lucide-react";
import { useSharedField } from "@/lib/propertyStore";

const TOOLTIP_STYLE = {
  background: "hsl(235 50% 11%)",
  border: "1px solid hsl(244 75% 60% / 0.4)",
  borderRadius: 12,
  fontSize: 12,
};

export default function AdvancedToolsPage() {
  const [tool, setTool] = useState<"monte" | "scenario">("monte");

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-4xl font-bold font-display">Advanced Tools</h1>
        <p className="text-muted-foreground mt-2">Monte Carlo stress tests and three-scenario modeling for serious underwriting.</p>
      </header>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTool("monte")} className={`tab-pill ${tool === "monte" ? "tab-pill-active" : "tab-pill-inactive"}`}>
          <Activity className="w-4 h-4" /> Monte Carlo
        </button>
        <button onClick={() => setTool("scenario")} className={`tab-pill ${tool === "scenario" ? "tab-pill-active" : "tab-pill-inactive"}`}>
          <GitBranch className="w-4 h-4" /> Scenario Modeling
        </button>
      </div>

      {tool === "monte" && <MonteCarloTab />}
      {tool === "scenario" && <ScenarioTab />}
    </div>
  );
}

function MonteCarloTab() {
  const [mode, setMode] = useState<Mode>("simple");
  const [price, setPrice] = useSharedField("purchasePrice");
  const [rent, setRent] = useSharedField("grossRent");
  const [downPct, setDownPct] = useSharedField("downPayment");
  const [otherOpEx, setOtherOpEx] = useState(300);
  const [annualTaxes, setAnnualTaxes] = useState(3600);
  const [annualInsurance, setAnnualInsurance] = useState(1500);
  const [rate, setRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [closingPct, setClosingPct] = useState(3);
  const [rehab, setRehab] = useState(0);
  const [years, setYears] = useState(5);
  const [profile, setProfile] = useState<RiskProfile>("balanced");
  const [iterations, setIterations] = useState<number>(5000);
  const [locked, setLocked] = useState(true);

  const [results, setResults] = useState<MonteCarloResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    // Defer a frame so the spinner paints before the (synchronous) simulation.
    setTimeout(() => {
      const sim = runSimulation({
        purchasePrice: price,
        monthlyRent: rent,
        monthlyOtherOpEx: otherOpEx,
        annualTaxes,
        annualInsurance,
        downPaymentPct: downPct,
        interestRate: rate,
        loanTermYears: loanTerm,
        holdYears: years,
        closingCostPct: closingPct,
        rehabBudget: rehab,
        iterations,
        profile,
        seed: locked ? 20260214 : undefined,
      });
      setResults(sim);
      setRunning(false);
    }, 30);
  };

  const a = PROFILES[profile];

  return (
    <div className="space-y-6">
      <ModeToggle mode={mode} onChange={setMode} hint="Simple mode runs a calibrated risk profile. Advanced exposes expense detail, hold structure, iteration count and seed locking." />
      <div className="panel space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-2">Risk Profile</p>
          <div className="flex gap-2 flex-wrap">
            {(["conservative", "balanced", "aggressive"] as const).map((p) => (
              <button key={p} onClick={() => setProfile(p)} className={`tab-pill capitalize ${profile === p ? "tab-pill-active" : "tab-pill-inactive"}`}>
                {p === "conservative" ? "📉" : p === "balanced" ? "📊" : "🚀"} {p}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-mono">
            Appreciation {a.apprMean}% ±{a.apprSd} · Rent growth {a.rentGrowthMean}% ±{a.rentGrowthSd} ·
            Vacancy {a.vacancyMin}–{a.vacancyMax}% (mode {a.vacancyMode}%) · Maint. median {a.maintMedianPct}% of rent ·
            CapEx event {(a.capexProb * 100).toFixed(0)}%/yr
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Num id="mc-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <Num id="mc-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={25} />
          <Num id="mc-exp" label="Other Monthly OpEx ($)" value={otherOpEx} onChange={setOtherOpEx} step={25} />
          <Num id="mc-rate" label="Interest Rate (%)" value={rate} onChange={setRate} step={0.1} />
          <div>
            <label htmlFor="mc-dp" className="text-xs font-medium text-muted-foreground block mb-1.5">Down Payment: <span className="text-primary font-mono">{downPct}%</span></label>
            <input id="mc-dp" type="range" min={0} max={100} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <label htmlFor="mc-yr" className="text-xs font-medium text-muted-foreground block mb-1.5">Hold: <span className="text-primary font-mono">{years} yrs</span></label>
            <input id="mc-yr" type="range" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>

        {mode === "advanced" && (
          <div className="space-y-4 rounded-xl border border-border/50 bg-secondary/20 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Capital & carrying detail</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Num id="mc-tax" label="Annual Taxes ($)" value={annualTaxes} onChange={setAnnualTaxes} step={100} />
              <Num id="mc-ins" label="Annual Insurance ($)" value={annualInsurance} onChange={setAnnualInsurance} step={50} />
              <Num id="mc-close" label="Closing Costs (%)" value={closingPct} onChange={setClosingPct} step={0.1} />
              <Num id="mc-rehab" label="Rehab Budget ($)" value={rehab} onChange={setRehab} step={500} />
              <Num id="mc-term" label="Loan Term (yrs)" value={loanTerm} onChange={setLoanTerm} step={5} />
              <div>
                <label htmlFor="mc-iter" className="text-xs font-medium text-muted-foreground block mb-1.5">Iterations</label>
                <select id="mc-iter" value={iterations} onChange={(e) => setIterations(Number(e.target.value))}
                  className="w-full bg-secondary/60 border border-border/60 rounded-lg px-3 py-2 text-sm font-mono">
                  {SIMULATION_COUNTS.map((c) => <option key={c} value={c}>{c.toLocaleString()}</option>)}
                </select>
              </div>
              <label className="flex items-end gap-2 text-xs text-muted-foreground pb-2">
                <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} className="accent-primary" />
                Lock seed (reproducible)
              </label>
            </div>
          </div>
        )}

        <button onClick={run} disabled={running} className="btn-primary w-full">
          {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running {iterations.toLocaleString()} paths...</> : <><Play className="w-4 h-4" /> Run Simulation</>}
        </button>
      </div>

      {results && (
        <div className="space-y-6 animate-fade-in">
          <SummaryBar title={`${results.iterations.toLocaleString()} paths · ${years}-yr hold · ${results.profile}`} items={[
            { label: "Mean ROI", value: formatPercent(results.roi.mean) },
            { label: "Median ROI", value: formatPercent(results.roi.median) },
            { label: "Loss Probability", value: `${results.probLoss.toFixed(1)}%` },
            { label: "Sharpe", value: results.sharpe.toFixed(2) },
          ]} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="5th %ile ROI" value={formatPercent(results.roi.p5)} variant={results.roi.p5 > 0 ? "success" : "danger"} subtitle="Downside case" />
            <MetricCard label="25th %ile" value={formatPercent(results.roi.p25)} />
            <MetricCard label="75th %ile" value={formatPercent(results.roi.p75)} />
            <MetricCard label="95th %ile" value={formatPercent(results.roi.p95)} subtitle="Upside case" />
            <MetricCard label="Median IRR" value={formatPercent(results.irr.median)} subtitle="Equity cash flows" />
            <MetricCard label="VaR (5%)" value={formatPercent(results.var5)} variant={results.var5 < 0 ? "danger" : "default"} subtitle="Worst 1-in-20" />
            <MetricCard label="Expected Shortfall" value={formatPercent(results.cvar5)} variant={results.cvar5 < 0 ? "danger" : "default"} subtitle="Mean of worst 5%" />
            <MetricCard label="Std. Deviation" value={`±${results.roi.stdev.toFixed(1)}%`} subtitle="Volatility of ROI" />
            <MetricCard label="Sortino" value={results.sortino.toFixed(2)} subtitle="Downside-adjusted" />
            <MetricCard label="Downside Dev." value={`${results.downsideDeviation.toFixed(1)}%`} subtitle={`vs ${RISK_FREE_RATE}% hurdle`} />
            <MetricCard label="P(ROI > 10%)" value={`${results.probRoiAbove10.toFixed(0)}%`} />
            <MetricCard label="Negative CF year" value={`${results.probNegativeCashFlowYear.toFixed(0)}%`}
              variant={results.probNegativeCashFlowYear > 25 ? "danger" : results.probNegativeCashFlowYear > 10 ? "warning" : "success"}
              subtitle="Any year in hold" />
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-1 font-display">Deal Confidence Index</h3>
            <p className="text-xs text-muted-foreground mb-4">Weighted blend of loss probability, cash-flow stability, downside protection, median return and dispersion.</p>
            <div className="flex items-center gap-5 flex-wrap mb-4">
              <span className={`text-4xl font-bold font-mono ${results.confidence.score >= 80 ? "text-success" : results.confidence.score >= 60 ? "text-warning" : "text-destructive"}`}>
                {results.confidence.score}
              </span>
              <span className="text-sm text-muted-foreground max-w-md">{results.confidence.label}</span>
            </div>
            <div className="space-y-2">
              {results.confidence.components.map((c) => (
                <div key={c.key} className="flex items-center gap-3 text-xs">
                  <span className="w-56 text-muted-foreground">{c.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary/60 overflow-hidden">
                    <div className="h-full bg-primary/80" style={{ width: `${(c.points / c.weight) * 100}%` }} />
                  </div>
                  <span className="font-mono w-16 text-right">{c.points}/{c.weight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-4 font-display">Annualised ROI distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results.histogram.bins}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
                <XAxis dataKey="label" stroke="hsl(240 18% 72%)" fontSize={10} interval={2} />
                <YAxis stroke="hsl(240 18% 72%)" fontSize={12} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, _n: any, p: any) => [`${v} paths (${p.payload.pct.toFixed(1)}%)`, "Frequency"]} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {results.histogram.bins.map((b, i) => (
                    <Cell key={i} fill={b.mid >= 0 ? "hsl(244 75% 62%)" : "hsl(0 80% 62%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel text-xs text-muted-foreground flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <span>
              Each path simulates the hold year by year. Appreciation and rent growth are drawn from normal
              distributions correlated through a shared macro factor; vacancy is triangular (recessions push it
              higher); maintenance is log-normal; major CapEx events are Bernoulli-triggered and log-normal in
              severity; taxes, insurance and other operating costs escalate independently. Exit applies a
              stochastic selling cost and months of listing carry. ROI is annualised total return on cash
              invested (down payment + closing + rehab), including principal paydown. Sharpe and Sortino use a
              {" "}{RISK_FREE_RATE}% risk-free rate. Results are estimates, not guarantees.
            </span>
          </div>
        </div>
      )}
    </div>
  );

}

function ScenarioTab() {
  const [mode, setMode] = useState<Mode>("simple");
  const [price, setPrice] = useSharedField("purchasePrice");
  const [rent, setRent] = useSharedField("grossRent");
  const [downPct, setDownPct] = useSharedField("downPayment");
  const [expenses, setExpenses] = useState(800);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(10);

  const [optRent, setOptRent] = useState(5);
  const [optApp, setOptApp] = useState(5);
  const [baseRent, setBaseRent] = useState(3);
  const [baseApp, setBaseApp] = useState(3);
  const [pesRent, setPesRent] = useState(1);
  const [pesApp, setPesApp] = useState(1);

  const mortgage = calculateMortgage(price, downPct, rate, 30);

  const scenarios = {
    Optimistic: { rentGrowth: optRent, expGrowth: 1, appr: optApp, color: "hsl(152 70% 55%)" },
    Base: { rentGrowth: baseRent, expGrowth: 2.5, appr: baseApp, color: "hsl(244 75% 62%)" },
    Pessimistic: { rentGrowth: pesRent, expGrowth: 4, appr: pesApp, color: "hsl(38 95% 60%)" },
  };

  const data = Array.from({ length: years }, (_, i) => {
    const yr = i + 1;
    const entry: any = { year: yr };
    for (const [name, s] of Object.entries(scenarios)) {
      const r = rent * Math.pow(1 + s.rentGrowth / 100, yr);
      const e = expenses * Math.pow(1 + s.expGrowth / 100, yr);
      entry[`${name}CF`] = Math.round((r - e - mortgage) * 12);
      entry[`${name}Val`] = Math.round(price * Math.pow(1 + s.appr / 100, yr));
    }
    return entry;
  });

  const cashIn = price * (downPct / 100);
  const totals = Object.fromEntries(
    Object.entries(scenarios).map(([name, s]) => {
      const cfTotal = data.reduce((sum, d) => sum + d[`${name}CF`], 0);
      const finalVal = price * Math.pow(1 + s.appr / 100, years);
      // simple equity (assume ~25% loan paydown over 10 yrs at 6.5% on 30-yr — approximated)
      const loanRemain = price * (1 - downPct / 100) * 0.82;
      const equity = finalVal - loanRemain;
      const total = cfTotal + equity - cashIn;
      const roi = cashIn > 0 ? (total / cashIn / years) * 100 : 0;
      return [name, { cfTotal, finalVal, equity, total, roi }];
    })
  );

  return (
    <div className="space-y-6">
      <ModeToggle mode={mode} onChange={setMode} hint="Simple mode uses preset growth bands. Advanced lets you tune rent growth & appreciation per scenario." />
      <div className="panel space-y-4">
        <h3 className="text-lg font-semibold font-display">Scenario inputs</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Num id="sc-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <Num id="sc-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={25} />
          <Num id="sc-exp" label="Monthly Expenses ($)" value={expenses} onChange={setExpenses} step={50} />
          <Num id="sc-dp" label="Down Payment (%)" value={downPct} onChange={setDownPct} step={1} />
          <Num id="sc-rate" label="Interest Rate (%)" value={rate} onChange={setRate} step={0.1} />
          <Num id="sc-yr" label="Hold Years" value={years} onChange={setYears} step={1} />
        </div>

        {mode === "advanced" && (
          <>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em] mt-2">Scenario assumptions (%/yr)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-success/30 bg-success/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-success">🟢 Optimistic</p>
                <Num id="opt-r" label="Rent growth" value={optRent} onChange={setOptRent} step={0.5} />
                <Num id="opt-a" label="Appreciation" value={optApp} onChange={setOptApp} step={0.5} />
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-primary">🔵 Base</p>
                <Num id="base-r" label="Rent growth" value={baseRent} onChange={setBaseRent} step={0.5} />
                <Num id="base-a" label="Appreciation" value={baseApp} onChange={setBaseApp} step={0.5} />
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-warning">🟡 Pessimistic</p>
                <Num id="pes-r" label="Rent growth" value={pesRent} onChange={setPesRent} step={0.5} />
                <Num id="pes-a" label="Appreciation" value={pesApp} onChange={setPesApp} step={0.5} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(scenarios).map(([name]) => (
          <MetricCard
            key={name}
            label={`${name} · ${years}yr`}
            value={`${totals[name].roi.toFixed(1)}%/yr`}
            subtitle={`CF $${(totals[name].cfTotal/1000).toFixed(0)}k · Equity $${(totals[name].equity/1000).toFixed(0)}k`}
            variant={name === "Optimistic" ? "success" : name === "Pessimistic" ? "warning" : "default"}
          />
        ))}
      </div>

      <div className="panel">
        <h3 className="text-lg font-semibold mb-4 font-display">{years}-year cash flow by scenario</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
            <XAxis dataKey="year" stroke="hsl(240 18% 72%)" fontSize={12} />
            <YAxis stroke="hsl(240 18% 72%)" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {Object.entries(scenarios).map(([name, s]) => (
              <Bar key={name} dataKey={`${name}CF`} name={name} fill={s.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3 className="text-lg font-semibold mb-4 font-display">Property value trajectories</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
            <XAxis dataKey="year" stroke="hsl(240 18% 72%)" fontSize={12} />
            <YAxis stroke="hsl(240 18% 72%)" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {Object.entries(scenarios).map(([name, s]) => (
              <Line key={name} type="monotone" dataKey={`${name}Val`} name={name} stroke={s.color} strokeWidth={2.5} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Num({ id, label, value, onChange, step = 1 }: { id?: string; label: string; value: number; onChange: (v: number) => void; step?: number }) {
  const inputId = id || label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div>
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <input id={inputId} type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))} className="input-field font-mono" />
    </div>
  );
}
