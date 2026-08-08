import { supabase } from "@/integrations/supabase/client";

/**
 * ZIP Market Research client — free public datasets only (Census ACS 5-Year,
 * Census Geocoder, USPS place directory). Any field the datasets omit arrives
 * as null and must be rendered as "Unavailable".
 */

export interface CensusFieldMeta {
  label: string;
  value: number | null;
  variable: string;
  dataset: string;
  year: number | null;
  geography: string;
  retrievedAt: string;
}

export interface ZipMarketData {
  zip: string;
  retrievedAt: string;
  acsYear: number | null;
  datasetName: string;
  geographyLevel: string;
  censusAvailable: boolean;
  sources: string[];
  place: {
    city: string | null;
    state: string | null;
    stateName: string | null;
    county: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  demographics: {
    population: number | null;
    medianAge: number | null;
    medianHouseholdIncome: number | null;
    unemploymentRate: number | null;
    laborForce: number | null;
    employed: number | null;
    unemployed: number | null;
    povertyRate: number | null;
    bachelorsPlusPct: number | null;
  };
  housing: {
    medianHomeValue: number | null;
    medianGrossRent: number | null;
    housingUnits: number | null;
    occupiedUnits: number | null;
    vacantUnits: number | null;
    ownerOccupiedUnits: number | null;
    renterOccupiedUnits: number | null;
    vacancyRate: number | null;
    ownerOccupiedPct: number | null;
    renterOccupiedPct: number | null;
    medianYearBuilt: number | null;
    grossRentMultiplierMarket: number | null;
    rentToValuePct: number | null;
    rentToIncomePct: number | null;
    medianGrossRentPctIncomeCensus: number | null;
  };
  fieldMeta: CensusFieldMeta[];
  trend: { year: number; medianGrossRent: number | null; medianHomeValue: number | null }[];
  datasetErrors: string[];
}

/** ZIP-level cache, deliberately separate from any property-level state. */
const zipCache = new Map<string, ZipMarketData>();

export function getCachedZipMarket(zip: string) {
  return zipCache.get(zip) ?? null;
}

export async function fetchZipMarket(zip: string): Promise<ZipMarketData> {
  const cached = zipCache.get(zip);
  if (cached) return cached;
  const { data, error } = await supabase.functions.invoke("zip-market", { body: { zip } });
  if (error) throw new Error("Market data temporarily unavailable.");
  if (data?.error) throw new Error(data.error);
  const result = data as ZipMarketData;
  zipCache.set(zip, result);
  return result;
}

export const fmtUnknown = (v: number | null | undefined, fmt: (n: number) => string) =>
  v === null || v === undefined || Number.isNaN(v) ? "Unavailable" : fmt(v);

export const money0 = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export const int0 = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
export const pct1 = (n: number) => `${n.toFixed(1)}%`;
export const num1 = (n: number) => n.toFixed(1);
