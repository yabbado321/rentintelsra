/**
 * Underwriting Guardrails
 * -----------------------------------------------------------------------------
 * Pure functions that surface risk-flags for suspicious metrics. Every
 * evaluator returns typed `GuardrailFlag` objects consumable by both UI
 * banners (GuardrailBanner) and PDF/memo generation.
 *
 * Benchmarks are institutional real-estate norms — deliberately conservative.
 */

export type GuardrailSeverity = "critical" | "warning" | "info";

export interface GuardrailFlag {
  code: string;
  severity: GuardrailSeverity;
  title: string;
  message: string;
}

const RISK_FREE_RATE = 4.5; // 10-yr Treasury proxy for Sharpe

/* ------------------------------------------------------------------ */
/*  Sharpe Ratio                                                       */
/* ------------------------------------------------------------------ */

/**
 * Derives a rough Sharpe ratio + stdev estimate from Monte Carlo p10/p90.
 * Uses (p90 - p10) / 2.5631 as a ~80% normal-band stdev proxy.
 */
export function deriveSharpe(expectedIRR: number, irrP10: number, irrP90: number) {
  const stdev = Math.max(0.01, (irrP90 - irrP10) / 2.5631);
  const sharpe = (expectedIRR - RISK_FREE_RATE) / stdev;
  return { sharpe, stdev };
}

export function evaluateSharpe(sharpe: number, stdev: number): GuardrailFlag | null {
  if (!isFinite(sharpe)) return null;
  if (sharpe > 3.0) {
    return {
      code: "SHARPE_OUT_OF_RANGE",
      severity: "critical",
      title: "Sharpe Ratio outside credible range",
      message:
        `The Sharpe Ratio of ${sharpe.toFixed(2)} materially exceeds typical real estate ranges ` +
        `(0.5–2.5) and likely reflects simulation inputs with artificially narrow variance bands — ` +
        `specifically, a standard deviation of ${stdev.toFixed(2)}% which understates real property ` +
        `volatility. This metric should not be used as a positive indicator of risk-adjusted quality.`,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Loss Probability                                                   */
/* ------------------------------------------------------------------ */

export function evaluateLossProbability(lossPct: number, iterations: number): GuardrailFlag | null {
  if (lossPct <= 0.0001 && iterations > 0) {
    return {
      code: "LOSS_PROB_ZERO",
      severity: "warning",
      title: "0% loss probability is not risk-free",
      message:
        `A Loss Probability of 0% across ${iterations.toLocaleString()} simulations may reflect ` +
        `simulation input ranges constrained to positive growth assumptions rather than a ` +
        `genuinely risk-free investment profile. Real rental properties carry intrinsic tail ` +
        `risks — sustained vacancy, major unplanned capital events, rent market corrections — ` +
        `that are not captured when simulation bands exclude negative scenarios. Independent ` +
        `stress testing using vacancy shocks and rent decline scenarios is strongly recommended ` +
        `before relying on this metric.`,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Deal Confidence Index                                              */
/* ------------------------------------------------------------------ */

export interface DCIResult {
  raw: number;         // uncapped composite (0-100)
  ceiling: number;     // policy-enforced ceiling
  adjusted: number;    // min(raw, ceiling)
  flag: GuardrailFlag | null;
  label: string;       // narrative label
}

export function computeDCI(inputs: {
  dscr: number;
  cashOnCash: number;   // %
  mcSuccessRate: number; // 100 - probNegativeCF
  netCashFlow: number;   // monthly $
}): DCIResult {
  const { dscr, cashOnCash, mcSuccessRate, netCashFlow } = inputs;

  // Ceiling by underwriting profile
  let ceiling = 90;
  if (dscr < 1.0) ceiling = 30;
  else if (dscr < 1.15) ceiling = 50;
  else if (dscr < 1.25) ceiling = 70;
  else if (dscr >= 1.25 && cashOnCash >= 5 && mcSuccessRate >= 85) ceiling = 95;
  else ceiling = 80;

  // Composite raw score (rewards DSCR, CoC, MC success)
  const dscrScore = Math.min(dscr / 1.5, 1) * 45;
  const cocScore = Math.min(Math.max(cashOnCash, 0) / 10, 1) * 30;
  const mcScore = Math.min(Math.max(mcSuccessRate, 0) / 100, 1) * 25;
  const raw = Math.round(dscrScore + cocScore + mcScore);
  const adjusted = Math.min(raw, ceiling);

  const label =
    adjusted >= 85 ? "High conviction"
    : adjusted >= 65 ? "Qualified"
    : adjusted >= 45 ? "Cautious"
    : "Fails threshold";

  const flag: GuardrailFlag | null = raw > ceiling
    ? {
        code: "DCI_CEILING_EXCEEDED",
        severity: "warning",
        title: "Deal Confidence Index adjusted to ceiling",
        message:
          `Deal Confidence Index Discrepancy: The raw confidence score of ${raw}% is inconsistent with ` +
          `the quantitative underwriting profile (DSCR: ${dscr.toFixed(2)}, CoC: ${cashOnCash.toFixed(1)}%, ` +
          `MC Success: ${mcSuccessRate.toFixed(1)}%, Net CF: $${Math.round(netCashFlow)}/mo). The ` +
          `confidence level supported by this analysis is ${ceiling}%.`,
      }
    : null;

  return { raw, ceiling, adjusted, flag, label };
}

/* ------------------------------------------------------------------ */
/*  Scenario Return Disclosure                                         */
/* ------------------------------------------------------------------ */

export function describeScenarioReturn(
  scenario: "Optimistic" | "Base" | "Pessimistic",
  returnPct: number,
  ltvPct: number,
): GuardrailFlag | null {
  if (returnPct > 20) {
    return {
      code: `SCENARIO_LEVERAGED_${scenario.toUpperCase()}`,
      severity: "info",
      title: `${scenario} return is leveraged, not cash-on-cash`,
      message:
        `The ${scenario} scenario projects ${returnPct.toFixed(1)}%/yr return. This figure represents ` +
        `leveraged total return on invested equity — incorporating property appreciation amplified ` +
        `by leverage — not cash-on-cash return or net operating return. At ${ltvPct.toFixed(0)}% LTV, ` +
        `leverage materially amplifies appreciation into equity return. This figure is not directly ` +
        `comparable to unlevered benchmarks or income-only return metrics.`,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Negative Cash Flow Scenario Protocol                               */
/* ------------------------------------------------------------------ */

export function evaluateNegativeCashflow(
  scenario: "Base" | "Pessimistic",
  annualCF: number,
  holdYears: number,
): GuardrailFlag | null {
  if (annualCF >= 0) return null;
  const shortfall = Math.abs(Math.round(annualCF));
  const cumulative = shortfall * holdYears;
  return {
    code: `NEG_CF_${scenario.toUpperCase()}`,
    severity: "critical",
    title: `${scenario} scenario requires supplemental capital`,
    message:
      `${scenario} Scenario Capital Requirement: Under ${scenario.toLowerCase()} assumptions, this ` +
      `property generates negative annual cash flow of approximately $${shortfall.toLocaleString()}/year. ` +
      `The investor must contribute $${shortfall.toLocaleString()}/year in supplemental capital to ` +
      `cover debt service and operating obligations. Total estimated capital contributions over ` +
      `the ${holdYears}-year hold period: $${cumulative.toLocaleString()}. This is not a passive ` +
      `income investment under these conditions.`,
  };
}

/* ------------------------------------------------------------------ */
/*  Expense Assumption Validation                                      */
/* ------------------------------------------------------------------ */

export interface ExpenseInputs {
  mgmtPct: number;      // % of rent
  capexPct: number;     // % of rent
  vacancyPct: number;   // %
  maintPct: number;     // % of rent
  monthlyRent: number;
  yearBuilt?: number;
}

export function validateExpenses(x: ExpenseInputs): GuardrailFlag[] {
  const flags: GuardrailFlag[] = [];

  if (x.mgmtPct < 6 && x.mgmtPct >= 0) {
    const dollarImpact = Math.round(x.monthlyRent * (0.09 - x.mgmtPct / 100));
    flags.push({
      code: "MGMT_BELOW_MARKET",
      severity: "warning",
      title: "Management fee below market",
      message:
        `The property management fee of ${x.mgmtPct}% is below the market rate of 8–12%. Cash flow ` +
        `projections may be overstated by approximately $${Math.max(0, dollarImpact)}/month.`,
    });
  }

  const capexFloor = x.yearBuilt && x.yearBuilt < 2000 ? 5 : 3;
  if (x.capexPct < capexFloor) {
    flags.push({
      code: "CAPEX_INSUFFICIENT",
      severity: "warning",
      title: "CapEx reserve may be inadequate",
      message:
        `CapEx reserve of ${x.capexPct}% may be inadequate for a property of this vintage. A minimum ` +
        `5% reserve is recommended.`,
    });
  }

  if (x.vacancyPct < 4) {
    flags.push({
      code: "VACANCY_AGGRESSIVE",
      severity: "warning",
      title: "Vacancy assumption is aggressive",
      message:
        `Vacancy assumption of ${x.vacancyPct}% falls below the stabilized benchmark of 5–8% and may ` +
        `overstate income.`,
    });
  }

  if (x.maintPct < 3) {
    flags.push({
      code: "MAINT_INSUFFICIENT",
      severity: "warning",
      title: "Maintenance reserve is insufficient",
      message:
        `Maintenance reserve of ${x.maintPct}% falls below the 5–10% market benchmark and likely ` +
        `understates true operating cost.`,
    });
  }

  return flags;
}

/* ------------------------------------------------------------------ */
/*  Cross-Tool Assumption Consistency                                  */
/* ------------------------------------------------------------------ */

export function detectInconsistency(
  field: string,
  values: { tool: string; value: number }[],
  usedValue: number,
): GuardrailFlag | null {
  if (values.length < 2) return null;
  const first = values[0].value;
  const drift = values.some((v) => Math.abs(v.value - first) > 0.5);
  if (!drift) return null;
  const parts = values.map((v) => `${v.value} in ${v.tool}`).join(" and ");
  return {
    code: `INCONSISTENT_${field.toUpperCase().replace(/\W+/g, "_")}`,
    severity: "warning",
    title: `${field} is inconsistent across tools`,
    message:
      `Assumption Inconsistency Detected: ${field} is set to ${parts}. This report uses ${usedValue}. ` +
      `Inconsistent assumptions across tools may produce conflicting performance projections. ` +
      `Investors should standardize all inputs before relying on cross-tool comparisons.`,
  };
}

/* ------------------------------------------------------------------ */
/*  Data Source Transparency                                           */
/* ------------------------------------------------------------------ */

export function dataTransparencyFlag(estimatedShare: number): GuardrailFlag | null {
  if (estimatedShare > 0.5) {
    return {
      code: "DATA_ESTIMATED_MAJORITY",
      severity: "info",
      title: "Market data is largely estimated",
      message:
        `Data Transparency Note: A material portion of market inputs in this analysis are estimated or ` +
        `modeled values rather than directly verified data. Unemployment rate, job growth, appreciation ` +
        `rate, and comparable rents are derived from regional proxies. Investors must independently ` +
        `verify all market data before making investment decisions.`,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  AI Communication Sanitizer                                         */
/* ------------------------------------------------------------------ */

/**
 * Strips fabricated lease-clause references (e.g. "Section 7b", "Exhibit A")
 * from AI-drafted tenant communications and replaces them with generic
 * descriptive language.
 */
export function stripLeaseCitations(text: string): string {
  return text
    .replace(/\bper\s+(section|clause|paragraph|article|exhibit|addendum|schedule)\s+[a-z0-9.\-]+\b/gi,
      "per your lease agreement")
    .replace(/\b(section|clause|paragraph|article|exhibit|addendum|schedule)\s+[a-z0-9.\-]+\b/gi,
      "your lease terms");
}

/* ------------------------------------------------------------------ */
/*  Aggregation                                                        */
/* ------------------------------------------------------------------ */

export function collectFlags(
  ...groups: (GuardrailFlag | null | GuardrailFlag[])[]
): GuardrailFlag[] {
  const out: GuardrailFlag[] = [];
  for (const g of groups) {
    if (!g) continue;
    if (Array.isArray(g)) out.push(...g);
    else out.push(g);
  }
  return out;
}

/** Sort flags critical → warning → info for consistent display order. */
export function orderFlags(flags: GuardrailFlag[]): GuardrailFlag[] {
  const rank: Record<GuardrailSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return [...flags].sort((a, b) => rank[a.severity] - rank[b.severity]);
}
