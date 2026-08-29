// WebMCP tool layer. Each tool declares a riskClass and a raw `run`; the Action Gate wraps run
// with its deterministic decision + logging. READ tools understand the market (expose user
// intentions, not implementation functions — hence explain_deal, not calculate_deal_score).

import { VEHICLES, searchVehicles, valueDelta } from "./catalog";
import { breakdown, fairValue, type Vehicle } from "./valuation";
import { dealScore, verdict } from "./dealScore";
import { priceHistory } from "./history";
import { useStore } from "./store";
import { classify, gate, type RiskClass, type RunResult } from "./gate";
import { registerTool, type ToolDef } from "./webmcp-compat";

const S = () => useStore.getState();
const find = (id: string): Vehicle | undefined => VEHICLES.find((v) => v.id === id);
const title = (v: Vehicle) => `${v.year} ${v.make} ${v.model} ${v.trim}`;
const notFound = (id: string): RunResult => ({ result: { error: `vehicle not found: ${id}` }, detail: `not found: ${id}` });
const deltaLabel = (d: number) => (d >= 0 ? `${d}% below fair value` : `${Math.abs(d)}% above fair value`);

type Spec = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  riskClass: RiskClass;
  run: (a: any) => RunResult | Promise<RunResult>;
};

const SPECS: Spec[] = [
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
    riskClass: "READ",
    run: (a) => {
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
      // Bound the tool output (WebMCP guidance: keep results small); the UI shows all matches.
      const top = found.slice(0, 8);
      return {
        result: {
          count: found.length,
          showing: top.length,
          results: top.map((v) => ({
            id: v.id, title: title(v), price: v.price, miles: v.miles,
            titleClean: v.titleClean, valueDeltaPct: valueDelta(v), location: v.location,
          })),
        },
        detail: `${found.length} matches`,
      };
    },
  },
  {
    name: "get_vehicle_details",
    description:
      "Get full details for one vehicle by id: specs, mileage, title status, location, asking price, and fair-value delta. Opens the vehicle in the page.",
    inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
    annotations: { readOnlyHint: true },
    riskClass: "READ",
    run: (a) => {
      const v = find(a.vehicleId);
      if (!v) return notFound(a.vehicleId);
      S().select(v.id);
      return {
        result: {
          id: v.id, title: title(v), year: v.year, make: v.make, model: v.model, trim: v.trim,
          miles: v.miles, condition: v.condition, titleClean: v.titleClean, location: v.location,
          price: v.price, fairValue: fairValue(v), valueDeltaPct: valueDelta(v),
        },
        detail: title(v),
      };
    },
  },
  {
    name: "get_price_history",
    description:
      "Get the recent asking-price history for one vehicle by id (monthly points ending at the current price).",
    inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
    annotations: { readOnlyHint: true },
    riskClass: "READ",
    run: (a) => {
      const v = find(a.vehicleId);
      if (!v) return notFound(a.vehicleId);
      S().select(v.id);
      const history = priceHistory(v);
      return { result: { id: v.id, title: title(v), history }, detail: `${title(v)} · ${history.length} points` };
    },
  },
  {
    name: "estimate_fair_value",
    description:
      "Estimate the deterministic fair value of one vehicle by id and explain it line-by-line (base, age, mileage, condition, title, region). No LLM in the number.",
    inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
    annotations: { readOnlyHint: true },
    riskClass: "READ",
    run: (a) => {
      const v = find(a.vehicleId);
      if (!v) return notFound(a.vehicleId);
      S().select(v.id);
      const b = breakdown(v);
      return {
        result: { id: v.id, title: title(v), base: b.base, adjustments: b.lines, fairValue: b.fairValue, askingPrice: v.price, valueDeltaPct: valueDelta(v) },
        detail: `${title(v)} · fair value $${b.fairValue.toLocaleString()}`,
      };
    },
  },
  {
    name: "explain_deal",
    description:
      "Explain whether a vehicle is a good deal: a 0-100 deal score with a verdict (STRONG BUY / GOOD DEAL / FAIR / OVERPRICED), the discount vs fair value, and the reasons behind it.",
    inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
    annotations: { readOnlyHint: true },
    riskClass: "READ",
    run: (a) => {
      const v = find(a.vehicleId);
      if (!v) return notFound(a.vehicleId);
      S().select(v.id);
      const score = dealScore(v);
      const vd = verdict(score);
      const b = breakdown(v);
      const delta = valueDelta(v);
      return {
        result: {
          id: v.id, title: title(v), dealScore: score, verdict: vd, askingPrice: v.price,
          fairValue: b.fairValue, discountPct: delta,
          reasons: b.lines.filter((l) => l.delta !== 0).map((l) => `${l.label}: ${l.delta >= 0 ? "+" : "-"}$${Math.abs(l.delta).toLocaleString()}`),
        },
        detail: `${title(v)} · ${vd} (${deltaLabel(delta)})`,
      };
    },
  },
  {
    name: "compare_vehicles",
    description:
      "Compare 2-4 vehicles by id side by side: price, fair value, value delta, deal score, mileage, and title. Highlights the best value and shows the comparison in the page.",
    inputSchema: { type: "object", properties: { vehicleIds: { type: "array", items: { type: "string" } } }, required: ["vehicleIds"] },
    annotations: { readOnlyHint: true },
    riskClass: "READ",
    run: (a) => {
      const ids: string[] = Array.isArray(a.vehicleIds) ? a.vehicleIds.slice(0, 4) : [];
      const vs = ids.map(find).filter(Boolean) as Vehicle[];
      if (vs.length === 0) return { result: { error: "no valid vehicle ids" }, detail: "no valid ids" };
      S().setCompare(vs.map((v) => v.id));
      S().select(null);
      const rows = vs.map((v) => ({
        id: v.id, title: title(v), price: v.price, fairValue: fairValue(v),
        valueDeltaPct: valueDelta(v), dealScore: dealScore(v), miles: v.miles, titleClean: v.titleClean,
      }));
      const best = rows.reduce((x, y) => (y.dealScore > x.dealScore ? y : x));
      return {
        result: { count: rows.length, bestId: best.id, vehicles: rows },
        detail: `${rows.length} finalists · best: ${best.title} (${deltaLabel(best.valueDeltaPct)})`,
      };
    },
  },
  {
    name: "save_vehicle",
    description: "Save a vehicle to the user's saved list by id. Reversible.",
    inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
    riskClass: "WRITE",
    run: (a) => {
      const v = find(a.vehicleId);
      if (!v) return notFound(a.vehicleId);
      S().save(v.id);
      return { result: { id: v.id, saved: true }, detail: `saved ${title(v)}` };
    },
  },
  {
    name: "prepare_offer",
    description:
      "Draft an offer for a vehicle at a given amount (optional message). Does NOT send it — creates a draft the user can review before submitting.",
    inputSchema: {
      type: "object",
      properties: { vehicleId: { type: "string" }, amount: { type: "number" }, message: { type: "string" } },
      required: ["vehicleId", "amount"],
    },
    riskClass: "WRITE",
    run: (a) => {
      const v = find(a.vehicleId);
      if (!v) return notFound(a.vehicleId);
      if (typeof a.amount !== "number" || a.amount <= 0) {
        return { result: { error: "a positive amount is required" }, detail: "invalid amount" };
      }
      const offer = S().prepareOffer(v.id, a.amount, a.message);
      S().select(v.id);
      return {
        result: { offerId: offer.id, vehicleId: v.id, amount: offer.amount, status: "DRAFT" },
        detail: `draft offer $${a.amount.toLocaleString()} on ${title(v)}`,
      };
    },
  },
  {
    name: "submit_offer",
    description:
      "Requests submission of an offer to the seller. Requires explicit human approval in the page before any seller-facing action occurs; nothing is sent until the user approves.",
    inputSchema: {
      type: "object",
      properties: { vehicleId: { type: "string" }, amount: { type: "number" } },
      required: ["vehicleId"],
    },
    riskClass: "OUTREACH_FINANCIAL",
    run: (a) => {
      const v = find(a.vehicleId);
      if (!v) return notFound(a.vehicleId);
      const amount = typeof a.amount === "number" ? a.amount : S().getDraft(v.id)?.amount ?? 0;
      if (amount <= 0) {
        return { result: { error: "no amount — prepare an offer first or pass an amount" }, detail: "no amount" };
      }
      S().select(v.id);
      const summary = `Send a $${amount.toLocaleString()} offer to the seller of the ${title(v)}`;
      return {
        result: null,
        detail: `$${amount.toLocaleString()} offer on ${title(v)}`,
        approval: { vehicleId: v.id, amount, summary },
      };
    },
  },
];

export const TOOLS: ToolDef[] = SPECS.map((s) => ({
  name: s.name,
  description: s.description,
  inputSchema: s.inputSchema,
  annotations: s.annotations,
  execute: gate(s.name, s.riskClass, s.run),
}));

export const TOOL_META = SPECS.map((s) => ({
  name: s.name,
  description: s.description,
  readOnly: !!s.annotations?.readOnlyHint,
  riskClass: s.riskClass,
  decision: classify(s.riskClass),
}));

export async function registerAllTools(signal: AbortSignal): Promise<number> {
  let n = 0;
  for (const t of TOOLS) {
    if (await registerTool(t, signal)) n += 1;
  }
  return n;
}
