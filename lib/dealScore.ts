// Deterministic 0–100 deal score (internal helper — not exposed as a WebMCP tool; the agent
// gets the richer explain_deal instead). Combines discount-vs-fair-value, mileage, title, condition.

import { CURRENT_YEAR, fairValue, type Vehicle } from "./valuation";

export type Verdict = "STRONG BUY" | "GOOD DEAL" | "FAIR" | "OVERPRICED";

export function dealScore(v: Vehicle): number {
  const fv = fairValue(v);
  const discount = (fv - v.price) / fv; // >0 = priced below fair value
  let score = 50 + discount * 200; // 10% below fair value → +20

  const age = Math.max(1, CURRENT_YEAR - v.year);
  const expected = age * 11000;
  if (v.miles < expected * 0.8) score += 6;
  else if (v.miles > expected * 1.4) score -= 8;

  if (!v.titleClean) score -= 25;
  if (v.condition === "Excellent") score += 4;
  else if (v.condition === "Fair") score -= 6;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function verdict(score: number): Verdict {
  if (score >= 80) return "STRONG BUY";
  if (score >= 65) return "GOOD DEAL";
  if (score >= 45) return "FAIR";
  return "OVERPRICED";
}
