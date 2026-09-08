import { useMemo, useState } from "react";
import { calculateMortgage, formatCurrency, formatPercent, findBreakeven, runMonteCarlo } from "@/lib/calculations";
import { runSimulation } from "@/lib/monteCarlo";
import MetricCard from "@/components/MetricCard";
import SummaryBar from "@/components/SummaryBar";
import ModeToggle, { type Mode } from "@/components/ModeToggle";
import PdfDownloadButton from "@/components/PdfDownloadButton";
import AIMemoGenerator from "@/components/AIMemoGenerator";
import GuardrailBanner from "@/components/GuardrailBanner";
import DealScorePanel from "@/components/DealScorePanel";
import type { UnderwritingReportData } from "@/components/UnderwritingReportPDF";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, BarChart, Bar, CartesianGrid, Legend } from "recharts";
import { Search, Calculator, Users, Info } from "lucide-react";
import { useSessionState } from "@/hooks/useSessionState";
import { useSharedField, useActiveProperty } from "@/lib/propertyStore";
import {
  collectFlags, computeDCI, evaluateSharpe, evaluateLossProbability,
  validateExpenses, describeScenarioReturn, evaluateNegativeCashflow, detectInconsistency,
  orderFlags,
} from "@/lib/guardrails";

type Tab = "analyzer" | "breakeven" | "affordability";

const TOOLTIP_STYLE = {
  background: "hsl(235 50% 11%)",
  border: "1px solid hsl(244 75% 60% / 0.4)",
  borderRadius: 12,
  fontSize: 12,
};

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#c084fc", "#ec4899", "#f43f5e", "#f97316", "#10b981"];

export default function DealAnalyzerPage() {
  const [tab, setTab] = useState<Tab>("analyzer");

  return (
    <div className="space-y-7">
      <header className="relative overflow-hidden rounded-2xl border border-primary/30 p-8 shadow-elegant">
        <div className="absolute inset-0 gradient-primary opacity-[0.10] -z-10" />
        <div className="absolute inset-0 bg-card/60 backdrop-blur-xl -z-10" />
        <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80 mb-2">Underwriting Suite</p>
        <h1 className="text-4xl md:text-5xl font-bold font-display gradient-text">Deal Analyzer</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">Full-stack underwriting — every cost an investor actually pays, every metric that matters.</p>
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
  const [mode, setMode] = useState<Mode>("simple");
  const activeProperty = useActiveProperty();
  // ===== Shared property fields — two-way bound to the global Property Hub =====
  // Editing any of these on ANY calculator updates the active property instantly.
  const [propName, setPropName] = useSharedField("address");
  const [price, setPrice] = useSharedField("purchasePrice");
  const [downPct, setDownPct] = useSharedField("downPayment");
  const [rent, setRent] = useSharedField("grossRent");
  const [vacPct, setVacPct] = useSharedField("vacancyRate");
  const [taxRatePct, setTaxRatePct] = useSharedField("taxes");
  const [insRatePct, setInsRatePct] = useSharedField("insurance");
  const [maintPct, setMaintPct] = useSharedField("maintenance");
  const [capexPct, setCapexPct] = useSharedField("capex");

  // ===== Calculator-local assumptions (stay per-calculator) =====
  const [rehab, setRehab] = useSessionState("deal.rehab", 0);
  const [arv, setArv] = useSessionState("deal.arv", 0); // after-repair value (0 = use price)
  const [closingPct, setClosingPct] = useSessionState("deal.closingPct", 3);
  const [interestRate, setInterestRate] = useSessionState("deal.interestRate", 6.5);
  const [loanTerm, setLoanTerm] = useSessionState("deal.loanTerm", 30);
  const [otherIncome, setOtherIncome] = useSessionState("deal.otherIncome", 0);
  const [hoa, setHoa] = useSessionState("deal.hoa", 0);
  const [mgmtPct, setMgmtPct] = useSessionState("deal.mgmtPct", 8);
  // Projection assumptions
  const [rentGrowth, setRentGrowth] = useSessionState("deal.rentGrowth", 3);
  const [expGrowth, setExpGrowth] = useSessionState("deal.expGrowth", 3); // inflation baseline
  const [appreciation, setAppreciation] = useSessionState("deal.appreciation", 3);
  const [years, setYears] = useSessionState("deal.years", 10);

  /* ======================================================================
   * CANONICAL UNDERWRITING — single source of truth.
   * Every metric on this page, in the Deal Score panel, in the Monte Carlo
   * block and in the exported PDF is read from this one object. Nothing
   * below recomputes NOI, cash flow, capital stack, LTV/LTC, DSCR, IRR,
   * equity multiple or exit proceeds.
   * ====================================================================== */
  const uwInputs = useMemo<Partial<UnderwritingInputs>>(() => ({
    purchasePrice: price,
    downPaymentPct: downPct,
    interestRatePct: interestRate,
    loanTermYears: loanTerm,
    closingCostPct: closingPct,
    rehabBudget: rehab,
    arv: arv > 0 ? arv : undefined,
    holdYears: years,
    monthlyBaseRent: rent,
    otherIncome: { other: otherIncome },
    vacancyPct: vacPct,
    propertyTaxes: pctOf(taxRatePct),
    insurance: pctOf(insRatePct),
    hoaMonthly: hoa,
    management: pctOf(mgmtPct),
    maintenance: pctOf(maintPct),
    capexReserve: pctOf(capexPct),
    rentGrowthPct: rentGrowth,
    expenseGrowthPct: expGrowth,
    appreciationPct: appreciation,
  }), [price, downPct, interestRate, loanTerm, closingPct, rehab, arv, years, rent, otherIncome,
       vacPct, taxRatePct, insRatePct, hoa, mgmtPct, maintPct, capexPct,
       rentGrowth, expGrowth, appreciation]);

  const uw = useMemo(() => computeUnderwriting(uwInputs), [uwInputs]);

  /** Display adapter over the canonical result — renaming only, no math. */
  const results = useMemo(() => {
    const exit5 = uw.projection.exitScenarios.find((e) => e.holdYears === 5)
      ?? uw.projection.exitScenarios[0];
    const grossIncomeAnnual = uw.income.grossPotentialRentAnnual + uw.income.otherIncomeAnnual;
    const expenseBreakdown = [
      { name: "Mortgage", value: Math.round(uw.debt.monthlyPI) },
      ...(uw.debt.monthlyMortgageInsurance > 0
        ? [{ name: "Mortgage Ins.", value: Math.round(uw.debt.monthlyMortgageInsurance) }]
        : []),
      ...uw.expenses.lines.map((l) => ({ name: l.label, value: Math.round(l.annual / 12) })),
      { name: "Vacancy Loss", value: Math.round(uw.income.vacancyLossAnnual / 12) },
    ].filter((e) => e.value > 0);

    return {
      cashIn: uw.capital.cashInvested,
      totalCost: uw.capital.totalProjectCost,
      mortgage: uw.debt.monthlyPI,
      pmi: uw.debt.monthlyMortgageInsurance,
      loanAmt: uw.debt.loanAmount,
      noi: uw.noiAnnual,
      annualCF: uw.cashFlow.annualAfterCapex,
      roi: uw.metrics.cashOnCashAfterCapexPct ?? 0,
      capRate: uw.metrics.capRatePct ?? 0,
      dscr: uw.metrics.dscr ?? 0,
      ltv: uw.metrics.ltvPct ?? 0,
      ltc: uw.metrics.ltcPct ?? 0,
      grm: uw.metrics.grm ?? 0,
      onePctTest: uw.metrics.onePctRulePct ?? 0,
      fiftyPctRule: grossIncomeAnnual * 0.5,
      breakEvenOccupancy: uw.metrics.breakEvenOccupancyPct,
      payback: uw.cashFlow.annualAfterCapex > 0 ? uw.capital.cashInvested / uw.cashFlow.annualAfterCapex : null,
      equityMultiple5: exit5?.equityMultiple ?? null,
      opExMonthly: uw.expenses.totalOperatingAnnual / 12,
      valueBasis: arv > 0 ? arv : price,
      expenseBreakdown,
      projections: uw.projection.years.map((y) => ({
        year: y.year,
        rent: Math.round(y.grossPotentialRent / 12),
        value: Math.round(y.propertyValue),
        cashFlow: Math.round(y.cashFlowAfterCapex),
        equity: Math.round(y.equity),
      })),
    };
  }, [uw, arv, price]);

  /** Canonical Monte Carlo — perturbs the same engine, never a second model. */
  const monteCarlo = useMemo(
    () => runUnderwritingMonteCarlo(uwInputs, { iterations: 1500, seed: 20260214 }),
    [uwInputs],
  );

  // ===== Guardrails: institutional risk-flag layer =====
  const guardrails = useMemo(() => {
    const mcSuccess = 100 - monteCarlo.probNegativeCashFlow;
    const sharpe = monteCarlo.sharpeRatio ?? 0;
    const stdev = monteCarlo.irr.stdev;

    const dci = computeDCI({
      dscr: results.dscr,
      cashOnCash: results.roi,
      mcSuccessRate: mcSuccess,
      netCashFlow: results.annualCF / 12,
    });

    const flags = collectFlags(
      evaluateSharpe(sharpe, stdev),
      evaluateLossProbability(monteCarlo.probNegativeCashFlow, monteCarlo.iterations),
      dci.flag,
      validateExpenses({
        mgmtPct, capexPct, vacancyPct: vacPct, maintPct,
        monthlyRent: rent, yearBuilt: activeProperty.yearBuilt,
      }),
      describeScenarioReturn("Optimistic", monteCarlo.irr.p90, results.ltv),
      describeScenarioReturn("Base", monteCarlo.irr.mean, results.ltv),
      results.annualCF < 0 ? evaluateNegativeCashflow("Base", results.annualCF, years) : null,
      // Pessimistic case comes straight from the canonical stress set.
      (() => {
        const worst = uw.sensitivity.scenarios.reduce<number | null>(
          (min, s) => (min === null || s.annualCashFlow < min ? s.annualCashFlow : min), null);
        return worst !== null && worst < 0 ? evaluateNegativeCashflow("Pessimistic", worst, years) : null;
      })(),
      null,
    );
    return { flags: orderFlags(flags), dci, sharpe, stdev, mcSuccess };
  }, [uw, results, monteCarlo, mgmtPct, vacPct, maintPct, capexPct, rent, years, activeProperty.yearBuilt]);

  const pdfData: UnderwritingReportData = useMemo(() => ({
    propertyName: propName,
    address: activeProperty.address || propName,
    underwriting: uw,
    monteCarlo,
    aiMemo: activeProperty.aiMemo,
    guardrails: guardrails.flags,
    dci: { adjusted: guardrails.dci.adjusted, ceiling: guardrails.dci.ceiling, label: guardrails.dci.label },
  }), [propName, uw, monteCarlo, activeProperty.aiMemo, activeProperty.address, guardrails]);





  return (
    <div className="space-y-6">
      <ModeToggle mode={mode} onChange={setMode} hint="Simple mode hides operating expense % sliders and growth assumptions. Advanced unlocks the full underwriting stack." />
      <div className="panel space-y-6">
        <div>
          <label htmlFor="prop-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Property Name</label>
          <input id="prop-name" value={propName} onChange={(e) => setPropName(e.target.value)} className="input-field" />
        </div>

        <Section title="1 · Acquisition & Financing">
          <Num id="d-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <Num id="d-rehab" label="Rehab Budget ($)" value={rehab} onChange={setRehab} step={500} />
          <Num id="d-arv" label="ARV ($, 0 = use price)" value={arv} onChange={setArv} step={1000} />
          <Num id="d-close" label="Closing Costs (% of price)" value={closingPct} onChange={setClosingPct} step={0.1} />
          <Num id="d-rate" label="Interest Rate (%)" value={interestRate} onChange={setInterestRate} step={0.1} />
          <div>
            <label htmlFor="d-term" className="text-xs font-medium text-muted-foreground block mb-1.5">Loan Term</label>
            <select id="d-term" value={loanTerm} onChange={(e) => setLoanTerm(Number(e.target.value))} className="input-field">
              <option value={15}>15 Years</option>
              <option value={20}>20 Years</option>
              <option value={30}>30 Years</option>
            </select>
          </div>
          <Slider id="d-dp" label={`Down Payment: ${downPct}% ${downPct < 20 ? "· PMI applied" : ""}`} value={downPct} onChange={setDownPct} min={0} max={100} />
        </Section>

        <Section title="2 · Income">
          <Num id="d-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={25} />
          <Num id="d-other" label="Other Income ($/mo — laundry, parking, pet)" value={otherIncome} onChange={setOtherIncome} step={25} />
        </Section>

        {mode === "advanced" && (
          <>
            <Section title="3 · Operating Expenses">
              <Num id="d-tax" label="Property Tax (% of value/yr)" value={taxRatePct} onChange={setTaxRatePct} step={0.05} />
              <Num id="d-ins" label="Insurance (% of value/yr)" value={insRatePct} onChange={setInsRatePct} step={0.05} />
              <Num id="d-hoa" label="HOA ($/mo)" value={hoa} onChange={setHoa} step={10} />
              <Slider id="d-vac" label={`Vacancy: ${vacPct}%`} value={vacPct} onChange={setVacPct} min={0} max={20} />
              <Slider id="d-mgmt" label={`Management: ${mgmtPct}%`} value={mgmtPct} onChange={setMgmtPct} min={0} max={20} />
              <Slider id="d-maint" label={`Maintenance: ${maintPct}%`} value={maintPct} onChange={setMaintPct} min={0} max={20} />
              <Slider id="d-capex" label={`CapEx Reserve: ${capexPct}%`} value={capexPct} onChange={setCapexPct} min={0} max={15} />
            </Section>

            <Section title="4 · Growth Assumptions">
              <Num id="d-rg" label="Rent Growth (%/yr)" value={rentGrowth} onChange={setRentGrowth} step={0.25} />
              <Num id="d-eg" label="Expense Growth (%/yr)" value={expGrowth} onChange={setExpGrowth} step={0.25} />
              <Num id="d-app" label="Appreciation (%/yr)" value={appreciation} onChange={setAppreciation} step={0.25} />
              <Slider id="d-yrs" label={`Hold Period: ${years} yrs`} value={years} onChange={setYears} min={1} max={30} />
            </Section>
          </>
        )}

        <button className="btn-primary w-full pointer-events-none opacity-90">
          <Search className="w-4 h-4" /> Live results below — no need to click
        </button>
      </div>

      <div className="space-y-6 animate-fade-in">
        <SummaryBar title={`${propName} · Year 1`} items={[
          { label: "ROI (CoC)", value: formatPercent(results.roi) },
          { label: "Cap Rate", value: formatPercent(results.capRate) },
          { label: "Cash Flow", value: `${formatCurrency(results.annualCF)}/yr` },
          { label: "Score", value: `${results.score.toFixed(0)}/100` },
        ]} />

        <GuardrailBanner flags={guardrails.flags} />

        <div className="panel flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Deal Confidence Index</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-mono">{guardrails.dci.adjusted}%</span>
              <span className="text-xs text-muted-foreground">/ ceiling {guardrails.dci.ceiling}%</span>
            </div>
            <p className="text-xs font-medium text-primary mt-1">{guardrails.dci.label}</p>
          </div>
          <div className="text-xs text-muted-foreground max-w-md leading-relaxed">
            DCI is bounded by DSCR ({results.dscr.toFixed(2)}), CoC ({formatPercent(results.roi)}), and Monte-Carlo success rate ({guardrails.mcSuccess.toFixed(0)}%).
            Sharpe estimate: {guardrails.sharpe.toFixed(2)} (σ ≈ {guardrails.stdev.toFixed(2)}%).
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Total Cash In" value={formatCurrency(results.cashIn)} subtitle="Down + closing + rehab"
            formula="(Price × Down%) + Rehab + (Price × Closing%)" />
          <MetricCard label="Mortgage" value={`${formatCurrency(results.mortgage + results.pmi)}/mo`} subtitle={results.pmi > 0 ? `incl. ${formatCurrency(results.pmi)} PMI` : "P&I"}
            formula="P × [r(1+r)^n] / [(1+r)^n − 1]" formulaNote="r = monthly rate, n = term in months" />
          <MetricCard label="NOI" value={`${formatCurrency(results.noi)}/yr`}
            formula="(Gross Income − Vacancy − OpEx) × 12" formulaNote="OpEx excludes debt service" />
          <MetricCard label="1% Rule" value={`${results.onePctTest.toFixed(2)}%`} variant={results.onePctTest >= 1 ? "success" : results.onePctTest >= 0.7 ? "warning" : "danger"} subtitle="rent ÷ price"
            formula="(Monthly Rent ÷ Purchase Price) × 100" formulaNote="≥ 1% is the classic cash-flow screen" />
          {mode === "advanced" && (
            <>
              <MetricCard label="DSCR" value={results.dscr.toFixed(2)} variant={results.dscr >= 1.25 ? "success" : results.dscr >= 1.2 ? "warning" : "danger"} subtitle="≥1.25 lender OK"
                formula="NOI ÷ Annual Debt Service" formulaNote="Below 1.20 most DSCR lenders decline" />
              <MetricCard label="LTV" value={formatPercent(results.ltv)}
                formula="Loan Amount ÷ Property Value" />
              <MetricCard label="GRM" value={results.grm.toFixed(1)} subtitle="price ÷ annual rent"
                formula="Price ÷ (Gross Monthly Income × 12)" />
              <MetricCard label="50% Rule OpEx" value={`${formatCurrency(results.fiftyPctRule / 12)}/mo`} subtitle="implied ceiling"
                formula="Gross Income × 50%" formulaNote="Quick sanity check on operating expenses" />
              <MetricCard label="Payback" value={results.payback ? `${results.payback.toFixed(1)} yrs` : "∞"}
                formula="Total Cash In ÷ Annual Cash Flow" />
              <MetricCard label="5-yr Equity Mult." value={`${results.equityMultiple5.toFixed(2)}x`} subtitle="total return / cash in" variant={results.equityMultiple5 >= 2 ? "success" : "default"}
                formula="(Cumulative CF + Year-5 Equity) ÷ Cash In" formulaNote="Includes amortization and appreciation" />
              <MetricCard label="Year-1 OpEx" value={`${formatCurrency(results.noi / 12 > 0 ? (rent + otherIncome) - results.noi / 12 : 0)}/mo`}
                formula="Gross Income − (NOI ÷ 12)" />
              <MetricCard label="Break-even Occ." value={`${Math.max(0, Math.min(100, ((results.mortgage + results.pmi) * 12 / Math.max(1, (rent + otherIncome) * 12)) * 100)).toFixed(0)}%`} subtitle="to cover debt"
                formula="Annual Debt Service ÷ Annual Gross Income" />
            </>
          )}
        </div>

        <DealScorePanel
          score={results.score}
          breakdown={results.scoreBreakdown}
          inputs={{
            roi: results.roi,
            capRate: results.capRate,
            dscr: results.dscr,
            onePctTest: results.onePctTest,
            annualCF: results.annualCF,
          }}
        />

        <div className="panel">
          <h3 className="text-lg font-semibold mb-4 font-display">Monthly expense breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={results.expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={70} outerRadius={110} paddingAngle={3}
                label={({ name, value }) => `${name}: $${value}`}>
                {results.expenseBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="hsl(235 50% 11%)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {mode === "advanced" && (
          <div className="panel">
            <h3 className="text-lg font-semibold mb-4 font-display">{years}-year projections</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results.projections}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 30% 22%)" />
                <XAxis dataKey="year" stroke="hsl(240 18% 72%)" fontSize={12} />
                <YAxis stroke="hsl(240 18% 72%)" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="cashFlow" name="Annual Cash Flow" fill="hsl(244 75% 62%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="equity" name="Equity" fill="hsl(152 70% 55%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="panel space-y-4">
          <div>
            <h3 className="text-sm font-semibold font-display">Executive Underwriting Report</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Institutional-grade PDF — capital stack, monthly cash flow, and Monte Carlo risk. Ready for lenders and equity partners.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AIMemoGenerator reportData={pdfData} />
            <PdfDownloadButton data={pdfData} label={activeProperty.aiMemo ? "Export PDF (with AI Memo)" : "Export PDF"} />
          </div>
          {activeProperty.aiMemo && (
            <p className="text-[11px] text-muted-foreground -mt-1">
              A saved AI memo will be stitched as cover pages 1–2 of the exported report.
            </p>
          )}
        </div>

        <div className="panel text-xs text-muted-foreground flex items-start gap-2">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span>NOI excludes mortgage. Cap rate uses ARV when set. PMI auto-applies under 20% down at 0.75% of loan/yr. Update assumptions to stress-test the deal.</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{children}</div>
    </div>
  );
}

function BreakEvenTab() {
  const [price, setPrice] = useState(250000);
  const [downPct, setDownPct] = useState(20);
  const [intRate, setIntRate] = useState(6.5);
  const [term, setTerm] = useState(30);
  const [ti, setTi] = useState(300);
  const [hoa, setHoa] = useState(0);
  const [maintPct, setMaintPct] = useState(10);
  const [mgmtPct, setMgmtPct] = useState(8);
  const [vacPct, setVacPct] = useState(5);
  const [capexPct, setCapexPct] = useState(5);

  const mortgage = calculateMortgage(price, downPct, intRate, term);
  const fixed = ti + hoa;
  const breakeven = findBreakeven(mortgage, fixed, maintPct + capexPct, mgmtPct, vacPct);

  const chartData = breakeven ? Array.from({ length: 32 }, (_, i) => {
    const r = breakeven - 800 + i * 50;
    const variable = r * (maintPct + capexPct + mgmtPct + vacPct) / 100;
    return { rent: r, cashFlow: Math.round(r - (mortgage + fixed + variable)) };
  }) : [];

  return (
    <div className="space-y-6">
      <div className="panel">
        <h3 className="text-lg font-semibold mb-4 font-display flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" /> Break-Even Calculator</h3>
        <p className="text-sm text-muted-foreground mb-5">Lowest monthly rent that still covers PITI + HOA + maintenance + management + CapEx + vacancy.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField id="be-price" label="Purchase Price ($)" value={price} onChange={setPrice} step={1000} />
          <InputField id="be-rate" label="Interest Rate (%)" value={intRate} onChange={setIntRate} step={0.1} />
          <InputField id="be-ti" label="Tax+Ins ($/mo)" value={ti} onChange={setTi} step={25} />
          <InputField id="be-hoa" label="HOA ($/mo)" value={hoa} onChange={setHoa} step={10} />
          <div>
            <label htmlFor="be-term" className="text-xs font-medium text-muted-foreground block mb-1.5">Loan Term</label>
            <select id="be-term" value={term} onChange={(e) => setTerm(Number(e.target.value))} className="input-field">
              <option value={15}>15 Years</option>
              <option value={20}>20 Years</option>
              <option value={30}>30 Years</option>
            </select>
          </div>
          <SliderField id="be-dp" label={`Down Payment: ${downPct}%`} value={downPct} onChange={setDownPct} min={0} max={100} />
          <SliderField id="be-mt" label={`Maintenance: ${maintPct}%`} value={maintPct} onChange={setMaintPct} min={0} max={30} />
          <SliderField id="be-cx" label={`CapEx: ${capexPct}%`} value={capexPct} onChange={setCapexPct} min={0} max={20} />
          <SliderField id="be-mg" label={`Management: ${mgmtPct}%`} value={mgmtPct} onChange={setMgmtPct} min={0} max={20} />
          <SliderField id="be-vc" label={`Vacancy: ${vacPct}%`} value={vacPct} onChange={setVacPct} min={0} max={20} />
        </div>
      </div>

      {breakeven ? (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Break-Even Rent" value={formatCurrency(breakeven)} subtitle="/month" variant="success" />
            <MetricCard label="Mortgage (P&I)" value={formatCurrency(mortgage)} subtitle="/month" />
            <MetricCard label="Fixed Costs" value={formatCurrency(fixed)} subtitle="tax+ins+HOA" />
            <MetricCard label="Margin Buffer" value={`${maintPct + capexPct + mgmtPct + vacPct}%`} subtitle="of rent reserved" />
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
          <p className="text-destructive font-medium">No break-even rent below $6,000/mo. Try a lower price or higher down payment.</p>
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
  const [otherDebt, setOtherDebt] = useState(0); // monthly debt obligations
  const [dtiCap, setDtiCap] = useState(43);      // total debt-to-income cap

  const reqMonthlyIncome = rent / (ratio / 100);
  const reqAnnualIncome = reqMonthlyIncome * 12;
  const monthlyIncome = period === "monthly" ? income : income / 12;
  const affordableByRatio = monthlyIncome * (ratio / 100);
  const affordableByDti = monthlyIncome * (dtiCap / 100) - otherDebt;
  const affordable = Math.max(0, Math.min(affordableByRatio, affordableByDti));

  return (
    <div className="space-y-6">
      <div className="panel space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 font-display"><Users className="w-5 h-5 text-primary" /> Tenant Affordability</h3>
        <p className="text-sm text-muted-foreground">Most lenders/PMs use a 30% rent-to-income cap and a 43% total DTI cap. Tweak both to match your screening criteria.</p>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setMode("income")} className={`tab-pill ${mode === "income" ? "tab-pill-active" : "tab-pill-inactive"}`}>
            Required income from rent
          </button>
          <button onClick={() => setMode("rent")} className={`tab-pill ${mode === "rent" ? "tab-pill-active" : "tab-pill-inactive"}`}>
            Max rent from income
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SliderField id="aff-ratio" label={`Rent-to-Income Ratio: ${ratio}%`} value={ratio} onChange={setRatio} min={10} max={50} />
          <SliderField id="aff-dti" label={`Total DTI Cap: ${dtiCap}%`} value={dtiCap} onChange={setDtiCap} min={20} max={60} />
        </div>

        {mode === "income" ? (
          <div className="space-y-4">
            <InputField id="aff-rent" label="Monthly Rent ($)" value={rent} onChange={setRent} step={50} />
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Required Monthly Income" value={formatCurrency(reqMonthlyIncome)} variant="success" />
              <MetricCard label="Required Annual Income" value={formatCurrency(reqAnnualIncome)} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setPeriod("monthly")} className={`tab-pill text-xs ${period === "monthly" ? "tab-pill-active" : "tab-pill-inactive"}`}>Monthly</button>
              <button onClick={() => setPeriod("annual")} className={`tab-pill text-xs ${period === "annual" ? "tab-pill-active" : "tab-pill-inactive"}`}>Annual</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField id="aff-inc" label={`${period === "monthly" ? "Monthly" : "Annual"} Income ($)`} value={income} onChange={setIncome} step={1000} />
              <InputField id="aff-debt" label="Other Monthly Debt ($)" value={otherDebt} onChange={setOtherDebt} step={50} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard label="Max Rent (rent ratio)" value={formatCurrency(affordableByRatio)} />
              <MetricCard label="Max Rent (DTI cap)" value={formatCurrency(Math.max(0, affordableByDti))} />
              <MetricCard label="Tenant Approval Cap" value={formatCurrency(affordable)} subtitle="lower of the two" variant="success" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Num({ id, label, value, onChange, step = 1, nonNegative = true }: { id?: string; label: string; value: number; onChange: (v: number) => void; step?: number; nonNegative?: boolean }) {
  return <InputField id={id} label={label} value={value} onChange={onChange} step={step} nonNegative={nonNegative} />;
}
function Slider({ id, label, value, onChange, min, max }: { id?: string; label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return <SliderField id={id} label={label} value={value} onChange={onChange} min={min} max={max} />;
}

function InputField({
  id, label, value, onChange, step = 1, nonNegative = true,
}: { id?: string; label: string; value: number; onChange: (v: number) => void; step?: number; nonNegative?: boolean }) {
  const inputId = id || label.replace(/\s+/g, "-").toLowerCase();
  const invalid = nonNegative && value < 0;
  const errorId = `${inputId}-err`;
  return (
    <div>
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <input
        id={inputId}
        type="number"
        value={value}
        step={step}
        min={nonNegative ? 0 : undefined}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`input-field font-mono ${invalid ? "border-destructive ring-1 ring-destructive/60 focus:ring-destructive" : ""}`}
      />
      {invalid && (
        <p id={errorId} className="mt-1 text-[10px] font-medium text-destructive">
          Value cannot be negative — enter 0 or more.
        </p>
      )}
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
