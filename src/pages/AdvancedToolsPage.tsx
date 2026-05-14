import { useState } from "react";
import { runMonteCarlo, formatPercent } from "@/lib/calculations";
import MetricCard from "@/components/MetricCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Activity, GitBranch, Play, Loader2 } from "lucide-react";

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
        <p className="text-muted-foreground mt-2">Monte Carlo stress tests and scenario modeling for serious underwriting.</p>
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
  const [price, setPrice] = useState(250000);
  const [rent, setRent] = useState(2200);
  const [expenses, setExpenses] = useState(800);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(5);
  const [preset, setPreset] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [results, setResults] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const presets = {
    conservative: { sims: 500, rent: [1, 2] as [number, number], appr: [1, 2] as [number, number], exp: [1, 3] as [number, number] },
    balanced: { sims: 1000, rent: [1, 3] as [number, number], appr: [2, 3] as [number, number], exp: [1, 4] as [number, number] },
    aggressive: { sims: 2000, rent: [2, 5] as [number, number], appr: [3, 5] as [number, number], exp: [0, 2] as [number, number] },
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
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const probPositive = roiResults.filter(r => r > 0).length / roiResults.length * 100;
      const probAbove10 = roiResults.filter(r => r > 10).length / roiResults.length * 100;

      const std = Math.sqrt(roiResults.reduce((sum, r) => sum + Math.pow(r - avgRoi, 2), 0) / roiResults.length);
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

      setResults({ avgRoi, medianRoi, p5, p95, probPositive, probAbove10, confidence, bins, sims: p.sims });
      setRunning(false);
    }, 60);
  };

  return (
    <div className="space-y-6">
      <div className="panel space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-2">Risk Profile</p>
          <div className="flex gap-2 flex-wrap">
            {(["conservative", "balanced", "aggressive"] as const).map((p) => (
              <button key={p} onClick={() => setPreset(p)} className={`tab-pill capitalize ${preset === p ? "tab-pill-active" : "tab-pill-inactive"}`}>
                {p === "conservative" ? "📉" : p === "balanced" ? "📊" : "🚀"} {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField id="mc-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <InputField id="mc-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={50} />
          <InputField id="mc-exp" label="Monthly Expenses ($)" value={expenses} onChange={setExpenses} step={50} />
          <InputField id="mc-rate" label="Interest Rate (%)" value={rate} onChange={setRate} step={0.1} />
          <div>
            <label htmlFor="mc-dp" className="text-xs font-medium text-muted-foreground block mb-1.5">Down Payment: <span className="text-primary font-mono">{downPct}%</span></label>
            <input id="mc-dp" type="range" min={0} max={100} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <label htmlFor="mc-yr" className="text-xs font-medium text-muted-foreground block mb-1.5">Hold: <span className="text-primary font-mono">{years} yrs</span></label>
            <input id="mc-yr" type="range" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>

        <button onClick={run} disabled={running} className="btn-primary w-full">
          {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running {presets[preset].sims} simulations...</> : <><Play className="w-4 h-4" /> Run Simulation</>}
        </button>
      </div>

      {results && (
        <div className="space-y-6 animate-fade-in">
          <p className="text-xs text-muted-foreground">Distribution of annualized total return across <span className="font-mono text-foreground">{results.sims}</span> randomized scenarios.</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard label="Mean ROI" value={formatPercent(results.avgRoi)} variant="success" />
            <MetricCard label="Median ROI" value={formatPercent(results.medianRoi)} />
            <MetricCard label="5th Percentile" value={formatPercent(results.p5)} variant={results.p5 > 0 ? "success" : "danger"} subtitle="Worst case" />
            <MetricCard label="95th Percentile" value={formatPercent(results.p95)} subtitle="Best case" />
            <MetricCard label="Positive ROI" value={`${results.probPositive.toFixed(0)}%`} subtitle="of scenarios" />
            <MetricCard label="ROI > 10%" value={`${results.probAbove10.toFixed(0)}%`} subtitle="of scenarios" />
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
                    : "🔴 Volatile — wide spread of outcomes, downside risk is real."}
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
        </div>
      )}
    </div>
  );
}

function ScenarioTab() {
  const [price, setPrice] = useState(250000);
  const [rent, setRent] = useState(2200);
  const [expenses, setExpenses] = useState(800);
  const years = 10;

  const scenarios = {
    Optimistic: { rentGrowth: 5, expGrowth: 1, color: "hsl(152 70% 55%)" },
    Base: { rentGrowth: 3, expGrowth: 2, color: "hsl(244 75% 62%)" },
    Pessimistic: { rentGrowth: 1, expGrowth: 3, color: "hsl(38 95% 60%)" },
  };

  const data = Array.from({ length: years }, (_, i) => {
    const yr = i + 1;
    const entry: any = { year: yr };
    for (const [name, s] of Object.entries(scenarios)) {
      entry[`${name}CF`] = Math.round((rent * Math.pow(1 + s.rentGrowth / 100, yr) - expenses * Math.pow(1 + s.expGrowth / 100, yr)) * 12);
    }
    return entry;
  });

  // Cumulative CF totals across scenarios
  const totals = Object.fromEntries(
    Object.keys(scenarios).map((name) => [name, data.reduce((sum, d) => sum + d[`${name}CF`], 0)])
  );

  return (
    <div className="space-y-6">
      <div className="panel space-y-4">
        <h3 className="text-lg font-semibold font-display">Scenario inputs</h3>
        <div className="grid grid-cols-3 gap-4">
          <InputField id="sc-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <InputField id="sc-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={50} />
          <InputField id="sc-exp" label="Monthly Expenses ($)" value={expenses} onChange={setExpenses} step={50} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(scenarios).map(([name, s]) => (
          <MetricCard
            key={name}
            label={`${name} · 10yr CF`}
            value={`$${(totals[name] / 1000).toFixed(0)}k`}
            subtitle={`${s.rentGrowth}% rent / ${s.expGrowth}% exp growth`}
            variant={name === "Optimistic" ? "success" : name === "Pessimistic" ? "warning" : "default"}
          />
        ))}
      </div>

      <div className="panel">
        <h3 className="text-lg font-semibold mb-4 font-display">10-year cash flow comparison</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
            <XAxis dataKey="year" stroke="hsl(240 18% 72%)" fontSize={12} />
            <YAxis stroke="hsl(240 18% 72%)" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `$${v.toLocaleString()}`} />
            {Object.entries(scenarios).map(([name, s]) => (
              <Bar key={name} dataKey={`${name}CF`} name={name} fill={s.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function InputField({ id, label, value, onChange, step = 1 }: { id?: string; label: string; value: number; onChange: (v: number) => void; step?: number }) {
  const inputId = id || label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div>
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <input id={inputId} type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))} className="input-field font-mono" />
    </div>
  );
}
