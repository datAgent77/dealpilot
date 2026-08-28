import { describe, expect, it } from "vitest";
import { TOOLS } from "./webmcp-tools";

function tool(name: string) {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`missing tool ${name}`);
  return t;
}

describe("webmcp read tools", () => {
  it("registers unique, read-only research tools with descriptions", () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const t of TOOLS) {
      expect(t.annotations?.readOnlyHint).toBe(true);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.description.length).toBeLessThanOrEqual(500);
    }
  });

  it("explain_deal returns a score, verdict, and reasons for a hero deal", async () => {
    const r: any = await tool("explain_deal").execute({ vehicleId: "h1" });
    expect(r.dealScore).toBeGreaterThanOrEqual(0);
    expect(r.dealScore).toBeLessThanOrEqual(100);
    expect(typeof r.verdict).toBe("string");
    expect(r.discountPct).toBeGreaterThan(0); // hero is priced below fair value
    expect(Array.isArray(r.reasons)).toBe(true);
  });

  it("estimate_fair_value explains the number with adjustment lines", async () => {
    const r: any = await tool("estimate_fair_value").execute({ vehicleId: "h1" });
    expect(r.fairValue).toBeGreaterThan(0);
    expect(Array.isArray(r.adjustments)).toBe(true);
    expect(r.adjustments.length).toBeGreaterThan(0);
  });

  it("compare_vehicles ranks a best pick", async () => {
    const r: any = await tool("compare_vehicles").execute({ vehicleIds: ["h1", "h2", "h3"] });
    expect(r.count).toBe(3);
    expect(r.vehicles).toHaveLength(3);
    expect(["h1", "h2", "h3"]).toContain(r.bestId);
  });

  it("fails safely on an unknown vehicle id", async () => {
    const r: any = await tool("get_vehicle_details").execute({ vehicleId: "does-not-exist" });
    expect(r.error).toBeTruthy();
  });
});
