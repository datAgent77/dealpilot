"use client";

import { valueDelta, type Vehicle } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export function VehicleCard({ v }: { v: Vehicle }) {
  const select = useStore((s) => s.select);
  const toggleSave = useStore((s) => s.toggleSave);
  const saved = useStore((s) => s.saved.includes(v.id));
  const d = valueDelta(v);
  return (
    <div className="card" onClick={() => select(v.id)}>
      <div className="name">
        {v.year} {v.make} {v.model} <span className="trim">{v.trim}</span>
      </div>
      <div className="meta">
        {v.miles.toLocaleString()} mi · {v.condition} · {v.location}
      </div>
      <div className="price">${v.price.toLocaleString()}</div>
      <div className="badges">
        <span className={`badge ${d >= 0 ? "deal" : "over"}`}>
          {d >= 0 ? `${d}% below fair value` : `${Math.abs(d)}% above fair value`}
        </span>
        {!v.titleClean && <span className="badge salvage">salvage</span>}
      </div>
      <button
        className={`savebtn ${saved ? "on" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleSave(v.id);
        }}
      >
        {saved ? "★ Saved" : "☆ Save"}
      </button>
    </div>
  );
}
