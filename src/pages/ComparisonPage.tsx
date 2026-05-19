import { useState } from "react";
import { formatCurrency, formatPercent, calculateMortgage } from "@/lib/calculations";
import MetricCard from "@/components/MetricCard";
import { Plus, Trash2, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Property {
  name: string;
  price: number;
  rent: number;
  // detail
  downPct: number;
  rate: number;
  closingPct: number;
  rehab: number;
  taxPct: number;
  insPct: number;
  hoa: number;
  vacPct: number;
  mgmtPct: number;
  maintPct: number;
  capexPct: number;
  // computed
  cashIn: number;
  mortgage: number;
  expenses: number;
  noi: number;
  cashFlow: number;
  roi: number;
  capRate: number;
  dscr: number;
  onePct: number;
  score: number;
}

const TOOLTIP_STYLE = {
  background: "hsl(235 50% 11%)",
  border: "1px solid hsl(244 75% 60% / 0.4)",
  borderRadius: 12,
  fontSize: 12,
};

export default function ComparisonPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [name, setName] = useState("");
  // basics
  const [price, setPrice] = useState(250000);
  const [rent, setRent] = useState(2200);
  // financing
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [closingPct, setClosingPct] = useState(3);
  const [rehab, setRehab] = useState(0);
  // recurring
  const [taxPct, setTaxPct] = useState(1.2);
  const [insPct, setInsPct] = useState(0.45);
  const [hoa, setHoa] = useState(0);
  const [vacPct, setVacPct] = useState(5);
  const [mgmtPct, setMgmtPct] = useState(8);
  const [maintPct, setMaintPct] = useState(8);
  const [capexPct, setCapexPct] = useState(5);

  const addProperty = () => {
    const mortgage = calculateMortgage(price, downPct, rate, 30);
    const propTax = (price * taxPct) / 100 / 12;
    const insurance = (price * insPct) / 100 / 12;
    const vacancy = rent * (vacPct / 100);
    const mgmt = rent * (mgmtPct / 100);
    const maint = rent * (maintPct / 100);
    const capex = rent * (capexPct / 100);
    const monthlyExpenses = propTax + insurance + hoa + vacancy + mgmt + maint + capex;
    const noi = (rent - monthlyExpenses) * 12;
    const debtSvc = mortgage * 12;
    const annualCF = noi - debtSvc;
    const cashIn = price * (downPct / 100) + rehab + price * (closingPct / 100);
    const roi = cashIn > 0 ? (annualCF / cashIn) * 100 : 0;
    const capRate = price > 0 ? (noi / price) * 100 : 0;
    const dscr = debtSvc > 0 ? noi / debtSvc : 0;
    const onePct = (rent / price) * 100;

    const roiScore = Math.min(Math.max(roi, 0), 20) / 20 * 40;
    const capScore = Math.min(Math.max(capRate, 0), 10) / 10 * 25;
    const dscrScore = dscr >= 1.25 ? 20 : dscr >= 1 ? 10 : 0;
    const onePctScore = onePct >= 1 ? 10 : onePct >= 0.7 ? 5 : 0;
    const cfScore = annualCF > 0 ? 5 : -10;
    const score = Math.max(0, Math.min(roiScore + capScore + dscrScore + onePctScore + cfScore, 100));

    setProperties([...properties, {
      name: name || `Property ${properties.length + 1}`,
      price, rent, downPct, rate, closingPct, rehab,
      taxPct, insPct, hoa, vacPct, mgmtPct, maintPct, capexPct,
      cashIn, mortgage, expenses: monthlyExpenses, noi, cashFlow: annualCF,
      roi, capRate, dscr, onePct, score,
    }]);
    setName("");
  };

  const best = properties.length
    ? properties.reduce((b, p) => (p.score > b.score ? p : b), properties[0])
    : null;

  const chartData = properties.map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name,
    ROI: Number(p.roi.toFixed(1)),
    Cap: Number(p.capRate.toFixed(1)),
    Score: Number(p.score.toFixed(0)),
  }));

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-4xl font-bold font-display">Property Comparison</h1>
        <p className="text-muted-foreground mt-2">Stack multiple deals side-by-side with the same realistic cost model used by lenders.</p>
      </header>

      <div className="panel space-y-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Add Property</h3>
        <div>
          <label htmlFor="cmp-name" className="text-xs font-medium text-muted-foreground block mb-1.5">Property Name / Address</label>
          <input id="cmp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 123 Main St" className="input-field" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Num id="cmp-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <Num id="cmp-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={25} />
          <Num id="cmp-rehab" label="Rehab ($)" value={rehab} onChange={setRehab} step={500} />
          <Num id="cmp-close" label="Closing (%)" value={closingPct} onChange={setClosingPct} step={0.1} />
          <Num id="cmp-dp" label="Down Payment (%)" value={downPct} onChange={setDownPct} step={1} />
          <Num id="cmp-rate" label="Interest Rate (%)" value={rate} onChange={setRate} step={0.1} />
          <Num id="cmp-tax" label="Property Tax (%/yr)" value={taxPct} onChange={setTaxPct} step={0.05} />
          <Num id="cmp-ins" label="Insurance (%/yr)" value={insPct} onChange={setInsPct} step={0.05} />
          <Num id="cmp-hoa" label="HOA ($/mo)" value={hoa} onChange={setHoa} step={10} />
          <Num id="cmp-vac" label="Vacancy (%)" value={vacPct} onChange={setVacPct} step={1} />
          <Num id="cmp-mgmt" label="Management (%)" value={mgmtPct} onChange={setMgmtPct} step={1} />
          <Num id="cmp-maint" label="Maint + CapEx (%)" value={maintPct + capexPct} onChange={(v) => { setMaintPct(v * 0.6); setCapexPct(v * 0.4); }} step={1} />
        </div>
        <button onClick={addProperty} className="btn-primary">
          <Plus className="w-4 h-4" /> Add to Comparison
        </button>
      </div>

      {properties.length > 0 ? (
        <div className="space-y-6">
          {best && (
            <div className="panel border-primary/40 shadow-elegant">
              <p className="text-xs uppercase tracking-[0.18em] text-primary mb-1">🏆 Top performer</p>
              <p className="text-xl font-semibold font-display">{best.name} — score {best.score.toFixed(0)} / 100 · {formatPercent(best.roi)} ROI · {formatCurrency(best.cashFlow)}/yr cash flow</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Properties" value={String(properties.length)} />
            <MetricCard label="Avg ROI" value={formatPercent(properties.reduce((s, p) => s + p.roi, 0) / properties.length)} />
            <MetricCard label="Avg Cap" value={formatPercent(properties.reduce((s, p) => s + p.capRate, 0) / properties.length)} />
            <MetricCard label="Total Cash In" value={formatCurrency(properties.reduce((s, p) => s + p.cashIn, 0))} />
          </div>

          {properties.length > 1 && (
            <div className="panel">
              <h3 className="text-lg font-semibold mb-4 font-display">Side-by-side comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
                  <XAxis dataKey="name" stroke="hsl(240 18% 72%)" fontSize={11} />
                  <YAxis stroke="hsl(240 18% 72%)" fontSize={12} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="ROI" fill="hsl(244 75% 62%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cap" fill="hsl(262 83% 68%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Score" fill="hsl(152 70% 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-border/70 glass">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-3.5">Property</th>
                  <th className="text-right px-4 py-3.5">Price</th>
                  <th className="text-right px-4 py-3.5">Cash In</th>
                  <th className="text-right px-4 py-3.5">Rent/mo</th>
                  <th className="text-right px-4 py-3.5">OpEx/mo</th>
                  <th className="text-right px-4 py-3.5">Cash Flow/yr</th>
                  <th className="text-right px-4 py-3.5">ROI</th>
                  <th className="text-right px-4 py-3.5">Cap</th>
                  <th className="text-right px-4 py-3.5">DSCR</th>
                  <th className="text-right px-4 py-3.5">1%</th>
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
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.cashIn)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.rent)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.expenses)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${p.cashFlow >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(p.cashFlow)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatPercent(p.roi)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatPercent(p.capRate)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${p.dscr >= 1.25 ? "text-success" : p.dscr >= 1 ? "text-warning" : "text-destructive"}`}>{p.dscr.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${p.onePct >= 1 ? "text-success" : "text-muted-foreground"}`}>{p.onePct.toFixed(2)}%</td>
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

          <button onClick={() => setProperties([])} className="btn-ghost">Clear All</button>
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

function Num({ id, label, value, onChange, step = 1 }: { id?: string; label: string; value: number; onChange: (v: number) => void; step?: number }) {
  const inputId = id || label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div>
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <input id={inputId} type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))} className="input-field font-mono" />
    </div>
  );
}
