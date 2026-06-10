import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Centralized Property Hub
 * -----------------------------------------------------------------------------
 * Single source of truth for property-level inputs shared across every
 * calculator + a small market-data cache keyed by ZIP for fallback values.
 */

export interface Property {
  id: string;
  address: string;
  purchasePrice: number;
  downPayment: number;   // percent of purchase price (e.g. 20)
  grossRent: number;     // gross monthly rent
  vacancyRate: number;   // percent (e.g. 5)
  taxes: number;         // annual property tax rate as % of value (e.g. 1.2)
  insurance: number;     // annual insurance rate as % of value (e.g. 0.45)
  maintenance: number;   // percent of rent (e.g. 5)
  capex: number;         // percent of rent (e.g. 5)
  // Optional metadata pulled from RentCast
  squareFootage?: number;
  yearBuilt?: number;
  zip?: string;
}

export interface ZipMarketData {
  zip: string;
  medianRent: number;
  avgPricePerSqft: number;
  medianPrice: number;
  vacancyRatePct: number;
  avgDaysOnMarket: number;
  grossYieldPct: number;
  yieldLabel: string;
  bedroomRents?: Record<string, number>;
  fetchedAt: number;
}

export const BLANK_PROPERTY: Omit<Property, "id"> = {
  address: "Untitled Deal",
  purchasePrice: 250000,
  downPayment: 20,
  grossRent: 2200,
  vacancyRate: 5,
  taxes: 1.2,
  insurance: 0.45,
  maintenance: 5,
  capex: 5,
};

interface PropertyStore {
  properties: Property[];
  activePropertyId: string;
  zipCache: Record<string, ZipMarketData>;
  addProperty: (seed?: Partial<Omit<Property, "id">>) => string;
  removeProperty: (id: string) => void;
  setActiveProperty: (id: string) => void;
  updateActiveProperty: <K extends keyof Property>(field: K, value: Property[K]) => void;
  renameActiveProperty: (address: string) => void;
  /** Merge a RentCast address payload into the active property (only overwrites fields with valid values). */
  applyRentCastPayload: (payload: Partial<Property> & { annualTaxes?: number }) => void;
  cacheZip: (z: ZipMarketData) => void;
  getZip: (zip: string) => ZipMarketData | undefined;
}

function uid() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const seedId = uid();
const seedProperty: Property = { id: seedId, ...BLANK_PROPERTY };

export const usePropertyStore = create<PropertyStore>()(
  persist(
    (set, get) => ({
      properties: [seedProperty],
      activePropertyId: seedId,
      zipCache: {},

      addProperty: (seed) => {
        const id = uid();
        const next: Property = {
          id,
          ...BLANK_PROPERTY,
          ...seed,
          address: seed?.address || `New Property ${get().properties.length + 1}`,
        };
        set((s) => ({ properties: [...s.properties, next], activePropertyId: id }));
        return id;
      },

      removeProperty: (id) => {
        set((s) => {
          const properties = s.properties.filter((p) => p.id !== id);
          if (properties.length === 0) {
            const fresh: Property = { id: uid(), ...BLANK_PROPERTY };
            return { properties: [fresh], activePropertyId: fresh.id };
          }
          const activePropertyId = s.activePropertyId === id ? properties[0].id : s.activePropertyId;
          return { properties, activePropertyId };
        });
      },

      setActiveProperty: (id) => set({ activePropertyId: id }),

      updateActiveProperty: (field, value) =>
        set((s) => ({
          properties: s.properties.map((p) =>
            p.id === s.activePropertyId ? { ...p, [field]: value } : p
          ),
        })),

      renameActiveProperty: (address) =>
        set((s) => ({
          properties: s.properties.map((p) =>
            p.id === s.activePropertyId ? { ...p, address } : p
          ),
        })),

      applyRentCastPayload: (payload) =>
        set((s) => {
          const zipFallback = payload.zip ? s.zipCache[payload.zip] : undefined;
          return {
            properties: s.properties.map((p) => {
              if (p.id !== s.activePropertyId) return p;
              const next: Property = { ...p };
              if (payload.address) next.address = payload.address;
              if (payload.purchasePrice && payload.purchasePrice > 0) next.purchasePrice = Math.round(payload.purchasePrice);
              if (payload.grossRent && payload.grossRent > 0) next.grossRent = Math.round(payload.grossRent);
              if (payload.squareFootage) next.squareFootage = payload.squareFootage;
              if (payload.yearBuilt) next.yearBuilt = payload.yearBuilt;
              if (payload.zip) next.zip = payload.zip;
              // Property taxes — RentCast returns dollars; convert to % of price.
              if (payload.annualTaxes && payload.annualTaxes > 0 && (payload.purchasePrice ?? p.purchasePrice) > 0) {
                next.taxes = +((payload.annualTaxes / (payload.purchasePrice ?? p.purchasePrice)) * 100).toFixed(2);
              }
              // ZIP fallback for missing fields
              if (zipFallback) {
                if (!payload.annualTaxes && zipFallback.vacancyRatePct) next.vacancyRate = zipFallback.vacancyRatePct;
              }
              return next;
            }),
          };
        }),

      cacheZip: (z) =>
        set((s) => ({ zipCache: { ...s.zipCache, [z.zip]: { ...z, fetchedAt: Date.now() } } })),

      getZip: (zip) => get().zipCache[zip],
    }),
    { name: "rentintel.propertyHub.v2" }
  )
);

/** Convenience selector — always returns a property (store guarantees ≥1). */
export function useActiveProperty(): Property {
  return usePropertyStore((s) => {
    const found = s.properties.find((p) => p.id === s.activePropertyId);
    return found ?? s.properties[0];
  });
}

export function useSharedField<K extends keyof Property>(
  field: K
): [Property[K], (value: Property[K]) => void] {
  const value = usePropertyStore((s) => {
    const p = s.properties.find((x) => x.id === s.activePropertyId) ?? s.properties[0];
    return p[field];
  });
  const update = usePropertyStore((s) => s.updateActiveProperty);
  return [value, (v) => update(field, v)];
}
