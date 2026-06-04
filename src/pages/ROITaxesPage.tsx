import { useMemo, useState } from "react";
import { calculateMortgage, formatCurrency } from "@/lib/calculations";
import MetricCard from "@/components/MetricCard";
import SummaryBar from "@/components/SummaryBar";
import ModeToggle, { type Mode } from "@/components/ModeToggle";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { Receipt, TrendingUp, BookOpen } from "lucide-react";

const TOOLTIP_STYLE = {
  background: "hsl(235 50% 11%)",
  border: "1px solid hsl(244 75% 60% / 0.4)",
  borderRadius: 12,
  fontSize: 12,
};

// Newton-Raphson IRR
function irr(cashflows: number[], guess = 0.1): number {
  let rate = guess;
  for (let i = 0; i < 100; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cashflows[t] / denom;
      dnpv -= (t * cashflows[t]) / (denom * (1 + rate));
    }
    const newRate = rate - npv / (dnpv || 1e-9);
    if (Math.abs(newRate - rate) < 1e-7) return newRate;
    rate = newRate;
  }
  return rate;
}

export default function ROITaxesPage() {
  // Acquisition
  const [price, setPrice] = useState(250000);
  const [closingPct, setClosingPct] = useState(3);
  const [rehab, setRehab] = useState(0);
  // Financing
  const [downPct, setDownPct] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  // Income
  const [rent, setRent] = useState(2200);
  // Expenses
  const [taxPct, setTaxPct] = useState(1.2);
  const [insPct, setInsPct] = useState(0.45);
  const [hoa, setHoa] = useState(0);
  const [vacPct, setVacPct] = useState(5);
  const [mgmtPct, setMgmtPct] = useState(8);
  const [maintPct, setMaintPct] = useState(8);
  const [capexPct, setCapexPct] = useState(5);
  // Growth
  const [rentGrowth, setRentGrowth] = useState(3);
  const [expGrowth, setExpGrowth] = useState(2.5);
  const [appr, setAppr] = useState(3);
  // Tax
  const [landPct, setLandPct] = useState(20);
  const [taxRate, setTaxRate] = useState(24);
  const [capGainsRate, setCapGainsRate] = useState(15);
  // Exit
  const [saleYear, setSaleYear] = useState(10);
  const [saleCostPct, setSaleCostPct] = useState(7);
  const [view, setView] = useState<"roi" | "tax">("roi");
  const [mode, setMode] = useState<Mode>("simple");

  const calc = useMemo(() => {
    const mortgage = calculateMortgage(price, downPct, interestRate, loanTerm);
    const buildingValue = price * (1 - landPct / 100);
    const annualDepreciation = buildingValue / 27.5;
    const taxSavings = annualDepreciation * taxRate / 100;
    const cashIn = price * (downPct / 100) + rehab + price * (closingPct / 100);
    const initialLoan = price * (1 - downPct / 100);
    const monthlyRate = interestRate / 100 / 12;

    let bal = initialLoan;
    const cashflows: number[] = [-cashIn]; // year 0 outflow
    const projections = Array.from({ length: saleYear }, (_, i) => {
      const yr = i + 1;
      let interestYr = 0, principalYr = 0;
      for (let m = 0; m < 12 && bal > 0; m++) {
        const interest = bal * monthlyRate;
        const principal = Math.min(mortgage - interest, bal);
        bal -= principal;
        interestYr += interest;
        principalYr += principal;
      }
      const r = rent * Math.pow(1 + rentGrowth / 100, yr);
      const propValue = price * Math.pow(1 + appr / 100, yr);
      const propTax = (propValue * taxPct) / 100 / 12;
      const insurance = (propValue * insPct) / 100 / 12;
      const variable = r * (vacPct + mgmtPct + maintPct + capexPct) / 100;
      const monthlyExp = propTax + insurance + hoa + variable;
      const annualOpEx = monthlyExp * 12 * Math.pow(1 + expGrowth / 100, 0); // value already inflated via tax/ins
      const noi = r * 12 - annualOpEx;
      const cf = noi - mortgage * 12;
      const cocRoi = cashIn > 0 ? (cf / cashIn) * 100 : 0;
      const equity = propValue - bal;
      const equityRoi = cashIn > 0 ? ((equity - cashIn) / cashIn / yr) * 100 : 0;
      const taxableIncome = noi - interestYr - annualDepreciation;
      const tax = Math.max(0, taxableIncome) * (taxRate / 100);
      const atcf = cf - tax;
      cashflows.push(atcf);
      return {
        year: yr,
        rent: Math.round(r),
        propValue: Math.round(propValue),
        cashFlow: Math.round(cf),
        afterTaxCF: Math.round(atcf),
        cocRoi: Math.round(cocRoi * 10) / 10,
        equityRoi: Math.round(equityRoi * 10) / 10,
        totalRoi: Math.round((cocRoi + equityRoi) * 10) / 10,
        equity: Math.round(equity),
        principal: Math.round(principalYr),
        interest: Math.round(interestYr),
        taxableIncome: Math.round(taxableIncome),
      };
    });

    // Sale at end of saleYear
    const finalValue = projections[projections.length - 1].propValue;
    const saleCosts = finalValue * (saleCostPct / 100);
    const remainingBal = bal;
    const totalDeprec = annualDepreciation * saleYear;
    const adjBasis = price - totalDeprec;
    const gain = Math.max(0, finalValue - saleCosts - adjBasis);
    const deprecRecapture = Math.min(totalDeprec, gain) * 0.25;
    const capGains = Math.max(0, gain - totalDeprec) * (capGainsRate / 100);
    const netProceeds = finalValue - saleCosts - remainingBal - deprecRecapture - capGains;
    // Add sale to last year cashflow
    cashflows[cashflows.length - 1] += netProceeds;

    const irrPct = irr(cashflows) * 100;
    const totalCF = projections.reduce((s, p) => s + p.afterTaxCF, 0);
    const totalReturn = totalCF + netProceeds;
    const equityMult = cashIn > 0 ? (totalReturn + cashIn) / cashIn : 0;

    return {
      mortgage, annualDepreciation, taxSavings, buildingValue, cashIn,
      projections, finalValue, saleCosts, remainingBal, netProceeds,
      deprecRecapture, capGains, gain, totalDeprec, irrPct, totalCF, totalReturn, equityMult,
    };
  }, [price, closingPct, rehab, downPct, interestRate, loanTerm, rent,
      taxPct, insPct, hoa, vacPct, mgmtPct, maintPct, capexPct,
      rentGrowth, expGrowth, appr, landPct, taxRate, capGainsRate, saleYear, saleCostPct]);

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-4xl font-bold font-display">ROI & Tax Insights</h1>
        <p className="text-muted-foreground mt-2">Full hold-and-sell model — IRR, equity multiple, depreciation, and exit taxes.</p>
      </header>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setView("roi")} className={`tab-pill ${view === "roi" ? "tab-pill-active" : "tab-pill-inactive"}`}>
          <TrendingUp className="w-4 h-4" /> ROI & Performance
        </button>
        <button onClick={() => setView("tax")} className={`tab-pill ${view === "tax" ? "tab-pill-active" : "tab-pill-inactive"}`}>
          <Receipt className="w-4 h-4" /> Tax Strategy
        </button>
      </div>

      {view === "roi" ? (
        <div className="space-y-6">
          <div className="panel space-y-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Acquisition & Financing</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Num id="rt-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
              <Num id="rt-rehab" label="Rehab ($)" value={rehab} onChange={setRehab} step={500} />
              <Num id="rt-close" label="Closing (%)" value={closingPct} onChange={setClosingPct} step={0.1} />
              <Num id="rt-dp" label="Down Payment (%)" value={downPct} onChange={setDownPct} step={1} />
              <Num id="rt-rate" label="Interest Rate (%)" value={interestRate} onChange={setInterestRate} step={0.1} />
              <div>
                <label htmlFor="rt-term" className="text-xs font-medium text-muted-foreground block mb-1.5">Loan Term</label>
                <select id="rt-term" value={loanTerm} onChange={(e) => setLoanTerm(Number(e.target.value))} className="input-field">
                  <option value={15}>15 Years</option>
                  <option value={20}>20 Years</option>
                  <option value={30}>30 Years</option>
                </select>
              </div>
              <Num id="rt-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={25} />
              <Num id="rt-hoa" label="HOA ($/mo)" value={hoa} onChange={setHoa} step={10} />
            </div>

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Operating Expenses (% of value or rent)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Num id="rt-tax" label="Property Tax (%/yr)" value={taxPct} onChange={setTaxPct} step={0.05} />
              <Num id="rt-ins" label="Insurance (%/yr)" value={insPct} onChange={setInsPct} step={0.05} />
              <Num id="rt-vac" label="Vacancy (%)" value={vacPct} onChange={setVacPct} step={1} />
              <Num id="rt-mgmt" label="Management (%)" value={mgmtPct} onChange={setMgmtPct} step={1} />
              <Num id="rt-maint" label="Maintenance (%)" value={maintPct} onChange={setMaintPct} step={1} />
              <Num id="rt-capex" label="CapEx (%)" value={capexPct} onChange={setCapexPct} step={1} />
            </div>

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Growth & Exit</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Num id="rt-rg" label="Rent Growth (%/yr)" value={rentGrowth} onChange={setRentGrowth} step={0.25} />
              <Num id="rt-eg" label="Expense Growth (%/yr)" value={expGrowth} onChange={setExpGrowth} step={0.25} />
              <Num id="rt-app" label="Appreciation (%/yr)" value={appr} onChange={setAppr} step={0.25} />
              <Num id="rt-sc" label="Sale Costs (%)" value={saleCostPct} onChange={setSaleCostPct} step={0.5} />
              <Num id="rt-mtax" label="Marginal Tax Rate (%)" value={taxRate} onChange={setTaxRate} step={1} />
              <Num id="rt-cg" label="LT Cap Gains Rate (%)" value={capGainsRate} onChange={setCapGainsRate} step={1} />
              <div className="md:col-span-2">
                <label htmlFor="rt-yr" className="text-xs font-medium text-muted-foreground block mb-1.5">Hold/Sell Year: <span className="text-primary font-mono">{saleYear}</span></label>
                <input id="rt-yr" type="range" min={1} max={30} value={saleYear} onChange={(e) => setSaleYear(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>
          </div>

          <SummaryBar title={`${saleYear}-Year Hold`} items={[
            { label: "IRR", value: `${calc.irrPct.toFixed(1)}%` },
            { label: "Equity Mult.", value: `${calc.equityMult.toFixed(2)}x` },
            { label: "Total After-Tax CF", value: formatCurrency(calc.totalCF) },
            { label: "Net Sale Proceeds", value: formatCurrency(calc.netProceeds) },
          ]} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Cash Invested" value={formatCurrency(calc.cashIn)} />
            <MetricCard label={`Sale Price (Yr ${saleYear})`} value={formatCurrency(calc.finalValue)} variant="success" />
            <MetricCard label="Loan Balance" value={formatCurrency(calc.remainingBal)} />
            <MetricCard label="Annual Depreciation" value={formatCurrency(calc.annualDepreciation)} subtitle="27.5-yr straight line" />
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-4 font-display">ROI projections over time</h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={calc.projections}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
                <XAxis dataKey="year" stroke="hsl(240 18% 72%)" fontSize={12} />
                <YAxis stroke="hsl(240 18% 72%)" fontSize={12} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="cocRoi" name="Cash-on-Cash" stroke="hsl(244 75% 62%)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="equityRoi" name="Equity Build (annualized)" stroke="hsl(262 83% 68%)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="totalRoi" name="Total" stroke="hsl(152 70% 55%)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-4 font-display">Equity build vs property value</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={calc.projections}>
                <defs>
                  <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(244 75% 62%)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="hsl(244 75% 62%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152 70% 55%)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="hsl(152 70% 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
                <XAxis dataKey="year" stroke="hsl(240 18% 72%)" fontSize={12} />
                <YAxis stroke="hsl(240 18% 72%)" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="propValue" name="Property Value" stroke="hsl(244 75% 62%)" fill="url(#gV)" />
                <Area type="monotone" dataKey="equity" name="Equity" stroke="hsl(152 70% 55%)" fill="url(#gE)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="panel overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4 font-display">Yearly breakdown</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-3 py-2">Yr</th>
                  <th className="text-right px-3 py-2">Rent/mo</th>
                  <th className="text-right px-3 py-2">Cash Flow</th>
                  <th className="text-right px-3 py-2">After-Tax CF</th>
                  <th className="text-right px-3 py-2">Principal</th>
                  <th className="text-right px-3 py-2">Interest</th>
                  <th className="text-right px-3 py-2">Equity</th>
                  <th className="text-right px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {calc.projections.map((p) => (
                  <tr key={p.year} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                    <td className="px-3 py-2.5 font-mono">{p.year}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(p.rent)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${p.cashFlow >= 0 ? "text-foreground" : "text-destructive"}`}>{formatCurrency(p.cashFlow)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-success">{formatCurrency(p.afterTaxCF)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(p.principal)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCurrency(p.interest)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(p.equity)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(p.propValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel space-y-2">
            <h3 className="text-lg font-semibold font-display">Sale waterfall (year {saleYear})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Line2 label="Sale price" value={formatCurrency(calc.finalValue)} />
              <Line2 label={`Sale costs (${saleCostPct}%)`} value={`-${formatCurrency(calc.saleCosts)}`} />
              <Line2 label="Loan payoff" value={`-${formatCurrency(calc.remainingBal)}`} />
              <Line2 label="Depreciation recapture (25%)" value={`-${formatCurrency(calc.deprecRecapture)}`} />
              <Line2 label={`Cap gains tax (${capGainsRate}%)`} value={`-${formatCurrency(calc.capGains)}`} />
              <Line2 label="Net proceeds" value={formatCurrency(calc.netProceeds)} highlight />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="panel space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 font-display"><BookOpen className="w-5 h-5 text-primary" /> Depreciation overview</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The IRS allows residential rental properties to be depreciated over <span className="text-foreground font-semibold">27.5 years</span> on the building portion only.
              This non-cash deduction reduces taxable rental income each year. When you sell, the IRS "recaptures" prior depreciation at up to 25%.
            </p>
          </div>

          <div className="panel space-y-4">
            <h3 className="text-lg font-semibold font-display">Tax savings calculator</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Num id="ts-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
              <Num id="ts-tax" label="Marginal Tax Rate (%)" value={taxRate} onChange={setTaxRate} step={1} />
              <div>
                <label htmlFor="ts-land" className="text-xs font-medium text-muted-foreground block mb-1.5">Land value: <span className="text-primary font-mono">{landPct}%</span></label>
                <input id="ts-land" type="range" min={0} max={50} value={landPct} onChange={(e) => setLandPct(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <MetricCard label="Building Basis" value={formatCurrency(calc.buildingValue)} />
              <MetricCard label="Annual Depreciation" value={formatCurrency(calc.annualDepreciation)} />
              <MetricCard label="Tax Savings" value={`${formatCurrency(calc.taxSavings)}/yr`} variant="success" />
            </div>
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-3 font-display">Common deductible expenses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {["Mortgage Interest", "Property Taxes", "Repairs & Maintenance", "Insurance", "Property Management Fees", "Utilities (if paid by owner)", "Depreciation", "Travel to Property", "Legal & Professional Fees", "Advertising & Tenant Screening", "Home-office (pro-rata)", "HOA Fees"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
                  <span className="text-primary">✓</span>
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-3 font-display">Pro tax strategies</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong className="text-foreground">Cost segregation:</strong> Reclassify carpet, fixtures, landscaping to accelerate depreciation in the first year.</li>
              <li>• <strong className="text-foreground">Bonus depreciation:</strong> First-year write-off on qualifying assets (varies by year).</li>
              <li>• <strong className="text-foreground">1031 exchange:</strong> Defer capital gains by reinvesting net proceeds into a like-kind property within 180 days.</li>
              <li>• <strong className="text-foreground">REPS designation:</strong> Real Estate Professional Status unlocks unlimited passive-loss offset against active income.</li>
              <li>• <strong className="text-foreground">Hold &gt;1 year:</strong> Long-term cap gains rate (0/15/20%) is typically much lower than short-term ordinary rates.</li>
              <li>• <strong className="text-foreground">Track everything:</strong> Mileage, repairs, supplies, software — small deductions compound.</li>
              <li>• <em>This page is educational, not tax advice. Talk to a CPA.</em></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Line2({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${highlight ? "border-success/40 bg-success/10" : "border-border/50 bg-secondary/20"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-semibold ${highlight ? "text-success" : ""}`}>{value}</span>
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
