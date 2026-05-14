import { useState } from "react";
import { formatCurrency, formatPercent, calculateMortgage } from "@/lib/calculations";
import MetricCard from "@/components/MetricCard";

export default function ComparisonPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(250000);
  const [rent, setRent] = useState(2200);
  const [expenses, setExpenses] = useState(800);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.5);

  const addProperty = () => {
    const mortgage = calculateMortgage(price, downPct, rate, 30);
    const noi = (rent - expenses) * 12;
    const annualCF = (rent - expenses - mortgage) * 12;
    const totalInvest = price * downPct / 100;
    const roi = totalInvest > 0 ? (annualCF / totalInvest) * 100 : 0;
    const capRate = price > 0 ? (noi / price) * 100 : 0;
    const score = Math.max(0, Math.min(Math.min(roi, 20) / 20 * 60 + Math.min(capRate, 10) / 10 * 30 + (annualCF > 0 ? 10 : -10), 100));

    setProperties([...properties, {
      name: name || `Property ${properties.length + 1}`,
      price, rent, expenses, roi, capRate, cashFlow: annualCF, score, mortgage,
    }]);
    setName("");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">🏘 Property Comparison</h1>
        <p className="text-muted-foreground mt-1">Compare multiple properties side-by-side.</p>
      </div>

      {/* Add Property Form */}
      <div className="bg-card rounded-xl p-6 border border-border space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Add Property</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Property Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 123 Main St"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <InputField label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <InputField label="Monthly Rent ($)" value={rent} onChange={setRent} step={50} />
          <InputField label="Monthly Expenses ($)" value={expenses} onChange={setExpenses} step={50} />
          <InputField label="Down Payment (%)" value={downPct} onChange={setDownPct} step={1} />
          <InputField label="Interest Rate (%)" value={rate} onChange={setRate} step={0.1} />
        </div>
        <button onClick={addProperty}
          className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-all">
          ➕ Add to Comparison
        </button>
      </div>

      {/* Comparison Table */}
      {properties.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/80">
                  <th className="text-left px-4 py-3 text-muted-foreground">Property</th>
                  <th className="text-right px-4 py-3 text-muted-foreground">Price</th>
                  <th className="text-right px-4 py-3 text-muted-foreground">Rent/mo</th>
                  <th className="text-right px-4 py-3 text-muted-foreground">Expenses/mo</th>
                  <th className="text-right px-4 py-3 text-muted-foreground">Cash Flow/yr</th>
                  <th className="text-right px-4 py-3 text-muted-foreground">ROI</th>
                  <th className="text-right px-4 py-3 text-muted-foreground">Cap Rate</th>
                  <th className="text-right px-4 py-3 text-muted-foreground">Score</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p, i) => (
                  <tr key={i} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.rent)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.expenses)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${p.cashFlow >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(p.cashFlow)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatPercent(p.roi)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatPercent(p.capRate)}</td>
                    <td className="px-4 py-3 text-right font-mono">{p.score.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setProperties(properties.filter((_, j) => j !== i))}
                        aria-label={`Remove ${p.name || `property ${i + 1}`}`}
                        className="text-destructive hover:text-destructive/80 text-xs">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={() => setProperties([])}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80">
            🧹 Clear All
          </button>
        </div>
      ) : (
        <div className="bg-secondary/30 rounded-xl p-8 text-center border border-border">
          <p className="text-muted-foreground">No properties added yet. Use the form above to start comparing.</p>
        </div>
      )}
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
