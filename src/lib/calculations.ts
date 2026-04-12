// Financial calculation utilities for RentIntel

export function calculateMortgage(price: number, downPct: number, rate: number, term: number): number {
  const loan = price * (1 - downPct / 100);
  const mRate = rate / 100 / 12;
  const months = term * 12;
  if (loan <= 0 || mRate <= 0) return 0;
  return loan * mRate / (1 - Math.pow(1 + mRate, -months));
}

export function calculatePropertyScore(roi: number, capRate: number, cashFlow: number): number {
  const score = Math.min(roi, 20) / 20 * 60 + Math.min(capRate, 10) / 10 * 30 + (cashFlow > 0 ? 10 : -10);
  return Math.max(0, Math.min(score, 100));
}

export function calculateFinancialRatios(
  price: number, rent: number, expenses: number,
  downPct: number, interestRate: number, loanTerm: number
) {
  const loanAmount = price * (1 - downPct / 100);
  const monthlyRate = interestRate / 100 / 12;
  const months = loanTerm * 12;
  const mortgage = loanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));

  const annualNOI = (rent - expenses) * 12;
  const debtService = mortgage * 12;

  const dscr = debtService > 0 ? annualNOI / debtService : 0;
  const dti = rent > 0 ? (mortgage + expenses) / rent : 0;
  const ltv = price > 0 ? (loanAmount / price) * 100 : 0;

  return { dscr, dti, ltv, mortgage };
}

export function getFeatureEstimate(beds: number, baths: number, sqft: number): number {
  const base = 600;
  return Math.round((base + beds * 350 + baths * 200 + sqft * 0.55) / 10) * 10;
}

export function computeRent(
  safmrRent: number | null,
  beds: number,
  baths: number,
  sqft: number
): {
  safmrRent: number | null;
  featureRent: number;
  blendedRent: number;
  confText: string;
  confColor: string;
  confPct: number;
} {
  const featureRent = getFeatureEstimate(beds, baths, sqft);

  if (safmrRent !== null && featureRent) {
    const diffPct = Math.abs(safmrRent - featureRent) / safmrRent * 100;
    let confText: string, confColor: string, confPct: number;

    if (diffPct < 7) { confText = "High"; confColor = "#4ade80"; confPct = 90; }
    else if (diffPct < 15) { confText = "Medium"; confColor = "#facc15"; confPct = 70; }
    else if (diffPct < 50) { confText = "Low"; confColor = "#ef4444"; confPct = 40; }
    else if (diffPct < 100) { confText = "Very Low"; confColor = "#d946ef"; confPct = 20; }
    else { confText = "Extremely Low"; confColor = "#9ca3af"; confPct = 20; }

    const safmrWeight = confPct / 100;
    const blendedRent = Math.round((safmrWeight * safmrRent + (1 - safmrWeight) * featureRent) / 10) * 10;

    return { safmrRent, featureRent, blendedRent, confText, confColor, confPct };
  }

  return {
    safmrRent: null,
    featureRent,
    blendedRent: featureRent,
    confText: "Medium",
    confColor: "#facc15",
    confPct: 65,
  };
}

export function runMonteCarlo(
  price: number, rent: number, expenses: number, downPct: number,
  sims: number, rentRange: [number, number], expRange: [number, number],
  apprRange: [number, number], years: number, interestRate: number
): { roiResults: number[]; irrResults: number[] } {
  const roiResults: number[] = [];
  const irrResults: number[] = [];

  for (let i = 0; i < sims; i++) {
    const rGrowth = (Math.random() * (rentRange[1] - rentRange[0]) + rentRange[0]) / 100;
    const eGrowth = (Math.random() * (expRange[1] - expRange[0]) + expRange[0]) / 100;
    const vGrowth = (Math.random() * (apprRange[1] - apprRange[0]) + apprRange[0]) / 100;

    const loan = price * (1 - downPct / 100);
    const mRate = interestRate / 100 / 12;
    const months = 30 * 12;
    const mortgage = loan > 0 && mRate > 0 ? loan * mRate / (1 - Math.pow(1 + mRate, -months)) : 0;

    let r = rent, e = expenses, val = price, bal = loan;
    const initialInvestment = price * downPct / 100;
    const cfList: number[] = [];

    for (let y = 0; y < years; y++) {
      const cf = (r - e - mortgage) * 12;
      cfList.push(cf);

      for (let m = 0; m < 12; m++) {
        const interest = bal * mRate;
        const principal = mortgage - interest;
        bal -= principal;
      }

      val *= (1 + vGrowth);
      r *= (1 + rGrowth);
      e *= (1 + eGrowth);
    }

    const salePrice = val;
    const saleCosts = 0.10 * salePrice;
    const netProceeds = salePrice - saleCosts - bal;

    const totalProfit = cfList.reduce((a, b) => a + b, 0) + netProceeds;
    const roiAnnualized = initialInvestment > 0
      ? (Math.pow(totalProfit / initialInvestment + 1, 1 / years) - 1) * 100
      : 0;
    roiResults.push(roiAnnualized);
    irrResults.push(roiAnnualized * 0.85); // Simplified IRR approximation
  }

  return { roiResults, irrResults };
}

export function findBreakeven(
  mortgage: number, ti: number, maintPct: number, mgmtPct: number, vacPct: number
): number | null {
  for (let r = 500; r <= 6000; r += 5) {
    const maint = r * maintPct / 100;
    const mgmt = r * mgmtPct / 100;
    const vacLoss = r * vacPct / 100;
    const exp = ti + maint + mgmt + vacLoss;
    const cf = r - (mortgage + exp);
    if (cf >= 0) return r;
  }
  return null;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
