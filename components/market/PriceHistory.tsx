import { priceHistory } from "@/lib/history";
import { type Vehicle } from "@/lib/valuation";

export function PriceHistory({ v }: { v: Vehicle }) {
  const pts = priceHistory(v);
  const prices = pts.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const w = 300;
  const h = 70;
  const pad = 8;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (w - 2 * pad);
  const y = (p: number) => h - pad - ((p - min) / Math.max(1, max - min)) * (h - 2 * pad);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
  const trendedDown = prices[0] >= prices[prices.length - 1];
  const color = trendedDown ? "var(--ok)" : "var(--warn)";
  return (
    <div className="sparkwrap">
      <svg width={w} height={h} className="spark" role="img" aria-label="price history">
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        <circle cx={x(pts.length - 1)} cy={y(prices[prices.length - 1])} r={3.5} fill={color} />
      </svg>
      <div className="sparklabels">
        <span>{pts[0].label}: ${prices[0].toLocaleString()}</span>
        <span>now: ${prices[prices.length - 1].toLocaleString()}</span>
      </div>
    </div>
  );
}
