// Deterministic, explainable fair-value engine. No LLM — every number is derived here and
// can be shown line-by-line via breakdown(). This is the lower-level module: it owns the
// Vehicle type; catalog.ts and dealScore.ts build on it.

export const CURRENT_YEAR = 2026;

export type Condition = "Excellent" | "Good" | "Fair";

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  price: number; // asking price
  miles: number;
  condition: Condition;
  titleClean: boolean;
  location: string; // "City, ST"
  region: string; // e.g. "CA"
};

// Reference "as-new" value per make+model (USD). Unknown → generic fallback.
const MODEL_BASE: Record<string, number> = {
  "Tesla Model 3": 42000,
  "Tesla Model Y": 48000,
  "Toyota Camry": 30000,
  "Honda Civic": 27000,
  "Ford Mustang": 38000,
  "Honda Accord": 31000,
  "Toyota Corolla": 24000,
  "Subaru Outback": 33000,
  "Chevrolet Bolt": 32000,
  "BMW 3 Series": 46000,
};

const TRIM_MULT: Record<string, number> = {
  Standard: 1.0, "Long Range": 1.14, Performance: 1.28,
  LE: 1.0, SE: 1.06, XLE: 1.14, L: 0.95,
  LX: 1.0, Sport: 1.08, Touring: 1.2,
  EcoBoost: 1.0, GT: 1.25,
  Base: 1.0, Premium: 1.12, Limited: 1.2,
  LT: 1.0, Premier: 1.12,
  "330i": 1.0, M340i: 1.35,
};

export function baseValue(v: Vehicle): number {
  const model = MODEL_BASE[`${v.make} ${v.model}`] ?? 30000;
  const trim = TRIM_MULT[v.trim] ?? 1;
  return Math.round(model * trim);
}

export type BreakdownLine = { label: string; delta: number };
export type Breakdown = { base: number; lines: BreakdownLine[]; fairValue: number };

// Deterministic pipeline: base → age → mileage (saturating) → condition → title → region.
export function breakdown(v: Vehicle): Breakdown {
  const base = baseValue(v);
  const lines: BreakdownLine[] = [];
  let val = base;

  const age = Math.max(0, CURRENT_YEAR - v.year);
  const ageDelta = Math.round(base * (Math.pow(0.88, age) - 1)); // ~12%/yr, compounding
  lines.push({ label: `Age (${age} yr)`, delta: ageDelta });
  val += ageDelta;

  // Mileage penalty relative to expected miles for the age; saturating.
  const expected = age * 11000;
  const excess = Math.max(0, v.miles - expected);
  const mileDelta = -Math.round(val * 0.18 * (1 - Math.exp(-excess / 60000)));
  lines.push({ label: `Mileage (${v.miles.toLocaleString()} mi)`, delta: mileDelta });
  val += mileDelta;

  const condFactor = v.condition === "Excellent" ? 0.04 : v.condition === "Fair" ? -0.07 : 0;
  const condDelta = Math.round(val * condFactor);
  if (condDelta !== 0) lines.push({ label: `Condition (${v.condition})`, delta: condDelta });
  val += condDelta;

  if (!v.titleClean) {
    const titleDelta = -Math.round(val * 0.3);
    lines.push({ label: "Salvage title", delta: titleDelta });
    val += titleDelta;
  }

  const regionFactor = v.region === "CA" ? 0.03 : 0;
  const regionDelta = Math.round(val * regionFactor);
  if (regionDelta !== 0) lines.push({ label: `Region (${v.region})`, delta: regionDelta });
  val += regionDelta;

  const fairValue = Math.max(500, Math.round(val / 50) * 50);
  return { base, lines, fairValue };
}

export function fairValue(v: Vehicle): number {
  return breakdown(v).fairValue;
}

// % below (positive) or above (negative) fair value — the deal signal.
export function valueDelta(v: Vehicle): number {
  const fv = fairValue(v);
  return Math.round(((fv - v.price) / fv) * 100);
}
