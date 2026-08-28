// Deterministic vehicle catalog: a seeded generator (~120 vehicles) plus a few curated "hero"
// deals for the demo. Reproducible on every load so judging is stable. Asking prices are derived
// from the fair value with a spread, so some cars are genuine deals and some are overpriced.

import { fairValue, valueDelta, type Condition, type Vehicle } from "./valuation";

export type { Vehicle } from "./valuation";
export { valueDelta } from "./valuation";

// --- seeded PRNG (mulberry32) -------------------------------------------------
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MODELS: Array<{ make: string; model: string; trims: string[] }> = [
  { make: "Tesla", model: "Model 3", trims: ["Standard", "Long Range", "Performance"] },
  { make: "Tesla", model: "Model Y", trims: ["Long Range", "Performance"] },
  { make: "Toyota", model: "Camry", trims: ["LE", "SE", "XLE"] },
  { make: "Honda", model: "Civic", trims: ["LX", "Sport", "Touring"] },
  { make: "Ford", model: "Mustang", trims: ["EcoBoost", "GT"] },
  { make: "Honda", model: "Accord", trims: ["LX", "Sport", "Touring"] },
  { make: "Toyota", model: "Corolla", trims: ["L", "LE", "SE"] },
  { make: "Subaru", model: "Outback", trims: ["Base", "Premium", "Limited"] },
  { make: "Chevrolet", model: "Bolt", trims: ["LT", "Premier"] },
  { make: "BMW", model: "3 Series", trims: ["330i", "M340i"] },
];

const CITIES = [
  "San Jose, CA", "Oakland, CA", "Fremont, CA", "San Mateo, CA", "Santa Clara, CA",
  "Sunnyvale, CA", "Palo Alto, CA", "Hayward, CA", "Berkeley, CA", "Mountain View, CA",
];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function round(n: number, to: number): number {
  return Math.round(n / to) * to;
}

// Curated hero deals (fixed) — clear, demo-friendly bargains. Prices set below fair value.
const HEROES: Omit<Vehicle, "price">[] = [
  { id: "h1", make: "Tesla", model: "Model 3", trim: "Long Range", year: 2021, miles: 41000, condition: "Excellent", titleClean: true, location: "San Jose, CA", region: "CA" },
  { id: "h2", make: "Tesla", model: "Model 3", trim: "Standard", year: 2020, miles: 52000, condition: "Good", titleClean: true, location: "Oakland, CA", region: "CA" },
  { id: "h3", make: "Toyota", model: "Camry", trim: "XLE", year: 2021, miles: 33000, condition: "Excellent", titleClean: true, location: "Fremont, CA", region: "CA" },
  { id: "h4", make: "Honda", model: "Civic", trim: "Sport", year: 2022, miles: 24000, condition: "Excellent", titleClean: true, location: "Sunnyvale, CA", region: "CA" },
];

function buildCatalog(): Vehicle[] {
  const rng = mulberry32(20260826);
  const out: Vehicle[] = [];

  // Heroes first — price at ~13–16% below fair value.
  for (const h of HEROES) {
    const fv = fairValue({ ...h, price: 0 });
    const discount = 0.13 + rng() * 0.03;
    out.push({ ...h, price: round(fv * (1 - discount), 100) });
  }

  // Generated inventory.
  const N = 116;
  for (let i = 0; i < N; i++) {
    const m = pick(rng, MODELS);
    const trim = pick(rng, m.trims);
    const year = 2016 + Math.floor(rng() * 9); // 2016–2024
    const age = Math.max(1, 2026 - year);
    const expected = age * 11000;
    const miles = Math.max(1000, round(expected * (0.6 + rng() * 0.9), 1000));
    const r = rng();
    const condition: Condition = r < 0.25 ? "Excellent" : r < 0.8 ? "Good" : "Fair";
    const titleClean = rng() > 0.06;
    const location = pick(rng, CITIES);
    const base: Omit<Vehicle, "price"> = {
      id: `g${i}`, make: m.make, model: m.model, trim, year, miles,
      condition, titleClean, location, region: "CA",
    };
    const fv = fairValue({ ...base, price: 0 });
    const factor = 0.85 + rng() * 0.27; // -15% .. +12% around fair value
    out.push({ ...base, price: round(fv * factor, 100) });
  }

  return out;
}

export const VEHICLES: Vehicle[] = buildCatalog();

export type SearchArgs = {
  make?: string;
  model?: string;
  maxPrice?: number;
  maxMiles?: number;
  excludeSalvage?: boolean;
};

export function searchVehicles(args: SearchArgs): Vehicle[] {
  const make = args.make?.toLowerCase().trim();
  const model = args.model?.toLowerCase().trim();
  return VEHICLES.filter((v) => {
    if (make && !v.make.toLowerCase().includes(make)) return false;
    if (model && !v.model.toLowerCase().includes(model)) return false;
    if (args.maxPrice != null && v.price > args.maxPrice) return false;
    if (args.maxMiles != null && v.miles > args.maxMiles) return false;
    if (args.excludeSalvage && !v.titleClean) return false;
    return true;
  });
}
