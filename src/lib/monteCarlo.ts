/**
 * Monte Carlo Underwriting Engine
 * -----------------------------------------------------------------------------
 * A stochastic, year-by-year simulation of a leveraged residential rental hold.
 *
 * Design principles
 *  - Nothing is deterministic. Every material driver (appreciation, rent growth,
 *    vacancy, maintenance, CapEx, taxes, insurance, other opex, selling costs and
 *    time-on-market at exit) is drawn from a distribution each simulated year.
 *  - Distributions are chosen to match observed behaviour, not convenience:
 *      appreciation .......... normal (log-return space -> log-normal value path)
 *      rent growth ........... normal, may be negative
 *      vacancy ............... triangular (low is common, high is possible)
 *      maintenance ........... log-normal (right-skewed: many cheap years, some brutal ones)
 *      CapEx ................. Bernoulli event x log-normal severity (rare, expensive)
 *      taxes / insurance ..... normal inflation with fat-ish upside for insurance
 *      selling costs ......... normal around 7.5% of sale price
 *      time on market ........ triangular months of carry at exit
 *  - A single latent macro factor `z` per year correlates the drivers:
 *    strong economy => higher appreciation + rent growth + lower vacancy;
 *    recession => the reverse. Inflation lifts both rents and expenses.
 *  - ROI is a full total-return calculation: cash flows + principal paydown +
 *    appreciation - selling costs - loan payoff - closing costs, all measured
 *    against actual cash invested.
 *  - Randomness is reproducible: pass a `seed` for identical output.
 *  - Pure logic only. No React, no UI, no formatting.
 */

/* ------------------------------------------------------------------ */
/*  Deterministic RNG (mulberry32) + distribution samplers            */
/* ------------------------------------------------------------------ */

export interface Rng {
  next(): number;               // uniform [0,1)
  normal(mean: number, sd: number): number;
  triangular(min: number, mode: number, max: number): number;
  logNormal(median: number, sigma: number): number;
  bernoulli(p: number): boolean;
}

export function createRng(seed?: number): Rng {
  let s = (seed ?? Math.floor(Math.random() * 2 ** 32)) >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  const stdNormal = () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    // Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = next();
    while (v === 0) v = next();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
  return {
    next,
    normal: (mean, sd) => mean + sd * stdNormal(),
    triangular: (min, mode, max) => {
      if (max <= min) return min;
      const u = next();
      const c = (mode - min) / (max - min);
      return u < c
        ? min + Math.sqrt(u * (max - min) * (mode - min))
        : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    },
    // median-parameterised log-normal: median * exp(sigma * Z)
    logNormal: (median, sigma) => median * Math.exp(sigma * stdNormal()),
    bernoulli: (p) => next() < p,
  };
}

/* ------------------------------------------------------------------ */
/*  Assumption sets                                                    */
/* ------------------------------------------------------------------ */

export type RiskProfile = "conservative" | "balanced" | "aggressive";

/** All rates are annual percents unless noted. */
export interface MonteCarloAssumptions {
  /** Appreciation: mean and volatility of annual log return (%). */
  apprMean: number;
  apprSd: number;
  /** Rent growth: mean / volatility (%). Can go negative. */
  rentGrowthMean: number;
  rentGrowthSd: number;
  /** Vacancy triangular parameters (% of gross rent, per year). */
  vacancyMin: number;
  vacancyMode: number;
  vacancyMax: number;
  /** Maintenance: median as % of annual gross rent, log-normal sigma. */
  maintMedianPct: number;
  maintSigma: number;
  /** CapEx: annual probability of a major event, median cost as % of property value, sigma. */
  capexProb: number;
  capexMedianPctOfValue: number;
  capexSigma: number;
  /** Property tax and insurance annual escalation (%). */
  taxInflMean: number;
  taxInflSd: number;
  insInflMean: number;
  insInflSd: number;
  /** Other operating expense inflation (%). */
  opexInflMean: number;
  opexInflSd: number;
  /** Selling cost at exit (% of sale price). */
  sellCostMean: number;
  sellCostSd: number;
  /** Time on market at exit (months of carry, triangular). */
  domMin: number;
  domMode: number;
  domMax: number;
  /** Correlation of each driver to the latent macro factor (0..1). */
  macroLoadingAppr: number;
  macroLoadingRent: number;
  macroLoadingVacancy: number;
}

/**
 * Baselines anchored on long-run US residential history:
 * nominal home appreciation ~3.8%/yr with ~7-9% annual volatility (Case-Shiller),
 * rent growth ~3%/yr with ~3% volatility, stabilised vacancy 5-8% with fat upper tail,
 * maintenance ~8% of gross rent (median) and CapEx events ~1 in 8 years.
 */
export const PROFILES: Record<RiskProfile, MonteCarloAssumptions> = {
  conservative: {
    apprMean: 2.5, apprSd: 5.0,
    rentGrowthMean: 2.0, rentGrowthSd: 2.2,
    vacancyMin: 3, vacancyMode: 7, vacancyMax: 22,
    maintMedianPct: 9, maintSigma: 0.55,
    capexProb: 0.16, capexMedianPctOfValue: 1.1, capexSigma: 0.6,
    taxInflMean: 3.0, taxInflSd: 1.8,
    insInflMean: 6.0, insInflSd: 4.0,
    opexInflMean: 3.2, opexInflSd: 1.6,
    sellCostMean: 8.0, sellCostSd: 1.0,
    domMin: 1, domMode: 2.5, domMax: 7,
    macroLoadingAppr: 0.75, macroLoadingRent: 0.55, macroLoadingVacancy: 0.6,
  },
  balanced: {
    apprMean: 3.8, apprSd: 7.5,
    rentGrowthMean: 3.0, rentGrowthSd: 3.0,
    vacancyMin: 2, vacancyMode: 6, vacancyMax: 20,
    maintMedianPct: 8, maintSigma: 0.6,
    capexProb: 0.13, capexMedianPctOfValue: 1.0, capexSigma: 0.65,
    taxInflMean: 2.8, taxInflSd: 1.6,
    insInflMean: 5.0, insInflSd: 3.5,
    opexInflMean: 3.0, opexInflSd: 1.5,
    sellCostMean: 7.5, sellCostSd: 1.0,
    domMin: 0.5, domMode: 2, domMax: 6,
    macroLoadingAppr: 0.7, macroLoadingRent: 0.5, macroLoadingVacancy: 0.55,
  },
  aggressive: {
    apprMean: 5.0, apprSd: 11.0,
    rentGrowthMean: 4.0, rentGrowthSd: 4.5,
    vacancyMin: 1, vacancyMode: 6, vacancyMax: 30,
    maintMedianPct: 7.5, maintSigma: 0.8,
    capexProb: 0.15, capexMedianPctOfValue: 1.2, capexSigma: 0.85,
    taxInflMean: 3.0, taxInflSd: 2.2,
    insInflMean: 6.0, insInflSd: 5.0,
    opexInflMean: 3.2, opexInflSd: 2.2,
    sellCostMean: 7.5, sellCostSd: 1.5,
    domMin: 0.5, domMode: 2, domMax: 9,
    macroLoadingAppr: 0.75, macroLoadingRent: 0.6, macroLoadingVacancy: 0.65,
  },
};

/* ------------------------------------------------------------------ */
/*  Inputs                                                             */
/* ------------------------------------------------------------------ */

export interface MonteCarloInputs {
  purchasePrice: number;
  /** Monthly gross scheduled rent at acquisition. */
  monthlyRent: number;
  /** Recurring monthly opex EXCLUDING vacancy, maintenance, CapEx, taxes, insurance. */
  monthlyOtherOpEx: number;
  /** Annual property tax at acquisition ($). */
  annualTaxes: number;
  /** Annual insurance premium at acquisition ($). */
  annualInsurance: number;
  downPaymentPct: number;
  interestRate: number;
  loanTermYears: number;
  holdYears: number;
  /** Acquisition closing costs (% of price) — real cash out of pocket. */
  closingCostPct: number;
  /** Rehab / initial capital injected at close ($). */
  rehabBudget: number;
  iterations: number;
  profile: RiskProfile;
  /** Optional per-run overrides on top of the selected profile. */
  overrides?: Partial<MonteCarloAssumptions>;
  seed?: number;
}

export interface MonteCarloPath {
  /** Annualised total return on invested equity (%). */
  roi: number;
  /** True IRR of the equity cash flow stream (%). */
  irr: number;
  /** Total profit in dollars over the hold. */
  totalProfit: number;
  /** Mean annual pre-tax cash flow ($). */
  avgAnnualCashFlow: number;
  /** True when any hold year produced negative cash flow. */
  hadNegativeYear: boolean;
  exitValue: number;
}

export interface Histogram {
  bins: { label: string; low: number; high: number; mid: number; count: number; pct: number }[];
  binSize: number;
}

export interface MonteCarloResult {
  iterations: number;
  profile: RiskProfile;
  assumptions: MonteCarloAssumptions;
  seed: number;
  roi: DistributionStats;
  irr: DistributionStats;
  probPositiveRoi: number;
  probLoss: number;
  probNegativeCashFlowYear: number;
  probRoiAbove10: number;
  probRoiAbove15: number;
  sharpe: number;
  sortino: number;
  downsideDeviation: number;
  var5: number;
  cvar5: number;
  confidence: ConfidenceIndex;
  histogram: Histogram;
  samples: number[];
}

export interface DistributionStats {
  mean: number;
  median: number;
  stdev: number;
  min: number;
  max: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
}

export interface ConfidenceIndex {
  score: number;
  label: string;
  components: { key: string; label: string; weight: number; raw: number; points: number }[];
}

/** 10-yr Treasury proxy used for risk-adjusted return metrics. */
export const RISK_FREE_RATE = 4.3;

/* ------------------------------------------------------------------ */
/*  Core engine                                                        */
/* ------------------------------------------------------------------ */

function monthlyPayment(loan: number, annualRate: number, termYears: number): number {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (loan <= 0) return 0;
  if (r <= 0) return loan / n;
  return (loan * r) / (1 - Math.pow(1 + r, -n));
}

/** Newton/bisection IRR on an annual cash flow series (cf[0] is negative equity). */
function irrOf(cashFlows: number[]): number {
  const npv = (rate: number) =>
    cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
  let lo = -0.95, hi = 3.0;
  if (npv(lo) < 0 && npv(hi) < 0) return -95;
  if (npv(lo) > 0 && npv(hi) > 0) return 300;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid; else hi = mid;
  }
  return ((lo + hi) / 2) * 100;
}

/** Simulate one hold period, year by year. */
export function simulatePath(inputs: MonteCarloInputs, a: MonteCarloAssumptions, rng: Rng): MonteCarloPath {
  const years = Math.max(1, Math.round(inputs.holdYears));
  const loan = inputs.purchasePrice * (1 - inputs.downPaymentPct / 100);
  const payment = monthlyPayment(loan, inputs.interestRate, inputs.loanTermYears);
  const monthlyRateDebt = inputs.interestRate / 100 / 12;

  const equityIn =
    inputs.purchasePrice * (inputs.downPaymentPct / 100) +
    inputs.purchasePrice * (inputs.closingCostPct / 100) +
    inputs.rehabBudget;

  let value = inputs.purchasePrice;
  let rent = inputs.monthlyRent;
  let taxes = inputs.annualTaxes;
  let insurance = inputs.annualInsurance;
  let otherOpEx = inputs.monthlyOtherOpEx;
  let balance = loan;

  const annualCashFlows: number[] = [];
  let hadNegativeYear = false;

  for (let y = 0; y < years; y++) {
    // Latent macro factor for this year: >0 expansion, <0 recession.
    const z = rng.normal(0, 1);
    const idio = () => rng.normal(0, 1);
    const mix = (loading: number) => loading * z + Math.sqrt(Math.max(0, 1 - loading * loading)) * idio();

    const apprPct = a.apprMean + a.apprSd * mix(a.macroLoadingAppr);
    const rentGrowthPct = a.rentGrowthMean + a.rentGrowthSd * mix(a.macroLoadingRent);

    // Vacancy: triangular draw, shifted by the macro cycle (recessions raise vacancy).
    const vacRaw = rng.triangular(a.vacancyMin, a.vacancyMode, a.vacancyMax);
    const vacancyPct = Math.max(0, Math.min(60, vacRaw - a.macroLoadingVacancy * z * 3));

    // Right-skewed maintenance as a share of annual gross rent.
    const grossAnnualRent = rent * 12;
    const maintenance = grossAnnualRent * (a.maintMedianPct / 100) * Math.exp(a.maintSigma * idio());

    // Rare, expensive capital events (roof / HVAC / appliances / systems).
    const capex = rng.bernoulli(a.capexProb)
      ? value * (a.capexMedianPctOfValue / 100) * Math.exp(a.capexSigma * idio())
      : 0;

    const vacancyLoss = grossAnnualRent * (vacancyPct / 100);
    const debtService = payment * 12;

    // Exit-year carrying cost: months on market with no rent collected.
    let listingCarry = 0;
    if (y === years - 1) {
      const dom = rng.triangular(a.domMin, a.domMode, a.domMax);
      listingCarry = rent * dom;
    }

    const operating = otherOpEx * 12 + taxes + insurance + maintenance + capex;
    const cf = grossAnnualRent - vacancyLoss - listingCarry - operating - debtService;
    if (cf < 0) hadNegativeYear = true;
    annualCashFlows.push(cf);

    // Amortise the loan month by month (principal paydown is real return).
    for (let m = 0; m < 12 && balance > 0; m++) {
      const interest = balance * monthlyRateDebt;
      const principal = Math.min(balance, payment - interest);
      balance -= principal;
    }
    balance = Math.max(0, balance);

    // Compound the value path and escalate every expense line independently.
    value *= 1 + apprPct / 100;
    rent *= 1 + rentGrowthPct / 100;
    taxes *= 1 + rng.normal(a.taxInflMean, a.taxInflSd) / 100;
    insurance *= 1 + Math.max(-5, rng.normal(a.insInflMean, a.insInflSd)) / 100;
    otherOpEx *= 1 + rng.normal(a.opexInflMean, a.opexInflSd) / 100;
  }

  const sellCostPct = Math.max(2, rng.normal(a.sellCostMean, a.sellCostSd));
  const netProceeds = value * (1 - sellCostPct / 100) - balance;

  const cumulativeCashFlow = annualCashFlows.reduce((s, c) => s + c, 0);
  const totalProfit = cumulativeCashFlow + netProceeds - equityIn;

  // Annualised total return on invested equity (geometric, floored at total wipeout).
  const multiple = equityIn > 0 ? (equityIn + totalProfit) / equityIn : 0;
  const roi = equityIn > 0
    ? (multiple <= 0 ? -100 : (Math.pow(multiple, 1 / years) - 1) * 100)
    : 0;

  const stream = [-equityIn, ...annualCashFlows];
  stream[stream.length - 1] += netProceeds;

  return {
    roi,
    irr: irrOf(stream),
    totalProfit,
    avgAnnualCashFlow: cumulativeCashFlow / years,
    hadNegativeYear,
    exitValue: value,
  };
}

/* ------------------------------------------------------------------ */
/*  Statistics                                                         */
/* ------------------------------------------------------------------ */

function percentile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function describe(values: number[]): DistributionStats {
  const sorted = [...values].sort((x, y) => x - y);
  const mean = values.reduce((s, v) => s + v, 0) / (values.length || 1);
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, values.length - 1);
  return {
    mean,
    median: percentile(sorted, 0.5),
    stdev: Math.sqrt(variance),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    p5: percentile(sorted, 0.05),
    p25: percentile(sorted, 0.25),
    p75: percentile(sorted, 0.75),
    p95: percentile(sorted, 0.95),
  };
}

/** Freedman-Diaconis bin width: 2 * IQR / n^(1/3), clamped to a sane bin count. */
export function buildHistogram(values: number[]): Histogram {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (!n) return { bins: [], binSize: 1 };
  const iqr = percentile(sorted, 0.75) - percentile(sorted, 0.25);
  const min = sorted[0];
  const max = sorted[n - 1];
  const span = Math.max(1e-6, max - min);
  let width = iqr > 0 ? (2 * iqr) / Math.cbrt(n) : span / 30;
  let count = Math.round(span / width);
  count = Math.max(12, Math.min(60, count || 30));
  width = span / count;

  const bins = Array.from({ length: count }, (_, i) => ({
    label: "",
    low: min + i * width,
    high: min + (i + 1) * width,
    mid: min + (i + 0.5) * width,
    count: 0,
    pct: 0,
  }));
  for (const v of sorted) {
    const i = Math.min(count - 1, Math.max(0, Math.floor((v - min) / width)));
    bins[i].count++;
  }
  for (const b of bins) {
    b.pct = (b.count / n) * 100;
    b.label = `${b.low.toFixed(b.high - b.low < 1 ? 1 : 0)}%`;
  }
  return { bins, binSize: width };
}

/**
 * Deal Confidence Index — weighted blend, NOT a pure volatility read.
 *   35%  Probability of positive annualised ROI
 *   20%  Probability of avoiding any negative cash-flow year
 *   20%  Downside risk (CVaR-5 mapped: -30% -> 0 pts, +5% -> full)
 *   15%  Return consistency (median ROI vs the 8% target hurdle)
 *   10%  Dispersion penalty (stdev + downside deviation, 0-30pp band)
 */
export function computeConfidence(args: {
  probPositiveRoi: number;
  probNegativeCashFlowYear: number;
  cvar5: number;
  medianRoi: number;
  stdev: number;
  downsideDeviation: number;
}): ConfidenceIndex {
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const parts = [
    { key: "probPositive", label: "P(positive ROI)", weight: 35, raw: args.probPositiveRoi, norm: clamp01(args.probPositiveRoi / 100) },
    { key: "cfStability", label: "Cash-flow stability", weight: 20, raw: 100 - args.probNegativeCashFlowYear, norm: clamp01((100 - args.probNegativeCashFlowYear) / 100) },
    { key: "downside", label: "Downside protection (CVaR₅)", weight: 20, raw: args.cvar5, norm: clamp01((args.cvar5 + 30) / 35) },
    { key: "consistency", label: "Median vs 8% hurdle", weight: 15, raw: args.medianRoi, norm: clamp01(args.medianRoi / 8) },
    { key: "dispersion", label: "Dispersion penalty", weight: 10, raw: (args.stdev + args.downsideDeviation) / 2, norm: clamp01(1 - (args.stdev + args.downsideDeviation) / 2 / 30) },
  ];
  const score = Math.round(parts.reduce((s, p) => s + p.weight * p.norm, 0));
  const label =
    score >= 80 ? "High conviction" :
    score >= 60 ? "Qualified" :
    score >= 40 ? "Cautious" : "Fails threshold";
  return {
    score,
    label,
    components: parts.map((p) => ({ key: p.key, label: p.label, weight: p.weight, raw: p.raw, points: Math.round(p.weight * p.norm) })),
  };
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */

export const SIMULATION_COUNTS = [1000, 5000, 10000, 25000, 50000] as const;

export function runSimulation(inputs: MonteCarloInputs): MonteCarloResult {
  const seed = inputs.seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = createRng(seed);
  const assumptions: MonteCarloAssumptions = { ...PROFILES[inputs.profile], ...(inputs.overrides ?? {}) };
  const iterations = Math.max(100, Math.min(50000, Math.round(inputs.iterations)));

  // Pre-allocated typed arrays keep 50k paths cheap and GC-free.
  const roiArr = new Float64Array(iterations);
  const irrArr = new Float64Array(iterations);
  let negCfCount = 0;

  for (let i = 0; i < iterations; i++) {
    const p = simulatePath(inputs, assumptions, rng);
    roiArr[i] = p.roi;
    irrArr[i] = p.irr;
    if (p.hadNegativeYear) negCfCount++;
  }

  const roiValues = Array.from(roiArr);
  const irrValues = Array.from(irrArr);
  const roi = describe(roiValues);
  const irr = describe(irrValues);

  const sortedRoi = [...roiValues].sort((a, b) => a - b);
  const var5 = percentile(sortedRoi, 0.05);
  const tail = sortedRoi.slice(0, Math.max(1, Math.floor(iterations * 0.05)));
  const cvar5 = tail.reduce((s, v) => s + v, 0) / tail.length;

  // Downside deviation measured against the risk-free hurdle.
  const shortfalls = roiValues.map((v) => Math.min(0, v - RISK_FREE_RATE));
  const downsideDeviation = Math.sqrt(shortfalls.reduce((s, v) => s + v * v, 0) / iterations);

  const sharpe = roi.stdev > 0.0001 ? (roi.mean - RISK_FREE_RATE) / roi.stdev : 0;
  const sortino = downsideDeviation > 0.0001 ? (roi.mean - RISK_FREE_RATE) / downsideDeviation : 0;

  const pct = (fn: (v: number) => boolean) => (roiValues.filter(fn).length / iterations) * 100;
  const probPositiveRoi = pct((v) => v > 0);
  const probNegativeCashFlowYear = (negCfCount / iterations) * 100;

  return {
    iterations,
    profile: inputs.profile,
    assumptions,
    seed,
    roi,
    irr,
    probPositiveRoi,
    probLoss: 100 - probPositiveRoi,
    probNegativeCashFlowYear,
    probRoiAbove10: pct((v) => v > 10),
    probRoiAbove15: pct((v) => v > 15),
    sharpe,
    sortino,
    downsideDeviation,
    var5,
    cvar5,
    confidence: computeConfidence({
      probPositiveRoi,
      probNegativeCashFlowYear,
      cvar5,
      medianRoi: roi.median,
      stdev: roi.stdev,
      downsideDeviation,
    }),
    histogram: buildHistogram(roiValues),
    samples: roiValues,
  };
}
