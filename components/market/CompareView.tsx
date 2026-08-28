"use client";

import type { ReactNode } from "react";
import { VEHICLES, valueDelta, type Vehicle } from "@/lib/catalog";
import { fairValue } from "@/lib/valuation";
import { dealScore, verdict } from "@/lib/dealScore";
import { useStore } from "@/lib/store";

const ROWS: { label: string; cell: (v: Vehicle) => ReactNode }[] = [
  { label: "Asking price", cell: (v) => `$${v.price.toLocaleString()}` },
  { label: "Fair value", cell: (v) => `$${fairValue(v).toLocaleString()}` },
  {
    label: "Value",
    cell: (v) => {
      const d = valueDelta(v);
      return <span className={d >= 0 ? "pos" : "neg"}>{d >= 0 ? `${d}% below` : `${Math.abs(d)}% above`}</span>;
    },
  },
  { label: "Deal score", cell: (v) => `${dealScore(v)}/100 · ${verdict(dealScore(v))}` },
  { label: "Mileage", cell: (v) => `${v.miles.toLocaleString()} mi` },
  { label: "Title", cell: (v) => (v.titleClean ? "Clean" : "Salvage") },
];

export function CompareView() {
  const compareIds = useStore((s) => s.compareIds);
  const setCompare = useStore((s) => s.setCompare);
  const select = useStore((s) => s.select);
  const vs = compareIds.map((id) => VEHICLES.find((v) => v.id === id)).filter(Boolean) as Vehicle[];
  if (vs.length === 0) return null;
  const best = vs.reduce((a, b) => (dealScore(b) > dealScore(a) ? b : a));

  return (
    <div className="compare">
      <div className="compare-head">
        <h2>Comparing {vs.length} vehicles</h2>
        <button className="back" onClick={() => setCompare([])}>
          ← Back to results
        </button>
      </div>
      <div className="compare-grid" style={{ gridTemplateColumns: `150px repeat(${vs.length}, 1fr)` }}>
        <div className="cc head" />
        {vs.map((v) => (
          <div
            className={`cc head ${v.id === best.id ? "best" : ""}`}
            key={v.id}
            onClick={() => select(v.id)}
          >
            <div>{v.year} {v.make} {v.model}</div>
            <div className="trim">{v.trim}</div>
            {v.id === best.id && <div className="beststar">★ best value</div>}
          </div>
        ))}
        {ROWS.map((r) => (
          <RowFragment key={r.label} label={r.label} vs={vs} best={best} cell={r.cell} />
        ))}
      </div>
    </div>
  );
}

function RowFragment({
  label,
  vs,
  best,
  cell,
}: {
  label: string;
  vs: Vehicle[];
  best: Vehicle;
  cell: (v: Vehicle) => ReactNode;
}) {
  return (
    <>
      <div className="cc label">{label}</div>
      {vs.map((v) => (
        <div className={`cc ${v.id === best.id ? "best" : ""}`} key={v.id}>
          {cell(v)}
        </div>
      ))}
    </>
  );
}
