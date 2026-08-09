/**
 * Monte Carlo on top of the canonical underwriting engine.
 * -----------------------------------------------------------------------------
 * There is NO separate financial model here. Each iteration perturbs inputs and
 * calls `computeUnderwriting`, so with zero volatility the median result equals
 * the deterministic Deal Analyzer result exactly (asserted in tests).
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
}

export interface Distribution {
  mean: number;
  median: number;
  p5: number;
  p10: number;
  p50: number;
  p90: number;
  p95: number;
  stdev: number;
}

export interface MonteCarloResult {
  iterations: number;
  irr: Distribution;
  cashOnCash: Distribution;
  dscr: Distribution;
  annualCashFlow: Distribution;
  equityMultiple: Distribution;
  probNegativeCashFlow: number; // % of paths with negative year-1 cash flow
  probLoss: number;             // % of paths with IRR <= 0
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
    p50: q(0.5),
    p90: q(0.9),
    p95: q(0.95),
    stdev: Math.sqrt(variance),
  };
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
    };
    const r = computeUnderwriting(path);
    if (r.projection.irrPreTaxPct !== null) {
      irrs.push(r.projection.irrPreTaxPct);
      if (r.projection.irrPreTaxPct <= 0) loss++;
    } else {
      loss++;
    }
    if (r.metrics.cashOnCashAfterCapexPct !== null) cocs.push(r.metrics.cashOnCashAfterCapexPct);
    if (r.metrics.dscr !== null) dscrs.push(r.metrics.dscr);
    cfs.push(r.cashFlow.annualAfterCapex);
    if (r.projection.equityMultiple !== null) ems.push(r.projection.equityMultiple);
    if (r.cashFlow.annualAfterCapex < 0) negCF++;
  }

  return {
    iterations,
    irr: describe(irrs),
    cashOnCash: describe(cocs),
    dscr: describe(dscrs),
    annualCashFlow: describe(cfs),
    equityMultiple: describe(ems),
    probNegativeCashFlow: (negCF / iterations) * 100,
    probLoss: (loss / iterations) * 100,
  };
}
