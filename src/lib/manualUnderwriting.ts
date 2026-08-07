/**
 * Manual Underwriting Engine
 * -----------------------------------------------------------------------------
 * Deterministic. Zero external APIs. Every number below is derived from either
 *   (a) a value the user typed, or
 *   (b) a free public dataset value passed in explicitly, or
 *   (c) an arithmetic combination of (a) and (b).
 *
 * Nothing is inferred, estimated by AI, or fabricated. Missing information
 * produces `null` (rendered as "Unknown"), never a guess.
 */

import { runSimulation, type MonteCarloInputs, type MonteCarloResult, type RiskProfile } from "@/lib/monteCarlo";

/* ------------------------------------------------------------------ */
/*  Inputs                                                             */
/* ------------------------------------------------------------------ */

export type TriState = "yes" | "no" | "unknown";

export const FEATURE_KEYS = [
  "garage",
  "centralAir",
  "laundry",
  "dishwasher",
  "fence",
  "pool",
  "basement",
  "updatedKitchen",
  "updatedBathrooms",
  "hardwoodFloors",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  garage: "Garage",
  centralAir: "Central Air",
  laundry: "In-Unit Laundry",
  dishwasher: "Dishwasher",
  fence: "Fenced Yard",
  pool: "Pool",
  basement: "Basement",
  updatedKitchen: "Updated Kitchen",
  updatedBathrooms: "Updated Bathrooms",
  hardwoodFloors: "Hardwood Floors",
};

/** Published, fixed dollar rules. Yes = apply, No/Unknown = $0. */
export const FEATURE_ADJUSTMENTS: Record<FeatureKey, number> = {
  garage: 50,
  centralAir: 40,
  laundry: 30,
  dishwasher: 15,
  fence: 15,
  pool: 25,
  basement: 25,
  updatedKitchen: 60,
  updatedBathrooms: 40,
  hardwoodFloors: 25,
};

export const PROPERTY_TYPES = [
  "Single Family",
  "Duplex",
  "Triplex",
  "Fourplex",
  "Condo",
  "Townhouse",
  "Manufactured",
  "Other",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export interface ManualPropertyInput {
  address: string;
  zip: string;
  propertyType: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  yearBuilt: number | null;
  lotSizeSqft: number | null;

  purchasePrice: number | null;
  expectedRent: number | null;

  annualPropertyTax: number | null;
  annualInsurance: number | null;
  monthlyHoa: number | null;
  monthlyRepairs: number | null;
  vacancyPct: number | null;
  managementPct: number | null;
  monthlyUtilities: number | null;
  closingCostPct: number | null;

  downPaymentPct: number | null;
  interestRate: number | null;
  loanTermYears: number | null;
  holdYears: number | null;
  rehabBudget: number | null;

  features: Record<FeatureKey, TriState>;
}

export const BLANK_FEATURES: Record<FeatureKey, TriState> = FEATURE_KEYS.reduce(
  (acc, k) => ({ ...acc, [k]: "unknown" as TriState }),
  {} as Record<FeatureKey, TriState>,
);

/** Conservative, industry-standard starting points — NOT property facts. */
export const DEFAULT_MANUAL_INPUT: ManualPropertyInput = {
  address: "",
  zip: "",
  propertyType: "Single Family",
  bedrooms: null,
  bathrooms: null,
  squareFootage: null,
  yearBuilt: null,
  lotSizeSqft: null,
  purchasePrice: null,
  expectedRent: null,
  annualPropertyTax: null,
  annualInsurance: null,
  monthlyHoa: 0,
  monthlyRepairs: null,
  vacancyPct: 7,
  managementPct: 8,
  monthlyUtilities: 0,
  closingCostPct: 3,
  downPaymentPct: 20,
  interestRate: 7,
  loanTermYears: 30,
  holdYears: 10,
  rehabBudget: 0,
  features: BLANK_FEATURES,
};

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

export interface ValidationIssue {
  field: string;
  label: string;
  message: string;
  severity: "error" | "warning";
}

export function validateManualInput(i: ManualPropertyInput): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const err = (field: string, label: string, message: string) =>
    out.push({ field, label, message, severity: "error" });
  const warn = (field: string, label: string, message: string) =>
    out.push({ field, label, message, severity: "warning" });

  if (!i.purchasePrice || i.purchasePrice <= 0) err("purchasePrice", "Purchase Price", "Must be greater than $0.");
  else if (i.purchasePrice < 10000) warn("purchasePrice", "Purchase Price", "Unusually low — confirm this is the full price.");

  if (!i.expectedRent || i.expectedRent <= 0) err("expectedRent", "Expected Rent", "Must be greater than $0.");

  if (i.bedrooms === null || i.bedrooms < 0 || i.bedrooms > 20 || !Number.isInteger(i.bedrooms))
    err("bedrooms", "Bedrooms", "Enter a whole number between 0 and 20.");

  if (i.bathrooms === null || i.bathrooms <= 0 || i.bathrooms > 20)
    err("bathrooms", "Bathrooms", "Enter a value between 0.5 and 20.");

  if (i.squareFootage === null || i.squareFootage < 100 || i.squareFootage > 25000)
    err("squareFootage", "Square Footage", "Enter a value between 100 and 25,000.");

  if (i.interestRate === null || i.interestRate <= 0 || i.interestRate > 25)
    err("interestRate", "Interest Rate", "Enter a rate between 0.1% and 25%.");

  if (i.downPaymentPct === null || i.downPaymentPct < 0 || i.downPaymentPct > 100)
    err("downPaymentPct", "Down Payment", "Enter 0–100%.");

  if (i.loanTermYears === null || i.loanTermYears <= 0 || i.loanTermYears > 40)
    err("loanTermYears", "Loan Term", "Enter 1–40 years.");

  if (i.annualPropertyTax === null || i.annualPropertyTax < 0) err("annualPropertyTax", "Property Tax", "Enter the annual amount (0 if none).");
  if (i.annualInsurance === null || i.annualInsurance < 0) err("annualInsurance", "Insurance", "Enter the annual premium (0 if none).");
  if (i.monthlyRepairs === null || i.monthlyRepairs < 0) err("monthlyRepairs", "Monthly Repairs", "Enter a monthly reserve (0 if none).");
  if (i.vacancyPct === null || i.vacancyPct < 0 || i.vacancyPct > 50) err("vacancyPct", "Vacancy", "Enter 0–50%.");
  if (i.managementPct === null || i.managementPct < 0 || i.managementPct > 30) err("managementPct", "Property Management", "Enter 0–30%.");

  if (i.yearBuilt !== null && (i.yearBuilt < 1800 || i.yearBuilt > new Date().getFullYear() + 1))
    err("yearBuilt", "Year Built", "Enter a realistic year.");

  if ((i.vacancyPct ?? 0) === 0) warn("vacancyPct", "Vacancy", "0% vacancy is not a sustainable assumption.");
  if ((i.monthlyRepairs ?? 0) === 0) warn("monthlyRepairs", "Monthly Repairs", "A $0 maintenance reserve understates real cost.");

  return out;
}

export const hasBlockingErrors = (issues: ValidationIssue[]) => issues.some((x) => x.severity === "error");

/* ------------------------------------------------------------------ */
/*  Rent adjustment engine — fully visible, rule-based                 */
/* ------------------------------------------------------------------ */

export interface RentAdjustment {
  label: string;
  rule: string;
  amount: number;
}

export interface RentEstimate {
  /** Null when no public median rent exists for the ZIP — never invented. */
  baseRent: number | null;
  baseSource: string;
  adjustments: RentAdjustment[];
  adjustedRent: number | null;
  userRent: number | null;
  /** userRent - adjustedRent, when both exist. */
  varianceVsUser: number | null;
}

const round5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Base rent is the ZIP median gross rent from the Census ACS (a real dataset
 * value). Adjustments are fixed published rules relative to a reference unit:
 * 2 bed / 1 bath / 1,200 sqft. If no dataset median exists, no estimate is
 * produced.
 */
export function buildRentEstimate(input: ManualPropertyInput, zipMedianGrossRent: number | null): RentEstimate {
  const adjustments: RentAdjustment[] = [];

  if (input.bedrooms !== null && input.bedrooms !== 2) {
    adjustments.push({
      label: `Bedrooms (${input.bedrooms} vs 2 reference)`,
      rule: "$150 per bedroom above/below 2",
      amount: (input.bedrooms - 2) * 150,
    });
  }
  if (input.bathrooms !== null && input.bathrooms !== 1) {
    adjustments.push({
      label: `Bathrooms (${input.bathrooms} vs 1 reference)`,
      rule: "$35 per bathroom above/below 1",
      amount: Math.round((input.bathrooms - 1) * 35),
    });
  }
  if (input.squareFootage !== null && input.squareFootage !== 1200) {
    adjustments.push({
      label: `Square footage (${input.squareFootage.toLocaleString()} vs 1,200 reference)`,
      rule: "$0.15 per sqft above/below 1,200",
      amount: Math.round((input.squareFootage - 1200) * 0.15),
    });
  }
  if (input.yearBuilt !== null) {
    if (input.yearBuilt >= 2000) adjustments.push({ label: `Built ${input.yearBuilt}`, rule: "+$50 for 2000 or newer", amount: 50 });
    else if (input.yearBuilt < 1960) adjustments.push({ label: `Built ${input.yearBuilt}`, rule: "-$50 for pre-1960", amount: -50 });
  }

  FEATURE_KEYS.forEach((k) => {
    if (input.features[k] === "yes") {
      adjustments.push({ label: FEATURE_LABELS[k], rule: `+$${FEATURE_ADJUSTMENTS[k]} when present`, amount: FEATURE_ADJUSTMENTS[k] });
    }
  });

  const baseRent = zipMedianGrossRent && zipMedianGrossRent > 0 ? zipMedianGrossRent : null;
  const total = adjustments.reduce((a, b) => a + b.amount, 0);
  const adjustedRent = baseRent === null ? null : Math.max(0, round5(baseRent + total));

  return {
    baseRent,
    baseSource: baseRent === null ? "No public median rent available for this ZIP" : "Census ACS median gross rent for the ZIP",
    adjustments,
    adjustedRent,
    userRent: input.expectedRent,
    varianceVsUser: adjustedRent !== null && input.expectedRent ? input.expectedRent - adjustedRent : null,
  };
}

/* ------------------------------------------------------------------ */
/*  Confidence score — evidence based only                             */
/* ------------------------------------------------------------------ */

export interface ConfidenceComponent {
  label: string;
  detail: string;
  earned: number;
  max: number;
}

export interface ConfidenceScore {
  score: number;
  label: "Low" | "Moderate" | "Good" | "Strong";
  components: ConfidenceComponent[];
}

export function computeInputConfidence(args: {
  input: ManualPropertyInput;
  marketAvailable: boolean;
  marketRentAvailable: boolean;
  issues: ValidationIssue[];
}): ConfidenceScore {
  const { input, marketAvailable, marketRentAvailable, issues } = args;

  const coreFields: (keyof ManualPropertyInput)[] = [
    "purchasePrice", "expectedRent", "bedrooms", "bathrooms", "squareFootage",
    "annualPropertyTax", "annualInsurance", "monthlyRepairs", "interestRate", "downPaymentPct",
  ];
  const coreFilled = coreFields.filter((f) => input[f] !== null && input[f] !== undefined).length;

  const optionalFields: (keyof ManualPropertyInput)[] = ["yearBuilt", "lotSizeSqft", "monthlyHoa", "monthlyUtilities", "closingCostPct"];
  const optionalFilled = optionalFields.filter((f) => input[f] !== null && input[f] !== undefined).length;

  const known = FEATURE_KEYS.filter((k) => input.features[k] !== "unknown").length;
  const errorCount = issues.filter((i) => i.severity === "error").length;

  const components: ConfidenceComponent[] = [
    {
      label: "Required fields completed",
      detail: `${coreFilled} of ${coreFields.length} required underwriting inputs provided`,
      earned: Math.round((coreFilled / coreFields.length) * 35),
      max: 35,
    },
    {
      label: "Property detail completeness",
      detail: `${optionalFilled} of ${optionalFields.length} supporting details provided`,
      earned: Math.round((optionalFilled / optionalFields.length) * 15),
      max: 15,
    },
    {
      label: "Feature verification",
      detail: `${known} of ${FEATURE_KEYS.length} features answered Yes or No (Unknown earns nothing)`,
      earned: Math.round((known / FEATURE_KEYS.length) * 20),
      max: 20,
    },
    {
      label: "Public market data available",
      detail: marketAvailable ? "Census ACS returned data for this ZIP" : "No ZIP market data loaded",
      earned: marketAvailable ? 15 : 0,
      max: 15,
    },
    {
      label: "Market rent benchmark",
      detail: marketRentAvailable ? "ZIP median gross rent available for comparison" : "No median rent benchmark available",
      earned: marketRentAvailable ? 15 : 0,
      max: 15,
    },
  ];

  let score = components.reduce((a, c) => a + c.earned, 0);
  if (errorCount > 0) {
    components.push({
      label: "Validation penalty",
      detail: `${errorCount} validation error${errorCount === 1 ? "" : "s"} outstanding`,
      earned: -Math.min(40, errorCount * 10),
      max: 0,
    });
    score -= Math.min(40, errorCount * 10);
  }
  score = Math.max(0, Math.min(100, score));

  const label: ConfidenceScore["label"] = score >= 85 ? "Strong" : score >= 65 ? "Good" : score >= 40 ? "Moderate" : "Low";
  return { score, label, components };
}

/* ------------------------------------------------------------------ */
/*  Deterministic underwriting metrics                                 */
/* ------------------------------------------------------------------ */

export interface UnderwritingResult {
  loanAmount: number;
  monthlyLoanPayment: number;
  totalInterestOverTerm: number;
  cashInvested: number;

  grossAnnualRent: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  noi: number;
  annualDebtService: number;

  monthlyCashFlow: number;
  annualCashFlow: number;
  capRate: number;
  cashOnCash: number;
  totalRoi: number;
  irr: number;
  dscr: number;
  grm: number;
  expenseRatio: number;
  breakEvenOccupancy: number;

  equityAtHorizon: number;
  loanBalanceAtHorizon: number;
  projectedValueAtHorizon: number;
  appreciationGain: number;
  netWorthProjection: number;
  expenseBreakdown: { label: string; annual: number }[];
}

const monthlyPayment = (loan: number, annualRate: number, termYears: number) => {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (loan <= 0) return 0;
  if (r <= 0) return loan / n;
  return (loan * r) / (1 - Math.pow(1 + r, -n));
};

const irrOf = (cf: number[]) => {
  const npv = (rate: number) => cf.reduce((a, c, t) => a + c / Math.pow(1 + rate, t), 0);
  let lo = -0.95, hi = 3;
  if (npv(lo) < 0 && npv(hi) < 0) return -95;
  if (npv(lo) > 0 && npv(hi) > 0) return 300;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid; else hi = mid;
  }
  return ((lo + hi) / 2) * 100;
};

/**
 * Deterministic underwriting. `appreciationPct` defaults to a conservative
 * 2.5%/yr and is an explicit assumption, not a market claim.
 */
export function runUnderwriting(i: ManualPropertyInput, appreciationPct = 2.5, rentGrowthPct = 2): UnderwritingResult {
  const price = i.purchasePrice ?? 0;
  const rent = i.expectedRent ?? 0;
  const downPct = i.downPaymentPct ?? 20;
  const rate = i.interestRate ?? 7;
  const term = i.loanTermYears ?? 30;
  const hold = Math.max(1, Math.round(i.holdYears ?? 10));

  const loanAmount = price * (1 - downPct / 100);
  const pmt = monthlyPayment(loanAmount, rate, term);
  const totalInterestOverTerm = Math.max(0, pmt * term * 12 - loanAmount);
  const cashInvested = price * (downPct / 100) + price * ((i.closingCostPct ?? 0) / 100) + (i.rehabBudget ?? 0);

  const grossAnnualRent = rent * 12;
  const vacancyLoss = grossAnnualRent * ((i.vacancyPct ?? 0) / 100);
  const effectiveGrossIncome = grossAnnualRent - vacancyLoss;

  const management = effectiveGrossIncome * ((i.managementPct ?? 0) / 100);
  const repairs = (i.monthlyRepairs ?? 0) * 12;
  const hoa = (i.monthlyHoa ?? 0) * 12;
  const utilities = (i.monthlyUtilities ?? 0) * 12;
  const taxes = i.annualPropertyTax ?? 0;
  const insurance = i.annualInsurance ?? 0;

  const expenseBreakdown = [
    { label: "Property Tax", annual: taxes },
    { label: "Insurance", annual: insurance },
    { label: "Repairs & Maintenance", annual: repairs },
    { label: "Property Management", annual: management },
    { label: "HOA", annual: hoa },
    { label: "Utilities", annual: utilities },
  ];
  const operatingExpenses = expenseBreakdown.reduce((a, e) => a + e.annual, 0);

  const noi = effectiveGrossIncome - operatingExpenses;
  const annualDebtService = pmt * 12;
  const annualCashFlow = noi - annualDebtService;

  const capRate = price > 0 ? (noi / price) * 100 : 0;
  const cashOnCash = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const grm = grossAnnualRent > 0 ? price / grossAnnualRent : 0;
  const expenseRatio = effectiveGrossIncome > 0 ? (operatingExpenses / effectiveGrossIncome) * 100 : 0;
  const breakEvenOccupancy = grossAnnualRent > 0 ? ((operatingExpenses + annualDebtService) / grossAnnualRent) * 100 : 0;

  // Amortise to the horizon and project value/rent with explicit assumptions.
  const mRate = rate / 100 / 12;
  let balance = loanAmount;
  const cashFlows: number[] = [-cashInvested];
  let projectedRent = rent;
  let projectedValue = price;
  for (let y = 1; y <= hold; y++) {
    for (let m = 0; m < 12; m++) {
      const interest = balance * mRate;
      balance = Math.max(0, balance - (pmt - interest));
    }
    const gross = projectedRent * 12;
    const vac = gross * ((i.vacancyPct ?? 0) / 100);
    const egi = gross - vac;
    const mgmt = egi * ((i.managementPct ?? 0) / 100);
    const opex = taxes + insurance + repairs + hoa + utilities + mgmt;
    cashFlows.push(egi - opex - annualDebtService);
    projectedRent *= 1 + rentGrowthPct / 100;
    projectedValue *= 1 + appreciationPct / 100;
  }
  const sellingCosts = projectedValue * 0.075;
  const netProceeds = projectedValue - sellingCosts - balance;
  cashFlows[cashFlows.length - 1] += netProceeds;

  const irr = cashInvested > 0 ? irrOf(cashFlows) : 0;
  const totalProfit = cashFlows.reduce((a, b) => a + b, 0);
  const totalRoi = cashInvested > 0 ? (totalProfit / cashInvested) * 100 : 0;

  return {
    loanAmount,
    monthlyLoanPayment: pmt,
    totalInterestOverTerm,
    cashInvested,
    grossAnnualRent,
    vacancyLoss,
    effectiveGrossIncome,
    operatingExpenses,
    noi,
    annualDebtService,
    monthlyCashFlow: annualCashFlow / 12,
    annualCashFlow,
    capRate,
    cashOnCash,
    totalRoi,
    irr,
    dscr,
    grm,
    expenseRatio,
    breakEvenOccupancy,
    equityAtHorizon: projectedValue - balance,
    loanBalanceAtHorizon: balance,
    projectedValueAtHorizon: projectedValue,
    appreciationGain: projectedValue - price,
    netWorthProjection: projectedValue - balance + cashFlows.slice(1, -1).reduce((a, b) => a + b, 0),
    expenseBreakdown,
  };
}

/** Bridges manual inputs into the existing Monte Carlo engine. */
export function toMonteCarloInputs(
  i: ManualPropertyInput,
  iterations: number,
  profile: RiskProfile,
): MonteCarloInputs {
  const rent = i.expectedRent ?? 0;
  const egiMgmt = rent * (1 - (i.vacancyPct ?? 0) / 100) * ((i.managementPct ?? 0) / 100);
  return {
    purchasePrice: i.purchasePrice ?? 0,
    monthlyRent: rent,
    monthlyOtherOpEx: (i.monthlyHoa ?? 0) + (i.monthlyUtilities ?? 0) + egiMgmt,
    annualTaxes: i.annualPropertyTax ?? 0,
    annualInsurance: i.annualInsurance ?? 0,
    downPaymentPct: i.downPaymentPct ?? 20,
    interestRate: i.interestRate ?? 7,
    loanTermYears: i.loanTermYears ?? 30,
    holdYears: i.holdYears ?? 10,
    closingCostPct: i.closingCostPct ?? 0,
    rehabBudget: i.rehabBudget ?? 0,
    iterations,
    profile,
    seed: 20260807,
  };
}

export function runManualMonteCarlo(i: ManualPropertyInput, iterations = 5000, profile: RiskProfile = "balanced"): MonteCarloResult {
  return runSimulation(toMonteCarloInputs(i, iterations, profile));
}
