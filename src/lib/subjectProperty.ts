/**
 * Canonical Subject Property — single source of truth for the ZIP / Rent Lookup report.
 * -----------------------------------------------------------------------------------
 * Raw AI output is never rendered directly. It is normalized here into ONE object,
 * validated for internal consistency, and every downstream section reads only from it.
 *
 * Rules enforced by this module:
 *  1. Beds / baths / sqft / address / ZIP / property type exist exactly once.
 *  2. Unverified features are reported as "Unknown" and contribute $0 of rent adjustment.
 *  3. The rent breakdown is recomputed deterministically: base + Σ(verified adjustments).
 *  4. Confidence is a numeric 0-100 score derived from measurable drivers, not a vague label.
 *  5. Any conflict between the AI payload and the user's verified inputs resolves to the
 *     verified input, and the conflict is logged as a validation issue.
 */

export type Verification = "verified" | "estimated" | "unknown";

export interface FeatureFlag {
  label: string;
  status: "yes" | "no" | "unknown";
  source?: string;
}

export interface RentLineItem {
  factor: string;
  dollarImpact: number;      // 0 when not verified
  rationale: string;
  verified: boolean;
}

export interface CanonicalComp {
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  rent: number;
  pricePerSqft: number | null;
  distanceMi: number;
  daysOnMarket: number | null;
  listedDate: string | null;
  propertyType: string | null;
  source: string | null;
  similarity: number;        // 0-100, higher = more comparable to the subject
}

export interface MarketMetric {
  label: string;
  value: string;
  source?: string;
}

export interface ConfidenceResult {
  score: number;                 // 0-100
  drivers: { ok: boolean; text: string }[];
}

export interface CanonicalProperty {
  // Identity — used by EVERY section
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  propertyType: string;
  neighborhood: string;

  // Physical facts
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSizeSqft: number | null;
  yearBuilt: number | null;

  // Provenance for the physical facts
  specSource: string;
  specVerification: Verification;

  // Verified-only feature set
  features: FeatureFlag[];

  // Valuation
  listingPrice: number | null;
  estimatedValue: number | null;
  valueSources: { label: string; value: number }[];
  lastSoldPrice: number | null;
  lastSoldYear: number | null;

  // Rent
  baseRent: number | null;
  baseRentSource: string;
  lineItems: RentLineItem[];
  estimatedRent: number | null;   // base + Σ verified impacts (deterministic)
  rentRange: [number, number] | null;
  methodology: string;

  // Supporting data
  comps: CanonicalComp[];
  compRadiusMi: number | null;
  rentByUnitType: { name: string; beds: number; value: number }[];
  marketMetrics: MarketMetric[];

  confidence: ConfidenceResult;
  validationIssues: string[];
  geo: { lat: number; lng: number } | null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(/[^0-9.\-]/g, "")) : v;
  return typeof n === "number" && Number.isFinite(n) && n !== 0 ? n : null;
};
const str = (v: unknown): string => (typeof v === "string" && v.trim() ? v.trim() : "");

/** Maps a loose yes/no/unknown-ish value into a strict feature status. */
function featureStatus(v: unknown): "yes" | "no" | "unknown" {
  if (v === true) return "yes";
  if (v === false) return "no";
  const s = String(v ?? "").trim().toLowerCase();
  if (["yes", "true", "present", "y"].includes(s)) return "yes";
  if (["no", "false", "none", "absent", "n"].includes(s)) return "no";
  return "unknown";
}

const FEATURE_KEYS: [string, string][] = [
  ["garage", "Garage"],
  ["basement", "Basement"],
  ["centralAir", "Central Air"],
  ["laundry", "In-Unit Laundry"],
  ["fencedYard", "Fenced Yard"],
  ["updatedKitchen", "Updated Kitchen"],
  ["updatedBathrooms", "Updated Bathrooms"],
  ["hardwoodFloors", "Hardwood Floors"],
  ["pool", "Pool"],
  ["dishwasher", "Dishwasher"],
];

/**
 * Feature words an adjustment may reference. If the adjustment mentions one of these
 * and the corresponding feature is not verified "yes", the adjustment is voided.
 */
const FEATURE_MATCHERS: { keys: string[]; label: string }[] = [
  { keys: ["garage", "carport", "parking"], label: "Garage" },
  { keys: ["basement"], label: "Basement" },
  { keys: ["central air", "hvac", "a/c", "air conditioning"], label: "Central Air" },
  { keys: ["laundry", "washer", "dryer"], label: "In-Unit Laundry" },
  { keys: ["fenced", "yard"], label: "Fenced Yard" },
  { keys: ["kitchen"], label: "Updated Kitchen" },
  { keys: ["bathroom remodel", "updated bath", "renovated bath"], label: "Updated Bathrooms" },
  { keys: ["hardwood", "flooring"], label: "Hardwood Floors" },
  { keys: ["pool"], label: "Pool" },
  { keys: ["dishwasher"], label: "Dishwasher" },
];

export interface UserInputs {
  zip: string;
  address: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  autoDetect: boolean;
}

export function buildCanonicalProperty(raw: any, inputs: UserInputs): CanonicalProperty {
  const issues: string[] = [];
  const p = raw?.property ?? {};
  const area = raw?.area ?? {};
  const rentEst = raw?.rentEstimates ?? {};
  const breakdown = raw?.rentBreakdown ?? {};

  // ---------------------------------------------------------------- identity
  const zip = /^\d{5}$/.test(inputs.zip) ? inputs.zip : str(raw?.area?.zip);
  const aiAddr = str(p.addressNormalized);
  const address = aiAddr || str(inputs.address) || `${str(area.city)}, ${str(area.state)} ${zip}`.trim();

  if (aiAddr && zip && /\b\d{5}\b/.test(aiAddr)) {
    const aiZip = aiAddr.match(/\b(\d{5})\b/)?.[1];
    if (aiZip && aiZip !== zip) {
      issues.push(`Resolved address ZIP (${aiZip}) does not match the requested ZIP (${zip}). Using ${zip}.`);
    }
  }

  // -------------------------------------------------------- physical facts
  // The user's manual entries are treated as verified ground truth. In auto-detect
  // mode we accept the AI-extracted specs but mark them "estimated" unless a source
  // is named.
  const aiBeds = num(p.beds);
  const aiBaths = num(p.baths);
  const aiSqft = num(p.sqft);
  const specSourceRaw = str(p.bedsBathsSqftSource);

  let beds: number | null;
  let baths: number | null;
  let sqft: number | null;
  let specVerification: Verification;
  let specSource: string;

  if (!inputs.autoDetect) {
    beds = inputs.beds ?? null;
    baths = inputs.baths ?? null;
    sqft = inputs.sqft ?? null;
    specVerification = "verified";
    specSource = "User-entered property specs";
    if (aiBeds && beds && aiBeds !== beds) issues.push(`AI reported ${aiBeds} bed; user-entered ${beds} bed takes precedence.`);
    if (aiSqft && sqft && Math.abs(aiSqft - sqft) / sqft > 0.05) issues.push(`AI reported ${aiSqft} sqft; user-entered ${sqft} sqft takes precedence.`);
  } else {
    beds = aiBeds;
    baths = aiBaths;
    sqft = aiSqft;
    specVerification = specSourceRaw ? "verified" : aiBeds ? "estimated" : "unknown";
    specSource = specSourceRaw || (aiBeds ? "AI-extracted from listing (source not named)" : "Unknown");
    if (!aiBeds) issues.push("Auto-detect could not verify bedroom count — shown as Unknown.");
  }

  // ------------------------------------------------------------- features
  const rawFeatures = p.features ?? {};
  const featureSource = str(rawFeatures.featuresSource);
  const features: FeatureFlag[] = FEATURE_KEYS.map(([key, label]) => ({
    label,
    status: featureStatus(rawFeatures[key]),
    source: featureStatus(rawFeatures[key]) === "unknown" ? undefined : featureSource || undefined,
  }));
  const verifiedYes = new Set(features.filter((f) => f.status === "yes").map((f) => f.label));

  // -------------------------------------------------------- rent breakdown
  const baseRent = num(breakdown.baseRent) ?? num(rentEst.medianOverall);
  const baseRentSource = str(breakdown.baseRentSource) || "ZIP median rent";

  const rawAdjustments: any[] = Array.isArray(breakdown.adjustments) ? breakdown.adjustments : [];
  const lineItems: RentLineItem[] = rawAdjustments.map((a) => {
    const factor = str(a?.factor) || "Adjustment";
    const impact = Number(a?.dollarImpact) || 0;
    const rationale = str(a?.rationale);
    const haystack = `${factor} ${rationale}`.toLowerCase();

    // Does this adjustment lean on a physical feature?
    const matched = FEATURE_MATCHERS.find((m) => m.keys.some((k) => haystack.includes(k)));
    let verified = a?.verified === true || matched === undefined;

    if (matched) {
      verified = verifiedYes.has(matched.label);
      if (!verified && impact !== 0) {
        issues.push(`"${factor}" adjustment voided — ${matched.label} is not verified for this property.`);
      }
    }

    // Sqft-based adjustments require a known sqft.
    if (/sq\s?ft|square foot/i.test(haystack) && !sqft) {
      verified = false;
      issues.push(`"${factor}" adjustment voided — square footage is Unknown.`);
    }

    // Bedroom-based adjustments require a known bedroom count.
    if (/bed/i.test(haystack) && !beds) {
      verified = false;
      issues.push(`"${factor}" adjustment voided — bedroom count is Unknown.`);
    }

    return { factor, dollarImpact: verified ? impact : 0, rationale, verified };
  });

  const netAdjustments = lineItems.reduce((s, l) => s + l.dollarImpact, 0);
  const estimatedRent = baseRent != null ? Math.round((baseRent + netAdjustments) / 5) * 5 : null;

  const aiFinal = num(breakdown.finalEstimate) ?? num(rentEst.subjectEstimate);
  if (aiFinal && estimatedRent && Math.abs(aiFinal - estimatedRent) > 25) {
    issues.push(
      `AI final estimate (${aiFinal}) did not reconcile with base + verified adjustments (${estimatedRent}). Using the recomputed figure.`
    );
  }

  const rangeLow = num(rentEst.rangeLow);
  const rangeHigh = num(rentEst.rangeHigh);
  const rentRange: [number, number] | null =
    estimatedRent != null
      ? [
          Math.min(rangeLow ?? Math.round(estimatedRent * 0.92), estimatedRent),
          Math.max(rangeHigh ?? Math.round(estimatedRent * 1.08), estimatedRent),
        ]
      : null;

  // ------------------------------------------------------------ rent table
  const rentByUnitType = [
    { name: "Studio", beds: 0, value: num(rentEst.studio) ?? 0 },
    { name: "1 Bed", beds: 1, value: num(rentEst.oneBed) ?? 0 },
    { name: "2 Bed", beds: 2, value: num(rentEst.twoBed) ?? 0 },
    { name: "3 Bed", beds: 3, value: num(rentEst.threeBed) ?? 0 },
    { name: "4 Bed", beds: 4, value: num(rentEst.fourBed) ?? 0 },
  ].filter((r) => r.value > 0);

  // ----------------------------------------------------------------- comps
  const propertyType = str(p.propertyType) || "Unknown";
  const rawComps: any[] = Array.isArray(p.nearbyComps) ? p.nearbyComps : [];
  const comps: CanonicalComp[] = rawComps
    .filter((c) => str(c?.address))
    .map((c) => {
      const cSqft = num(c.sqft);
      const cRent = num(c.rent);
      const cBeds = num(c.beds) ?? 0;
      const cBaths = num(c.baths) ?? 0;
      const dist = Number(c.distanceMi) || 0;
      const cType = str(c.propertyType) || null;

      // Deterministic similarity: bedroom match, sqft delta, distance, recency, type match.
      let sim = 100;
      if (beds != null) sim -= Math.abs(cBeds - beds) * 22;
      if (baths != null) sim -= Math.abs(cBaths - baths) * 8;
      if (sqft && cSqft) sim -= Math.min(30, (Math.abs(cSqft - sqft) / sqft) * 60);
      sim -= Math.min(20, dist * 20);
      const dom = num(c.daysOnMarket);
      if (dom && dom > 90) sim -= 8;
      if (cType && propertyType !== "Unknown" && cType.toLowerCase() !== propertyType.toLowerCase()) sim -= 15;

      return {
        address: str(c.address),
        beds: cBeds,
        baths: cBaths,
        sqft: cSqft ?? 0,
        rent: cRent ?? 0,
        pricePerSqft: cSqft && cRent ? Number((cRent / cSqft).toFixed(2)) : null,
        distanceMi: dist,
        daysOnMarket: dom,
        listedDate: str(c.listedDate) || null,
        propertyType: cType,
        source: str(c.source) || null,
        similarity: Math.max(0, Math.min(100, Math.round(sim))),
      };
    })
    .sort((a, b) => b.similarity - a.similarity);

  // -------------------------------------------------------- market metrics
  const demo = raw?.demographics ?? {};
  const econ = raw?.economy ?? {};
  const live = raw?.livability ?? {};
  const demand = raw?.rentalDemand ?? {};
  const mkt = raw?.marketMetrics ?? {};
  const money = (n: number | null) => (n == null ? "Unknown" : `$${n.toLocaleString()}`);
  const pct = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && v !== null && v !== undefined && v !== "" ? `${n > 0 ? "+" : ""}${n}%` : "Unknown";
  };
  const plain = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n !== 0 ? n.toLocaleString() : str(v) || "Unknown";
  };

  const marketMetrics: MarketMetric[] = [
    { label: "Median Rent (ZIP)", value: money(num(rentEst.medianOverall)) },
    { label: "Rent Growth (1yr)", value: pct(rentEst.yoyChangePct) },
    { label: "Median Home Price", value: money(num(econ.medianHomePrice)) },
    { label: "Home Price Growth (1yr)", value: pct(econ.homeAppreciation1yPct) },
    { label: "Population", value: plain(demo.population) },
    { label: "Population Growth (5yr)", value: pct(demo.populationGrowth5yPct) },
    { label: "Median Household Income", value: money(num(demo.medianHouseholdIncome)) },
    { label: "Owner Occupancy", value: pct(demo.ownerOccupiedPct).replace("+", "") },
    { label: "Renter Occupancy", value: pct(demo.renterOccupiedPct).replace("+", "") },
    { label: "Vacancy Rate", value: pct(demand.vacancyRatePct).replace("+", "") },
    { label: "Crime Index", value: str(live.crimeIndex) || "Unknown" },
    { label: "School Rating", value: num(live.schoolRating) ? `${num(live.schoolRating)}/10` : "Unknown" },
    { label: "Avg Days on Market", value: num(demand.avgDaysOnMarket) ? `${num(demand.avgDaysOnMarket)} days` : "Unknown" },
    { label: "Active Inventory", value: plain(mkt.activeInventoryUnits) },
    { label: "Building Permits (12mo)", value: plain(mkt.buildingPermits12mo) },
    { label: "Rent-to-Income Ratio", value: pct(demand.rentToIncomeRatioPct).replace("+", "") },
  ];

  // ------------------------------------------------------------ valuation
  const tri = p.valueTriangulation ?? {};
  const valueSources = [
    { label: "Zillow Zestimate", value: num(tri.zillowZestimate) },
    { label: "Redfin Estimate", value: num(tri.redfinEstimate) },
    { label: "County Assessed", value: num(tri.countyAssessedValue) },
  ].filter((v): v is { label: string; value: number } => v.value != null);

  const median = (arr: number[]) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
  };
  const estimatedValue = median(valueSources.map((v) => v.value)) ?? num(p.estimatedValue);

  // ------------------------------------------------------------ confidence
  const confidence = scoreConfidence({
    comps,
    specVerification,
    beds,
    sqft,
    valueSourceCount: valueSources.length,
    unverifiedFeatureCount: features.filter((f) => f.status === "unknown").length,
    issueCount: issues.length,
    voidedAdjustments: lineItems.filter((l) => !l.verified).length,
    hasBaseRent: baseRent != null,
  });

  return {
    address,
    city: str(area.city) || "Unknown",
    state: str(area.state) || "Unknown",
    zip: zip || "Unknown",
    county: str(area.county) || "Unknown",
    propertyType,
    neighborhood: str(p.neighborhood) || "Unknown",
    beds,
    baths,
    sqft,
    lotSizeSqft: num(p.lotSizeSqft),
    yearBuilt: num(p.yearBuilt),
    specSource,
    specVerification,
    features,
    listingPrice: num(p.listingPrice),
    estimatedValue,
    valueSources,
    lastSoldPrice: num(p.lastSoldPrice),
    lastSoldYear: num(p.lastSoldYear),
    baseRent,
    baseRentSource,
    lineItems,
    estimatedRent,
    rentRange,
    methodology: str(breakdown.methodology),
    comps,
    compRadiusMi: num(p.compSearchRadiusMi),
    rentByUnitType,
    marketMetrics,
    confidence,
    validationIssues: issues,
    geo: raw?.geo?.lat != null ? { lat: Number(raw.geo.lat), lng: Number(raw.geo.lng) } : null,
  };
}

function scoreConfidence(args: {
  comps: CanonicalComp[];
  specVerification: Verification;
  beds: number | null;
  sqft: number | null;
  valueSourceCount: number;
  unverifiedFeatureCount: number;
  issueCount: number;
  voidedAdjustments: number;
  hasBaseRent: boolean;
}): ConfidenceResult {
  const drivers: { ok: boolean; text: string }[] = [];
  let score = 40; // deterministic floor before evidence

  const strongComps = args.comps.filter((c) => c.similarity >= 70 && c.rent > 0);
  if (strongComps.length >= 6) { score += 25; drivers.push({ ok: true, text: `${strongComps.length} closely comparable rentals found` }); }
  else if (strongComps.length >= 3) { score += 16; drivers.push({ ok: true, text: `${strongComps.length} closely comparable rentals found` }); }
  else if (args.comps.length > 0) { score += 6; drivers.push({ ok: false, text: `Only ${args.comps.length} comparable rental(s) found — thin comp set` }); }
  else { drivers.push({ ok: false, text: "No verifiable rental comps found" }); }

  if (args.specVerification === "verified") { score += 15; drivers.push({ ok: true, text: `Property specs verified` }); }
  else if (args.specVerification === "estimated") { score += 5; drivers.push({ ok: false, text: "Property specs extracted without a named source" }); }
  else { drivers.push({ ok: false, text: "Property specs could not be verified" }); }

  if (args.beds != null && args.sqft != null) { score += 8; drivers.push({ ok: true, text: "Bedroom count and square footage known" }); }
  else { drivers.push({ ok: false, text: "Bedroom count or square footage is Unknown" }); }

  if (args.valueSourceCount >= 3) { score += 10; drivers.push({ ok: true, text: "Three independent valuation sources agree on a median" }); }
  else if (args.valueSourceCount > 0) { score += 4; drivers.push({ ok: false, text: `Only ${args.valueSourceCount} valuation source(s) available` }); }
  else { drivers.push({ ok: false, text: "No valuation sources returned" }); }

  if (args.hasBaseRent) { score += 6; drivers.push({ ok: true, text: "Base market rent sourced for this ZIP" }); }
  else { drivers.push({ ok: false, text: "No base market rent available for this ZIP" }); }

  if (args.unverifiedFeatureCount > 0) {
    score -= Math.min(12, args.unverifiedFeatureCount * 2);
    drivers.push({ ok: false, text: `${args.unverifiedFeatureCount} property feature(s) unverified — no rent credit applied` });
  }
  if (args.voidedAdjustments > 0) {
    score -= Math.min(10, args.voidedAdjustments * 4);
    drivers.push({ ok: false, text: `${args.voidedAdjustments} adjustment(s) removed for lack of verification` });
  }
  if (args.issueCount > 0) {
    score -= Math.min(15, args.issueCount * 5);
    drivers.push({ ok: false, text: `${args.issueCount} data inconsistency(ies) detected and resolved to verified values` });
  }

  return { score: Math.max(5, Math.min(100, Math.round(score))), drivers };
}
