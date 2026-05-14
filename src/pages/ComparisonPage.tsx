import { useState } from "react";
import { formatCurrency, formatPercent, calculateMortgage } from "@/lib/calculations";
import { Plus, Trash2, Building2 } from "lucide-react";

interface Property {
  name: string;
  price: number;
  rent: number;
  expenses: number;
  roi: number;
  capRate: number;
  cashFlow: number;
  score: number;
  mortgage: number;
}

export default function ComparisonPage() {
  const [properties, setProperties] = useState<Property[]>([]);
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
    const dscr = mortgage > 0 ? noi / (mortgage * 12) : 0;
    const roiScore = Math.min(Math.max(roi, 0), 20) / 20 * 50;
    const capScore = Math.min(Math.max(capRate, 0), 10) / 10 * 30;
    const dscrScore = dscr >= 1.25 ? 20 : dscr >= 1 ? 10 : -10;
    const score = Math.max(0, Math.min(roiScore + capScore + dscrScore, 100));

    setProperties([...properties, {
      name: name || `Property ${properties.length + 1}`,
      price, rent, expenses, roi, capRate, cashFlow: annualCF, score, mortgage,
    }]);
    setName("");
  };

  const best = properties.length
    ? properties.reduce((b, p) => (p.score > b.score ? p : b), properties[0])
    : null;

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-4xl font-bold font-display">Property Comparison</h1>
        <p className="text-muted-foreground mt-2">Stack multiple deals side-by-side to spot the strongest performer instantly.</p>
      </header>

      <div className="panel space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Add Property</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="cmp-name" className="text-xs font-medium text-muted-foreground block mb-1.5">Property Name</label>
            <input id="cmp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 123 Main St" className="input-field" />
          </div>
          <InputField id="cmp-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <InputField id="cmp-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={50} />
          <InputField id="cmp-exp" label="Monthly Expenses ($)" value={expenses} onChange={setExpenses} step={50} />
          <InputField id="cmp-dp" label="Down Payment (%)" value={downPct} onChange={setDownPct} step={1} />
          <InputField id="cmp-rate" label="Interest Rate (%)" value={rate} onChange={setRate} step={0.1} />
        </div>
        <button onClick={addProperty} className="btn-primary">
          <Plus className="w-4 h-4" /> Add to Comparison
        </button>
      </div>

      {properties.length > 0 ? (
        <div className="space-y-4">
          {best && (
            <div className="panel border-primary/40 shadow-elegant">
              <p className="text-xs uppercase tracking-[0.18em] text-primary mb-1">🏆 Top performer</p>
              <p className="text-xl font-semibold font-display">{best.name} — score {best.score.toFixed(0)} / 100</p>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-border/70 glass">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-3.5">Property</th>
                  <th className="text-right px-4 py-3.5">Price</th>
                  <th className="text-right px-4 py-3.5">Rent/mo</th>
                  <th className="text-right px-4 py-3.5">Expenses/mo</th>
                  <th className="text-right px-4 py-3.5">Cash Flow/yr</th>
                  <th className="text-right px-4 py-3.5">ROI</th>
                  <th className="text-right px-4 py-3.5">Cap Rate</th>
                  <th className="text-right px-4 py-3.5">Score</th>
                  <th className="px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p, i) => (
                  <tr key={i} className={`border-t border-border/40 hover:bg-primary/5 transition-colors ${best && best === p ? "bg-primary/[0.06]" : ""}`}>
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary/70" /> {p.name}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.rent)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.expenses)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${p.cashFlow >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(p.cashFlow)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatPercent(p.roi)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatPercent(p.capRate)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{p.score.toFixed(0)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setProperties(properties.filter((_, j) => j !== i))}
                        aria-label={`Remove ${p.name || `property ${i + 1}`}`}
                        className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={() => setProperties([])} className="btn-ghost">
            Clear All
          </button>
        </div>
      ) : (
        <div className="rounded-2xl p-10 text-center border border-dashed border-border/70 bg-secondary/20">
          <Building2 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No properties added yet. Use the form above to start comparing.</p>
        </div>
      )}
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
