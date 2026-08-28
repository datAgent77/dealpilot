import { breakdown, type Vehicle } from "@/lib/valuation";

export function ValueBreakdown({ v }: { v: Vehicle }) {
  const b = breakdown(v);
  const delta = Math.round(((b.fairValue - v.price) / b.fairValue) * 100);
  return (
    <div className="breakdown">
      <div className="bd-row">
        <span>Base value</span>
        <span className="mono">${b.base.toLocaleString()}</span>
      </div>
      {b.lines
        .filter((l) => l.delta !== 0)
        .map((l, i) => (
          <div className="bd-row sub" key={i}>
            <span>{l.label}</span>
            <span className={`mono ${l.delta >= 0 ? "pos" : "neg"}`}>
              {l.delta >= 0 ? "+" : "−"}${Math.abs(l.delta).toLocaleString()}
            </span>
          </div>
        ))}
      <div className="bd-row total">
        <span>Fair value</span>
        <span className="mono">${b.fairValue.toLocaleString()}</span>
      </div>
      <div className="bd-row asking">
        <span>Asking price</span>
        <span className="mono">${v.price.toLocaleString()}</span>
      </div>
      <div className={`bd-verdict ${delta >= 0 ? "deal" : "over"}`}>
        {delta >= 0 ? `${delta}% below fair value` : `${Math.abs(delta)}% above fair value`}
      </div>
    </div>
  );
}
