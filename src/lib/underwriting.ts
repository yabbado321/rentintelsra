/**
 * RentIntel Canonical Underwriting Engine
 * -----------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for every financial metric displayed anywhere in the
 * application (Deal Analyzer, Comparison, Long-Term Analysis, Deal Score,
 * Monte Carlo, PDF export, Portfolio).
 *
 * Rules enforced here:
 *  - Vacancy is subtracted exactly once (Gross Potential Rent -> EGI).
 *  - CapEx is NEVER inside NOI. It is a below-NOI cash item.
 *  - Debt service, income taxes and depreciation are NEVER inside NOI.
 *  - LTV is loan / purchase price. Loan-to-ARV is reported separately.
 *  - Nothing is invented: unknown inputs stay `undefined` and metrics that
 *    require them return `null` (render as "Unavailable").
 *
 * All money values are USD. Every field name states its period explicitly
 * (`Monthly` / `Annual`) or is annual by convention where noted.
 */

import type { GuardrailFlag } from "./guardrails";

/* ==========================================================================
 * Inputs
 * ========================================================================== */

export type AmountMode = "pct" | "amount";

/** A cost the user may enter as a % (of value or of income) OR as dollars. */
export interface FlexAmount {
  mode: AmountMode;
  /** % when mode === "pct", annual dollars when mode === "amount". */
  value: number;
  /** True when the value is a RentIntel/market estimate, not a user-verified figure. */
  estimated?: boolean;
}

export const pct = (value: number, estimated = false): FlexAmount => ({ mode: "pct", value, estimated });
export const dollars = (value: number, estimated = false): FlexAmount => ({ mode: "amount", value, estimated });

export interface PropertyRiskFacts {
  yearBuilt?: number;
  roofAge?: number;
  hvacAge?: number;
  waterHeaterAge?: number;
  electricalAge?: number;
  plumbingAge?: number;
  foundationType?: string;
  floodRisk?: "none" | "low" | "moderate" | "high" | "unknown";
  floodInsuranceRequired?: boolean;
  specialAssessments?: number;
  knownDeferredMaintenance?: number;
}

/** Observed market data — never mixed with property data or model assumptions. */
export interface MarketContext {
  zip?: string;
  medianRent?: number;        // ZIP median gross rent, monthly
  vacancyRatePct?: number;    // ZIP rental vacancy
  medianHomeValue?: number;
  medianHouseholdIncome?: number;
  population?: number;
  rentTrendPct?: number;      // YoY change, if published
}

export interface UnderwritingInputs {
  /* --- Acquisition --------------------------------------------------- */
  purchasePrice: number;
  downPaymentPct: number;
  interestRatePct: number;
  loanTermYears: number;
  closingCostPct: number;
  rehabBudget: number;
  /** Loan origination points, % of loan amount. */
  pointsPct?: number;
  /** Flat lender fees in dollars. Overrides loanFeesPct when provided. */
  loanFees?: number;
  /** Lender fees as % of the loan amount, used when loanFees is undefined. */
  loanFeesPct?: number;

  /** Carry cost between funding and stabilization (dollars). */
  holdingCosts?: number;
  /** Number of months of debt service used to derive holding costs when holdingCosts is undefined. */
  holdingMonths?: number;
  inspectionFee?: number;
  appraisalFee?: number;
  /** Contingency on the rehab scope, % of rehab budget. */
  rehabContingencyPct?: number;
  otherAcquisitionCosts?: number;
  sellerCredits?: number;

  financingType?: "Conventional" | "FHA" | "VA" | "Private" | "Other";
  /** After-repair value. Used for Loan-to-ARV and exit sanity checks only. */
  arv?: number;
  holdYears: number;

  /* --- Property facts ------------------------------------------------ */
  units?: number;
  squareFeet?: number;
  risk?: PropertyRiskFacts;

  /* --- Income --------------------------------------------------------- */
  /** Total monthly base rent across all units (or per-unit x units, resolved by caller). */
  monthlyBaseRent: number;
  otherIncome?: {
    parking?: number;
    laundry?: number;
    petRent?: number;
    storage?: number;
    other?: number;
  };

  /* --- Operating expenses --------------------------------------------- */
  vacancyPct: number;
  /** % of property value per year, or annual dollars. */
  propertyTaxes: FlexAmount;
  insurance: FlexAmount;
  hoaMonthly?: number;
  /** % of EGI, or annual dollars. */
  management: FlexAmount;
  /** % of EGI, or annual dollars. Recurring repairs — inside NOI. */
  maintenance: FlexAmount;
  /** % of EGI, or annual dollars. Replacement reserve — OUTSIDE NOI. */
  capexReserve: FlexAmount;
  ownerUtilitiesMonthly?: number;
  /** Optional recurring line items, monthly dollars. */
  otherOperating?: {
    landscaping?: number;
    snowRemoval?: number;
    pestControl?: number;
    trash?: number;
    waterSewer?: number;
    accounting?: number;
    legal?: number;
    licensing?: number;
    other?: number;
  };

  /* --- Projection assumptions (RentIntel assumptions, never "data") ---- */
  rentGrowthPct: number;
  expenseGrowthPct: number;
  appreciationPct: number;
  /** When set, exit value = final-year NOI / exitCapRatePct. */
  exitCapRatePct?: number;
  sellingCostPct: number;

  /* --- Tax assumptions -------------------------------------------------- */
  taxModelEnabled?: boolean;
  marginalTaxRatePct?: number;
  capitalGainsRatePct?: number;
  landAllocationPct?: number;
  depreciationYears?: number;

  /* --- Sensitivity configuration ---------------------------------------- */
  rentSensitivityPct?: number;   // default 10
  expenseSensitivityPct?: number; // default 15

  /* --- Market (observed, optional) -------------------------------------- */
  market?: MarketContext;
}

/* ==========================================================================
 * Defaults / normalisation
 * ========================================================================== */

export const DEFAULT_INPUTS: UnderwritingInputs = {
  purchasePrice: 250000,
  downPaymentPct: 20,
  interestRatePct: 6.5,
  loanTermYears: 30,
  closingCostPct: 3,
  rehabBudget: 0,
  holdYears: 10,
  units: 1,
  monthlyBaseRent: 2000,
  vacancyPct: 5,
  propertyTaxes: pct(1.1, true),
  insurance: pct(0.5, true),
  hoaMonthly: 0,
  management: pct(8, true),
  maintenance: pct(5, true),
  capexReserve: pct(5, true),
  rentGrowthPct: 3,
  expenseGrowthPct: 3,
  appreciationPct: 3,
  sellingCostPct: 7,
  taxModelEnabled: true,
  marginalTaxRatePct: 24,
  capitalGainsRatePct: 15,
  landAllocationPct: 20,
  depreciationYears: 27.5,
  rentSensitivityPct: 10,
  expenseSensitivityPct: 15,
  // Acquisition cost conventions (all overridable per deal).
  pointsPct: 0,
  loanFeesPct: 1,
  holdingMonths: 2,
  inspectionFee: 500,
  appraisalFee: 650,
  rehabContingencyPct: 10,
};


const sum = (o?: Record<string, number | undefined>) =>
  o ? Object.values(o).reduce((a: number, b) => a + (Number(b) || 0), 0) : 0;

const safeDiv = (a: number, b: number): number | null => (b > 0 && isFinite(a / b) ? a / b : null);

/* ==========================================================================
 * Debt primitives
 * ========================================================================== */

/** Level-payment monthly principal & interest. Handles 0% rate and 0 loan. */
export function monthlyPayment(loanAmount: number, annualRatePct: number, termYears: number): number {
  const n = Math.round(termYears * 12);
  if (loanAmount <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return loanAmount / n;
  return (loanAmount * r) / (1 - Math.pow(1 + r, -n));
}

export interface AmortYear {
  year: number;
  interest: number;
  principal: number;
  endingBalance: number;
}

/** Year-by-year amortization schedule (monthly compounding). */
export function amortize(loanAmount: number, annualRatePct: number, termYears: number, years: number): AmortYear[] {
  const pay = monthlyPayment(loanAmount, annualRatePct, termYears);
  const r = annualRatePct / 100 / 12;
  let balance = loanAmount;
  const out: AmortYear[] = [];
  for (let y = 1; y <= years; y++) {
    let interest = 0;
    let principal = 0;
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const i = balance * r;
      const p = Math.min(pay - i, balance);
      balance -= p;
      interest += i;
      principal += p;
    }
    out.push({ year: y, interest, principal, endingBalance: Math.max(0, balance) });
  }
  return out;
}

/** Newton-Raphson IRR with bisection fallback. Returns decimal (0.12 = 12%). */
export function irr(cashflows: number[]): number | null {
  const hasPos = cashflows.some((c) => c > 0);
  const hasNeg = cashflows.some((c) => c < 0);
  if (!hasPos || !hasNeg) return null;
  const npv = (rate: number) =>
    cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);

  let rate = 0.1;
  for (let i = 0; i < 80; i++) {
    const f = npv(rate);
    const d = (npv(rate + 1e-6) - f) / 1e-6;
    if (!isFinite(d) || Math.abs(d) < 1e-12) break;
    const next = rate - f / d;
    if (!isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-9) return next > -0.9999 ? next : null;
    rate = Math.max(-0.9, Math.min(next, 10));
  }
  // Bisection fallback
  let lo = -0.9;
  let hi = 10;
  let flo = npv(lo);
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (flo * fm <= 0) hi = mid;
    else { lo = mid; flo = fm; }
  }
  const result = (lo + hi) / 2;
  return Math.abs(npv(result)) < 1 ? result : null;
}

/* ==========================================================================
 * Result shape
 * ========================================================================== */

export interface ExpenseLine {
  key: string;
  label: string;
  annual: number;
  estimated: boolean;
  /** false for CapEx reserve — excluded from NOI. */
  inNOI: boolean;
}

export interface YearRow {
  year: number;
  grossPotentialRent: number;
  vacancyLoss: number;
  otherIncome: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  noi: number;
  interest: number;
  principal: number;
  debtService: number;
  capex: number;
  cashFlowBeforeCapex: number;
  cashFlowAfterCapex: number;
  depreciation: number;
  taxableIncome: number;
  incomeTax: number;
  afterTaxCashFlow: number;
  loanBalance: number;
  propertyValue: number;
  equity: number;
}

export interface ExitResult {
  method: "appreciation" | "exit-cap";
  grossSalePrice: number;
  sellingCosts: number;
  loanPayoff: number;
  netProceedsPreTax: number;
  capitalGainsTax: number;
  depreciationRecaptureTax: number;
  netProceedsAfterTax: number;
  totalDepreciationTaken: number;
  adjustedBasis: number;
}

export interface ScenarioResult {
  label: string;
  noi: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  dscr: number | null;
  cashOnCashPct: number | null;
  capRatePct: number | null;
}

/**
 * A stress scenario carries the full income statement so the report can show
 * gross rent → vacancy → EGI → OpEx → NOI → debt service → cash flow → DSCR.
 */
export interface StressScenarioResult extends ScenarioResult {
  key: string;
  group: "rent" | "vacancy" | "opex" | "rate" | "management";
  grossPotentialRent: number;
  otherIncome: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  debtService: number;
  capexReserve: number;
  cashInvested: number;
  deltaCashFlow: number;
  deltaDscr: number | null;
  breakEvenOccupancyPct: number | null;
  /** Cash flow ≥ 0 and DSCR ≥ 1.20. */
  pass: boolean;
}

/** Exit outcome for one explicitly-labelled holding period. */
export interface ExitScenario {
  holdYears: number;
  label: string;
  method: "appreciation" | "exit-cap";
  finalYearNoi: number;
  propertyValue: number;
  grossSalePrice: number;
  sellingCosts: number;
  loanPayoff: number;
  netProceedsPreTax: number;
  capitalGainsTax: number;
  depreciationRecaptureTax: number;
  netProceedsAfterTax: number;
  cumulativeCashFlow: number;
  totalDistributions: number;
  contributedCapital: number;
  equityMultiple: number | null;
  irrPreTaxPct: number | null;
  irrAfterTaxPct: number | null;
  annualizedReturnPct: number | null;
}


export interface DebtSensitivityRow {
  label: string;
  monthlyPayment: number;
  cashInvested: number;
  annualCashFlow: number;
  dscr: number | null;
  cashOnCashPct: number | null;
}

export interface ScoreCategory {
  key: "cashFlow" | "debtSafety" | "return" | "downsideRisk" | "market";
  label: string;
  score: number;
  max: number;
  detail: string;
}

export interface DealScore {
  total: number;              // 0-100, normalised when market data is absent
  categories: ScoreCategory[];
  marketScored: boolean;
  verdict: "Excellent" | "Good" | "Marginal" | "Poor";
  explanation: string;
}

export interface ReconciliationLine {
  label: string;
  value: number | null;
  op: "+" | "-" | "=" | "";
  indent?: boolean;
}

export interface UnderwritingResult {
  inputs: UnderwritingInputs;

  income: {
    grossPotentialRentAnnual: number;
    otherIncomeAnnual: number;
    vacancyLossAnnual: number;
    effectiveGrossIncomeAnnual: number;
  };

  expenses: {
    lines: ExpenseLine[];
    totalOperatingAnnual: number;   // NOI expenses only (excludes CapEx)
    capexReserveAnnual: number;
    estimatedShare: number;         // 0..1 share of opex that is estimated
  };

  noiAnnual: number;

  debt: {
    loanAmount: number;
    monthlyPI: number;
    annualPI: number;
    monthlyMortgageInsurance: number;
    annualDebtService: number;      // P&I + mortgage insurance
  };

  cashFlow: {
    annualBeforeCapex: number;
    annualAfterCapex: number;
    monthlyBeforeCapex: number;
    monthlyAfterCapex: number;
  };

  /**
   * Sources and uses of capital — the ONLY definition of project cost and
   * investor equity used anywhere in the application.
   *
   *   Total Project Cost = purchase price + closing costs + lender fees/points
   *                      + rehab + rehab contingency + holding costs
   *                      + inspection + appraisal + other acquisition costs
   *                      − seller credits
   *   Investor Equity (= "Cash Invested") = Total Project Cost − Loan Amount
   */
  capital: {
    downPayment: number;
    closingCosts: number;
    rehab: number;
    rehabContingency: number;
    points: number;
    loanFees: number;
    /** points + flat lender fees */
    financingCosts: number;
    holdingCosts: number;
    inspection: number;
    appraisal: number;
    otherAcquisitionCosts: number;
    sellerCredits: number;
    loanAmount: number;
    /** Sum of every use of funds. */
    totalProjectCost: number;
    /** Total Project Cost − Loan Amount. This IS "cash invested". */
    investorEquity: number;
    /** Alias of investorEquity — the single definition of cash invested. */
    cashInvested: number;
    /** Alias of totalProjectCost, kept for readability in cost-basis metrics. */
    allInCost: number;
    allInPerUnit: number | null;
    allInPerSqFt: number | null;
    uses: { key: string; label: string; amount: number; estimated: boolean }[];
    sources: { key: string; label: string; amount: number; sharePct: number }[];
  };

  metrics: {
    capRatePct: number | null;
    capRateAllInPct: number | null;
    yieldOnCostPct: number | null;
    cashOnCashBeforeCapexPct: number | null;
    cashOnCashAfterCapexPct: number | null;
    dscr: number | null;
    debtYieldPct: number | null;
    grm: number | null;
    ltvPct: number | null;
    /** Loan ÷ Total Project Cost. The only loan-to-cost figure in the app. */
    ltcPct: number | null;
    loanToArvPct: number | null;
    equitySharePct: number | null;
    expenseRatioPct: number | null;
    breakEvenOccupancyPct: number | null;
    breakEvenRentMonthly: number | null;
    pricePerSqFt: number | null;
    noiPerSqFt: number | null;
    rentPerSqFtMonthly: number | null;
    onePctRulePct: number | null;
  };


  projection: {
    years: YearRow[];
    preTaxCashflowStream: number[];
    afterTaxCashflowStream: number[];
    irrPreTaxPct: number | null;
    irrAfterTaxPct: number | null;
    /** Total positive investor distributions ÷ total contributed capital. */
    equityMultiple: number | null;
    totalRoiPct: number | null;
    totalCashFlow: number;
    totalDistributions: number;
    contributedCapital: number;
    appreciationGain: number;
    principalPaydown: number;
    endingEquity: number;
    exit: ExitResult;
    /** Explicitly-labelled holding-period exits (3 / 5 / 10 / 35 years). */
    exitScenarios: ExitScenario[];
  };

  sensitivity: {
    /** Canonical stress set — each row re-runs the engine end to end. */
    scenarios: StressScenarioResult[];
    rent: ScenarioResult[];
    expense: ScenarioResult[];
    debt: {
      interestRate: DebtSensitivityRow[];
      downPayment: DebtSensitivityRow[];
      loanTerm: DebtSensitivityRow[];
    };
  };


  score: DealScore;
  flags: GuardrailFlag[];
  reconciliation: ReconciliationLine[];
}

/* ==========================================================================
 * Core engine
 * ========================================================================== */

function resolveFlex(f: FlexAmount, pctBase: number): { annual: number; estimated: boolean } {
  if (!f) return { annual: 0, estimated: false };
  return {
    annual: f.mode === "pct" ? (pctBase * f.value) / 100 : f.value,
    estimated: Boolean(f.estimated),
  };
}

interface CoreSnapshot {
  gpr: number;
  otherIncome: number;
  vacancyLoss: number;
  egi: number;
  lines: ExpenseLine[];
  totalOperating: number;
  capex: number;
  noi: number;
}

/**
 * Year-1 income statement for a given rent / vacancy / expense-multiplier
 * combination. Every scenario, sensitivity and Monte Carlo path routes through
 * this function so no metric can diverge.
 */
function incomeStatement(
  i: UnderwritingInputs,
  opts: { monthlyRent?: number; vacancyPct?: number; expenseMultiplier?: number } = {},
): CoreSnapshot {
  const monthlyRent = opts.monthlyRent ?? i.monthlyBaseRent;
  const vacancyPct = opts.vacancyPct ?? i.vacancyPct;
  const em = opts.expenseMultiplier ?? 1;

  const gpr = monthlyRent * 12;
  const otherIncomeMonthly = sum(i.otherIncome);
  const otherIncome = otherIncomeMonthly * 12;
  // Vacancy/credit loss applies to scheduled rent and to occupancy-linked income.
  const vacancyLoss = (gpr + otherIncome) * (vacancyPct / 100);
  const egi = gpr + otherIncome - vacancyLoss;

  const valueBasis = i.purchasePrice;
  const taxes = resolveFlex(i.propertyTaxes, valueBasis);
  const ins = resolveFlex(i.insurance, valueBasis);
  const mgmt = resolveFlex(i.management, egi);
  const maint = resolveFlex(i.maintenance, egi);
  const capexRes = resolveFlex(i.capexReserve, egi);

  const lines: ExpenseLine[] = [
    { key: "taxes", label: "Property Taxes", annual: taxes.annual * em, estimated: taxes.estimated, inNOI: true },
    { key: "insurance", label: "Insurance", annual: ins.annual * em, estimated: ins.estimated, inNOI: true },
    { key: "hoa", label: "HOA", annual: (i.hoaMonthly || 0) * 12 * em, estimated: false, inNOI: true },
    { key: "management", label: "Property Management", annual: mgmt.annual * em, estimated: mgmt.estimated, inNOI: true },
    { key: "maintenance", label: "Maintenance & Repairs", annual: maint.annual * em, estimated: maint.estimated, inNOI: true },
    { key: "utilities", label: "Owner-Paid Utilities", annual: (i.ownerUtilitiesMonthly || 0) * 12 * em, estimated: false, inNOI: true },
    { key: "other", label: "Other Recurring Operating", annual: sum(i.otherOperating) * 12 * em, estimated: false, inNOI: true },
    { key: "capex", label: "CapEx Reserve (below NOI)", annual: capexRes.annual * em, estimated: capexRes.estimated, inNOI: false },
  ].filter((l) => l.annual !== 0 || l.key === "capex");

  const totalOperating = lines.filter((l) => l.inNOI).reduce((a, l) => a + l.annual, 0);
  const capex = lines.find((l) => l.key === "capex")?.annual ?? 0;

  return { gpr, otherIncome, vacancyLoss, egi, lines, totalOperating, capex, noi: egi - totalOperating };
}

function debtFor(i: UnderwritingInputs, overrides: { downPaymentPct?: number; interestRatePct?: number; loanTermYears?: number } = {}) {
  const downPct = overrides.downPaymentPct ?? i.downPaymentPct;
  const rate = overrides.interestRatePct ?? i.interestRatePct;
  const term = overrides.loanTermYears ?? i.loanTermYears;
  const loanAmount = Math.max(0, i.purchasePrice * (1 - downPct / 100));
  const monthlyPI = monthlyPayment(loanAmount, rate, term);
  // Mortgage insurance: conventional loans above 80% LTV, 0.75%/yr of loan.
  const monthlyMortgageInsurance = downPct < 20 && loanAmount > 0 ? (loanAmount * 0.0075) / 12 : 0;
  return {
    downPct, rate, term, loanAmount, monthlyPI, monthlyMortgageInsurance,
    annualPI: monthlyPI * 12,
    annualDebtService: (monthlyPI + monthlyMortgageInsurance) * 12,
  };
}

/**
 * Sources & uses of capital. This is the ONLY place project cost and investor
 * equity are defined. Every screen, the Deal Score and the PDF read from here.
 *
 *   Total Project Cost = purchase + closing + points + lender fees + rehab
 *                      + rehab contingency + holding + inspection + appraisal
 *                      + other acquisition costs − seller credits
 *   Investor Equity ("cash invested") = Total Project Cost − Loan Amount
 *   LTC = Loan Amount / Total Project Cost
 */
function capitalFor(i: UnderwritingInputs, downPaymentPct?: number) {
  const downPct = downPaymentPct ?? i.downPaymentPct;
  const downPayment = i.purchasePrice * (downPct / 100);
  const loanAmount = Math.max(0, i.purchasePrice * (1 - downPct / 100));
  const closingCosts = i.purchasePrice * (i.closingCostPct / 100);
  const rehab = i.rehabBudget || 0;
  const rehabContingency = rehab * ((i.rehabContingencyPct ?? 0) / 100);
  const points = ((i.pointsPct || 0) / 100) * loanAmount;
  const loanFees =
    i.loanFees !== undefined ? i.loanFees : ((i.loanFeesPct ?? 0) / 100) * loanAmount;
  const financingCosts = points + loanFees;
  const monthlyPI = monthlyPayment(loanAmount, i.interestRatePct, i.loanTermYears);
  const holdingCosts =
    i.holdingCosts !== undefined ? i.holdingCosts : monthlyPI * (i.holdingMonths ?? 0);
  const inspection = i.inspectionFee ?? 0;
  const appraisal = i.appraisalFee ?? 0;
  const otherAcquisitionCosts = i.otherAcquisitionCosts || 0;
  const sellerCredits = i.sellerCredits || 0;

  const uses = [
    { key: "purchase", label: "Purchase Price", amount: i.purchasePrice, estimated: false },
    { key: "closing", label: `Closing Costs (${i.closingCostPct}%)`, amount: closingCosts, estimated: true },
    { key: "points", label: "Loan Points", amount: points, estimated: false },
    { key: "loanFees", label: "Lender / Origination Fees", amount: loanFees, estimated: i.loanFees === undefined },
    { key: "rehab", label: "Rehab / CapEx Scope", amount: rehab, estimated: false },
    { key: "contingency", label: `Rehab Contingency (${i.rehabContingencyPct ?? 0}%)`, amount: rehabContingency, estimated: true },
    { key: "holding", label: "Holding / Carry Costs", amount: holdingCosts, estimated: i.holdingCosts === undefined },
    { key: "inspection", label: "Inspection", amount: inspection, estimated: true },
    { key: "appraisal", label: "Appraisal", amount: appraisal, estimated: true },
    { key: "other", label: "Other Acquisition Costs", amount: otherAcquisitionCosts, estimated: false },
    { key: "credits", label: "Seller Credits", amount: -sellerCredits, estimated: false },
  ].filter((u) => u.amount !== 0);

  const totalProjectCost = uses.reduce((a, u) => a + u.amount, 0);
  const investorEquity = Math.max(0, totalProjectCost - loanAmount);
  const sources = [
    { key: "loan", label: "Senior Debt", amount: loanAmount, sharePct: totalProjectCost > 0 ? (loanAmount / totalProjectCost) * 100 : 0 },
    { key: "equity", label: "Investor Equity (Cash Invested)", amount: investorEquity, sharePct: totalProjectCost > 0 ? (investorEquity / totalProjectCost) * 100 : 0 },
  ];

  return {
    downPayment,
    closingCosts,
    rehab,
    rehabContingency,
    points,
    loanFees,
    financingCosts,
    holdingCosts,
    inspection,
    appraisal,
    otherAcquisitionCosts,
    sellerCredits,
    loanAmount,
    totalProjectCost,
    investorEquity,
    /** Alias — the single definition of cash invested. */
    cashInvested: investorEquity,
    /** Alias — total project cost is the all-in cost basis. */
    allInCost: totalProjectCost,
    uses,
    sources,
  };
}


/** Solve break-even occupancy (income covers opex + debt service) by bisection. */
function solveBreakEvenOccupancy(i: UnderwritingInputs, annualDebtService: number): number | null {
  const f = (occ: number) => {
    const s = incomeStatement(i, { vacancyPct: (1 - occ) * 100 });
    return s.noi - annualDebtService;
  };
  if (f(1) < 0) return null; // never breaks even, even at 100% occupancy
  let lo = 0, hi = 1;
  if (f(0) >= 0) return 0;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= 0) hi = mid; else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

/** Solve the monthly rent that produces zero cash flow before CapEx at the selected vacancy. */
function solveBreakEvenRent(i: UnderwritingInputs, annualDebtService: number): number | null {
  const f = (rent: number) => incomeStatement(i, { monthlyRent: rent }).noi - annualDebtService;
  let lo = 0, hi = Math.max(1000, i.monthlyBaseRent * 10 + 5000);
  if (f(hi) < 0) return null;
  if (f(lo) >= 0) return 0;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

function scenario(
  label: string,
  i: UnderwritingInputs,
  opts: { monthlyRent?: number; vacancyPct?: number; expenseMultiplier?: number },
  annualDebtService: number,
  cashInvested: number,
): ScenarioResult {
  const s = incomeStatement(i, opts);
  const cf = s.noi - annualDebtService - s.capex;
  return {
    label,
    noi: s.noi,
    annualCashFlow: cf,
    monthlyCashFlow: cf / 12,
    dscr: annualDebtService > 0 ? s.noi / annualDebtService : null,
    cashOnCashPct: cashInvested > 0 ? (cf / cashInvested) * 100 : null,
    capRatePct: i.purchasePrice > 0 ? (s.noi / i.purchasePrice) * 100 : null,
  };
}

/**
 * Canonical stress scenario. Re-runs the full engine on modified inputs:
 * gross rent → vacancy → EGI → OpEx → NOI → debt service → cash flow → DSCR.
 * Nothing is approximated and NOI is never manipulated directly.
 */
function stressScenario(
  key: string,
  group: StressScenarioResult["group"],
  label: string,
  baseInputs: UnderwritingInputs,
  overrides: Partial<UnderwritingInputs>,
  baseline: { cashFlow: number; dscr: number | null },
): StressScenarioResult {
  const i: UnderwritingInputs = { ...baseInputs, ...overrides };
  const s = incomeStatement(i);
  const d = debtFor(i);
  const c = capitalFor(i);
  const cf = s.noi - d.annualDebtService - s.capex;
  const dscr = d.annualDebtService > 0 ? s.noi / d.annualDebtService : null;
  return {
    key,
    group,
    label,
    grossPotentialRent: s.gpr,
    otherIncome: s.otherIncome,
    vacancyLoss: s.vacancyLoss,
    effectiveGrossIncome: s.egi,
    operatingExpenses: s.totalOperating,
    noi: s.noi,
    debtService: d.annualDebtService,
    capexReserve: s.capex,
    annualCashFlow: cf,
    monthlyCashFlow: cf / 12,
    dscr,
    cashOnCashPct: c.cashInvested > 0 ? (cf / c.cashInvested) * 100 : null,
    capRatePct: i.purchasePrice > 0 ? (s.noi / i.purchasePrice) * 100 : null,
    cashInvested: c.cashInvested,
    deltaCashFlow: cf - baseline.cashFlow,
    deltaDscr: dscr !== null && baseline.dscr !== null ? dscr - baseline.dscr : null,
    breakEvenOccupancyPct: solveBreakEvenOccupancy(i, d.annualDebtService),
    pass: cf >= 0 && dscr !== null && dscr >= 1.2,
  };
}

/**
 * Scales every operating expense input by a multiplier. Returns real input
 * overrides (not a shortcut applied to NOI) so the whole chain — including
 * break-even occupancy and expense ratio — recalculates consistently.
 * CapEx reserve sits below NOI and is deliberately left untouched.
 */
function scaleOperatingExpenses(i: UnderwritingInputs, m: number): Partial<UnderwritingInputs> {
  const s = (f: FlexAmount): FlexAmount => ({ ...f, value: f.value * m });
  const scaleMap = (o?: Record<string, number | undefined>) => {
    if (!o) return o;
    const out: Record<string, number | undefined> = {};
    for (const [k, v] of Object.entries(o)) out[k] = v === undefined ? undefined : v * m;
    return out;
  };
  return {
    propertyTaxes: s(i.propertyTaxes),
    insurance: s(i.insurance),
    management: s(i.management),
    maintenance: s(i.maintenance),
    hoaMonthly: (i.hoaMonthly || 0) * m,
    ownerUtilitiesMonthly: (i.ownerUtilitiesMonthly || 0) * m,
    otherOperating: scaleMap(i.otherOperating) as UnderwritingInputs["otherOperating"],
  };
}

/** The required stress set — every row re-runs the engine end to end. */

function buildStressScenarios(i: UnderwritingInputs): StressScenarioResult[] {
  const b = incomeStatement(i);
  const bd = debtFor(i);
  const baseCf = b.noi - bd.annualDebtService - b.capex;
  const baseline = {
    cashFlow: baseCf,
    dscr: bd.annualDebtService > 0 ? b.noi / bd.annualDebtService : null,
  };
  const rentAt = (dropPct: number) => i.monthlyBaseRent * (1 - dropPct / 100);
  const mgmtIsZero =
    !i.management || (i.management.mode === "pct" ? i.management.value === 0 : i.management.value === 0);

  const rows: StressScenarioResult[] = [
    stressScenario("base", "rent", "Base case (your inputs)", i, {}, baseline),
    stressScenario("rent-5", "rent", "Rent −5%", i, { monthlyBaseRent: rentAt(5) }, baseline),
    stressScenario("rent-10", "rent", "Rent −10%", i, { monthlyBaseRent: rentAt(10) }, baseline),
    stressScenario("rent-15", "rent", "Rent −15%", i, { monthlyBaseRent: rentAt(15) }, baseline),
    stressScenario("vac-10", "vacancy", "Vacancy 10%", i, { vacancyPct: 10 }, baseline),
    stressScenario("vac-15", "vacancy", "Vacancy 15%", i, { vacancyPct: 15 }, baseline),
    stressScenario("vac-20", "vacancy", "Vacancy 20%", i, { vacancyPct: 20 }, baseline),
    stressScenario("opex-10", "opex", "Operating expenses +10%", i, scaleOperatingExpenses(i, 1.1), baseline),
    stressScenario("opex-20", "opex", "Operating expenses +20%", i, scaleOperatingExpenses(i, 1.2), baseline),

    stressScenario("rate+1", "rate", `Interest rate +1.00% (${(i.interestRatePct + 1).toFixed(2)}%)`, i, { interestRatePct: i.interestRatePct + 1 }, baseline),
    stressScenario("rate+2", "rate", `Interest rate +2.00% (${(i.interestRatePct + 2).toFixed(2)}%)`, i, { interestRatePct: i.interestRatePct + 2 }, baseline),
    stressScenario(
      "mgmt",
      "management",
      mgmtIsZero ? "Third-party management added (8% of EGI)" : "Management fee raised to 10% of EGI",
      i,
      { management: pct(mgmtIsZero ? 8 : 10, true) },
      baseline,
    ),
  ];
  return rows;
}


/* ==========================================================================
 * Main entry point
 * ========================================================================== */

export function computeUnderwriting(raw: Partial<UnderwritingInputs>): UnderwritingResult {
  const i: UnderwritingInputs = { ...DEFAULT_INPUTS, ...raw };

  const base = incomeStatement(i);
  const debt = debtFor(i);
  const cap = capitalFor(i);

  const noi = base.noi;
  const cfBeforeCapex = noi - debt.annualDebtService;
  const cfAfterCapex = cfBeforeCapex - base.capex;

  const opexEstimated = base.lines.filter((l) => l.inNOI && l.estimated).reduce((a, l) => a + l.annual, 0);
  const estimatedShare = base.totalOperating > 0 ? opexEstimated / base.totalOperating : 0;

  const sqft = i.squareFeet && i.squareFeet > 0 ? i.squareFeet : null;
  const units = i.units && i.units > 0 ? i.units : null;

  const metrics: UnderwritingResult["metrics"] = {
    capRatePct: i.purchasePrice > 0 ? (noi / i.purchasePrice) * 100 : null,
    capRateAllInPct: cap.allInCost > 0 ? (noi / cap.allInCost) * 100 : null,
    yieldOnCostPct: cap.allInCost > 0 ? (noi / cap.allInCost) * 100 : null,
    cashOnCashBeforeCapexPct: cap.cashInvested > 0 ? (cfBeforeCapex / cap.cashInvested) * 100 : null,
    cashOnCashAfterCapexPct: cap.cashInvested > 0 ? (cfAfterCapex / cap.cashInvested) * 100 : null,
    dscr: debt.annualDebtService > 0 ? noi / debt.annualDebtService : null,
    debtYieldPct: debt.loanAmount > 0 ? (noi / debt.loanAmount) * 100 : null,
    grm: base.gpr > 0 ? i.purchasePrice / base.gpr : null,
    ltvPct: i.purchasePrice > 0 ? (debt.loanAmount / i.purchasePrice) * 100 : null,
    ltcPct: cap.totalProjectCost > 0 ? (debt.loanAmount / cap.totalProjectCost) * 100 : null,
    equitySharePct: cap.totalProjectCost > 0 ? (cap.investorEquity / cap.totalProjectCost) * 100 : null,
    loanToArvPct: i.arv && i.arv > 0 ? (debt.loanAmount / i.arv) * 100 : null,

    expenseRatioPct: base.egi > 0 ? (base.totalOperating / base.egi) * 100 : null,
    breakEvenOccupancyPct: solveBreakEvenOccupancy(i, debt.annualDebtService),
    breakEvenRentMonthly: solveBreakEvenRent(i, debt.annualDebtService),
    pricePerSqFt: sqft ? i.purchasePrice / sqft : null,
    noiPerSqFt: sqft ? noi / sqft : null,
    rentPerSqFtMonthly: sqft ? i.monthlyBaseRent / sqft : null,
    onePctRulePct: i.purchasePrice > 0 ? (i.monthlyBaseRent / i.purchasePrice) * 100 : null,
  };

  const projection = buildProjection(i, cap, debt);

  /* ---- Sensitivities ------------------------------------------------- */
  const rentDelta = i.rentSensitivityPct ?? 10;
  const expDelta = i.expenseSensitivityPct ?? 15;

  const rentSensitivity: ScenarioResult[] = [
    scenario(`Conservative rent (−${rentDelta}%)`, i, { monthlyRent: i.monthlyBaseRent * (1 - rentDelta / 100) }, debt.annualDebtService, cap.cashInvested),
    scenario("Base rent (entered)", i, {}, debt.annualDebtService, cap.cashInvested),
    scenario(`Optimistic rent (+${rentDelta}%)`, i, { monthlyRent: i.monthlyBaseRent * (1 + rentDelta / 100) }, debt.annualDebtService, cap.cashInvested),
  ];

  const expenseSensitivity: ScenarioResult[] = [
    scenario("Base case (your inputs)", i, {}, debt.annualDebtService, cap.cashInvested),
    scenario(
      `Conservative (+${expDelta}% expenses, vacancy ×1.5)`,
      i,
      { expenseMultiplier: 1 + expDelta / 100, vacancyPct: Math.min(100, i.vacancyPct * 1.5 + 1) },
      debt.annualDebtService,
      cap.cashInvested,
    ),
    scenario(
      `Severe downside (+${expDelta * 2}% expenses, −${rentDelta}% rent, vacancy ×2.5)`,
      i,
      {
        expenseMultiplier: 1 + (expDelta * 2) / 100,
        monthlyRent: i.monthlyBaseRent * (1 - rentDelta / 100),
        vacancyPct: Math.min(100, i.vacancyPct * 2.5 + 3),
      },
      debt.annualDebtService,
      cap.cashInvested,
    ),
  ];

  const debtRow = (label: string, o: { downPaymentPct?: number; interestRatePct?: number; loanTermYears?: number }): DebtSensitivityRow => {
    const d = debtFor(i, o);
    const c = capitalFor(i, o.downPaymentPct);
    const cf = base.noi - d.annualDebtService - base.capex;
    return {
      label,
      monthlyPayment: d.monthlyPI + d.monthlyMortgageInsurance,
      cashInvested: c.cashInvested,
      annualCashFlow: cf,
      dscr: d.annualDebtService > 0 ? base.noi / d.annualDebtService : null,
      cashOnCashPct: c.cashInvested > 0 ? (cf / c.cashInvested) * 100 : null,
    };
  };

  const sensitivity: UnderwritingResult["sensitivity"] = {
    scenarios: buildStressScenarios(i),
    rent: rentSensitivity,

    expense: expenseSensitivity,
    debt: {
      interestRate: [-1, -0.5, 0, 0.5, 1, 2].map((d) =>
        debtRow(`${(i.interestRatePct + d).toFixed(2)}%`, { interestRatePct: Math.max(0, i.interestRatePct + d) }),
      ),
      downPayment: [10, 15, 20, 25, 30].map((dp) => debtRow(`${dp}% down`, { downPaymentPct: dp })),
      loanTerm: [15, 20, 30].map((t) => debtRow(`${t}-yr term`, { loanTermYears: t })),
    },
  };

  const flags = buildFlags(i, { base, debt, cap, metrics, sensitivity, projection, estimatedShare });
  const score = buildScore(i, { metrics, cfAfterCapex, sensitivity, projection });

  const reconciliation: ReconciliationLine[] = [
    { label: "Gross Potential Rent", value: base.gpr, op: "" },
    { label: "Other Income", value: base.otherIncome, op: "+" },
    { label: `Vacancy / Credit Loss (${i.vacancyPct}%)`, value: base.vacancyLoss, op: "-" },
    { label: "Effective Gross Income", value: base.egi, op: "=" },
    ...base.lines.filter((l) => l.inNOI).map((l) => ({ label: l.label + (l.estimated ? " (Estimated)" : ""), value: l.annual, op: "-" as const, indent: true })),
    { label: "Total Operating Expenses", value: base.totalOperating, op: "-" },
    { label: "Net Operating Income (NOI)", value: noi, op: "=" },
    { label: "Debt Service (P&I" + (debt.monthlyMortgageInsurance > 0 ? " + MI" : "") + ")", value: debt.annualDebtService, op: "-" },
    { label: "Cash Flow Before CapEx", value: cfBeforeCapex, op: "=" },
    { label: "CapEx Reserve", value: base.capex, op: "-" },
    { label: "Cash Flow After CapEx", value: cfAfterCapex, op: "=" },
    { label: "Down Payment", value: cap.downPayment, op: "" },
    { label: "Closing Costs", value: cap.closingCosts, op: "+" },
    { label: "Rehab Budget", value: i.rehabBudget, op: "+" },
    { label: "Points / Financing Costs", value: cap.points, op: "+" },
    { label: "Other Acquisition Costs", value: cap.otherAcquisitionCosts, op: "+" },
    { label: "Seller Credits", value: cap.sellerCredits, op: "-" },
    { label: "Total Cash Invested", value: cap.cashInvested, op: "=" },
  ];

  return {
    inputs: i,
    income: {
      grossPotentialRentAnnual: base.gpr,
      otherIncomeAnnual: base.otherIncome,
      vacancyLossAnnual: base.vacancyLoss,
      effectiveGrossIncomeAnnual: base.egi,
    },
    expenses: {
      lines: base.lines,
      totalOperatingAnnual: base.totalOperating,
      capexReserveAnnual: base.capex,
      estimatedShare,
    },
    noiAnnual: noi,
    debt: {
      loanAmount: debt.loanAmount,
      monthlyPI: debt.monthlyPI,
      annualPI: debt.annualPI,
      monthlyMortgageInsurance: debt.monthlyMortgageInsurance,
      annualDebtService: debt.annualDebtService,
    },
    cashFlow: {
      annualBeforeCapex: cfBeforeCapex,
      annualAfterCapex: cfAfterCapex,
      monthlyBeforeCapex: cfBeforeCapex / 12,
      monthlyAfterCapex: cfAfterCapex / 12,
    },
    capital: {
      downPayment: cap.downPayment,
      closingCosts: cap.closingCosts,
      rehab: i.rehabBudget,
      points: cap.points,
      otherAcquisitionCosts: cap.otherAcquisitionCosts,
      sellerCredits: cap.sellerCredits,
      cashInvested: cap.cashInvested,
      allInCost: cap.allInCost,
      allInPerUnit: units ? cap.allInCost / units : null,
      allInPerSqFt: sqft ? cap.allInCost / sqft : null,
    },
    metrics,
    projection,
    sensitivity,
    score,
    flags,
    reconciliation,
  };
}

/* ==========================================================================
 * Long-term projection, exit and taxes
 * ========================================================================== */

function buildProjection(
  i: UnderwritingInputs,
  cap: ReturnType<typeof capitalFor>,
  debt: ReturnType<typeof debtFor>,
): UnderwritingResult["projection"] {
  const years = Math.max(1, Math.round(i.holdYears));
  const schedule = amortize(debt.loanAmount, i.interestRatePct, i.loanTermYears, years);

  const depreciableBasis = i.purchasePrice * (1 - (i.landAllocationPct ?? 20) / 100) + i.rehabBudget;
  const depYears = i.depreciationYears ?? 27.5;
  const annualDepreciation = i.taxModelEnabled ? depreciableBasis / depYears : 0;
  const marginal = (i.marginalTaxRatePct ?? 0) / 100;

  const rows: YearRow[] = [];
  const preTax: number[] = [-cap.cashInvested];
  const afterTax: number[] = [-cap.cashInvested];

  for (let y = 1; y <= years; y++) {
    const rentFactor = Math.pow(1 + i.rentGrowthPct / 100, y - 1);
    const expFactor = Math.pow(1 + i.expenseGrowthPct / 100, y - 1);
    const s = incomeStatement(i, {
      monthlyRent: i.monthlyBaseRent * rentFactor,
      expenseMultiplier: expFactor,
    });
    const am = schedule[y - 1];
    const debtService = debt.annualDebtService;
    const cfBefore = s.noi - debtService;
    const cfAfter = cfBefore - s.capex;
    const propertyValue = i.purchasePrice * Math.pow(1 + i.appreciationPct / 100, y);
    const taxableIncome = s.noi - am.interest - annualDepreciation;
    const incomeTax = i.taxModelEnabled ? Math.max(0, taxableIncome) * marginal : 0;
    const atcf = cfAfter - incomeTax;

    rows.push({
      year: y,
      grossPotentialRent: s.gpr,
      vacancyLoss: s.vacancyLoss,
      otherIncome: s.otherIncome,
      effectiveGrossIncome: s.egi,
      operatingExpenses: s.totalOperating,
      noi: s.noi,
      interest: am.interest,
      principal: am.principal,
      debtService,
      capex: s.capex,
      cashFlowBeforeCapex: cfBefore,
      cashFlowAfterCapex: cfAfter,
      depreciation: annualDepreciation,
      taxableIncome,
      incomeTax,
      afterTaxCashFlow: atcf,
      loanBalance: am.endingBalance,
      propertyValue,
      equity: propertyValue - am.endingBalance,
    });
    preTax.push(cfAfter);
    afterTax.push(atcf);
  }

  const last = rows[rows.length - 1];
  const useExitCap = Boolean(i.exitCapRatePct && i.exitCapRatePct > 0);
  const grossSalePrice = useExitCap ? last.noi / ((i.exitCapRatePct as number) / 100) : last.propertyValue;
  const sellingCosts = grossSalePrice * (i.sellingCostPct / 100);
  const loanPayoff = last.loanBalance;
  const netProceedsPreTax = grossSalePrice - sellingCosts - loanPayoff;

  const totalDepreciationTaken = annualDepreciation * years;
  const adjustedBasis = cap.allInCost - totalDepreciationTaken;
  const gain = Math.max(0, grossSalePrice - sellingCosts - adjustedBasis);
  const recaptureBase = Math.min(totalDepreciationTaken, gain);
  const depreciationRecaptureTax = i.taxModelEnabled ? recaptureBase * 0.25 : 0;
  const capitalGainsTax = i.taxModelEnabled
    ? Math.max(0, gain - recaptureBase) * ((i.capitalGainsRatePct ?? 15) / 100)
    : 0;
  const netProceedsAfterTax = netProceedsPreTax - depreciationRecaptureTax - capitalGainsTax;

  preTax[preTax.length - 1] += netProceedsPreTax;
  afterTax[afterTax.length - 1] += netProceedsAfterTax;

  const totalCashFlow = rows.reduce((a, r) => a + r.cashFlowAfterCapex, 0);
  const irrPre = irr(preTax);
  const irrPost = irr(afterTax);
  const equityMultiple = cap.cashInvested > 0
    ? (totalCashFlow + netProceedsPreTax) / cap.cashInvested
    : null;

  return {
    years: rows,
    preTaxCashflowStream: preTax,
    afterTaxCashflowStream: afterTax,
    irrPreTaxPct: irrPre === null ? null : irrPre * 100,
    irrAfterTaxPct: irrPost === null ? null : irrPost * 100,
    equityMultiple,
    totalRoiPct: equityMultiple === null ? null : (equityMultiple - 1) * 100,
    totalCashFlow,
    appreciationGain: grossSalePrice - i.purchasePrice,
    principalPaydown: debt.loanAmount - last.loanBalance,
    endingEquity: last.equity,
    exit: {
      method: useExitCap ? "exit-cap" : "appreciation",
      grossSalePrice,
      sellingCosts,
      loanPayoff,
      netProceedsPreTax,
      capitalGainsTax,
      depreciationRecaptureTax,
      netProceedsAfterTax,
      totalDepreciationTaken,
      adjustedBasis,
    },
  };
}

/* ==========================================================================
 * Red flags
 * ========================================================================== */

function buildFlags(
  i: UnderwritingInputs,
  ctx: {
    base: CoreSnapshot;
    debt: ReturnType<typeof debtFor>;
    cap: ReturnType<typeof capitalFor>;
    metrics: UnderwritingResult["metrics"];
    sensitivity: UnderwritingResult["sensitivity"];
    projection: UnderwritingResult["projection"];
    estimatedShare: number;
  },
): GuardrailFlag[] {
  const f: GuardrailFlag[] = [];
  const { metrics, sensitivity, cap } = ctx;
  const cfAfter = ctx.base.noi - ctx.debt.annualDebtService - ctx.base.capex;

  if (metrics.dscr !== null && metrics.dscr < 1.0) {
    f.push({
      code: "DSCR_BELOW_1",
      severity: "critical",
      title: "DSCR below 1.00 — NOI does not cover debt service",
      message: `DSCR is ${metrics.dscr.toFixed(2)}. Net operating income does not cover annual debt service of $${Math.round(ctx.debt.annualDebtService).toLocaleString()}. Most lenders decline below 1.20 and the owner must fund the shortfall from outside capital.`,
    });
  } else if (metrics.dscr !== null && metrics.dscr < 1.25) {
    f.push({
      code: "DSCR_THIN",
      severity: "warning",
      title: "DSCR below the 1.25 lender threshold",
      message: `DSCR is ${metrics.dscr.toFixed(2)}. Financing terms assumed here may not be attainable, and there is limited cushion for vacancy or expense surprises.`,
    });
  }

  if (cfAfter < 0) {
    f.push({
      code: "NEG_CF_BASE",
      severity: "critical",
      title: "Base-case cash flow is negative",
      message: `After CapEx reserves, the base case produces $${Math.round(cfAfter).toLocaleString()}/year. The investor must contribute roughly $${Math.abs(Math.round(cfAfter / 12)).toLocaleString()}/month of supplemental capital. This is not a passive-income outcome under the entered assumptions.`,
    });
  }

  const conservative = sensitivity.expense[1];
  if (cfAfter >= 0 && conservative && conservative.annualCashFlow < 0) {
    f.push({
      code: "FRAGILE_CF",
      severity: "critical",
      title: "Cash flow fails under mild stress",
      message: `A modest stress case (higher expenses and vacancy) turns cash flow negative at $${Math.round(conservative.annualCashFlow).toLocaleString()}/year. The deal depends on assumptions holding almost exactly as entered.`,
    });
  }

  const conservativeRent = sensitivity.rent[0];
  if (cfAfter >= 0 && conservativeRent && conservativeRent.annualCashFlow < 0) {
    f.push({
      code: "RENT_DEPENDENT",
      severity: "critical",
      title: "Cash flow depends on achieving full asking rent",
      message: `A ${i.rentSensitivityPct ?? 10}% rent shortfall produces $${Math.round(conservativeRent.annualCashFlow).toLocaleString()}/year. Verify achievable rent with property-level comparables before proceeding.`,
    });
  }

  if (metrics.loanToArvPct !== null && metrics.loanToArvPct > 80) {
    f.push({
      code: "LTARV_HIGH",
      severity: metrics.loanToArvPct > 90 ? "critical" : "warning",
      title: "Loan-to-ARV is high",
      message: `Loan-to-ARV is ${metrics.loanToArvPct.toFixed(1)}% (not to be confused with LTV of ${metrics.ltvPct?.toFixed(1)}%). Most value-add lenders cap loan-to-ARV at 70–75%.`,
    });
  }

  if (i.arv && i.arv > 0 && cap.allInCost > i.arv) {
    f.push({
      code: "BASIS_ABOVE_ARV",
      severity: "critical",
      title: "All-in basis exceeds expected stabilized value",
      message: `All-in cost of $${Math.round(cap.allInCost).toLocaleString()} exceeds the entered ARV of $${Math.round(i.arv).toLocaleString()}. The deal starts with negative equity before any market movement.`,
    });
  }

  if (metrics.breakEvenOccupancyPct === null) {
    f.push({
      code: "NO_BREAKEVEN",
      severity: "critical",
      title: "No break-even occupancy exists",
      message: "Even at 100% occupancy, income does not cover operating expenses plus debt service.",
    });
  } else if (metrics.breakEvenOccupancyPct > 85) {
    f.push({
      code: "BREAKEVEN_HIGH",
      severity: "warning",
      title: "Break-even occupancy above 85%",
      message: `The property must stay ${metrics.breakEvenOccupancyPct.toFixed(1)}% occupied simply to cover expenses and debt. A single extended vacancy pushes the year negative.`,
    });
  }

  if (metrics.expenseRatioPct !== null && metrics.expenseRatioPct > 55) {
    f.push({
      code: "EXPENSE_RATIO_HIGH",
      severity: "warning",
      title: "Operating expense ratio above 55%",
      message: `Operating expenses consume ${metrics.expenseRatioPct.toFixed(1)}% of effective gross income. Verify tax, insurance and management figures against actual bills.`,
    });
  }

  if (metrics.ltvPct !== null && metrics.ltvPct > 80) {
    f.push({
      code: "LTV_HIGH",
      severity: "warning",
      title: "LTV above 80%",
      message: `LTV is ${metrics.ltvPct.toFixed(1)}%. Leverage amplifies both return and loss, mortgage insurance applies, and refinancing options narrow if values soften.`,
    });
  }

  if (i.rehabBudget > 0 && i.rehabBudget / Math.max(1, i.purchasePrice) > 0.25) {
    f.push({
      code: "REHAB_LARGE",
      severity: "warning",
      title: "Rehab budget is large relative to purchase price",
      message: `Rehab of $${Math.round(i.rehabBudget).toLocaleString()} is ${((i.rehabBudget / i.purchasePrice) * 100).toFixed(0)}% of purchase price. Construction overruns of 15–30% are common; verify scope and contingency.`,
    });
  }

  // Capital-reserve exposure from unknown major systems (risk flags only — no rent adjustment)
  const r = i.risk || {};
  const unknownSystems = ["roofAge", "hvacAge", "waterHeaterAge", "electricalAge", "plumbingAge"]
    .filter((k) => (r as Record<string, unknown>)[k] === undefined);
  if (unknownSystems.length > 0) {
    f.push({
      code: "SYSTEM_AGE_UNKNOWN",
      severity: "warning",
      title: "Major-system condition is unknown",
      message: `Age is not provided for: ${unknownSystems.map((k) => k.replace(/Age$/, "")).join(", ")}. Replacement reserve requirements cannot be verified and CapEx exposure is uncertain. Values are shown as Unknown rather than estimated.`,
    });
  }
  const oldSystems: string[] = [];
  if ((r.roofAge ?? -1) >= 20) oldSystems.push(`roof (${r.roofAge} yrs)`);
  if ((r.hvacAge ?? -1) >= 15) oldSystems.push(`HVAC (${r.hvacAge} yrs)`);
  if ((r.waterHeaterAge ?? -1) >= 12) oldSystems.push(`water heater (${r.waterHeaterAge} yrs)`);
  if (oldSystems.length) {
    f.push({
      code: "SYSTEM_AGE_END_OF_LIFE",
      severity: "warning",
      title: "Major systems at or near end of life",
      message: `Near-term replacement is likely for: ${oldSystems.join(", ")}. Budget this as capital expenditure separate from the recurring CapEx reserve.`,
    });
  }
  if (r.floodRisk === "high" || r.floodInsuranceRequired) {
    f.push({
      code: "FLOOD_RISK",
      severity: "warning",
      title: "Flood exposure",
      message: "Flood insurance is required or flood risk is high. Confirm the current premium quote — it can materially change the expense stack.",
    });
  }

  if (ctx.estimatedShare > 0.5) {
    f.push({
      code: "OPEX_MOSTLY_ESTIMATED",
      severity: "info",
      title: "Most operating expenses are estimated",
      message: `${(ctx.estimatedShare * 100).toFixed(0)}% of operating expenses are RentIntel estimates rather than verified figures. Replace them with actual tax bills, insurance quotes and management contracts before committing capital.`,
    });
  }

  // Rent reasonableness vs observed market — warning only, never auto-adjusts rent.
  const median = i.market?.medianRent;
  if (median && median > 0) {
    const diff = ((i.monthlyBaseRent - median) / median) * 100;
    if (Math.abs(diff) >= 20) {
      f.push({
        code: diff > 0 ? "RENT_ABOVE_MARKET" : "RENT_BELOW_MARKET",
        severity: diff > 0 ? "warning" : "info",
        title: diff > 0 ? "Entered rent is well above the ZIP median" : "Entered rent is well below the ZIP median",
        message: `Entered rent of $${Math.round(i.monthlyBaseRent).toLocaleString()}/mo is ${Math.abs(diff).toFixed(0)}% ${diff > 0 ? "above" : "below"} the ZIP median gross rent of $${Math.round(median).toLocaleString()}/mo (Census ACS). The ZIP median covers all unit types and is not a property-level comparable — verify against comparable properties of similar size, condition and bedroom count.`,
      });
    }
  }

  return f;
}

/* ==========================================================================
 * Deal Score — balanced, five categories, fully explainable
 * ========================================================================== */

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

function buildScore(
  i: UnderwritingInputs,
  ctx: {
    metrics: UnderwritingResult["metrics"];
    cfAfterCapex: number;
    sensitivity: UnderwritingResult["sensitivity"];
    projection: UnderwritingResult["projection"];
  },
): DealScore {
  const m = ctx.metrics;
  const cats: ScoreCategory[] = [];

  /* Return — cap rate, CoC, yield on cost (20) */
  const capScore = clamp01(((m.capRatePct ?? 0) - 3) / 5) * 7;          // 3%→0, 8%→7
  const cocScore = clamp01(((m.cashOnCashAfterCapexPct ?? 0) - 0) / 10) * 7; // 0%→0, 10%→7
  const yocScore = clamp01((((m.yieldOnCostPct ?? 0) - (m.capRatePct ?? 0)) / 1.5)) * 3
    + clamp01(((m.yieldOnCostPct ?? 0) - 3) / 5) * 3;
  const returnScore = Math.min(20, capScore + cocScore + yocScore);
  cats.push({
    key: "return", label: "Return", score: returnScore, max: 20,
    detail: `Cap ${m.capRatePct?.toFixed(2) ?? "—"}% · CoC (after CapEx) ${m.cashOnCashAfterCapexPct?.toFixed(1) ?? "—"}% · Yield on Cost ${m.yieldOnCostPct?.toFixed(2) ?? "—"}%`,
  });

  /* Debt safety — DSCR, debt yield, LTV (20) */
  const dscrScore = clamp01((((m.dscr ?? 0) - 1.0) / 0.35)) * 10;        // 1.00→0, 1.35→10
  const dyScore = clamp01((((m.debtYieldPct ?? 0) - 7) / 4)) * 6;        // 7%→0, 11%→6
  const ltvScore = clamp01((85 - (m.ltvPct ?? 100)) / 25) * 4;           // 85%→0, 60%→4
  const debtScore = Math.min(20, dscrScore + dyScore + ltvScore);
  cats.push({
    key: "debtSafety", label: "Debt Safety", score: debtScore, max: 20,
    detail: `DSCR ${m.dscr?.toFixed(2) ?? "—"} · Debt Yield ${m.debtYieldPct?.toFixed(1) ?? "—"}% · LTV ${m.ltvPct?.toFixed(0) ?? "—"}%`,
  });

  /* Cash-flow quality — dollars, break-even occupancy, expense ratio (20) */
  const perUnit = ctx.cfAfterCapex / 12 / Math.max(1, i.units || 1);
  const cfScore = ctx.cfAfterCapex < 0 ? 0 : clamp01(perUnit / 200) * 10; // $200/unit/mo → full
  const beOcc = m.breakEvenOccupancyPct;
  const beScore = beOcc === null ? 0 : clamp01((90 - beOcc) / 25) * 6;    // 90%→0, 65%→6
  const erScore = clamp01((55 - (m.expenseRatioPct ?? 60)) / 20) * 4;     // 55%→0, 35%→4
  const cashFlowScore = Math.min(20, cfScore + beScore + erScore);
  cats.push({
    key: "cashFlow", label: "Cash Flow Quality", score: cashFlowScore, max: 20,
    detail: `$${Math.round(ctx.cfAfterCapex / 12).toLocaleString()}/mo after CapEx · Break-even occupancy ${beOcc === null ? "not achievable" : beOcc.toFixed(0) + "%"} · Expense ratio ${m.expenseRatioPct?.toFixed(0) ?? "—"}%`,
  });

  /* Downside risk — stress scenarios (20) */
  const [rentDown] = ctx.sensitivity.rent;
  const conservative = ctx.sensitivity.expense[1];
  const severe = ctx.sensitivity.expense[2];
  let downside = 20;
  if (rentDown.annualCashFlow < 0) downside -= 6;
  if (conservative.annualCashFlow < 0) downside -= 7;
  if (severe.annualCashFlow < 0) downside -= 4;
  if ((conservative.dscr ?? 0) < 1.0) downside -= 3;
  const downsideScore = Math.max(0, downside);
  cats.push({
    key: "downsideRisk", label: "Downside Risk", score: downsideScore, max: 20,
    detail: `Rent −${i.rentSensitivityPct ?? 10}%: $${Math.round(rentDown.annualCashFlow).toLocaleString()}/yr · Conservative: $${Math.round(conservative.annualCashFlow).toLocaleString()}/yr · Severe: $${Math.round(severe.annualCashFlow).toLocaleString()}/yr`,
  });

  /* Market — only scored when observed market data exists (20) */
  const mk = i.market;
  const hasMarket = Boolean(mk && (mk.medianRent || mk.vacancyRatePct !== undefined || mk.medianHouseholdIncome));
  let marketScore = 0;
  let marketDetail = "No verified market data loaded — category excluded and the score is normalised over the remaining 80 points.";
  if (hasMarket && mk) {
    let s = 0;
    if (mk.medianRent) {
      const ratio = i.monthlyBaseRent / mk.medianRent;
      // Rent at or below market is safest; far above market is a leasing risk.
      s += ratio <= 1.05 ? 8 : ratio <= 1.2 ? 5 : ratio <= 1.4 ? 2 : 0;
    }
    if (mk.vacancyRatePct !== undefined) s += clamp01((10 - mk.vacancyRatePct) / 7) * 5;
    if (mk.medianHouseholdIncome) {
      const burden = (i.monthlyBaseRent * 12) / mk.medianHouseholdIncome;
      s += burden <= 0.3 ? 4 : burden <= 0.4 ? 2 : 0;
    }
    if (mk.rentTrendPct !== undefined) s += clamp01((mk.rentTrendPct + 2) / 6) * 3;
    marketScore = Math.min(20, s);
    marketDetail = `ZIP median rent ${mk.medianRent ? "$" + Math.round(mk.medianRent).toLocaleString() : "Unavailable"} · ZIP vacancy ${mk.vacancyRatePct !== undefined ? mk.vacancyRatePct.toFixed(1) + "%" : "Unavailable"}`;
  }
  cats.push({ key: "market", label: "Market Context", score: marketScore, max: 20, detail: marketDetail });

  const scored = hasMarket ? cats : cats.filter((c) => c.key !== "market");
  const rawTotal = scored.reduce((a, c) => a + c.score, 0);
  const maxTotal = scored.reduce((a, c) => a + c.max, 0);
  const total = maxTotal > 0 ? (rawTotal / maxTotal) * 100 : 0;

  const verdict: DealScore["verdict"] =
    total >= 80 ? "Excellent" : total >= 65 ? "Good" : total >= 45 ? "Marginal" : "Poor";

  const weakest = [...scored].sort((a, b) => a.score / a.max - b.score / b.max)[0];
  const strongest = [...scored].sort((a, b) => b.score / b.max - a.score / a.max)[0];
  const explanation =
    ctx.cfAfterCapex < 0
      ? `Score is capped by negative base-case cash flow. Strongest category: ${strongest.label}. Weakest: ${weakest.label} (${weakest.score.toFixed(0)}/${weakest.max}).`
      : `Driven mainly by ${strongest.label} (${strongest.score.toFixed(0)}/${strongest.max}); held back by ${weakest.label} (${weakest.score.toFixed(0)}/${weakest.max}). High headline returns alone cannot offset weak debt coverage or fragile downside performance.`;

  return { total, categories: cats, marketScored: hasMarket, verdict, explanation };
}

/* ==========================================================================
 * Formatting helpers used across screens (keeps display consistent)
 * ========================================================================== */

export function fmtMoney(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || !isFinite(v)) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits,
  }).format(v);
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !isFinite(v)) return "Unavailable";
  return `${v.toFixed(digits)}%`;
}

export function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !isFinite(v)) return "Unavailable";
  return v.toFixed(digits);
}

export { safeDiv };
