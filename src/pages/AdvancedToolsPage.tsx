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
  const [expenses, setExpenses] = useState(800);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(5);
  const [preset, setPreset] = useState<"conservative" | "balanced" | "aggressive" | "custom">("balanced");
  // custom ranges
  const [rentMin, setRentMin] = useState(1);
  const [rentMax, setRentMax] = useState(3);
  const [apprMin, setApprMin] = useState(2);
  const [apprMax, setApprMax] = useState(3);
  const [expMin, setExpMin] = useState(1);
  const [expMax, setExpMax] = useState(4);
  const [sims, setSims] = useState(1000);

  const [results, setResults] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const presets = {
    conservative: { sims: 1000, rent: [1, 2] as [number, number], appr: [1, 2] as [number, number], exp: [1, 3] as [number, number] },
    balanced: { sims: 1000, rent: [1, 3] as [number, number], appr: [2, 3] as [number, number], exp: [1, 4] as [number, number] },
    aggressive: { sims: 2000, rent: [2, 5] as [number, number], appr: [3, 5] as [number, number], exp: [0, 2] as [number, number] },
    custom: { sims, rent: [rentMin, rentMax] as [number, number], appr: [apprMin, apprMax] as [number, number], exp: [expMin, expMax] as [number, number] },
  };

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      const p = presets[preset];
      const { roiResults } = runMonteCarlo(
        price, rent, expenses, downPct, p.sims, p.rent, p.exp, p.appr, years, rate
      );

      const sorted = [...roiResults].sort((a, b) => a - b);
      const avgRoi = roiResults.reduce((a, b) => a + b, 0) / roiResults.length;
      const medianRoi = sorted[Math.floor(sorted.length / 2)];
      const p5 = sorted[Math.floor(sorted.length * 0.05)];
      const p25 = sorted[Math.floor(sorted.length * 0.25)];
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const probPositive = roiResults.filter(r => r > 0).length / roiResults.length * 100;
      const probAbove10 = roiResults.filter(r => r > 10).length / roiResults.length * 100;
      const probAbove15 = roiResults.filter(r => r > 15).length / roiResults.length * 100;
      const probLoss = roiResults.filter(r => r < 0).length / roiResults.length * 100;

      const std = Math.sqrt(roiResults.reduce((sum, r) => sum + Math.pow(r - avgRoi, 2), 0) / roiResults.length);
      const sharpe = std > 0 ? (avgRoi - 4) / std : 0; // risk-free ~4%
      const confidence = Math.max(0, Math.min(100, 100 - std * 1.5));

      const minR = Math.floor(Math.min(...roiResults));
      const maxR = Math.ceil(Math.max(...roiResults));
      const binCount = 25;
      const binSize = (maxR - minR) / binCount || 1;
      const bins = Array.from({ length: binCount }, (_, i) => {
        const low = minR + i * binSize;
        const high = low + binSize;
        const count = roiResults.filter(r => r >= low && r < high).length;
        return { range: `${low.toFixed(0)}%`, count, mid: (low + high) / 2 };
      });

      setResults({ avgRoi, medianRoi, p5, p25, p75, p95, probPositive, probAbove10, probAbove15, probLoss, confidence, std, sharpe, bins, sims: p.sims });
      setRunning(false);
    }, 60);
  };

  return (
    <div className="space-y-6">
      <ModeToggle mode={mode} onChange={setMode} hint="Simple mode runs preset risk profiles. Advanced exposes custom growth ranges and simulation count." />
      <div className="panel space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-2">Risk Profile</p>
          <div className="flex gap-2 flex-wrap">
            {(["conservative", "balanced", "aggressive", ...(mode === "advanced" ? ["custom" as const] : [])] as const).map((p) => (
              <button key={p} onClick={() => setPreset(p)} className={`tab-pill capitalize ${preset === p ? "tab-pill-active" : "tab-pill-inactive"}`}>
                {p === "conservative" ? "📉" : p === "balanced" ? "📊" : p === "aggressive" ? "🚀" : "⚙️"} {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Num id="mc-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <Num id="mc-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={25} />
          <Num id="mc-exp" label="Monthly Expenses ($)" value={expenses} onChange={setExpenses} step={50} />
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

        {mode === "advanced" && preset === "custom" && (
          <div className="space-y-3 rounded-xl border border-border/50 bg-secondary/20 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Custom growth ranges (%/yr)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Num id="mc-rmin" label="Rent growth min" value={rentMin} onChange={setRentMin} step={0.5} />
              <Num id="mc-rmax" label="Rent growth max" value={rentMax} onChange={setRentMax} step={0.5} />
              <Num id="mc-amin" label="Appreciation min" value={apprMin} onChange={setApprMin} step={0.5} />
              <Num id="mc-amax" label="Appreciation max" value={apprMax} onChange={setApprMax} step={0.5} />
              <Num id="mc-emin" label="Expense growth min" value={expMin} onChange={setExpMin} step={0.5} />
              <Num id="mc-emax" label="Expense growth max" value={expMax} onChange={setExpMax} step={0.5} />
              <Num id="mc-sims" label="Simulations" value={sims} onChange={setSims} step={500} />
            </div>
          </div>
        )}

        <button onClick={run} disabled={running} className="btn-primary w-full">
          {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running {presets[preset].sims} simulations...</> : <><Play className="w-4 h-4" /> Run Simulation</>}
        </button>
      </div>

      {results && (
        <div className="space-y-6 animate-fade-in">
          <SummaryBar title={`${results.sims} Simulations · ${years}-yr hold`} items={[
            { label: "Mean ROI", value: formatPercent(results.avgRoi) },
            { label: "Median", value: formatPercent(results.medianRoi) },
            { label: "Loss Probability", value: `${results.probLoss.toFixed(0)}%` },
            { label: "Sharpe", value: results.sharpe.toFixed(2) },
          ]} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="5th %ile" value={formatPercent(results.p5)} variant={results.p5 > 0 ? "success" : "danger"} subtitle="Worst-case" />
            <MetricCard label="25th %ile" value={formatPercent(results.p25)} />
            <MetricCard label="75th %ile" value={formatPercent(results.p75)} />
            <MetricCard label="95th %ile" value={formatPercent(results.p95)} subtitle="Best-case" />
            <MetricCard label="P(ROI > 0)" value={`${results.probPositive.toFixed(0)}%`} variant="success" />
            <MetricCard label="P(ROI > 10%)" value={`${results.probAbove10.toFixed(0)}%`} />
            <MetricCard label="P(ROI > 15%)" value={`${results.probAbove15.toFixed(0)}%`} />
            <MetricCard label="Std. Deviation" value={`±${results.std.toFixed(1)}%`} subtitle="Volatility" />
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-3 font-display">Deal Confidence Index</h3>
            <div className="flex items-center gap-5 flex-wrap">
              <span className={`text-4xl font-bold font-mono ${results.confidence >= 85 ? "text-success" : results.confidence >= 70 ? "text-warning" : "text-destructive"}`}>
                {results.confidence.toFixed(0)}%
              </span>
              <span className="text-sm text-muted-foreground max-w-md">
                {results.confidence >= 85
                  ? "🟢 Stable — predictable returns across scenarios."
                  : results.confidence >= 70
                    ? "🟡 Moderate — some volatility but manageable."
                    : "🔴 Volatile — wide spread, downside risk is real."}
              </span>
            </div>
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-4 font-display">ROI distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results.bins}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
                <XAxis dataKey="range" stroke="hsl(240 18% 72%)" fontSize={10} interval={2} />
                <YAxis stroke="hsl(240 18% 72%)" fontSize={12} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {results.bins.map((b: any, i: number) => (
                    <Cell key={i} fill={b.mid >= 0 ? "hsl(244 75% 62%)" : "hsl(0 80% 62%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel text-xs text-muted-foreground flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <span>Each simulation samples rent growth, expense growth, and appreciation uniformly within your selected ranges, then amortizes the loan over the hold period and exits at year {years}. Sharpe ratio uses a 4% risk-free rate.</span>
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
