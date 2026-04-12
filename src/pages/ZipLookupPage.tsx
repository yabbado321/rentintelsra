import { useState } from "react";
import { computeRent } from "@/lib/calculations";
import MetricCard from "@/components/MetricCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function ZipLookupPage() {
  const [zipCode, setZipCode] = useState("");
  const [beds, setBeds] = useState(2);
  const [baths, setBaths] = useState(1);
  const [sqft, setSqft] = useState(1000);
  const [results, setResults] = useState<ReturnType<typeof computeRent> | null>(null);

  const analyze = () => {
    if (!zipCode) return;
    // No SAFMR data loaded client-side, use feature estimate only
    const result = computeRent(null, beds, baths, sqft);
    setResults(result);
  };

  const chartData = results ? [
    { name: "HUD SAFMR", value: results.safmrRent ?? 0, color: "#4ade80" },
    { name: "Feature Est.", value: results.featureRent, color: "#60a5fa" },
    { name: "Blended", value: results.blendedRent, color: "#facc15" },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">📍 ZIP Rent Lookup</h1>
        <p className="text-muted-foreground mt-1">Estimate rent based on property features and location.</p>
      </div>

      {/* Inputs */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">ZIP Code</label>
            <input
              type="text"
              maxLength={5}
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="e.g. 90210"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Bedrooms</label>
            <input
              type="number"
              min={0}
              value={beds}
              onChange={(e) => setBeds(Number(e.target.value))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Bathrooms</label>
            <input
              type="number"
              min={0}
              value={baths}
              onChange={(e) => setBaths(Number(e.target.value))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Square Footage</label>
            <input
              type="number"
              min={0}
              step={50}
              value={sqft}
              onChange={(e) => setSqft(Number(e.target.value))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={analyze}
          className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-all"
        >
          🔍 Analyze Rent Estimates
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="HUD SAFMR"
              value={results.safmrRent ? `$${results.safmrRent.toLocaleString()}` : "N/A"}
              subtitle="Government fair market rent"
            />
            <MetricCard
              label="Feature Estimate"
              value={`$${results.featureRent.toLocaleString()}`}
              subtitle="Based on property features"
            />
            <MetricCard
              label="Blended Estimate"
              value={`$${results.blendedRent.toLocaleString()}`}
              subtitle="Weighted average"
              variant="success"
            />
          </div>

          {/* Confidence */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Confidence Level</span>
              <span className="text-sm font-bold" style={{ color: results.confColor }}>
                {results.confText} ({results.confPct}%)
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{ width: `${results.confPct}%`, backgroundColor: results.confColor }}
              />
            </div>
          </div>

          {/* Chart */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4">📊 Rent Estimate Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="hsl(240, 5%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(240, 5%, 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(240, 5%, 13%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(0, 0%, 95%)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
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
