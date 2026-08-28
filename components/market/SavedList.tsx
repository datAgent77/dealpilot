"use client";

import { VEHICLES } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export function SavedList() {
  const saved = useStore((s) => s.saved);
  const select = useStore((s) => s.select);
  if (saved.length === 0) return null;
  const items = saved.map((id) => VEHICLES.find((v) => v.id === id)).filter(Boolean) as typeof VEHICLES;
  return (
    <aside className="panel">
      <h3>Saved ({items.length})</h3>
      <div className="saved-list">
        {items.map((v) => (
          <div className="saved-row" key={v.id} onClick={() => select(v.id)}>
            <span>
              {v.year} {v.make} {v.model}
            </span>
            <span className="mono">${v.price.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
