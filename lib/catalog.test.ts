import { describe, expect, it } from "vitest";
import { VEHICLES, searchVehicles, valueDelta } from "./catalog";

describe("catalog", () => {
  it("has a stable inventory of 120 vehicles", () => {
    expect(VEHICLES.length).toBe(120);
  });

  it("gives every vehicle a positive asking price and a valid id", () => {
    for (const v of VEHICLES) {
      expect(v.price).toBeGreaterThan(0);
      expect(v.id).toBeTruthy();
    }
  });

  it("makes the curated hero cars genuine deals (priced below fair value)", () => {
    for (const id of ["h1", "h2", "h3", "h4"]) {
      const v = VEHICLES.find((x) => x.id === id)!;
      expect(valueDelta(v)).toBeGreaterThanOrEqual(8);
    }
  });

  it("filters correctly (Tesla under $22k, no salvage)", () => {
    const found = searchVehicles({ make: "Tesla", maxPrice: 22000, excludeSalvage: true });
    for (const v of found) {
      expect(v.make).toBe("Tesla");
      expect(v.price).toBeLessThanOrEqual(22000);
      expect(v.titleClean).toBe(true);
    }
  });
});
