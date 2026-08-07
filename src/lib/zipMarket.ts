import { supabase } from "@/integrations/supabase/client";

/**
 * ZIP Market Research client — free public datasets only (Census ACS + USPS
 * place directory). Any field the datasets omit arrives as null and must be
 * rendered as "Unknown".
 */

export interface ZipMarketData {
  zip: string;
  retrievedAt: string;
  acsYear: number | null;
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
    medianHouseholdIncome: number | null;
    unemploymentRate: number | null;
    laborForce: number | null;
  };
  housing: {
    medianHomeValue: number | null;
    medianGrossRent: number | null;
    housingUnits: number | null;
    occupiedUnits: number | null;
    vacantUnits: number | null;
    vacancyRate: number | null;
    ownerOccupiedPct: number | null;
    renterOccupiedPct: number | null;
    medianYearBuilt: number | null;
    grossRentMultiplierMarket: number | null;
    rentToValuePct: number | null;
  };
  trend: { year: number; medianGrossRent: number | null; medianHomeValue: number | null }[];
  datasetErrors: string[];
}

export async function fetchZipMarket(zip: string): Promise<ZipMarketData> {
  const { data, error } = await supabase.functions.invoke("zip-market", { body: { zip } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as ZipMarketData;
}

export const fmtUnknown = (v: number | null | undefined, fmt: (n: number) => string) =>
  v === null || v === undefined || Number.isNaN(v) ? "Unknown" : fmt(v);

export const money0 = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export const int0 = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
export const pct1 = (n: number) => `${n.toFixed(1)}%`;
