import { useState } from "react";
import { calculateMortgage, formatCurrency, formatPercent, findBreakeven } from "@/lib/calculations";
import MetricCard from "@/components/MetricCard";
import SummaryBar from "@/components/SummaryBar";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, BarChart, Bar, CartesianGrid } from "recharts";

type Tab = "analyzer" | "breakeven" | "affordability";

export default function DealAnalyzerPage() {
  const [tab, setTab] = useState<Tab>("analyzer");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📊 Quick Deal Analyzer</h1>
        <p className="text-muted-foreground mt-1">Evaluate rental properties with advanced metrics and guidance.</p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 flex-wrap">
        {([["analyzer", "Deal Analyzer"], ["breakeven", "Break-Even"], ["affordability", "Tenant Affordability"]] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
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
    const projRent = rent * Math.pow(1 + rentGrowth / 100, years);
    const projValue = price * Math.pow(1 + appreciation / 100, years);
    const loanAmt = price * (1 - downPct / 100);
    const noi = (projRent - expenses) * 12;
    const annualCF = (projRent - expenses - mortgage) * 12;
    const totalInvest = price * downPct / 100;
    const roi = totalInvest > 0 ? (annualCF / totalInvest) * 100 : 0;
    const capRate = projValue > 0 ? (noi / projValue) * 100 : 0;
    const coc = totalInvest > 0 ? (annualCF / totalInvest) * 100 : 0;
    const dscr = mortgage > 0 ? noi / (mortgage * 12) : 0;
    const ltv = projValue > 0 ? (loanAmt / projValue) * 100 : 0;
    const payback = annualCF > 0 ? totalInvest / annualCF : null;

    const roiScore = Math.min(roi, 20) / 20 * 50;
    const capScore = Math.min(capRate, 10) / 10 * 30;
    const dscrScore = dscr >= 1.25 ? 20 : dscr >= 1 ? 10 : -10;
    const score = Math.max(0, Math.min(roiScore + capScore + dscrScore, 100));

    // Expense breakdown
    const propTax = price * 0.012 / 12;
    const insurance = price * 0.004 / 12;
    const mgmt = rent * 0.08;
    const maint = rent * 0.10;
    const capex = rent * 0.05;
    const vacancy = rent * 0.05;

    const expenseBreakdown = [
      { name: "Mortgage", value: Math.round(mortgage), color: "#3b82f6" },
      { name: "Property Tax", value: Math.round(propTax), color: "#6366f1" },
      { name: "Insurance", value: Math.round(insurance), color: "#8b5cf6" },
      { name: "Management", value: Math.round(mgmt), color: "#a855f7" },
      { name: "Maintenance", value: Math.round(maint), color: "#ec4899" },
      { name: "CapEx", value: Math.round(capex), color: "#f43f5e" },
      { name: "Vacancy", value: Math.round(vacancy), color: "#f97316" },
    ];

    // Yearly projections
    const projections = Array.from({ length: years }, (_, i) => {
      const yr = i + 1;
      const projR = rent * Math.pow(1 + rentGrowth / 100, yr);
      const projV = price * Math.pow(1 + appreciation / 100, yr);
      const cf = (projR - expenses - mortgage) * 12;
      return { year: yr, rent: Math.round(projR), value: Math.round(projV), cashFlow: Math.round(cf) };
    });

    setResults({ roi, capRate, coc, dscr, ltv, payback, annualCF, score, mortgage, expenseBreakdown, projections });
  };

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-card rounded-xl p-6 border border-border space-y-6">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Property Name</label>
          <input value={propName} onChange={(e) => setPropName(e.target.value)}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>

        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">💰 Deal Inputs</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Purchase Price ($)", value: price, set: setPrice, step: 1000 },
            { label: "Monthly Rent ($)", value: rent, set: setRent, step: 50 },
            { label: "Monthly Expenses ($)", value: expenses, set: setExpenses, step: 50 },
            { label: "Interest Rate (%)", value: interestRate, set: setInterestRate, step: 0.1 },
            { label: "Rent Growth (%)", value: rentGrowth, set: setRentGrowth, step: 0.1 },
            { label: "Appreciation (%)", value: appreciation, set: setAppreciation, step: 0.1 },
          ].map((inp) => (
            <div key={inp.label}>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">{inp.label}</label>
              <input type="number" value={inp.value} step={inp.step} onChange={(e) => inp.set(Number(e.target.value))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Down Payment: {downPct}%</label>
            <input type="range" min={0} max={100} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))}
              className="w-full accent-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Years: {years}</label>
            <input type="range" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Loan Term</label>
            <select value={loanTerm} onChange={(e) => setLoanTerm(Number(e.target.value))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none">
              <option value={15}>15 Years</option>
              <option value={20}>20 Years</option>
              <option value={30}>30 Years</option>
            </select>
          </div>
        </div>

        <button onClick={analyze}
          className="w-full px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-all glow-primary text-sm">
          🔍 Analyze Deal
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6 animate-fade-in">
          <SummaryBar title="Deal Metrics" items={[
            { label: "ROI", value: formatPercent(results.roi) },
            { label: "Cap Rate", value: formatPercent(results.capRate) },
            { label: "Cash Flow", value: `${formatCurrency(results.annualCF)}/yr` },
            { label: "Score", value: `${results.score.toFixed(1)}/100` },
          ]} />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="CoC ROI" value={formatPercent(results.coc)} />
            <MetricCard label="DSCR" value={results.dscr.toFixed(2)} variant={results.dscr >= 1.25 ? "success" : results.dscr >= 1 ? "warning" : "danger"} />
            <MetricCard label="LTV" value={formatPercent(results.ltv)} />
            <MetricCard label="Payback" value={results.payback ? `${results.payback.toFixed(1)} yrs` : "∞"} />
            <MetricCard label="Mortgage" value={`${formatCurrency(results.mortgage)}/mo`} />
            <MetricCard label="Score" value={results.score.toFixed(1)}
              variant={results.score >= 70 ? "success" : results.score >= 50 ? "warning" : "danger"} />
          </div>

          {/* Score gauge */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4">📊 Deal Score</h3>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(240, 4%, 20%)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none"
                    stroke={results.score >= 70 ? "#4ade80" : results.score >= 50 ? "#facc15" : "#ef4444"}
                    strokeWidth="3" strokeDasharray={`${results.score} 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold font-mono">{results.score.toFixed(0)}</span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {results.score >= 85 ? "🏆 Excellent" : results.score >= 70 ? "👍 Solid" : results.score >= 50 ? "⚠️ Marginal" : "🚨 Risky"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {results.score >= 70 ? "Strong deal with good fundamentals." : results.score >= 50 ? "Moderate potential, review inputs." : "High risk — consider alternatives."}
                </p>
              </div>
            </div>
          </div>

          {/* Expense Pie */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4">📊 Expense Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={results.expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100} paddingAngle={2} label={({ name, value }) => `${name}: $${value}`}>
                  {results.expenseBreakdown.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(240, 5%, 13%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Projections */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4">📈 Multi-Year Projections</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results.projections}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 22%)" />
                <XAxis dataKey="year" stroke="hsl(240, 5%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(240, 5%, 55%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(240, 5%, 13%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 8 }} />
                <Bar dataKey="rent" name="Monthly Rent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cashFlow" name="Annual Cash Flow" fill="#4ade80" radius={[4, 4, 0, 0]} />
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
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold mb-4">💡 Break-Even Calculator</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField label="Purchase Price" value={price} onChange={setPrice} step={1000} />
          <InputField label="Interest Rate (%)" value={intRate} onChange={setIntRate} step={0.1} />
          <InputField label="Taxes+Ins+HOA ($/mo)" value={ti} onChange={setTi} step={25} />
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Loan Term</label>
            <select value={term} onChange={(e) => setTerm(Number(e.target.value))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none">
              <option value={15}>15 Years</option>
              <option value={30}>30 Years</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <SliderField label={`Down Payment: ${downPct}%`} value={downPct} onChange={setDownPct} min={0} max={100} />
          <SliderField label={`Maintenance: ${maintPct}%`} value={maintPct} onChange={setMaintPct} min={0} max={50} />
          <SliderField label={`Management: ${mgmtPct}%`} value={mgmtPct} onChange={setMgmtPct} min={0} max={50} />
          <SliderField label={`Vacancy: ${vacPct}%`} value={vacPct} onChange={setVacPct} min={0} max={30} />
        </div>
      </div>

      {breakeven ? (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard label="Break-Even Rent" value={formatCurrency(breakeven)} subtitle="/month" variant="success" />
            <MetricCard label="Mortgage Payment" value={formatCurrency(mortgage)} subtitle="/month" />
          </div>
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4">Cash Flow vs Rent</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 22%)" />
                <XAxis dataKey="rent" stroke="hsl(240, 5%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(240, 5%, 55%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(240, 5%, 13%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="cashFlow" stroke="#4ade80" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
          <p className="text-destructive font-medium">❌ No break-even rent found. Try adjusting inputs.</p>
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
      <div className="bg-card rounded-xl p-6 border border-border space-y-4">
        <h3 className="text-lg font-semibold">👥 Tenant Affordability</h3>
        <p className="text-sm text-muted-foreground">Check if rent is affordable based on income or vice versa.</p>

        <div className="flex gap-2">
          <button onClick={() => setMode("income")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "income" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            Required Income from Rent
          </button>
          <button onClick={() => setMode("rent")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "rent" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            Max Rent from Income
          </button>
        </div>

        <SliderField label={`Rent-to-Income Ratio: ${ratio}%`} value={ratio} onChange={setRatio} min={10} max={50} />

        {mode === "income" ? (
          <div className="space-y-4">
            <InputField label="Monthly Rent ($)" value={rent} onChange={setRent} step={50} />
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Required Monthly Income" value={formatCurrency(rent / (ratio / 100))} variant="success" />
              <MetricCard label="Required Annual Income" value={formatCurrency(rent / (ratio / 100) * 12)} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 mb-2">
              <button onClick={() => setPeriod("monthly")}
                className={`px-3 py-1.5 rounded text-xs ${period === "monthly" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>
                Monthly
              </button>
              <button onClick={() => setPeriod("annual")}
                className={`px-3 py-1.5 rounded text-xs ${period === "annual" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>
                Annual
              </button>
            </div>
            <InputField label={`${period === "monthly" ? "Monthly" : "Annual"} Income ($)`} value={income} onChange={setIncome} step={1000} />
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

// Reusable input components
function InputField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
    </div>
  );
}

function SliderField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary" />
    </div>
  );
}
