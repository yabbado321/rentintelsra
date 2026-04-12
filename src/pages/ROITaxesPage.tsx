import { useState } from "react";
import { calculateMortgage, formatCurrency, formatPercent } from "@/lib/calculations";
import MetricCard from "@/components/MetricCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ROITaxesPage() {
  const [price, setPrice] = useState(250000);
  const [downPct, setDownPct] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [rent, setRent] = useState(2200);
  const [expenses, setExpenses] = useState(800);
  const [landPct, setLandPct] = useState(20);
  const [rentGrowth, setRentGrowth] = useState(3);
  const [expGrowth, setExpGrowth] = useState(2);
  const [taxRate, setTaxRate] = useState(24);
  const [saleYear, setSaleYear] = useState(10);
  const [view, setView] = useState<"roi" | "tax">("roi");

  const mortgage = calculateMortgage(price, downPct, interestRate, loanTerm);
  const buildingValue = price * (1 - landPct / 100);
  const annualDepreciation = buildingValue / 27.5;
  const taxSavings = annualDepreciation * taxRate / 100;
  const totalInvest = price * downPct / 100;

  // Generate projection data
  const projections = Array.from({ length: saleYear }, (_, i) => {
    const yr = i + 1;
    const r = rent * Math.pow(1 + rentGrowth / 100, yr);
    const e = expenses * Math.pow(1 + expGrowth / 100, yr);
    const cf = (r - e - mortgage) * 12;
    const cocRoi = totalInvest > 0 ? (cf / totalInvest) * 100 : 0;
    const propValue = price * Math.pow(1 + 3 / 100, yr);
    const equity = propValue - price * (1 - downPct / 100); // Simplified
    const equityRoi = totalInvest > 0 ? (equity / totalInvest / yr) * 100 : 0;
    const atcf = cf + taxSavings;
    return {
      year: yr,
      cashFlow: Math.round(cf),
      cocRoi: Math.round(cocRoi * 10) / 10,
      equityRoi: Math.round(equityRoi * 10) / 10,
      totalRoi: Math.round((cocRoi + equityRoi) * 10) / 10,
      afterTaxCF: Math.round(atcf),
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">📘 Multi-Year ROI & Tax Insights</h1>
        <p className="text-muted-foreground mt-1">Long-term projections with depreciation, tax savings, and ROI breakdown.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setView("roi")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === "roi" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          ROI & Performance
        </button>
        <button onClick={() => setView("tax")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === "tax" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          Tax Savings & Methods
        </button>
      </div>

      {view === "roi" ? (
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Property Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputField label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
              <InputField label="Monthly Rent ($)" value={rent} onChange={setRent} step={50} />
              <InputField label="Monthly Expenses ($)" value={expenses} onChange={setExpenses} step={50} />
              <InputField label="Interest Rate (%)" value={interestRate} onChange={setInterestRate} step={0.1} />
              <InputField label="Rent Growth (%/yr)" value={rentGrowth} onChange={setRentGrowth} step={0.5} />
              <InputField label="Expense Growth (%/yr)" value={expGrowth} onChange={setExpGrowth} step={0.5} />
              <InputField label="Tax Rate (%)" value={taxRate} onChange={setTaxRate} step={1} />
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Projection: {saleYear} yrs</label>
                <input type="range" min={1} max={30} value={saleYear} onChange={(e) => setSaleYear(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Annual Depreciation" value={formatCurrency(annualDepreciation)} />
            <MetricCard label="Tax Savings" value={formatCurrency(taxSavings)} subtitle="/year" variant="success" />
            <MetricCard label="Mortgage" value={`${formatCurrency(mortgage)}/mo`} />
            <MetricCard label="Building Value" value={formatCurrency(buildingValue)} />
          </div>

          {/* ROI Chart */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4">📈 ROI Projections Over Time</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={projections}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 22%)" />
                <XAxis dataKey="year" stroke="hsl(240, 5%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(240, 5%, 55%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(240, 5%, 13%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="cocRoi" name="Cash-on-Cash ROI %" stroke="#4ade80" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="equityRoi" name="Equity ROI %" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="totalRoi" name="Total ROI %" stroke="#facc15" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl p-6 border border-border overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4">📊 Yearly Breakdown</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-muted-foreground">Year</th>
                  <th className="text-right px-3 py-2 text-muted-foreground">Cash Flow</th>
                  <th className="text-right px-3 py-2 text-muted-foreground">CoC ROI</th>
                  <th className="text-right px-3 py-2 text-muted-foreground">Equity ROI</th>
                  <th className="text-right px-3 py-2 text-muted-foreground">After-Tax CF</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p) => (
                  <tr key={p.year} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-3 py-2">{p.year}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(p.cashFlow)}</td>
                    <td className="px-3 py-2 text-right font-mono">{p.cocRoi}%</td>
                    <td className="px-3 py-2 text-right font-mono">{p.equityRoi}%</td>
                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(p.afterTaxCF)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border space-y-4">
            <h3 className="text-lg font-semibold">🔑 Depreciation Overview</h3>
            <p className="text-sm text-muted-foreground">
              The IRS allows residential properties to be depreciated over <span className="text-foreground font-semibold">27.5 years</span>.
              This reduces taxable income each year without any cash outflow.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border space-y-3">
            <h3 className="text-lg font-semibold">💸 Common Tax Deductions</h3>
            {["Mortgage Interest", "Property Taxes", "Repairs and Maintenance", "Insurance", "Property Management Fees", "Utilities", "Depreciation"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <span className="text-primary">✓</span>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-xl p-6 border border-border space-y-4">
            <h3 className="text-lg font-semibold">📊 Tax Savings Calculator</h3>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
              <InputField label="Tax Rate (%)" value={taxRate} onChange={setTaxRate} step={1} />
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Land Value: {landPct}%</label>
                <input type="range" min={0} max={50} value={landPct} onChange={(e) => setLandPct(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <MetricCard label="Building Value" value={formatCurrency(buildingValue)} />
              <MetricCard label="Annual Depreciation" value={formatCurrency(annualDepreciation)} />
              <MetricCard label="Tax Savings" value={formatCurrency(taxSavings)} variant="success" subtitle="/year" />
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border space-y-3">
            <h3 className="text-lg font-semibold">💡 Tips for Maximizing Tax Savings</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong className="text-foreground">Cost Segregation:</strong> Accelerate depreciation by reclassifying components.</li>
              <li>• <strong className="text-foreground">Bonus Depreciation:</strong> Additional first-year write-offs on qualifying assets.</li>
              <li>• <strong className="text-foreground">Keep Records:</strong> Track all property-related expenses for deductions.</li>
              <li>• <strong className="text-foreground">Consult a CPA:</strong> Tax situations vary — professional advice is essential.</li>
            </ul>
          </div>
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
