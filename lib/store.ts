// Shared client state (Zustand). Both the human UI and the WebMCP tools drive this same store.

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

export type Offer = {
  id: string;
  vehicleId: string;
  amount: number;
  message?: string;
  status: "DRAFT" | "SENT";
  approvalId?: string;
  ref?: string;
};

export type Approval = {
  id: string;
  tool: string;
  vehicleId: string;
  amount: number;
  summary: string;
  riskScore: number;
  status: "PENDING" | "APPROVED" | "DENIED";
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
  offers: Offer[];
  approvals: Approval[];
  activity: Activity[];
  webmcp: "checking" | "on" | "off";
  _act: number;
  _seq: number;
  setFilter: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  select: (id: string | null) => void;
  setCompare: (ids: string[]) => void;
  toggleSave: (id: string) => void;
  save: (id: string) => void;
  prepareOffer: (vehicleId: string, amount: number, message?: string) => Offer;
  getDraft: (vehicleId: string) => Offer | undefined;
  getSentOffer: (vehicleId: string) => Offer | undefined;
  createApproval: (a: Omit<Approval, "id" | "status">) => string;
  resolveApproval: (id: string, approve: boolean) => void;
  logActivity: (entry: ActivityInput) => void;
  setWebmcp: (s: "checking" | "on" | "off") => void;
};

export const useStore = create<Store>((set, get) => ({
  filters: initialFilters,
  selectedId: null,
  compareIds: [],
  saved: [],
  offers: [],
  approvals: [],
  activity: [],
  webmcp: "checking",
  _act: 0,
  _seq: 0,
  setFilter: (patch) => set((s) => ({ filters: { ...s.filters, ...patch }, compareIds: [] })),
  resetFilters: () => set({ filters: initialFilters, compareIds: [], selectedId: null }),
  select: (id) => set({ selectedId: id }),
  setCompare: (ids) => set({ compareIds: ids }),
  toggleSave: (id) =>
    set((s) => ({ saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id] })),
  save: (id) => set((s) => (s.saved.includes(id) ? {} : { saved: [...s.saved, id] })),

  prepareOffer: (vehicleId, amount, message) => {
    const existing = get().offers.find((o) => o.vehicleId === vehicleId && o.status === "DRAFT");
    let offer: Offer;
    if (existing) {
      offer = { ...existing, amount, message };
      set((s) => ({ offers: s.offers.map((o) => (o.id === existing.id ? offer : o)) }));
    } else {
      const seq = get()._seq + 1;
      offer = { id: `of${seq}`, vehicleId, amount, message, status: "DRAFT" };
      set((s) => ({ _seq: seq, offers: [...s.offers, offer] }));
    }
    return offer;
  },
  getDraft: (vehicleId) => get().offers.find((o) => o.vehicleId === vehicleId && o.status === "DRAFT"),
  getSentOffer: (vehicleId) => get().offers.find((o) => o.vehicleId === vehicleId && o.status === "SENT"),

  createApproval: (a) => {
    const seq = get()._seq + 1;
    const id = `AP-${seq}`;
    set((s) => ({ _seq: seq, approvals: [{ id, status: "PENDING", ...a }, ...s.approvals] }));
    return id;
  },

  // Idempotent: only a PENDING approval does anything; a second call is a no-op (no duplicate offer).
  resolveApproval: (id, approve) => {
    const ap = get().approvals.find((a) => a.id === id);
    if (!ap || ap.status !== "PENDING") return;

    if (!approve) {
      set((s) => ({ approvals: s.approvals.map((a) => (a.id === id ? { ...a, status: "DENIED" } : a)) }));
      get().logActivity({
        tool: ap.tool,
        detail: `DENIED_BY_USER — $${ap.amount.toLocaleString()} offer declined`,
        riskClass: "OUTREACH_FINANCIAL",
        decision: "APPROVAL",
        riskScore: ap.riskScore,
      });
      return;
    }

    const ref = `demo_offer_${id}`;
    set((s) => {
      const approvals = s.approvals.map((a) => (a.id === id ? { ...a, status: "APPROVED" as const } : a));
      const draft = s.offers.find((o) => o.vehicleId === ap.vehicleId && o.status === "DRAFT");
      let offers: Offer[];
      let seq = s._seq;
      if (draft) {
        offers = s.offers.map((o) =>
          o.id === draft.id ? { ...o, amount: ap.amount, status: "SENT" as const, approvalId: id, ref } : o,
        );
      } else {
        seq += 1;
        offers = [...s.offers, { id: `of${seq}`, vehicleId: ap.vehicleId, amount: ap.amount, status: "SENT", approvalId: id, ref }];
      }
      return { approvals, offers, _seq: seq };
    });
    get().logActivity({
      tool: ap.tool,
      detail: `OFFER_SENT — $${ap.amount.toLocaleString()} (${ref})`,
      riskClass: "OUTREACH_FINANCIAL",
      decision: "APPROVAL",
      riskScore: ap.riskScore,
    });
  },

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
