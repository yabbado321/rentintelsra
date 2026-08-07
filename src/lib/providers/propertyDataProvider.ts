/**
 * Property Data Provider Interface
 * -----------------------------------------------------------------------------
 * The underwriting engine NEVER talks to a data provider directly. It consumes
 * `ManualPropertyInput` only. A provider (RentCast, county assessor feed, MLS,
 * etc.) can therefore be added later purely as an optional pre-fill layer:
 * it populates fields, the user can override every one of them, and the maths
 * is unchanged.
 *
 * No provider is configured today. `getActiveProvider()` returns null and the
 * app must work normally in that state.
 */

import type { ManualPropertyInput } from "@/lib/manualUnderwriting";

/** Fields a provider is allowed to pre-fill. Everything is optional. */
export type ProviderPrefill = Partial<
  Pick<
    ManualPropertyInput,
    | "address"
    | "zip"
    | "propertyType"
    | "bedrooms"
    | "bathrooms"
    | "squareFootage"
    | "yearBuilt"
    | "lotSizeSqft"
    | "purchasePrice"
    | "expectedRent"
    | "annualPropertyTax"
    | "annualInsurance"
    | "monthlyHoa"
  >
>;

export interface ProviderLookupResult {
  /** Values to pre-fill. The user may override any of them. */
  prefill: ProviderPrefill;
  /** Per-field provenance so the Data Audit stays honest. */
  fieldSources: Record<string, string>;
  providerName: string;
  retrievedAt: string;
}

export interface PropertyDataProvider {
  id: string;
  name: string;
  /** True only when credentials/subscription are actually usable. */
  isConfigured(): boolean;
  lookupByAddress(address: string): Promise<ProviderLookupResult>;
}

const registry: PropertyDataProvider[] = [
  // Register future providers here, e.g. createRentCastProvider().
];

/** Returns the first configured provider, or null when running API-free. */
export function getActiveProvider(): PropertyDataProvider | null {
  return registry.find((p) => p.isConfigured()) ?? null;
}

export function hasProvider(): boolean {
  return getActiveProvider() !== null;
}

/** Human-readable source label for any field that came from the user. */
export const USER_INPUT_SOURCE = "User input";
export const PUBLIC_DATASET_SOURCE = "US Census ACS 5-Year (public dataset)";
export const CALCULATED_SOURCE = "Calculated";
