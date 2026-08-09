import { describe, it, expect } from "vitest";
import {
  computeUnderwriting, monthlyPayment, amortize, irr, pct, dollars,
  type UnderwritingInputs,
} from "./underwriting";
import { runUnderwritingMonteCarlo } from "./underwritingMonteCarlo";

/** Canonical test deal: $300k, 20% down, 6% / 30yr, $2,500 rent. */
const DEAL: Partial<UnderwritingInputs> = {
  purchasePrice: 300000,
  downPaymentPct: 20,
  interestRatePct: 6,
  loanTermYears: 30,
  closingCostPct: 3,
  rehabBudget: 20000,
  holdYears: 10,
  units: 1,
  squareFeet: 1500,
  monthlyBaseRent: 2500,
  otherIncome: { parking: 50 },
  vacancyPct: 5,
  propertyTaxes: dollars(3600),
  insurance: dollars(1200),
  hoaMonthly: 0,
  management: pct(8),
  maintenance: pct(5),
  capexReserve: pct(5),
  rentGrowthPct: 3,
  expenseGrowthPct: 3,
  appreciationPct: 3,
  sellingCostPct: 7,
  taxModelEnabled: true,
  marginalTaxRatePct: 24,
  capitalGainsRatePct: 15,
  landAllocationPct: 20,
};

describe("debt primitives", () => {
  it("computes a level mortgage payment", () => {
    // $240,000 @ 6% / 30yr = $1,438.92
    expect(monthlyPayment(240000, 6, 30)).toBeCloseTo(1438.92, 1);
  });

  it("handles 0% interest as straight-line principal", () => {
    expect(monthlyPayment(120000, 0, 30)).toBeCloseTo(120000 / 360, 6);
  });

  it("returns 0 payment with no loan (100% down)", () => {
    expect(monthlyPayment(0, 6, 30)).toBe(0);
  });

  it("amortizes to a lower balance each year and never below zero", () => {
    const s = amortize(240000, 6, 30, 30);
    expect(s[0].endingBalance).toBeLessThan(240000);
    expect(s[29].endingBalance).toBeCloseTo(0, 2);
    for (const y of s) expect(y.endingBalance).toBeGreaterThanOrEqual(0);
  });

  it("computes IRR of a known stream", () => {
    // -1000 then 5x 300 => ~15.2%
    const r = irr([-1000, 300, 300, 300, 300, 300]);
    expect(r).not.toBeNull();
    expect((r as number) * 100).toBeCloseTo(15.24, 1);
  });
});

describe("income statement and NOI conventions", () => {
  const r = computeUnderwriting(DEAL);

  it("computes gross potential rent, other income and a single vacancy deduction", () => {
    expect(r.income.grossPotentialRentAnnual).toBe(2500 * 12);
    expect(r.income.otherIncomeAnnual).toBe(50 * 12);
    expect(r.income.vacancyLossAnnual).toBeCloseTo((30000 + 600) * 0.05, 6);
    expect(r.income.effectiveGrossIncomeAnnual).toBeCloseTo(30600 - 1530, 6);
  });

  it("excludes CapEx from NOI but includes maintenance", () => {
    const egi = r.income.effectiveGrossIncomeAnnual;
    const expected = egi - (3600 + 1200 + egi * 0.08 + egi * 0.05);
    expect(r.noiAnnual).toBeCloseTo(expected, 6);
    expect(r.expenses.capexReserveAnnual).toBeCloseTo(egi * 0.05, 6);
    expect(r.expenses.lines.find((l) => l.key === "capex")?.inNOI).toBe(false);
  });

  it("never subtracts debt service from NOI", () => {
    expect(r.noiAnnual).toBeGreaterThan(r.cashFlow.annualBeforeCapex);
    expect(r.cashFlow.annualBeforeCapex).toBeCloseTo(r.noiAnnual - r.debt.annualDebtService, 6);
    expect(r.cashFlow.annualAfterCapex).toBeCloseTo(
      r.cashFlow.annualBeforeCapex - r.expenses.capexReserveAnnual, 6,
    );
  });
});

describe("core metrics", () => {
  const r = computeUnderwriting(DEAL);

  it("cap rate uses purchase price, yield on cost uses all-in cost", () => {
    expect(r.metrics.capRatePct).toBeCloseTo((r.noiAnnual / 300000) * 100, 6);
    expect(r.metrics.yieldOnCostPct).toBeCloseTo((r.noiAnnual / r.capital.allInCost) * 100, 6);
    expect(r.metrics.yieldOnCostPct as number).toBeLessThan(r.metrics.capRatePct as number);
  });

  it("cash invested = down + closing + rehab + financing - credits", () => {
    expect(r.capital.cashInvested).toBeCloseTo(60000 + 9000 + 20000, 6);
    expect(r.capital.allInCost).toBeCloseTo(300000 + 20000 + 9000, 6);
  });

  it("DSCR, debt yield, LTV and GRM", () => {
    expect(r.metrics.dscr).toBeCloseTo(r.noiAnnual / r.debt.annualDebtService, 6);
    expect(r.metrics.debtYieldPct).toBeCloseTo((r.noiAnnual / 240000) * 100, 6);
    expect(r.metrics.ltvPct).toBeCloseTo(80, 6);
    expect(r.metrics.grm).toBeCloseTo(300000 / 30000, 6);
  });

  it("per-square-foot metrics only when square footage exists", () => {
    expect(r.metrics.pricePerSqFt).toBeCloseTo(200, 6);
    const noSqft = computeUnderwriting({ ...DEAL, squareFeet: undefined });
    expect(noSqft.metrics.pricePerSqFt).toBeNull();
    expect(noSqft.metrics.noiPerSqFt).toBeNull();
  });

  it("cash-on-cash before and after CapEx differ and both trace to cash invested", () => {
    expect(r.metrics.cashOnCashBeforeCapexPct).toBeCloseTo(
      (r.cashFlow.annualBeforeCapex / r.capital.cashInvested) * 100, 6,
    );
    expect(r.metrics.cashOnCashAfterCapexPct).toBeCloseTo(
      (r.cashFlow.annualAfterCapex / r.capital.cashInvested) * 100, 6,
    );
    expect(r.metrics.cashOnCashAfterCapexPct as number)
      .toBeLessThan(r.metrics.cashOnCashBeforeCapexPct as number);
  });
});

describe("break-even solutions", () => {
  it("break-even occupancy actually zeroes cash flow before CapEx", () => {
    const r = computeUnderwriting(DEAL);
    const occ = r.metrics.breakEvenOccupancyPct as number;
    expect(occ).toBeGreaterThan(0);
    const at = computeUnderwriting({ ...DEAL, vacancyPct: 100 - occ });
    expect(at.cashFlow.annualBeforeCapex).toBeCloseTo(0, 0);
  });

  it("break-even rent actually zeroes cash flow before CapEx", () => {
    const r = computeUnderwriting(DEAL);
    const rent = r.metrics.breakEvenRentMonthly as number;
    const at = computeUnderwriting({ ...DEAL, monthlyBaseRent: rent });
    expect(at.cashFlow.annualBeforeCapex).toBeCloseTo(0, 0);
  });

  it("returns null when no rent covers costs", () => {
    const r = computeUnderwriting({ ...DEAL, propertyTaxes: dollars(500000) });
    expect(r.metrics.breakEvenOccupancyPct).toBeNull();
  });
});

describe("long-term returns and exit", () => {
  const r = computeUnderwriting(DEAL);

  it("cash-flow stream starts with negative cash invested", () => {
    expect(r.projection.preTaxCashflowStream[0]).toBeCloseTo(-r.capital.cashInvested, 6);
    expect(r.projection.preTaxCashflowStream).toHaveLength(11);
  });

  it("final stream year includes net sale proceeds", () => {
    const lastYear = r.projection.years[9];
    expect(r.projection.preTaxCashflowStream[10]).toBeCloseTo(
      lastYear.cashFlowAfterCapex + r.projection.exit.netProceedsPreTax, 4,
    );
  });

  it("net sale proceeds = price - selling costs - payoff", () => {
    const e = r.projection.exit;
    expect(e.netProceedsPreTax).toBeCloseTo(e.grossSalePrice - e.sellingCosts - e.loanPayoff, 6);
    expect(e.netProceedsAfterTax).toBeLessThan(e.netProceedsPreTax);
  });

  it("equity multiple reproduces from the displayed stream", () => {
    const em = (r.projection.totalCashFlow + r.projection.exit.netProceedsPreTax) / r.capital.cashInvested;
    expect(r.projection.equityMultiple).toBeCloseTo(em, 6);
    expect(r.projection.totalRoiPct).toBeCloseTo((em - 1) * 100, 6);
  });

  it("IRR reproduces from the displayed stream", () => {
    const recomputed = irr(r.projection.preTaxCashflowStream) as number;
    expect(r.projection.irrPreTaxPct).toBeCloseTo(recomputed * 100, 6);
    expect(r.projection.irrAfterTaxPct as number).toBeLessThan(r.projection.irrPreTaxPct as number);
  });

  it("exit cap methodology overrides appreciation when provided", () => {
    const withCap = computeUnderwriting({ ...DEAL, exitCapRatePct: 6 });
    expect(withCap.projection.exit.method).toBe("exit-cap");
    const finalNoi = withCap.projection.years[9].noi;
    expect(withCap.projection.exit.grossSalePrice).toBeCloseTo(finalNoi / 0.06, 4);
  });

  it("does not depreciate land", () => {
    const dep = r.projection.years[0].depreciation;
    const basis = 300000 * 0.8 + 20000;
    expect(dep).toBeCloseTo(basis / 27.5, 6);
  });
});

describe("edge cases", () => {
  it("0% vacancy leaves EGI equal to gross income", () => {
    const r = computeUnderwriting({ ...DEAL, vacancyPct: 0 });
    expect(r.income.vacancyLossAnnual).toBe(0);
    expect(r.income.effectiveGrossIncomeAnnual).toBeCloseTo(30600, 6);
  });

  it("100% vacancy produces zero EGI and negative cash flow", () => {
    const r = computeUnderwriting({ ...DEAL, vacancyPct: 100 });
    expect(r.income.effectiveGrossIncomeAnnual).toBeCloseTo(0, 6);
    expect(r.cashFlow.annualAfterCapex).toBeLessThan(0);
    expect(r.metrics.dscr as number).toBeLessThan(0);
  });

  it("100% down payment removes debt entirely", () => {
    const r = computeUnderwriting({ ...DEAL, downPaymentPct: 100 });
    expect(r.debt.loanAmount).toBe(0);
    expect(r.debt.annualDebtService).toBe(0);
    expect(r.metrics.dscr).toBeNull();
    expect(r.metrics.debtYieldPct).toBeNull();
    expect(r.metrics.ltvPct).toBeCloseTo(0, 6);
  });

  it("0% interest still amortizes and yields positive coverage", () => {
    const r = computeUnderwriting({ ...DEAL, interestRatePct: 0 });
    expect(r.debt.monthlyPI).toBeCloseTo(240000 / 360, 4);
    expect(r.projection.years[0].interest).toBeCloseTo(0, 6);
  });

  it("no rehab, no HOA, no management, no other income", () => {
    const r = computeUnderwriting({
      ...DEAL, rehabBudget: 0, hoaMonthly: 0, management: pct(0), otherIncome: {},
    });
    expect(r.income.otherIncomeAnnual).toBe(0);
    expect(r.capital.allInCost).toBeCloseTo(309000, 6);
    expect(r.expenses.lines.some((l) => l.key === "management")).toBe(false);
  });

  it("very high rehab pushes yield on cost below cap rate materially", () => {
    const r = computeUnderwriting({ ...DEAL, rehabBudget: 200000 });
    expect(r.metrics.yieldOnCostPct as number).toBeLessThan((r.metrics.capRatePct as number) * 0.7);
  });

  it("ARV below purchase price flags negative starting equity", () => {
    const r = computeUnderwriting({ ...DEAL, arv: 250000 });
    expect(r.metrics.loanToArvPct).toBeCloseTo((240000 / 250000) * 100, 6);
    expect(r.flags.some((f) => f.code === "BASIS_ABOVE_ARV")).toBe(true);
  });

  it("ARV above purchase price does not become LTV", () => {
    const r = computeUnderwriting({ ...DEAL, arv: 400000 });
    expect(r.metrics.ltvPct).toBeCloseTo(80, 6);
    expect(r.metrics.loanToArvPct).toBeCloseTo(60, 6);
  });

  it("negative cash flow raises a critical flag and caps the score", () => {
    const r = computeUnderwriting({ ...DEAL, monthlyBaseRent: 1200 });
    expect(r.cashFlow.annualAfterCapex).toBeLessThan(0);
    expect(r.flags.some((f) => f.code === "NEG_CF_BASE" && f.severity === "critical")).toBe(true);
    expect(r.score.total).toBeLessThan(50);
  });
});

describe("deal score behaviour", () => {
  it("does not award a near-perfect score to a fragile high-return deal", () => {
    const fragile = computeUnderwriting({
      ...DEAL, purchasePrice: 150000, monthlyBaseRent: 2500, downPaymentPct: 5,
      interestRatePct: 11, propertyTaxes: dollars(9000), insurance: dollars(4000),
    });
    const stable = computeUnderwriting({
      ...DEAL, purchasePrice: 260000, monthlyBaseRent: 2700, downPaymentPct: 30,
      interestRatePct: 6, propertyTaxes: dollars(3200), insurance: dollars(1200),
    });
    expect(fragile.metrics.cashOnCashAfterCapexPct as number)
      .toBeGreaterThan(stable.metrics.cashOnCashAfterCapexPct as number);
    expect(fragile.score.total).toBeLessThan(stable.score.total);
  });

  it("score categories sum to the displayed total", () => {
    const r = computeUnderwriting(DEAL);
    const scored = r.score.marketScored
      ? r.score.categories
      : r.score.categories.filter((c) => c.key !== "market");
    const total = (scored.reduce((a, c) => a + c.score, 0) / scored.reduce((a, c) => a + c.max, 0)) * 100;
    expect(r.score.total).toBeCloseTo(total, 6);
    expect(r.score.total).toBeLessThanOrEqual(100);
  });

  it("never auto-adjusts rent from ZIP median, only warns", () => {
    const r = computeUnderwriting({ ...DEAL, market: { medianRent: 1500 } });
    expect(r.inputs.monthlyBaseRent).toBe(2500);
    expect(r.flags.some((f) => f.code === "RENT_ABOVE_MARKET")).toBe(true);
  });
});

describe("reconciliation panel", () => {
  it("traces EGI, NOI and cash flow from the displayed lines", () => {
    const r = computeUnderwriting(DEAL);
    const find = (label: string) => r.reconciliation.find((l) => l.label.startsWith(label))?.value as number;
    expect(find("Effective Gross Income")).toBeCloseTo(r.income.effectiveGrossIncomeAnnual, 6);
    expect(find("Net Operating Income")).toBeCloseTo(r.noiAnnual, 6);
    expect(find("Cash Flow After CapEx")).toBeCloseTo(r.cashFlow.annualAfterCapex, 6);
    expect(find("Total Cash Invested")).toBeCloseTo(r.capital.cashInvested, 6);
  });
});

describe("monte carlo uses the same engine", () => {
  it("converges to the deterministic result with zero volatility", () => {
    const deterministic = computeUnderwriting(DEAL);
    const mc = runUnderwritingMonteCarlo(DEAL, {
      iterations: 50, rentGrowthStdev: 0, expenseGrowthStdev: 0, appreciationStdev: 0,
      vacancyStdev: 0, expenseShockStdev: 0, rentShockStdev: 0,
    });
    expect(mc.irr.median).toBeCloseTo(deterministic.projection.irrPreTaxPct as number, 6);
    expect(mc.dscr.median).toBeCloseTo(deterministic.metrics.dscr as number, 6);
    expect(mc.annualCashFlow.median).toBeCloseTo(deterministic.cashFlow.annualAfterCapex, 6);
    expect(mc.cashOnCash.median).toBeCloseTo(deterministic.metrics.cashOnCashAfterCapexPct as number, 6);
  });

  it("produces dispersion once volatility is enabled", () => {
    const mc = runUnderwritingMonteCarlo(DEAL, { iterations: 300 });
    expect(mc.irr.stdev).toBeGreaterThan(0);
    expect(mc.irr.p95).toBeGreaterThan(mc.irr.p5);
  });
});
