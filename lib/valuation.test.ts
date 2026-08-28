import { describe, expect, it } from "vitest";
import { breakdown, fairValue, type Vehicle } from "./valuation";

function veh(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "t", make: "Tesla", model: "Model 3", trim: "Long Range", year: 2021,
    price: 20000, miles: 40000, condition: "Good", titleClean: true,
    location: "San Jose, CA", region: "CA",
    ...overrides,
  };
}

describe("valuation.fairValue", () => {
  it("is deterministic", () => {
    expect(fairValue(veh())).toBe(fairValue(veh()));
  });

  it("decreases (or holds) as mileage increases", () => {
    const low = fairValue(veh({ miles: 20000 }));
    const mid = fairValue(veh({ miles: 60000 }));
    const high = fairValue(veh({ miles: 120000 }));
    expect(mid).toBeLessThanOrEqual(low);
    expect(high).toBeLessThanOrEqual(mid);
    expect(high).toBeLessThan(low); // meaningful gap
  });

  it("decreases as the car gets older", () => {
    const newer = fairValue(veh({ year: 2023 }));
    const older = fairValue(veh({ year: 2017 }));
    expect(older).toBeLessThan(newer);
  });

  it("penalizes a salvage title", () => {
    const clean = fairValue(veh({ titleClean: true }));
    const salvage = fairValue(veh({ titleClean: false }));
    expect(salvage).toBeLessThan(clean);
  });

  it("values Excellent above Fair condition", () => {
    expect(fairValue(veh({ condition: "Excellent" }))).toBeGreaterThan(
      fairValue(veh({ condition: "Fair" })),
    );
  });
});

describe("valuation.breakdown", () => {
  it("explains the number with labeled lines that reconcile to fairValue", () => {
    const b = breakdown(veh({ titleClean: false }));
    expect(b.lines.length).toBeGreaterThan(0);
    const summed = b.base + b.lines.reduce((s, l) => s + l.delta, 0);
    // fairValue is the summed pipeline, rounded to the nearest $50.
    expect(Math.abs(summed - b.fairValue)).toBeLessThanOrEqual(50);
    expect(b.lines.some((l) => l.label === "Salvage title")).toBe(true);
  });
});
