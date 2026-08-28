// Deterministic synthetic price history for the sparkline (ends at the current asking price).

import { type Vehicle } from "./valuation";

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PricePoint = { label: string; price: number };

const MONTHS = ["-7mo", "-6mo", "-5mo", "-4mo", "-3mo", "-2mo", "-1mo", "now"];

export function priceHistory(v: Vehicle): PricePoint[] {
  let seed = 0;
  for (const c of v.id) seed = (seed * 31 + c.charCodeAt(0)) | 0;
  const rng = mulberry32(seed ^ v.price);
  const prices: number[] = [];
  let p = v.price * (1.04 + rng() * 0.08); // started a bit higher, drifts down toward now
  for (let i = 0; i < MONTHS.length; i++) {
    prices.push(Math.max(500, Math.round(p / 100) * 100));
    p += (rng() - 0.6) * v.price * 0.03;
  }
  prices[prices.length - 1] = v.price; // anchor the last point to the current price
  return prices.map((price, i) => ({ label: MONTHS[i], price }));
}
