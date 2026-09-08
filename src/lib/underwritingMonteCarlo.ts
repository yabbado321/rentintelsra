/**
 * Monte Carlo on top of the canonical underwriting engine.
 * -----------------------------------------------------------------------------
 * There is NO separate financial model here. Each iteration perturbs inputs and
 * calls `computeUnderwriting`, so with zero volatility the median result equals
 * the deterministic Deal Analyzer result exactly (asserted in tests).
 *
 * Simulated variables (spec §16): rent (achievable-rent shock), vacancy,
 * rent growth, expense growth, appreciation, operating-expense shock, and
 * exit cap rate (only when the deal uses the exit-cap method). Interest-rate
 * / refinancing uncertainty is intentionally NOT modeled — RentIntel has no
 * refinance model to perturb, so adding rate noise here would fabricate
 * precision the underlying engine can't back up.
 *
 * Statistics (spec §17/18): every stat below is computed directly from the
 * simulated paths, never derived from another statistic. VaR and Expected
 * Shortfall always share one confidence level (see TailRisk). Sharpe/Sortino
 * return null below MIN_OBS_FOR_RISK_RATIOS rather than fabricate precision
 * from too few observations.
 */
import { computeUnderwriting, type UnderwritingInputs } from "./underwriting";

export interface MonteCarloConfig {
  iterations?: number;
  seed?: number;
  /** Standard deviations / ranges expressed in percentage points. */
  rentGrowthStdev?: number;
  expenseGrowthStdev?: number;
  appreciationStdev?: number;
  vacancyStdev?: number;
  expenseShockStdev?: number; // multiplier stdev, e.g. 0.10 = ±10%
  rentShockStdev?: number;    // multiplier stdev on achievable rent
  /**
   * Stdev (percentage points) applied to exitCapRatePct when the deal uses
   * the exit-cap exit method. Ignored when exitCapRatePct is undefined
   * (appreciation-based exit has no cap rate to perturb).
   */
  exitCapRateStdev?: number;
  /** DSCR floor used for probDscrBelowThreshold. Default 1.20 (typical lender minimum). */
  dscrThreshold?: number;
  /** Pre-tax IRR (%) used for probReturnExceedsTarget. Default 10%. */
  targetReturnPct?: number;
  /**
   * Annual risk-free rate (%) used as the Sharpe/Sortino minimum acceptable
   * return. Default 4.5% — a placeholder for a short-term Treasury yield;
   * callers should pass the current rate rather than rely on this default
   * for anything client-facing.
   */
  riskFreeRatePct?: number;
  /** Confidence level (%) for VaR / Expected Shortfall. Default 95. Must match between the two — see Distribution docs. */
  varConfidencePct?: number;
}

export interface Distribution {
  mean: number;
  median: number;
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  stdev: number;
}

/** Value-at-Risk and Expected Shortfall computed at the SAME confidence level — never mixed. */
export interface TailRisk {
  confidencePct: number;
  /** Dollar loss not exceeded at this confidence level (positive = a loss). */
  valueAtRisk: number;
  /** Average loss within the worst (100 - confidencePct)% tail. Always >= VaR. */
  expectedShortfall: number;
}

export interface MonteCarloResult {
  iterations: number;
  irr: Distribution;
  cashOnCash: Distribution;
  dscr: Distribution;
  annualCashFlow: Distribution;
  equityMultiple: Distribution;
  probNegativeCashFlow: number; // % of paths with negative year-1 cash flow
  probLoss: number;             // % of paths with IRR <= 0 (or no solvable IRR)
  /** % of paths where DSCR falls below config.dscrThreshold. */
  probDscrBelowThreshold: number;
  /** % of paths where pre-tax IRR exceeds config.targetReturnPct. */
  probReturnExceedsTarget: number;
  /** VaR/ES on annual cash flow (dollars), spec §17. */
  cashFlowTailRisk: TailRisk;
  /**
   * Sharpe/Sortino on the simulated pre-tax IRR distribution. `null` when
   * fewer than 30 valid IRR observations exist — spec §18 forbids
   * manufacturing precision from insufficient data.
   */
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  riskFreeRatePct: number;
  /** DSCR floor used for probDscrBelowThreshold — echoed so reports can label it truthfully. */
  dscrThreshold: number;
  /** Target pre-tax IRR (%) used for probReturnExceedsTarget. */
  targetReturnPct: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller normal draw. */
function normal(rand: () => number, mean: number, stdev: number) {
  if (stdev === 0) return mean;
  const u = Math.max(1e-12, rand());
  const v = rand();
  return mean + stdev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function describe(values: number[]): Distribution {
  const clean = values.filter((v) => isFinite(v)).sort((a, b) => a - b);
  const q = (p: number) => (clean.length ? clean[Math.min(clean.length - 1, Math.floor(p * clean.length))] : 0);
  const mean = clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : 0;
  const variance = clean.length ? clean.reduce((a, b) => a + (b - mean) ** 2, 0) / clean.length : 0;
  return {
    mean,
    median: q(0.5),
    p5: q(0.05),
    p10: q(0.1),
    p25: q(0.25),
    p50: q(0.5),
    p75: q(0.75),
    p90: q(0.9),
    p95: q(0.95),
    stdev: Math.sqrt(variance),
  };
}

/**
 * VaR / Expected Shortfall at a single, explicit confidence level. ES always
 * uses the identical tail that defines VaR (spec §17: "If VaR is 95%,
 * Expected Shortfall must use the worst 5% tail" — never a different alpha).
 */
function tailRisk(values: number[], confidencePct: number): TailRisk {
  const clean = values.filter((v) => isFinite(v)).sort((a, b) => a - b);
  if (!clean.length) return { confidencePct, valueAtRisk: 0, expectedShortfall: 0 };
  const alpha = 1 - confidencePct / 100;
  const cutoffIdx = Math.max(0, Math.min(clean.length - 1, Math.floor(alpha * clean.length)));
  const valueAtRisk = -clean[cutoffIdx];
  const tail = clean.slice(0, cutoffIdx + 1);
  const expectedShortfall = -(tail.reduce((a, b) => a + b, 0) / tail.length);
  return { confidencePct, valueAtRisk, expectedShortfall };
}

/**
 * Sharpe/Sortino on a return series expressed in percent. Returns null for
 * both when fewer than MIN_OBS valid observations exist, per spec §18
 * ("do not manufacture precision from insufficient data").
 */
const MIN_OBS_FOR_RISK_RATIOS = 30;
function riskAdjustedRatios(returnsPct: number[], riskFreeRatePct: number): { sharpe: number | null; sortino: number | null } {
  const clean = returnsPct.filter((v) => isFinite(v));
  if (clean.length < MIN_OBS_FOR_RISK_RATIOS) return { sharpe: null, sortino: null };
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  const variance = clean.reduce((a, b) => a + (b - mean) ** 2, 0) / clean.length;
  const stdev = Math.sqrt(variance);
  const excess = mean - riskFreeRatePct;
  const sharpe = stdev > 0 ? excess / stdev : null;

  // Downside deviation: only observations below the MAR (risk-free rate) count.
  const downsideSq = clean.map((r) => (r < riskFreeRatePct ? (r - riskFreeRatePct) ** 2 : 0));
  const downsideVariance = downsideSq.reduce((a, b) => a + b, 0) / clean.length;
  const downsideDev = Math.sqrt(downsideVariance);
  const sortino = downsideDev > 0 ? excess / downsideDev : null;

  return { sharpe, sortino };
}

export function runUnderwritingMonteCarlo(
  inputs: Partial<UnderwritingInputs>,
  config: MonteCarloConfig = {},
): MonteCarloResult {
  const {
    iterations = 1500,
    seed = 20260214,
    rentGrowthStdev = 1.5,
    expenseGrowthStdev = 1.5,
    appreciationStdev = 3,
    vacancyStdev = 2.5,
    expenseShockStdev = 0.08,
    rentShockStdev = 0.06,
    exitCapRateStdev = 0.5,
    dscrThreshold = 1.2,
    targetReturnPct = 10,
    riskFreeRatePct = 4.5,
    varConfidencePct = 95,
  } = config;

  const rand = mulberry32(seed);
  const base = computeUnderwriting(inputs);
  const b = base.inputs;

  const irrs: number[] = [];
  const cocs: number[] = [];
  const dscrs: number[] = [];
  const cfs: number[] = [];
  const ems: number[] = [];
  let negCF = 0;
  let loss = 0;
  let belowDscrThreshold = 0;
  let aboveTargetReturn = 0;

  for (let n = 0; n < iterations; n++) {
    const rentShock = Math.max(0.4, normal(rand, 1, rentShockStdev));
    const expShock = Math.max(0.5, normal(rand, 1, expenseShockStdev));
    const path: Partial<UnderwritingInputs> = {
      ...b,
      monthlyBaseRent: b.monthlyBaseRent * rentShock,
      vacancyPct: Math.max(0, Math.min(60, normal(rand, b.vacancyPct, vacancyStdev))),
      rentGrowthPct: normal(rand, b.rentGrowthPct, rentGrowthStdev),
      expenseGrowthPct: normal(rand, b.expenseGrowthPct, expenseGrowthStdev),
      appreciationPct: normal(rand, b.appreciationPct, appreciationStdev),
      propertyTaxes: { ...b.propertyTaxes, value: b.propertyTaxes.value * expShock },
      insurance: { ...b.insurance, value: b.insurance.value * expShock },
      maintenance: { ...b.maintenance, value: b.maintenance.value * expShock },
      // Only perturb exit cap rate when the deal actually uses the exit-cap
      // method — appreciation-exit deals have no cap rate to shock.
      exitCapRatePct:
        b.exitCapRatePct !== undefined
          ? Math.max(0.01, normal(rand, b.exitCapRatePct, exitCapRateStdev))
          : undefined,
    };
    const r = computeUnderwriting(path);
    if (r.projection.irrPreTaxPct !== null) {
      irrs.push(r.projection.irrPreTaxPct);
      if (r.projection.irrPreTaxPct <= 0) loss++;
      if (r.projection.irrPreTaxPct > targetReturnPct) aboveTargetReturn++;
    } else {
      loss++;
    }
    if (r.metrics.cashOnCashAfterCapexPct !== null) cocs.push(r.metrics.cashOnCashAfterCapexPct);
    if (r.metrics.dscr !== null) {
      dscrs.push(r.metrics.dscr);
      if (r.metrics.dscr < dscrThreshold) belowDscrThreshold++;
    } else {
      // No debt service (all-cash deal) — DSCR is undefined, not "below threshold".
    }
    cfs.push(r.cashFlow.annualAfterCapex);
    if (r.projection.equityMultiple !== null) ems.push(r.projection.equityMultiple);
    if (r.cashFlow.annualAfterCapex < 0) negCF++;
  }

  const { sharpe, sortino } = riskAdjustedRatios(irrs, riskFreeRatePct);

  return {
    iterations,
    irr: describe(irrs),
    cashOnCash: describe(cocs),
    dscr: describe(dscrs),
    annualCashFlow: describe(cfs),
    equityMultiple: describe(ems),
    probNegativeCashFlow: (negCF / iterations) * 100,
    probLoss: (loss / iterations) * 100,
    probDscrBelowThreshold: dscrs.length ? (belowDscrThreshold / dscrs.length) * 100 : 0,
    probReturnExceedsTarget: (aboveTargetReturn / iterations) * 100,
    cashFlowTailRisk: tailRisk(cfs, varConfidencePct),
    sharpeRatio: sharpe,
    sortinoRatio: sortino,
    riskFreeRatePct,
    dscrThreshold,
    targetReturnPct,
  };
}
