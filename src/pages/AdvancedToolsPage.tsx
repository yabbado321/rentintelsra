import { useState } from "react";
import { runMonteCarlo, formatPercent } from "@/lib/calculations";
import MetricCard from "@/components/MetricCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdvancedToolsPage() {
  const [tool, setTool] = useState<"monte" | "scenario">("monte");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📈 Advanced Tools</h1>
        <p className="text-muted-foreground mt-1">Monte Carlo simulations, scenario modeling, and sensitivity analysis.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTool("monte")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tool === "monte" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          Monte Carlo Simulator
        </button>
        <button onClick={() => setTool("scenario")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tool === "scenario" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          Scenario Modeling
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
  const [sims, setSims] = useState(1000);
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
      const { roiResults, irrResults } = runMonteCarlo(
        price, rent, expenses, downPct, p.sims, p.rent, p.exp, p.appr, years, rate
      );

      const avgRoi = roiResults.reduce((a, b) => a + b, 0) / roiResults.length;
      const avgIrr = irrResults.reduce((a, b) => a + b, 0) / irrResults.length;
      const sorted = [...roiResults].sort((a, b) => a - b);
      const p5 = sorted[Math.floor(sorted.length * 0.05)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const probPositive = roiResults.filter(r => r > 0).length / roiResults.length * 100;
      const probAbove10 = roiResults.filter(r => r > 10).length / roiResults.length * 100;

      const std = Math.sqrt(roiResults.reduce((sum, r) => sum + Math.pow(r - avgRoi, 2), 0) / roiResults.length);
      const confidence = Math.max(0, Math.min(100, 100 - std * 1.5));

      // Histogram bins
      const minR = Math.floor(Math.min(...roiResults));
      const maxR = Math.ceil(Math.max(...roiResults));
      const binCount = 25;
      const binSize = (maxR - minR) / binCount || 1;
      const bins = Array.from({ length: binCount }, (_, i) => {
        const low = minR + i * binSize;
        const high = low + binSize;
        const count = roiResults.filter(r => r >= low && r < high).length;
        return { range: `${low.toFixed(0)}%`, count };
      });

      setResults({ avgRoi, avgIrr, p5, p95, probPositive, probAbove10, confidence, bins });
      setRunning(false);
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 border border-border space-y-4">
        <div className="flex gap-2 flex-wrap">
          {(["conservative", "balanced", "aggressive"] as const).map((p) => (
            <button key={p} onClick={() => setPreset(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${preset === p ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {p === "conservative" ? "📉" : p === "balanced" ? "📊" : "🚀"} {p}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <InputField label="Monthly Rent ($)" value={rent} onChange={setRent} step={50} />
          <InputField label="Monthly Expenses ($)" value={expenses} onChange={setExpenses} step={50} />
          <InputField label="Interest Rate (%)" value={rate} onChange={setRate} step={0.1} />
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Down Payment: {downPct}%</label>
            <input type="range" min={0} max={100} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Years: {years}</label>
            <input type="range" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>

        <button onClick={run} disabled={running}
          className="w-full px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-all glow-primary disabled:opacity-50">
          {running ? "⏳ Running Simulation..." : "▶️ Run Simulation"}
        </button>
      </div>

      {results && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard label="Avg ROI" value={formatPercent(results.avgRoi)} variant="success" />
            <MetricCard label="5th Percentile" value={formatPercent(results.p5)} variant={results.p5 > 0 ? "success" : "danger"} />
            <MetricCard label="95th Percentile" value={formatPercent(results.p95)} />
            <MetricCard label="Avg IRR" value={formatPercent(results.avgIrr)} />
            <MetricCard label="Positive ROI" value={`${results.probPositive.toFixed(0)}%`} subtitle="of scenarios" />
            <MetricCard label="ROI > 10%" value={`${results.probAbove10.toFixed(0)}%`} subtitle="of scenarios" />
          </div>

          {/* Confidence Index */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-2">📊 Deal Confidence Index</h3>
            <div className="flex items-center gap-4">
              <span className={`text-3xl font-bold font-mono ${results.confidence >= 85 ? "text-success" : results.confidence >= 70 ? "text-warning" : "text-destructive"}`}>
                {results.confidence.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">
                {results.confidence >= 85 ? "🟢 Stable — predictable returns" : results.confidence >= 70 ? "🟡 Moderate — some uncertainty" : "🔴 Volatile — high variation"}
              </span>
            </div>
          </div>

          {/* Histogram */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4">ROI Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results.bins}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 22%)" />
                <XAxis dataKey="range" stroke="hsl(240, 5%, 55%)" fontSize={10} interval={2} />
                <YAxis stroke="hsl(240, 5%, 55%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(240, 5%, 13%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#4ade80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioTab() {
  const [price] = useState(250000);
  const [rent] = useState(2200);
  const [expenses] = useState(800);
  const years = 10;

  const scenarios = {
    Optimistic: { rentGrowth: 5, expGrowth: 1 },
    Base: { rentGrowth: 3, expGrowth: 2 },
    Pessimistic: { rentGrowth: 1, expGrowth: 3 },
  };

  const data = Array.from({ length: years }, (_, i) => {
    const yr = i + 1;
    const entry: any = { year: yr };
    for (const [name, s] of Object.entries(scenarios)) {
      entry[`${name}CF`] = Math.round((rent * Math.pow(1 + s.rentGrowth / 100, yr) - expenses * Math.pow(1 + s.expGrowth / 100, yr)) * 12);
    }
    return entry;
  });

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold mb-4">🔮 Scenario Modeling</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Compare optimistic, base, and pessimistic scenarios over 10 years.
        </p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 22%)" />
            <XAxis dataKey="year" stroke="hsl(240, 5%, 55%)" fontSize={12} />
            <YAxis stroke="hsl(240, 5%, 55%)" fontSize={12} />
            <Tooltip contentStyle={{ background: "hsl(240, 5%, 13%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 8 }} />
            <Bar dataKey="OptimisticCF" name="Optimistic" fill="#4ade80" radius={[4, 4, 0, 0]} />
            <Bar dataKey="BaseCF" name="Base" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="PessimisticCF" name="Pessimistic" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
    </div>
  );
}
