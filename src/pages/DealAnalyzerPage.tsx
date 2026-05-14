import { useState } from "react";
import { calculateMortgage, formatCurrency, formatPercent, findBreakeven } from "@/lib/calculations";
import MetricCard from "@/components/MetricCard";
import SummaryBar from "@/components/SummaryBar";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, BarChart, Bar, CartesianGrid, Legend } from "recharts";
import { Search, Calculator, Users } from "lucide-react";

type Tab = "analyzer" | "breakeven" | "affordability";

const TOOLTIP_STYLE = {
  background: "hsl(235 50% 11%)",
  border: "1px solid hsl(244 75% 60% / 0.4)",
  borderRadius: 12,
  fontSize: 12,
};

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#c084fc", "#ec4899", "#f43f5e", "#f97316"];

export default function DealAnalyzerPage() {
  const [tab, setTab] = useState<Tab>("analyzer");

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-4xl font-bold font-display">Deal Analyzer</h1>
        <p className="text-muted-foreground mt-2">Underwrite a rental in seconds — ROI, cap rate, score and projections.</p>
      </header>

      <div className="flex gap-2 flex-wrap">
        {([
          ["analyzer", "Deal Analyzer"],
          ["breakeven", "Break-Even"],
          ["affordability", "Tenant Affordability"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`tab-pill ${tab === id ? "tab-pill-active" : "tab-pill-inactive"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "analyzer" && <DealAnalyzerTab />}
      {tab === "breakeven" && <BreakEvenTab />}
      {tab === "affordability" && <AffordabilityTab />}
    </div>
  );
}

function DealAnalyzerTab() {
  const [propName, setPropName] = useState("Untitled Deal");
  const [price, setPrice] = useState(250000);
  const [rent, setRent] = useState(2200);
  const [expenses, setExpenses] = useState(800);
  const [downPct, setDownPct] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [rentGrowth, setRentGrowth] = useState(3);
  const [appreciation, setAppreciation] = useState(4);
  const [years, setYears] = useState(5);
  const [results, setResults] = useState<any>(null);

  const analyze = () => {
    const mortgage = calculateMortgage(price, downPct, interestRate, loanTerm);
    const loanAmt = price * (1 - downPct / 100);
    const totalInvest = price * downPct / 100;

    // ----- Year-1 / current metrics (the headline numbers) -----
    const noi = (rent - expenses) * 12;
    const annualCF = (rent - expenses - mortgage) * 12;
    const roi = totalInvest > 0 ? (annualCF / totalInvest) * 100 : 0;
    const capRate = price > 0 ? (noi / price) * 100 : 0;
    const coc = roi; // cash-on-cash equals ROI when computed on cash flow / cash invested
    const dscr = mortgage > 0 ? noi / (mortgage * 12) : 0;
    const ltv = price > 0 ? (loanAmt / price) * 100 : 0;
    const grm = rent > 0 ? price / (rent * 12) : 0;
    const payback = annualCF > 0 ? totalInvest / annualCF : null;

    // ----- Year-N projections -----
    const projRent = rent * Math.pow(1 + rentGrowth / 100, years);
    const projValue = price * Math.pow(1 + appreciation / 100, years);
    const projCF = (projRent - expenses - mortgage) * 12;

    // Score weighting: ROI (50), Cap (30), DSCR (20)
    const roiScore = Math.min(Math.max(roi, 0), 20) / 20 * 50;
    const capScore = Math.min(Math.max(capRate, 0), 10) / 10 * 30;
    const dscrScore = dscr >= 1.25 ? 20 : dscr >= 1 ? 10 : -10;
    const score = Math.max(0, Math.min(roiScore + capScore + dscrScore, 100));

    // Reference expense breakdown (industry rules of thumb)
    const propTax = price * 0.012 / 12;
    const insurance = price * 0.004 / 12;
    const mgmt = rent * 0.08;
    const maint = rent * 0.10;
    const capex = rent * 0.05;
    const vacancy = rent * 0.05;

    const expenseBreakdown = [
      { name: "Mortgage", value: Math.round(mortgage) },
      { name: "Property Tax", value: Math.round(propTax) },
      { name: "Insurance", value: Math.round(insurance) },
      { name: "Management", value: Math.round(mgmt) },
      { name: "Maintenance", value: Math.round(maint) },
      { name: "CapEx", value: Math.round(capex) },
      { name: "Vacancy", value: Math.round(vacancy) },
    ];

    const projections = Array.from({ length: years }, (_, i) => {
      const yr = i + 1;
      const projR = rent * Math.pow(1 + rentGrowth / 100, yr);
      const projV = price * Math.pow(1 + appreciation / 100, yr);
      const cf = (projR - expenses - mortgage) * 12;
      return { year: yr, rent: Math.round(projR), value: Math.round(projV), cashFlow: Math.round(cf) };
    });

    setResults({
      roi, capRate, coc, dscr, ltv, grm, payback, annualCF, score, mortgage,
      projRent, projValue, projCF,
      expenseBreakdown, projections,
    });
  };

  return (
    <div className="space-y-6">
      <div className="panel space-y-6">
        <div>
          <label htmlFor="prop-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Property Name</label>
          <input id="prop-name" value={propName} onChange={(e) => setPropName(e.target.value)} className="input-field" />
        </div>

        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Deal Inputs</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { id: "price", label: "Purchase Price ($)", value: price, set: setPrice, step: 1000 },
            { id: "rent", label: "Monthly Rent ($)", value: rent, set: setRent, step: 50 },
            { id: "exp", label: "Monthly Expenses ($)", value: expenses, set: setExpenses, step: 50 },
            { id: "rate", label: "Interest Rate (%)", value: interestRate, set: setInterestRate, step: 0.1 },
            { id: "rg", label: "Rent Growth (%/yr)", value: rentGrowth, set: setRentGrowth, step: 0.1 },
            { id: "app", label: "Appreciation (%/yr)", value: appreciation, set: setAppreciation, step: 0.1 },
          ].map((inp) => (
            <div key={inp.id}>
              <label htmlFor={inp.id} className="text-xs font-medium text-muted-foreground block mb-1.5">{inp.label}</label>
              <input id={inp.id} type="number" value={inp.value} step={inp.step} onChange={(e) => inp.set(Number(e.target.value))} className="input-field font-mono" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="dp" className="text-xs font-medium text-muted-foreground block mb-1.5">Down Payment: <span className="text-primary font-mono">{downPct}%</span></label>
            <input id="dp" type="range" min={0} max={100} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <label htmlFor="yrs" className="text-xs font-medium text-muted-foreground block mb-1.5">Hold: <span className="text-primary font-mono">{years} yrs</span></label>
            <input id="yrs" type="range" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <label htmlFor="lt" className="text-xs font-medium text-muted-foreground block mb-1.5">Loan Term</label>
            <select id="lt" value={loanTerm} onChange={(e) => setLoanTerm(Number(e.target.value))} className="input-field">
              <option value={15}>15 Years</option>
              <option value={20}>20 Years</option>
              <option value={30}>30 Years</option>
            </select>
          </div>
        </div>

        <button onClick={analyze} className="btn-primary w-full">
          <Search className="w-4 h-4" /> Analyze Deal
        </button>
      </div>

      {results && (
        <div className="space-y-6 animate-fade-in">
          <SummaryBar title={`${propName} · Year 1`} items={[
            { label: "ROI", value: formatPercent(results.roi) },
            { label: "Cap Rate", value: formatPercent(results.capRate) },
            { label: "Cash Flow", value: `${formatCurrency(results.annualCF)}/yr` },
            { label: "Score", value: `${results.score.toFixed(0)}/100` },
          ]} />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Cash-on-Cash" value={formatPercent(results.coc)} />
            <MetricCard label="DSCR" value={results.dscr.toFixed(2)} variant={results.dscr >= 1.25 ? "success" : results.dscr >= 1 ? "warning" : "danger"} />
            <MetricCard label="LTV" value={formatPercent(results.ltv)} />
            <MetricCard label="GRM" value={results.grm.toFixed(1)} subtitle="price ÷ annual rent" />
            <MetricCard label="Payback" value={results.payback ? `${results.payback.toFixed(1)} yrs` : "∞"} />
            <MetricCard label="Mortgage" value={`${formatCurrency(results.mortgage)}/mo`} />
          </div>

          {/* Score gauge */}
          <div className="panel">
            <h3 className="text-lg font-semibold mb-5 font-display">Deal Score</h3>
            <div className="flex items-center gap-8 flex-wrap">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(240 30% 20%)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none"
                    stroke={results.score >= 70 ? "hsl(152 70% 55%)" : results.score >= 50 ? "hsl(38 95% 60%)" : "hsl(0 80% 62%)"}
                    strokeWidth="3" strokeDasharray={`${results.score} 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold font-mono">{results.score.toFixed(0)}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-xl font-display">
                  {results.score >= 85 ? "🏆 Excellent deal" : results.score >= 70 ? "👍 Solid deal" : results.score >= 50 ? "⚠️ Marginal" : "🚨 High risk"}
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  {results.score >= 70
                    ? "Strong fundamentals across ROI, cap rate, and debt coverage."
                    : results.score >= 50
                      ? "Some metrics are soft — try lowering price or increasing rent."
                      : "Numbers don't pencil — consider walking or restructuring the offer."}
                </p>
              </div>
            </div>
          </div>

          {/* Year-N projection callout */}
          <div className="panel">
            <h3 className="text-lg font-semibold mb-4 font-display">Year {results.projections.length} projection</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard label={`Year ${results.projections.length} Rent`} value={`${formatCurrency(results.projRent)}/mo`} />
              <MetricCard label="Property Value" value={formatCurrency(results.projValue)} variant="success" />
              <MetricCard label="Annual Cash Flow" value={formatCurrency(results.projCF)} variant={results.projCF >= 0 ? "success" : "danger"} />
            </div>
          </div>

          {/* Expense Pie */}
          <div className="panel">
            <h3 className="text-lg font-semibold mb-4 font-display">Reference monthly expenses</h3>
            <p className="text-xs text-muted-foreground mb-4">Industry rules of thumb (mortgage + 1.2% tax, 0.4% insurance, 8% mgmt, 10% maint, 5% CapEx, 5% vacancy).</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={results.expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={70} outerRadius={110} paddingAngle={3}
                  label={({ name, value }) => `${name}: $${value}`}>
                  {results.expenseBreakdown.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="hsl(235 50% 11%)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Projections */}
          <div className="panel">
            <h3 className="text-lg font-semibold mb-4 font-display">Multi-year projections</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results.projections}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
                <XAxis dataKey="year" stroke="hsl(240 18% 72%)" fontSize={12} />
                <YAxis stroke="hsl(240 18% 72%)" fontSize={12} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="rent" name="Monthly Rent" fill="hsl(244 75% 62%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cashFlow" name="Annual Cash Flow" fill="hsl(262 83% 68%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function BreakEvenTab() {
  const [price, setPrice] = useState(250000);
  const [downPct, setDownPct] = useState(20);
  const [intRate, setIntRate] = useState(6.5);
  const [term, setTerm] = useState(30);
  const [ti, setTi] = useState(300);
  const [maintPct, setMaintPct] = useState(10);
  const [mgmtPct, setMgmtPct] = useState(8);
  const [vacPct, setVacPct] = useState(5);

  const mortgage = calculateMortgage(price, downPct, intRate, term);
  const breakeven = findBreakeven(mortgage, ti, maintPct, mgmtPct, vacPct);

  const chartData = breakeven ? Array.from({ length: 32 }, (_, i) => {
    const r = breakeven - 800 + i * 50;
    const m = r * maintPct / 100;
    const mg = r * mgmtPct / 100;
    const vl = r * vacPct / 100;
    return { rent: r, cashFlow: Math.round(r - (mortgage + ti + m + mg + vl)) };
  }) : [];

  return (
    <div className="space-y-6">
      <div className="panel">
        <h3 className="text-lg font-semibold mb-4 font-display flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" /> Break-Even Calculator</h3>
        <p className="text-sm text-muted-foreground mb-5">Lowest monthly rent that still covers mortgage + taxes + insurance + variable costs.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField id="be-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <InputField id="be-rate" label="Interest Rate (%)" value={intRate} onChange={setIntRate} step={0.1} />
          <InputField id="be-ti" label="Tax+Ins+HOA ($/mo)" value={ti} onChange={setTi} step={25} />
          <div>
            <label htmlFor="be-term" className="text-xs font-medium text-muted-foreground block mb-1.5">Loan Term</label>
            <select id="be-term" value={term} onChange={(e) => setTerm(Number(e.target.value))} className="input-field">
              <option value={15}>15 Years</option>
              <option value={30}>30 Years</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <SliderField id="be-dp" label={`Down Payment: ${downPct}%`} value={downPct} onChange={setDownPct} min={0} max={100} />
          <SliderField id="be-mt" label={`Maintenance: ${maintPct}%`} value={maintPct} onChange={setMaintPct} min={0} max={50} />
          <SliderField id="be-mg" label={`Management: ${mgmtPct}%`} value={mgmtPct} onChange={setMgmtPct} min={0} max={50} />
          <SliderField id="be-vc" label={`Vacancy: ${vacPct}%`} value={vacPct} onChange={setVacPct} min={0} max={30} />
        </div>
      </div>

      {breakeven ? (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard label="Break-Even Rent" value={formatCurrency(breakeven)} subtitle="/month" variant="success" />
            <MetricCard label="Mortgage Payment" value={formatCurrency(mortgage)} subtitle="/month" />
          </div>
          <div className="panel">
            <h3 className="text-lg font-semibold mb-4 font-display">Cash flow vs rent</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
                <XAxis dataKey="rent" stroke="hsl(240 18% 72%)" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <YAxis stroke="hsl(240 18% 72%)" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="cashFlow" stroke="hsl(244 75% 62%)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 text-center">
          <p className="text-destructive font-medium">No break-even rent found below $6,000/mo. Try lower price or higher down payment.</p>
        </div>
      )}
    </div>
  );
}

function AffordabilityTab() {
  const [mode, setMode] = useState<"income" | "rent">("income");
  const [rent, setRent] = useState(1800);
  const [income, setIncome] = useState(60000);
  const [ratio, setRatio] = useState(30);
  const [period, setPeriod] = useState<"monthly" | "annual">("annual");

  return (
    <div className="space-y-6">
      <div className="panel space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 font-display"><Users className="w-5 h-5 text-primary" /> Tenant Affordability</h3>
        <p className="text-sm text-muted-foreground">Standard underwriting uses a 30% rent-to-income ratio. Adjust to match your screening criteria.</p>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setMode("income")} className={`tab-pill ${mode === "income" ? "tab-pill-active" : "tab-pill-inactive"}`}>
            Required income from rent
          </button>
          <button onClick={() => setMode("rent")} className={`tab-pill ${mode === "rent" ? "tab-pill-active" : "tab-pill-inactive"}`}>
            Max rent from income
          </button>
        </div>

        <SliderField id="aff-ratio" label={`Rent-to-Income Ratio: ${ratio}%`} value={ratio} onChange={setRatio} min={10} max={50} />

        {mode === "income" ? (
          <div className="space-y-4">
            <InputField id="aff-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={50} />
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Required Monthly Income" value={formatCurrency(rent / (ratio / 100))} variant="success" />
              <MetricCard label="Required Annual Income" value={formatCurrency(rent / (ratio / 100) * 12)} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setPeriod("monthly")} className={`tab-pill text-xs ${period === "monthly" ? "tab-pill-active" : "tab-pill-inactive"}`}>Monthly</button>
              <button onClick={() => setPeriod("annual")} className={`tab-pill text-xs ${period === "annual" ? "tab-pill-active" : "tab-pill-inactive"}`}>Annual</button>
            </div>
            <InputField id="aff-inc" label={`${period === "monthly" ? "Monthly" : "Annual"} Income ($)`} value={income} onChange={setIncome} step={1000} />
            <MetricCard
              label="Affordable Rent"
              value={formatCurrency(period === "monthly" ? income * ratio / 100 : income / 12 * ratio / 100)}
              subtitle="/month"
              variant="success"
            />
          </div>
        )}
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

function SliderField({ id, label, value, onChange, min, max }: { id?: string; label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  const inputId = id || label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div>
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <input id={inputId} type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}
