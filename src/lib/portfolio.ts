// Shared portfolio store for all RentIntel tools (Dashboard, Pricing, Maintenance, Comms).
// Backed by localStorage so the experience persists across reloads without auth.

import { useEffect, useState, useCallback } from "react";

export interface Unit {
  id: string;
  label: string;          // "Unit 4B"
  address: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  currentRent: number;
  occupied: boolean;
  tenantName?: string;
  suggestedRent?: number;
  pricingConfidence?: number;
  pricingUpdatedAt?: string;
}

export interface Ticket {
  id: string;
  unitId: string;
  description: string;
  priority: "P1" | "P2" | "P3";
  category: string;
  severity: string;
  estimatedCostRange: string;
  vendorType: string;
  slaHours: number;
  summary: string;
  selfFixSteps: string[];
  status: "Open" | "Dispatched" | "Scheduled" | "Resolved" | "Closed";
  createdAt: string;
}

export interface Conversation {
  id: string;
  unitId: string;
  tenantName: string;
  messages: { role: "tenant" | "ai" | "manager"; text: string; at: string; meta?: Record<string, unknown> }[];
  sentiment?: string;
  churnRisk?: string;
  updatedAt: string;
}

interface Store {
  units: Unit[];
  tickets: Ticket[];
  conversations: Conversation[];
}

const KEY = "rentintel.portfolio.v1";

const seed: Store = {
  units: [
    { id: "u1", label: "Unit 4B",  address: "1142 Oak St",   zip: "78704", beds: 2, baths: 1, sqft: 920,  currentRent: 1850, occupied: true,  tenantName: "Maria Lopez" },
    { id: "u2", label: "Unit 12C", address: "1142 Oak St",   zip: "78704", beds: 1, baths: 1, sqft: 640,  currentRent: 1420, occupied: true,  tenantName: "Devon Park" },
    { id: "u3", label: "Unit 7A",  address: "455 Cedar Ave", zip: "78745", beds: 3, baths: 2, sqft: 1320, currentRent: 2650, occupied: true,  tenantName: "Aisha Brown" },
    { id: "u4", label: "Unit 2D",  address: "455 Cedar Ave", zip: "78745", beds: 0, baths: 1, sqft: 480,  currentRent: 1100, occupied: false },
  ],
  tickets: [],
  conversations: [],
};

function load(): Store {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed;
    return { ...seed, ...JSON.parse(raw) };
  } catch { return seed; }
}

function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// Tiny pub/sub so multiple components stay in sync within the tab.
const listeners = new Set<() => void>();
let cache: Store | null = null;
function getStore(): Store { return cache ?? (cache = load()); }
function setStore(updater: (s: Store) => Store) {
  cache = updater(getStore());
  save(cache);
  listeners.forEach((l) => l());
}

export function usePortfolio() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  const store = getStore();

  const addUnit = useCallback((u: Omit<Unit, "id">) => {
    const id = `u${Date.now()}`;
    setStore((s) => ({ ...s, units: [...s.units, { ...u, id }] }));
    return id;
  }, []);
  const updateUnit = useCallback((id: string, patch: Partial<Unit>) => {
    setStore((s) => ({ ...s, units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
  }, []);
  const removeUnit = useCallback((id: string) => {
    setStore((s) => ({ ...s, units: s.units.filter((u) => u.id !== id), tickets: s.tickets.filter((t) => t.unitId !== id) }));
  }, []);

  const addTicket = useCallback((t: Omit<Ticket, "id" | "createdAt" | "status">) => {
    const id = `t${Date.now()}`;
    setStore((s) => ({ ...s, tickets: [{ ...t, id, status: "Open", createdAt: new Date().toISOString() }, ...s.tickets] }));
    return id;
  }, []);
  const updateTicket = useCallback((id: string, patch: Partial<Ticket>) => {
    setStore((s) => ({ ...s, tickets: s.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }, []);
  const removeTicket = useCallback((id: string) => {
    setStore((s) => ({ ...s, tickets: s.tickets.filter((t) => t.id !== id) }));
  }, []);

  const upsertConversation = useCallback((c: Conversation) => {
    setStore((s) => {
      const idx = s.conversations.findIndex((x) => x.id === c.id);
      const next = [...s.conversations];
      if (idx >= 0) next[idx] = c; else next.unshift(c);
      return { ...s, conversations: next };
    });
  }, []);

  return {
    units: store.units,
    tickets: store.tickets,
    conversations: store.conversations,
    addUnit, updateUnit, removeUnit,
    addTicket, updateTicket, removeTicket,
    upsertConversation,
  };
}
