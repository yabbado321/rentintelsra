import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Centralized Property Hub
 * -----------------------------------------------------------------------------
 * Single source of truth for property-level inputs that are shared across every
 * calculator (Deal Analyzer, BRRRR, Buy-and-Hold, ROI & Taxes, Comparison,
 * Advanced Tools, etc.).
 *
 * Calculator-specific assumptions (e.g. exit cap, refi LTV) still live in each
 * calculator's local state — only the universal "what is this deal?" fields
 * live here.
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
  addProperty: (seed?: Partial<Omit<Property, "id">>) => string;
  removeProperty: (id: string) => void;
  setActiveProperty: (id: string) => void;
  updateActiveProperty: <K extends keyof Property>(field: K, value: Property[K]) => void;
  renameActiveProperty: (address: string) => void;
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
    }),
    { name: "rentintel.propertyHub.v1" }
  )
);

/** Convenience selector — always returns a property (store guarantees ≥1). */
export function useActiveProperty(): Property {
  return usePropertyStore((s) => {
    const found = s.properties.find((p) => p.id === s.activePropertyId);
    return found ?? s.properties[0];
  });
}

/**
 * Two-way binding hook — read a single field from the active property and
 * push edits back to the global store. Designed to be a drop-in replacement
 * for `useState<number>` / `useSessionState<number>` inside any calculator.
 *
 * Example:
 *   const [price, setPrice] = useSharedField("purchasePrice");
 *   <input value={price} onChange={e => setPrice(Number(e.target.value))} />
 */
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
