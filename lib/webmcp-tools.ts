// WebMCP tool layer — the READ/RESEARCH tools an agent uses to understand the market instead of
// guessing through the DOM. Each is readOnlyHint, updates the shared store, and streams a line to
// the Agent Research panel. Design principle: expose user intentions, not implementation functions
// (hence explain_deal, not the internal calculate_deal_score).

import { VEHICLES, searchVehicles, valueDelta } from "./catalog";
import { breakdown, fairValue, type Vehicle } from "./valuation";
import { dealScore, verdict } from "./dealScore";
import { priceHistory } from "./history";
import { useStore } from "./store";
import { registerTool, type ToolDef } from "./webmcp-compat";

const S = () => useStore.getState();
const find = (id: string): Vehicle | undefined => VEHICLES.find((v) => v.id === id);
const title = (v: Vehicle) => `${v.year} ${v.make} ${v.model} ${v.trim}`;
const notFound = (id: string) => ({ error: `vehicle not found: ${id}` });
const deltaLabel = (d: number) => (d >= 0 ? `${d}% below fair value` : `${Math.abs(d)}% above fair value`);

export const TOOLS: ToolDef[] = [
  {
    name: "search_vehicles",
    description:
      "Search the used-car catalog by make, model, max price, max mileage, and title status. Returns matching vehicles with price and fair-value delta.",
    inputSchema: {
      type: "object",
      properties: {
        make: { type: "string" },
        model: { type: "string" },
        maxPrice: { type: "number" },
        maxMiles: { type: "number" },
        excludeSalvage: { type: "boolean" },
      },
      required: [],
    },
    annotations: { readOnlyHint: true },
    execute: async (a: any = {}) => {
      S().setFilter({
        make: a.make ?? "",
        model: a.model ?? "",
        maxPrice: a.maxPrice ?? null,
        maxMiles: a.maxMiles ?? null,
        excludeSalvage: !!a.excludeSalvage,
        query: "",
      });
      S().select(null);
      const found = searchVehicles(a);
      S().logActivity("search_vehicles", `${found.length} matches`);
      return {
        count: found.length,
        results: found.slice(0, 20).map((v) => ({
          id: v.id,
          title: title(v),
          price: v.price,
          miles: v.miles,
          titleClean: v.titleClean,
          valueDeltaPct: valueDelta(v),
          location: v.location,
        })),
      };
    },
  },
  {
    name: "get_vehicle_details",
    description:
      "Get full details for one vehicle by id: specs, mileage, title status, location, asking price, and fair-value delta. Opens the vehicle in the page.",
    inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
    annotations: { readOnlyHint: true },
    execute: async (a: any = {}) => {
      const v = find(a.vehicleId);
      if (!v) return notFound(a.vehicleId);
      S().select(v.id);
      S().logActivity("get_vehicle_details", title(v));
      return {
        id: v.id, title: title(v), year: v.year, make: v.make, model: v.model, trim: v.trim,
        miles: v.miles, condition: v.condition, titleClean: v.titleClean, location: v.location,
        price: v.price, fairValue: fairValue(v), valueDeltaPct: valueDelta(v),
      };
    },
  },
  {
    name: "get_price_history",
    description:
      "Get the recent asking-price history for one vehicle by id (monthly points ending at the current price).",
    inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
    annotations: { readOnlyHint: true },
    execute: async (a: any = {}) => {
      const v = find(a.vehicleId);
      if (!v) return notFound(a.vehicleId);
      S().select(v.id);
      const history = priceHistory(v);
      S().logActivity("get_price_history", `${title(v)} · ${history.length} points`);
      return { id: v.id, title: title(v), history };
    },
  },
  {
    name: "estimate_fair_value",
    description:
      "Estimate the deterministic fair value of one vehicle by id and explain it line-by-line (base, age, mileage, condition, title, region). No LLM in the number.",
    inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
    annotations: { readOnlyHint: true },
    execute: async (a: any = {}) => {
      const v = find(a.vehicleId);
      if (!v) return notFound(a.vehicleId);
      S().select(v.id);
      const b = breakdown(v);
      S().logActivity("estimate_fair_value", `${title(v)} · fair value $${b.fairValue.toLocaleString()}`);
      return {
        id: v.id, title: title(v), base: b.base, adjustments: b.lines,
        fairValue: b.fairValue, askingPrice: v.price, valueDeltaPct: valueDelta(v),
      };
    },
  },
  {
    name: "explain_deal",
    description:
      "Explain whether a vehicle is a good deal: a 0-100 deal score with a verdict (STRONG BUY / GOOD DEAL / FAIR / OVERPRICED), the discount vs fair value, and the reasons behind it.",
    inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
    annotations: { readOnlyHint: true },
    execute: async (a: any = {}) => {
      const v = find(a.vehicleId);
      if (!v) return notFound(a.vehicleId);
      S().select(v.id);
      const score = dealScore(v);
      const vd = verdict(score);
      const b = breakdown(v);
      const delta = valueDelta(v);
      S().logActivity("explain_deal", `${title(v)} · ${vd} (${deltaLabel(delta)})`);
      return {
        id: v.id, title: title(v), dealScore: score, verdict: vd,
        askingPrice: v.price, fairValue: b.fairValue, discountPct: delta,
        reasons: b.lines.filter((l) => l.delta !== 0).map((l) => `${l.label}: ${l.delta >= 0 ? "+" : "-"}$${Math.abs(l.delta).toLocaleString()}`),
      };
    },
  },
  {
    name: "compare_vehicles",
    description:
      "Compare 2-4 vehicles by id side by side: price, fair value, value delta, deal score, mileage, and title. Highlights the best value and shows the comparison in the page.",
    inputSchema: {
      type: "object",
      properties: { vehicleIds: { type: "array", items: { type: "string" } } },
      required: ["vehicleIds"],
    },
    annotations: { readOnlyHint: true },
    execute: async (a: any = {}) => {
      const ids: string[] = Array.isArray(a.vehicleIds) ? a.vehicleIds.slice(0, 4) : [];
      const vs = ids.map(find).filter(Boolean) as Vehicle[];
      if (vs.length === 0) return { error: "no valid vehicle ids" };
      S().setCompare(vs.map((v) => v.id));
      S().select(null);
      const rows = vs.map((v) => ({
        id: v.id, title: title(v), price: v.price, fairValue: fairValue(v),
        valueDeltaPct: valueDelta(v), dealScore: dealScore(v), miles: v.miles, titleClean: v.titleClean,
      }));
      const best = rows.reduce((x, y) => (y.dealScore > x.dealScore ? y : x));
      S().logActivity("compare_vehicles", `${rows.length} finalists · best: ${best.title} (${deltaLabel(best.valueDeltaPct)})`);
      return { count: rows.length, bestId: best.id, vehicles: rows };
    },
  },
];

export const TOOL_META = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  readOnly: !!t.annotations?.readOnlyHint,
}));

export async function registerAllTools(signal: AbortSignal): Promise<number> {
  let n = 0;
  for (const t of TOOLS) {
    if (await registerTool(t, signal)) n += 1;
  }
  return n;
}
