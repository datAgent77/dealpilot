"use client";

import { useStore, visibleVehicles } from "@/lib/store";
import { VehicleCard } from "./VehicleCard";

export function VehicleGrid() {
  const filters = useStore((s) => s.filters);
  const list = visibleVehicles(filters);
  return (
    <>
      <div className="count">{list.length} vehicle(s)</div>
      {list.length === 0 ? (
        <div className="empty">No vehicles match these filters.</div>
      ) : (
        <div className="cards">
          {list.map((v) => (
            <VehicleCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </>
  );
}
