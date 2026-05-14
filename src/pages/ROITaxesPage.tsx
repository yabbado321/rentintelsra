import { useState } from "react";
import { calculateMortgage, formatCurrency } from "@/lib/calculations";
import MetricCard from "@/components/MetricCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Receipt, TrendingUp, BookOpen } from "lucide-react";

const TOOLTIP_STYLE = {
  background: "hsl(235 50% 11%)",
  border: "1px solid hsl(244 75% 60% / 0.4)",
  borderRadius: 12,
  fontSize: 12,
};

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
  const [appr, setAppr] = useState(3);
  const [taxRate, setTaxRate] = useState(24);
  const [saleYear, setSaleYear] = useState(10);
  const [view, setView] = useState<"roi" | "tax">("roi");

  const mortgage = calculateMortgage(price, downPct, interestRate, loanTerm);
  const buildingValue = price * (1 - landPct / 100);
  const annualDepreciation = buildingValue / 27.5;
  const taxSavings = annualDepreciation * taxRate / 100;
  const totalInvest = price * downPct / 100;
  const initialLoan = price * (1 - downPct / 100);
  const monthlyRate = interestRate / 100 / 12;

  // Amortize each year for accurate remaining balance
  const projections = (() => {
    let bal = initialLoan;
    return Array.from({ length: saleYear }, (_, i) => {
      const yr = i + 1;
      // pay 12 months
      for (let m = 0; m < 12 && bal > 0; m++) {
        const interest = bal * monthlyRate;
        const principal = Math.min(mortgage - interest, bal);
        bal -= principal;
      }
      const r = rent * Math.pow(1 + rentGrowth / 100, yr);
      const e = expenses * Math.pow(1 + expGrowth / 100, yr);
      const cf = (r - e - mortgage) * 12;
      const cocRoi = totalInvest > 0 ? (cf / totalInvest) * 100 : 0;
      const propValue = price * Math.pow(1 + appr / 100, yr);
      const equity = propValue - bal;
      const equityRoi = totalInvest > 0 ? ((equity - totalInvest) / totalInvest / yr) * 100 : 0;
      const atcf = cf + taxSavings;
      return {
        year: yr,
        cashFlow: Math.round(cf),
        cocRoi: Math.round(cocRoi * 10) / 10,
        equityRoi: Math.round(equityRoi * 10) / 10,
        totalRoi: Math.round((cocRoi + equityRoi) * 10) / 10,
        afterTaxCF: Math.round(atcf),
        equity: Math.round(equity),
      };
    });
  })();

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-4xl font-bold font-display">ROI & Tax Insights</h1>
        <p className="text-muted-foreground mt-2">Long-term performance with depreciation, equity build, and tax savings.</p>
      </header>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setView("roi")} className={`tab-pill ${view === "roi" ? "tab-pill-active" : "tab-pill-inactive"}`}>
          <TrendingUp className="w-4 h-4" /> ROI & Performance
        </button>
        <button onClick={() => setView("tax")} className={`tab-pill ${view === "tax" ? "tab-pill-active" : "tab-pill-inactive"}`}>
          <Receipt className="w-4 h-4" /> Tax Savings
        </button>
      </div>

      {view === "roi" ? (
        <div className="space-y-6">
          <div className="panel">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-4">Property Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputField id="rt-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
              <InputField id="rt-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={50} />
              <InputField id="rt-exp" label="Monthly Expenses ($)" value={expenses} onChange={setExpenses} step={50} />
              <InputField id="rt-rate" label="Interest Rate (%)" value={interestRate} onChange={setInterestRate} step={0.1} />
              <InputField id="rt-rg" label="Rent Growth (%/yr)" value={rentGrowth} onChange={setRentGrowth} step={0.5} />
              <InputField id="rt-eg" label="Expense Growth (%/yr)" value={expGrowth} onChange={setExpGrowth} step={0.5} />
              <InputField id="rt-app" label="Appreciation (%/yr)" value={appr} onChange={setAppr} step={0.5} />
              <InputField id="rt-tax" label="Tax Rate (%)" value={taxRate} onChange={setTaxRate} step={1} />
            </div>
            <div className="mt-4">
              <label htmlFor="rt-yr" className="text-xs font-medium text-muted-foreground block mb-1.5">Projection horizon: <span className="text-primary font-mono">{saleYear} yrs</span></label>
              <input id="rt-yr" type="range" min={1} max={30} value={saleYear} onChange={(e) => setSaleYear(Number(e.target.value))} className="w-full accent-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Annual Depreciation" value={formatCurrency(annualDepreciation)} subtitle="27.5-yr schedule" />
            <MetricCard label="Tax Savings" value={`${formatCurrency(taxSavings)}/yr`} variant="success" />
            <MetricCard label="Mortgage" value={`${formatCurrency(mortgage)}/mo`} />
            <MetricCard label="Building Basis" value={formatCurrency(buildingValue)} subtitle={`${100 - landPct}% of price`} />
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-4 font-display">ROI projections over time</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={projections}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
                <XAxis dataKey="year" stroke="hsl(240 18% 72%)" fontSize={12} />
                <YAxis stroke="hsl(240 18% 72%)" fontSize={12} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="cocRoi" name="Cash-on-Cash" stroke="hsl(244 75% 62%)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="equityRoi" name="Equity Build" stroke="hsl(262 83% 68%)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="totalRoi" name="Total Annualized" stroke="hsl(199 89% 60%)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="panel overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4 font-display">Yearly breakdown</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-3 py-2">Year</th>
                  <th className="text-right px-3 py-2">Cash Flow</th>
                  <th className="text-right px-3 py-2">CoC ROI</th>
                  <th className="text-right px-3 py-2">Equity Build</th>
                  <th className="text-right px-3 py-2">Equity</th>
                  <th className="text-right px-3 py-2">After-Tax CF</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p) => (
                  <tr key={p.year} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                    <td className="px-3 py-2.5 font-mono">{p.year}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(p.cashFlow)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{p.cocRoi}%</td>
                    <td className="px-3 py-2.5 text-right font-mono">{p.equityRoi}%</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(p.equity)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-success">{formatCurrency(p.afterTaxCF)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="panel space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 font-display"><BookOpen className="w-5 h-5 text-primary" /> Depreciation overview</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The IRS allows residential rental properties to be depreciated over <span className="text-foreground font-semibold">27.5 years</span> on the building portion only.
              This non-cash deduction reduces taxable rental income each year.
            </p>
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-3 font-display">Common tax deductions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {["Mortgage Interest", "Property Taxes", "Repairs & Maintenance", "Insurance", "Property Management Fees", "Utilities (if paid)", "Depreciation", "Travel to Property"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
                  <span className="text-primary">✓</span>
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel space-y-4">
            <h3 className="text-lg font-semibold font-display">Tax savings calculator</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InputField id="ts-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
              <InputField id="ts-tax" label="Marginal Tax Rate (%)" value={taxRate} onChange={setTaxRate} step={1} />
              <div>
                <label htmlFor="ts-land" className="text-xs font-medium text-muted-foreground block mb-1.5">Land value: <span className="text-primary font-mono">{landPct}%</span></label>
                <input id="ts-land" type="range" min={0} max={50} value={landPct} onChange={(e) => setLandPct(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <MetricCard label="Building Basis" value={formatCurrency(buildingValue)} />
              <MetricCard label="Annual Depreciation" value={formatCurrency(annualDepreciation)} />
              <MetricCard label="Tax Savings" value={`${formatCurrency(taxSavings)}/yr`} variant="success" />
            </div>
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-3 font-display">Pro tax tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong className="text-foreground">Cost segregation:</strong> Reclassify components (carpet, fixtures, landscaping) to accelerate depreciation.</li>
              <li>• <strong className="text-foreground">Bonus depreciation:</strong> First-year write-off on qualifying assets (varies by year).</li>
              <li>• <strong className="text-foreground">1031 exchange:</strong> Defer capital gains by reinvesting into a like-kind property.</li>
              <li>• <strong className="text-foreground">Track everything:</strong> Mileage, repairs, supplies — small deductions compound.</li>
              <li>• <strong className="text-foreground">Talk to a CPA:</strong> This page is educational, not tax advice.</li>
            </ul>
          </div>
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
