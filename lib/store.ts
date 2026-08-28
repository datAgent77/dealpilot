// Shared client state (Zustand). Both the human UI and the WebMCP tools drive this same store —
// tools mutate it via useStore.getState() from outside React, so a human and their agent operate
// one surface.

import { create } from "zustand";
import { searchVehicles, type SearchArgs, type Vehicle } from "./catalog";

export type Activity = {
  id: number;
  tool: string;
  detail: string;
  riskClass?: string;
  decision?: string;
  riskScore?: number;
  ts: string;
};

export type ActivityInput = Omit<Activity, "id" | "ts">;

export type Filters = {
  query: string;
  make: string;
  model: string;
  maxPrice: number | null;
  maxMiles: number | null;
  excludeSalvage: boolean;
};

const initialFilters: Filters = {
  query: "",
  make: "",
  model: "",
  maxPrice: null,
  maxMiles: null,
  excludeSalvage: false,
};

type Store = {
  filters: Filters;
  selectedId: string | null;
  compareIds: string[];
  saved: string[];
  activity: Activity[];
  webmcp: "checking" | "on" | "off";
  _act: number;
  setFilter: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  select: (id: string | null) => void;
  setCompare: (ids: string[]) => void;
  toggleSave: (id: string) => void;
  logActivity: (entry: ActivityInput) => void;
  setWebmcp: (s: "checking" | "on" | "off") => void;
};

export const useStore = create<Store>((set) => ({
  filters: initialFilters,
  selectedId: null,
  compareIds: [],
  saved: [],
  activity: [],
  webmcp: "checking",
  _act: 0,
  setFilter: (patch) => set((s) => ({ filters: { ...s.filters, ...patch }, compareIds: [] })),
  resetFilters: () => set({ filters: initialFilters, compareIds: [], selectedId: null }),
  select: (id) => set({ selectedId: id }),
  setCompare: (ids) => set({ compareIds: ids }),
  toggleSave: (id) =>
    set((s) => ({
      saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id],
    })),
  logActivity: (entry) =>
    set((s) => {
      const id = s._act + 1;
      return {
        _act: id,
        activity: [{ id, ts: new Date().toLocaleTimeString(), ...entry }, ...s.activity].slice(0, 30),
      };
    }),
  setWebmcp: (webmcp) => set({ webmcp }),
}));

// --- pure selectors ---
export function filtersToArgs(f: Filters): SearchArgs {
  return {
    make: f.make || undefined,
    model: f.model || undefined,
    maxPrice: f.maxPrice ?? undefined,
    maxMiles: f.maxMiles ?? undefined,
    excludeSalvage: f.excludeSalvage || undefined,
  };
}

export function visibleVehicles(f: Filters): Vehicle[] {
  let list = searchVehicles(filtersToArgs(f));
  const q = f.query.toLowerCase().trim();
  if (q) list = list.filter((v) => `${v.year} ${v.make} ${v.model} ${v.trim}`.toLowerCase().includes(q));
  return list;
}
