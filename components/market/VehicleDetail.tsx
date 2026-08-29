"use client";

import { VEHICLES } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { ValueBreakdown } from "./ValueBreakdown";
import { PriceHistory } from "./PriceHistory";
import { OfferSection } from "./OfferSection";

export function VehicleDetail({ id }: { id: string }) {
  const v = VEHICLES.find((x) => x.id === id);
  const select = useStore((s) => s.select);
  const toggleSave = useStore((s) => s.toggleSave);
  const saved = useStore((s) => s.saved.includes(id));
  if (!v) return null;
  return (
    <div className="detail">
      <button className="back" onClick={() => select(null)}>
        ← Back to results
      </button>
      <div className="detail-head">
        <div>
          <h2>
            {v.year} {v.make} {v.model} <span className="trim">{v.trim}</span>
          </h2>
          <div className="meta">
            {v.miles.toLocaleString()} mi · {v.condition} ·{" "}
            {v.titleClean ? "Clean title" : "Salvage title"} · {v.location}
          </div>
        </div>
        <button className={`savebtn ${saved ? "on" : ""}`} onClick={() => toggleSave(id)}>
          {saved ? "★ Saved" : "☆ Save"}
        </button>
      </div>
      <div className="detail-grid">
        <section className="panel">
          <h3>Fair value breakdown</h3>
          <ValueBreakdown v={v} />
        </section>
        <section className="panel">
          <h3>Price history</h3>
          <PriceHistory v={v} />
          <div className="offer-title">Make an offer</div>
          <OfferSection v={v} />
        </section>
      </div>
    </div>
  );
}
