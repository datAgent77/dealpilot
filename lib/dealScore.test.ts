import { describe, expect, it } from "vitest";
import { dealScore, verdict } from "./dealScore";
import { fairValue, type Vehicle } from "./valuation";

function veh(overrides: Partial<Vehicle> = {}): Vehicle {
  const base: Vehicle = {
    id: "t", make: "Tesla", model: "Model 3", trim: "Long Range", year: 2021,
    price: 20000, miles: 40000, condition: "Good", titleClean: true,
    location: "San Jose, CA", region: "CA",
  };
  return { ...base, ...overrides };
}

// Price a vehicle at a given fraction of its fair value.
function atFraction(frac: number, overrides: Partial<Vehicle> = {}): Vehicle {
  const v = veh(overrides);
  return { ...v, price: Math.round(fairValue(v) * frac) };
}

describe("dealScore", () => {
  it("always returns 0..100", () => {
    for (const frac of [0.5, 0.8, 1.0, 1.3, 1.8]) {
      const s = dealScore(atFraction(frac));
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("scores a clear bargain higher than an overpriced car", () => {
    expect(dealScore(atFraction(0.82))).toBeGreaterThan(dealScore(atFraction(1.15)));
  });

  it("drops sharply for a salvage title", () => {
    const clean = dealScore(atFraction(0.9, { titleClean: true }));
    const salvage = dealScore(atFraction(0.9, { titleClean: false }));
    expect(clean - salvage).toBeGreaterThanOrEqual(20);
  });

  it("maps verdicts by band", () => {
    expect(verdict(85)).toBe("STRONG BUY");
    expect(verdict(70)).toBe("GOOD DEAL");
    expect(verdict(50)).toBe("FAIR");
    expect(verdict(30)).toBe("OVERPRICED");
  });
});
