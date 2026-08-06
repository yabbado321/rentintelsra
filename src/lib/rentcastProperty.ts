/**
 * Canonical Subject Property — RentCast is the ONLY source of property facts.
 * ---------------------------------------------------------------------------
 * Every value in the returned object either:
 *   (a) comes verbatim from a named RentCast API field, or
 *   (b) is computed deterministically from RentCast fields, with the formula recorded.
 *
 * Nothing is inferred, averaged from "typical" values, or supplied by an AI model.
 * A field RentCast did not return is `null` and renders as "Unknown".
 */

export interface FieldAudit {
  field: string;
  value: string;
  source: string;        // e.g. "RentCast /properties"
  apiField: string;      // e.g. "property.bedrooms"
  retrievedAt: string;
  usedInCalc: boolean;
}

export interface RentAdjustment {
  factor: string;
  formula: string;       // the literal arithmetic, with real numbers
  dollarImpact: number;  // 0 when not applied
  applied: boolean;
  reason?: string;       // why it was not applied
}

export interface CanonicalComp {
  id: string;
  address: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  rent: number | null;
  rentPerSqft: number | null;
  propertyType: string | null;
  distanceMi: number | null;
  daysOld: number | null;
  listedDate: string | null;
  correlation: number | null;   // RentCast's own comp correlation, 0-1
  zip: string | null;
  sameMarket: boolean;
}

export interface ValidationCheck {
  label: string;
  ok: boolean;
  detail: string;
  blocking: boolean;
}

export interface ConfidenceResult {
  score: number;
  drivers: { ok: boolean; text: string; points: number }[];
}

export interface MarketRentRow {
  name: string;
  beds: number;
  medianRent: number | null;
  averageRent: number | null;
  listings: number | null;
}

export interface CanonicalProperty {
  retrievedAt: string;

  // ---- identity (RentCast /properties, falling back to the user's ZIP only)
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  propertyType: string | null;
  matched: boolean;
  matchMethod: string;
  geo: { lat: number; lng: number } | null;

  // ---- physical facts (RentCast only — never fabricated)
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSizeSqft: number | null;
  yearBuilt: number | null;

  // ---- features: present only when RentCast returned the key
  features: { label: string; value: string; apiField: string }[];

  // ---- valuation
  valueEstimate: number | null;
  valueRange: [number, number] | null;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  saleHistory: { date: string; event: string; price: number | null }[];
  taxAssessedValue: number | null;
  taxAssessedYear: number | null;
  annualPropertyTax: number | null;
  hoaFee: number | null;

  // ---- rent
  avmRent: number | null;              // RentCast rentAvm.rent — the base rent
  avmRentRange: [number, number] | null;
  compBaseRent: number | null;         // median of the RentCast comp set actually used
  compBaseLabel: string;
  adjustments: RentAdjustment[];
  compDerivedRent: number | null;      // compBaseRent + applied adjustments
  variancePct: number | null;          // compDerivedRent vs avmRent
  recommendedRent: number | null;      // = avmRent (RentCast AVM is authoritative)

  comps: CanonicalComp[];

  // ---- ZIP market stats (RentCast /markets)
  marketRentRows: MarketRentRow[];
  marketStats: { label: string; value: string; apiField: string }[];
  marketLastUpdated: string | null;

  // ---- narrative context (AI, non-numeric, never used in math)
  context: {
    neighborhoodSummary: string;
    rentalDemandNarrative: string;
    majorEmployers: string[];
    amenities: { grocery: string[]; parks: string[]; restaurants: string[]; hospitals: string[] };
    thingsToDo: Record<string, { name: string; category: string }[]>;
  } | null;

  // ---- provenance / integrity
  listingUrlProvided: string | null;
  extractedAddress: string | null;
  extractionMethod: string | null;
  audit: FieldAudit[];
  checks: ValidationCheck[];
  blockingFailures: string[];
  confidence: ConfidenceResult;
  apiErrors: { endpoint: string; status: number; message: string }[];
}

/* --------------------------------- helpers -------------------------------- */

const numOrNull = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const posOrNull = (v: unknown): number | null => {
  const n = numOrNull(v);
  return n != null && n > 0 ? n : null;
};
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const money = (n: number | null) =>
  n == null ? 'Unknown' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** RentCast feature keys → human labels. Only rendered when the key exists. */
const FEATURE_MAP: [string, string][] = [
  ['garage', 'Garage'],
  ['garageSpaces', 'Garage Spaces'],
  ['pool', 'Pool'],
  ['cooling', 'Cooling'],
  ['coolingType', 'Cooling Type'],
  ['heating', 'Heating'],
  ['heatingType', 'Heating Type'],
  ['fireplace', 'Fireplace'],
  ['fireplaceType', 'Fireplace Type'],
  ['floorCount', 'Floors'],
  ['unitCount', 'Units'],
  ['roomCount', 'Rooms'],
  ['architectureType', 'Architecture'],
  ['exteriorType', 'Exterior'],
  ['roofType', 'Roof'],
  ['foundationType', 'Foundation'],
  ['viewType', 'View'],
];

/* ------------------------------ main factory ------------------------------ */

export function buildRentCastProperty(payload: any, requestedZip: string): CanonicalProperty {
  const retrievedAt: string = strOrNull(payload?.retrievedAt) ?? new Date().toISOString();
  const p = payload?.property ?? null;
  const rentAvm = payload?.rentAvm ?? null;
  const valueAvm = payload?.valueAvm ?? null;
  const rental = payload?.market?.rentalData ?? null;
  const sale = payload?.market?.saleData ?? null;

  const audit: FieldAudit[] = [];
  const track = (field: string, value: string, apiField: string, usedInCalc: boolean, source = 'RentCast /properties') => {
    audit.push({ field, value, source, apiField, retrievedAt, usedInCalc });
    return undefined;
  };

  /* ---------------------------------------------------------- identity */
  const address = strOrNull(p?.formattedAddress);
  const city = strOrNull(p?.city);
  const state = strOrNull(p?.state);
  const zip = strOrNull(p?.zipCode) ?? (/^\d{5}$/.test(requestedZip) ? requestedZip : null);
  const county = strOrNull(p?.county);
  const propertyType = strOrNull(p?.propertyType);

  const lat = numOrNull(p?.latitude) ?? numOrNull(rentAvm?.latitude);
  const lng = numOrNull(p?.longitude) ?? numOrNull(rentAvm?.longitude);
  const geo = lat != null && lng != null ? { lat, lng } : null;

  if (address) track('Address', address, 'property.formattedAddress', false);
  if (zip) track('ZIP Code', zip, p?.zipCode ? 'property.zipCode' : 'user input', false, p?.zipCode ? 'RentCast /properties' : 'User input');
  if (county) track('County', county, 'property.county', false);
  if (propertyType) track('Property Type', propertyType, 'property.propertyType', true);

  /* ---------------------------------------------------- physical facts */
  const beds = numOrNull(p?.bedrooms);
  const baths = numOrNull(p?.bathrooms);
  const sqft = posOrNull(p?.squareFootage);
  const lotSizeSqft = posOrNull(p?.lotSize);
  const yearBuilt = posOrNull(p?.yearBuilt);

  if (beds != null) track('Bedrooms', String(beds), 'property.bedrooms', true);
  if (baths != null) track('Bathrooms', String(baths), 'property.bathrooms', true);
  if (sqft != null) track('Square Footage', `${sqft.toLocaleString()} sqft`, 'property.squareFootage', true);
  if (lotSizeSqft != null) track('Lot Size', `${lotSizeSqft.toLocaleString()} sqft`, 'property.lotSize', false);
  if (yearBuilt != null) track('Year Built', String(yearBuilt), 'property.yearBuilt', false);

  /* --------------------------------------------------------- features */
  const rawFeatures = p?.features ?? {};
  const features = FEATURE_MAP.filter(([k]) => rawFeatures[k] !== undefined && rawFeatures[k] !== null && rawFeatures[k] !== '')
    .map(([k, label]) => {
      const v = rawFeatures[k];
      const value = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
      track(label, value, `property.features.${k}`, false);
      return { label, value, apiField: `property.features.${k}` };
    });

  /* -------------------------------------------------------- valuation */
  const valueEstimate = posOrNull(valueAvm?.price);
  const vLow = posOrNull(valueAvm?.priceRangeLow);
  const vHigh = posOrNull(valueAvm?.priceRangeHigh);
  const valueRange: [number, number] | null = vLow != null && vHigh != null ? [vLow, vHigh] : null;
  if (valueEstimate != null) track('Estimated Value', money(valueEstimate), 'valueAvm.price', false, 'RentCast /avm/value');
  if (valueRange) track('Value Range', `${money(valueRange[0])} – ${money(valueRange[1])}`, 'valueAvm.priceRangeLow / priceRangeHigh', false, 'RentCast /avm/value');

  const lastSalePrice = posOrNull(p?.lastSalePrice);
  const lastSaleDate = strOrNull(p?.lastSaleDate);
  if (lastSalePrice != null) track('Last Sale Price', money(lastSalePrice), 'property.lastSalePrice', false);
  if (lastSaleDate) track('Last Sale Date', lastSaleDate.slice(0, 10), 'property.lastSaleDate', false);

  const saleHistory = Object.entries(p?.history ?? {})
    .map(([key, v]: [string, any]) => ({
      date: strOrNull(v?.date)?.slice(0, 10) ?? key,
      event: strOrNull(v?.event) ?? 'Unknown',
      price: posOrNull(v?.price),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const assessments = Object.entries(p?.taxAssessments ?? {})
    .map(([year, v]: [string, any]) => ({ year: Number(year), value: posOrNull(v?.value) }))
    .filter((a) => Number.isFinite(a.year))
    .sort((a, b) => b.year - a.year);
  const taxAssessedValue = assessments[0]?.value ?? null;
  const taxAssessedYear = assessments[0]?.year ?? null;
  if (taxAssessedValue != null) track(`Tax Assessed Value (${taxAssessedYear})`, money(taxAssessedValue), `property.taxAssessments.${taxAssessedYear}.value`, false);

  const taxes = Object.entries(p?.propertyTaxes ?? {})
    .map(([year, v]: [string, any]) => ({ year: Number(year), total: posOrNull(v?.total) }))
    .filter((t) => Number.isFinite(t.year))
    .sort((a, b) => b.year - a.year);
  const annualPropertyTax = taxes[0]?.total ?? null;
  if (annualPropertyTax != null) track(`Annual Property Tax (${taxes[0].year})`, money(annualPropertyTax), `property.propertyTaxes.${taxes[0].year}.total`, false);

  const hoaFee = posOrNull(p?.hoa?.fee);
  if (hoaFee != null) track('HOA Fee', `${money(hoaFee)} / mo`, 'property.hoa.fee', false);

  /* ------------------------------------------------------------ comps */
  const rawComps: any[] = Array.isArray(rentAvm?.comparables) ? rentAvm.comparables : [];
  const comps: CanonicalComp[] = rawComps.map((c, i) => {
    const cRent = posOrNull(c?.price);
    const cSqft = posOrNull(c?.squareFootage);
    const cZip = strOrNull(c?.zipCode);
    return {
      id: strOrNull(c?.id) ?? `comp-${i}`,
      address: strOrNull(c?.formattedAddress) ?? 'Unknown',
      beds: numOrNull(c?.bedrooms),
      baths: numOrNull(c?.bathrooms),
      sqft: cSqft,
      rent: cRent,
      rentPerSqft: cRent != null && cSqft != null ? Number((cRent / cSqft).toFixed(2)) : null,
      propertyType: strOrNull(c?.propertyType),
      distanceMi: numOrNull(c?.distance),
      daysOld: numOrNull(c?.daysOld),
      listedDate: strOrNull(c?.listedDate)?.slice(0, 10) ?? null,
      correlation: numOrNull(c?.correlation),
      zip: cZip,
      sameMarket: zip != null && cZip != null ? cZip === zip : (numOrNull(c?.distance) ?? 99) <= 5,
    };
  });

  /* -------------------------------------------------------- rent AVM */
  const avmRent = posOrNull(rentAvm?.rent);
  const rLow = posOrNull(rentAvm?.rentRangeLow);
  const rHigh = posOrNull(rentAvm?.rentRangeHigh);
  const avmRentRange: [number, number] | null = rLow != null && rHigh != null ? [rLow, rHigh] : null;
  if (avmRent != null) track('RentCast Rent Estimate', `${money(avmRent)} / mo`, 'rentAvm.rent', true, 'RentCast /avm/rent/long-term');
  if (avmRentRange) track('Rent Range', `${money(avmRentRange[0])} – ${money(avmRentRange[1])}`, 'rentAvm.rentRangeLow / rentRangeHigh', false, 'RentCast /avm/rent/long-term');

  /* ------------------------ deterministic comp-based cross-derivation */
  const compsWithRent = comps.filter((c) => c.rent != null);
  const bedMatched = beds != null ? compsWithRent.filter((c) => c.beds === beds) : [];
  const baseSet = bedMatched.length >= 3 ? bedMatched : compsWithRent;
  const compBaseLabel =
    baseSet.length === 0
      ? 'No comparable rentals returned by RentCast'
      : bedMatched.length >= 3
      ? `Median asking rent of ${bedMatched.length} RentCast comparables matching ${beds} bed`
      : `Median asking rent of all ${compsWithRent.length} RentCast comparables (fewer than 3 matched the subject bedroom count)`;
  const compBaseRent = median(baseSet.map((c) => c.rent as number));

  const adjustments: RentAdjustment[] = [];

  // Square-footage adjustment: (subject sqft − comp median sqft) × comp median $/sqft
  const ppsfSet = baseSet.filter((c) => c.rentPerSqft != null).map((c) => c.rentPerSqft as number);
  const medPpsf = median(ppsfSet);
  const medCompSqft = median(baseSet.filter((c) => c.sqft != null).map((c) => c.sqft as number));
  if (sqft != null && medPpsf != null && medCompSqft != null && ppsfSet.length >= 3) {
    const impact = Math.round((sqft - medCompSqft) * medPpsf);
    adjustments.push({
      factor: 'Square footage vs. comparable median',
      formula: `(${sqft.toLocaleString()} sqft − ${Math.round(medCompSqft).toLocaleString()} sqft) × $${medPpsf.toFixed(2)}/sqft = ${impact >= 0 ? '+' : '−'}$${Math.abs(impact).toLocaleString()}`,
      dollarImpact: impact,
      applied: true,
    });
  } else {
    adjustments.push({
      factor: 'Square footage vs. comparable median',
      formula: '(subject sqft − comp median sqft) × comp median $/sqft',
      dollarImpact: 0,
      applied: false,
      reason:
        sqft == null
          ? 'RentCast did not return squareFootage for the subject property.'
          : ppsfSet.length < 3
          ? `Only ${ppsfSet.length} comparable(s) had both rent and square footage — at least 3 required.`
          : 'Comparable square footage unavailable.',
    });
  }

  // Bedroom adjustment: only when the base set is not bedroom-matched AND a
  // per-bedroom coefficient can be measured from the comps themselves.
  if (bedMatched.length < 3) {
    const byBed = new Map<number, number[]>();
    compsWithRent.forEach((c) => {
      if (c.beds == null) return;
      byBed.set(c.beds, [...(byBed.get(c.beds) ?? []), c.rent as number]);
    });
    const groups = [...byBed.entries()].filter(([, v]) => v.length >= 2).sort((a, b) => a[0] - b[0]);
    const medCompBeds = median(compsWithRent.filter((c) => c.beds != null).map((c) => c.beds as number));
    if (groups.length >= 2 && beds != null && medCompBeds != null && beds !== medCompBeds) {
      const lo = groups[0];
      const hi = groups[groups.length - 1];
      const coeff = Math.round(((median(hi[1]) as number) - (median(lo[1]) as number)) / (hi[0] - lo[0]));
      const impact = Math.round((beds - medCompBeds) * coeff);
      adjustments.push({
        factor: 'Bedroom count vs. comparable median',
        formula: `(${beds} bd − ${medCompBeds} bd) × $${coeff.toLocaleString()}/bd  [coefficient = (median ${hi[0]}bd rent − median ${lo[0]}bd rent) ÷ ${hi[0] - lo[0]} bd, measured from the returned comps]`,
        dollarImpact: impact,
        applied: true,
      });
    } else {
      adjustments.push({
        factor: 'Bedroom count vs. comparable median',
        formula: '(subject beds − comp median beds) × per-bedroom coefficient measured from the comp set',
        dollarImpact: 0,
        applied: false,
        reason:
          beds == null
            ? 'RentCast did not return bedrooms for the subject property.'
            : groups.length < 2
            ? 'The returned comparables do not span two bedroom counts with 2+ listings each, so no coefficient can be measured.'
            : 'Subject bedroom count already equals the comparable median — no adjustment required.',
      });
    }
  }

  // Bathrooms / amenities: intentionally never adjusted.
  adjustments.push({
    factor: 'Bathrooms & amenities',
    formula: 'n/a',
    dollarImpact: 0,
    applied: false,
    reason: 'RentCast does not publish a per-bathroom or per-amenity rent coefficient, so no dollar value is assigned. Assigning one would be fabrication.',
  });

  const appliedSum = adjustments.filter((a) => a.applied).reduce((s, a) => s + a.dollarImpact, 0);
  const compDerivedRent = compBaseRent != null ? Math.round((compBaseRent + appliedSum) / 5) * 5 : null;
  const variancePct =
    compDerivedRent != null && avmRent != null ? Number((((compDerivedRent - avmRent) / avmRent) * 100).toFixed(1)) : null;
  const recommendedRent = avmRent;

  if (compBaseRent != null) {
    audit.push({
      field: 'Comp-derived rent (cross-check)',
      value: `${money(compDerivedRent)} / mo`,
      source: 'Deterministic calculation from RentCast comparables',
      apiField: 'rentAvm.comparables[].price / .squareFootage / .bedrooms',
      retrievedAt,
      usedInCalc: true,
    });
  }

  /* ------------------------------------------------- ZIP market stats */
  const marketRentRows: MarketRentRow[] = Array.isArray(rental?.dataByBedrooms)
    ? rental.dataByBedrooms
        .map((r: any) => {
          const b = numOrNull(r?.bedrooms);
          return {
            name: b === 0 ? 'Studio' : `${b} Bed`,
            beds: b ?? -1,
            medianRent: posOrNull(r?.medianRent),
            averageRent: posOrNull(r?.averageRent),
            listings: numOrNull(r?.totalListings),
          };
        })
        .filter((r: MarketRentRow) => r.beds >= 0 && (r.medianRent != null || r.averageRent != null))
        .sort((a: MarketRentRow, b: MarketRentRow) => a.beds - b.beds)
    : [];

  const marketStats: { label: string; value: string; apiField: string }[] = [];
  const pushStat = (label: string, value: string | null, apiField: string, source = 'RentCast /markets') => {
    marketStats.push({ label, value: value ?? 'Unknown', apiField });
    if (value) audit.push({ field: label, value, source, apiField, retrievedAt, usedInCalc: false });
  };
  pushStat('Median Rent (ZIP)', rental?.medianRent != null ? `${money(posOrNull(rental.medianRent))} / mo` : null, 'market.rentalData.medianRent');
  pushStat('Average Rent (ZIP)', rental?.averageRent != null ? `${money(posOrNull(rental.averageRent))} / mo` : null, 'market.rentalData.averageRent');
  pushStat('Rent Low – High (ZIP)', posOrNull(rental?.minRent) != null && posOrNull(rental?.maxRent) != null ? `${money(posOrNull(rental.minRent))} – ${money(posOrNull(rental.maxRent))}` : null, 'market.rentalData.minRent / maxRent');
  pushStat('Active Rental Listings', numOrNull(rental?.totalListings) != null ? String(numOrNull(rental?.totalListings)) : null, 'market.rentalData.totalListings');
  pushStat('Avg Days on Market (rentals)', numOrNull(rental?.averageDaysOnMarket) != null ? `${Math.round(numOrNull(rental?.averageDaysOnMarket) as number)} days` : null, 'market.rentalData.averageDaysOnMarket');
  pushStat('Median Sale Price (ZIP)', posOrNull(sale?.medianPrice) != null ? money(posOrNull(sale?.medianPrice)) : null, 'market.saleData.medianPrice');
  pushStat('Average Sale Price (ZIP)', posOrNull(sale?.averagePrice) != null ? money(posOrNull(sale?.averagePrice)) : null, 'market.saleData.averagePrice');
  pushStat('Median $/Sqft (sales)', posOrNull(sale?.medianPricePerSquareFoot) != null ? `$${(posOrNull(sale?.medianPricePerSquareFoot) as number).toFixed(0)}` : null, 'market.saleData.medianPricePerSquareFoot');
  pushStat('Active Sale Listings', numOrNull(sale?.totalListings) != null ? String(numOrNull(sale?.totalListings)) : null, 'market.saleData.totalListings');
  pushStat('Avg Days on Market (sales)', numOrNull(sale?.averageDaysOnMarket) != null ? `${Math.round(numOrNull(sale?.averageDaysOnMarket) as number)} days` : null, 'market.saleData.averageDaysOnMarket');

  const marketLastUpdated = strOrNull(rental?.lastUpdatedDate)?.slice(0, 10) ?? null;

  /* ------------------------------------------------------- validation */
  const checks: ValidationCheck[] = [];
  const addCheck = (label: string, ok: boolean, detail: string, blocking = false) => checks.push({ label, ok, detail, blocking });

  addCheck(
    'Property matched by RentCast',
    !!p,
    p ? `Matched to ${address}` : 'RentCast returned no property record — property-level fields are Unknown.',
  );
  const zipConsistent = !/^\d{5}$/.test(requestedZip) || !p?.zipCode || p.zipCode === requestedZip;
  addCheck(
    'ZIP consistent',
    zipConsistent,
    zipConsistent
      ? `Requested ${requestedZip || 'n/a'} · RentCast ${p?.zipCode ?? 'n/a'}`
      : `Requested ZIP ${requestedZip} but RentCast matched ${p?.zipCode}. Rendering blocked — the addresses are different properties.`,
    !zipConsistent,
  );
  addCheck('Address consistent across sections', !!address || !p, address ? `All sections read property.formattedAddress = "${address}"` : 'No address to reconcile.');
  addCheck('Bedrooms present', beds != null, beds != null ? `property.bedrooms = ${beds}` : 'Not returned — displayed as Unknown, no rent credit.');
  addCheck('Bathrooms present', baths != null, baths != null ? `property.bathrooms = ${baths}` : 'Not returned — displayed as Unknown, no rent credit.');
  addCheck('Square footage present', sqft != null, sqft != null ? `property.squareFootage = ${sqft}` : 'Not returned — sqft adjustment suppressed.');
  addCheck('Property type present', !!propertyType, propertyType ? `property.propertyType = ${propertyType}` : 'Not returned — comp type match cannot be asserted.');
  addCheck(
    'Rent estimate returned for this property',
    avmRent != null,
    avmRent != null ? `rentAvm.rent = ${money(avmRent)} for ${address ?? 'the queried address'}` : 'RentCast returned no long-term rent estimate.',
  );
  const offMarket = comps.filter((c) => !c.sameMarket).length;
  addCheck(
    'Comparables belong to the same market',
    offMarket === 0,
    comps.length === 0 ? 'No comparables returned.' : offMarket === 0 ? `All ${comps.length} comparables are in ZIP ${zip ?? 'n/a'} or within 5 mi.` : `${offMarket} of ${comps.length} comparables fall outside the subject ZIP and 5 mi radius.`,
  );
  const typeMismatch = propertyType ? comps.filter((c) => c.propertyType && c.propertyType !== propertyType).length : 0;
  addCheck('Comparable property types match', typeMismatch === 0, typeMismatch === 0 ? 'Every comparable shares the subject property type.' : `${typeMismatch} comparable(s) are a different property type — flagged in the table.`);
  const varianceOk = variancePct == null || Math.abs(variancePct) <= 15;
  addCheck(
    'Comp-derived rent reconciles with the RentCast estimate',
    varianceOk,
    variancePct == null ? 'Not enough comparables to cross-check.' : `Comp-derived ${money(compDerivedRent)} vs RentCast ${money(avmRent)} → ${variancePct > 0 ? '+' : ''}${variancePct}%`,
  );
  const historyOk = lastSalePrice == null || saleHistory.length === 0 || saleHistory.some((h) => h.price === lastSalePrice);
  addCheck('Sale history consistent with last sale price', historyOk, historyOk ? 'property.lastSalePrice appears in property.history.' : 'property.lastSalePrice does not appear in property.history — both shown verbatim, neither reconciled.');
  addCheck('No AI-generated property facts', true, 'Property facts, rent, valuation and comparables come only from RentCast. AI output is limited to non-numeric narrative.');

  const blockingFailures = checks.filter((c) => c.blocking && !c.ok).map((c) => c.detail);

  /* ------------------------------------------------------- confidence */
  const drivers: ConfidenceResult['drivers'] = [];
  let score = 0;
  const award = (points: number, ok: boolean, text: string) => {
    if (ok) score += points;
    drivers.push({ ok, text, points: ok ? points : 0 });
  };

  award(25, !!p, p ? 'Property matched to a RentCast record' : 'No RentCast property record matched');
  const compCount = compsWithRent.length;
  const compPts = compCount >= 8 ? 25 : compCount >= 5 ? 18 : compCount >= 3 ? 12 : compCount >= 1 ? 5 : 0;
  award(compPts, compCount > 0, compCount > 0 ? `${compCount} comparable rental(s) returned by RentCast` : 'No comparable rentals returned');
  const medDaysOld = median(comps.filter((c) => c.daysOld != null).map((c) => c.daysOld as number));
  const recencyPts = medDaysOld == null ? 0 : medDaysOld <= 90 ? 10 : medDaysOld <= 180 ? 5 : 0;
  award(recencyPts, recencyPts > 0, medDaysOld == null ? 'Comparable listing age unavailable' : `Median comparable listing age: ${Math.round(medDaysOld)} days`);
  const core = [beds, baths, sqft, yearBuilt, lotSizeSqft, propertyType, address, valueEstimate];
  const filled = core.filter((v) => v != null && v !== '').length;
  const fieldPts = Math.round((filled / core.length) * 20);
  award(fieldPts, fieldPts > 0, `${filled} of ${core.length} core property fields returned by RentCast`);
  award(10, avmRent != null, avmRent != null ? 'RentCast long-term rent estimate available' : 'No RentCast rent estimate available');
  award(10, marketStats.some((m) => m.value !== 'Unknown'), rental || sale ? `ZIP market statistics available${marketLastUpdated ? ` (updated ${marketLastUpdated})` : ''}` : 'No ZIP market statistics available');

  if (blockingFailures.length) { score = Math.max(0, score - 40); drivers.push({ ok: false, text: 'Blocking validation failure detected', points: 0 }); }

  const confidence: ConfidenceResult = { score: Math.max(0, Math.min(100, score)), drivers };

  /* -------------------------------------------------------- narrative */
  const ai = payload?.aiContext;
  const context = ai
    ? {
        neighborhoodSummary: strOrNull(ai.neighborhoodSummary) ?? '',
        rentalDemandNarrative: strOrNull(ai.rentalDemandNarrative) ?? '',
        majorEmployers: Array.isArray(ai.majorEmployers) ? ai.majorEmployers : [],
        amenities: {
          grocery: ai.amenities?.grocery ?? [],
          parks: ai.amenities?.parks ?? [],
          restaurants: ai.amenities?.restaurants ?? [],
          hospitals: ai.amenities?.hospitals ?? [],
        },
        thingsToDo: ai.thingsToDo ?? {},
      }
    : null;

  return {
    retrievedAt,
    address, city, state, zip, county, propertyType,
    matched: !!p,
    matchMethod: strOrNull(payload?.match?.method) ?? 'Unknown',
    geo,
    beds, baths, sqft, lotSizeSqft, yearBuilt,
    features,
    valueEstimate, valueRange, lastSalePrice, lastSaleDate, saleHistory,
    taxAssessedValue, taxAssessedYear, annualPropertyTax, hoaFee,
    avmRent, avmRentRange, compBaseRent, compBaseLabel, adjustments, compDerivedRent, variancePct, recommendedRent,
    comps,
    marketRentRows, marketStats, marketLastUpdated,
    context,
    listingUrlProvided: strOrNull(payload?.input?.listingUrl),
    extractedAddress: strOrNull(payload?.input?.extractedAddress),
    extractionMethod: strOrNull(payload?.input?.extractionMethod),
    audit,
    checks,
    blockingFailures,
    confidence,
    apiErrors: Array.isArray(payload?.rentcastErrors) ? payload.rentcastErrors : [],
  };
}
