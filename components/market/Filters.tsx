"use client";

import { useStore } from "@/lib/store";

const MAKES = ["", "Tesla", "Toyota", "Honda", "Ford", "Subaru", "Chevrolet", "BMW"];

export function Filters() {
  const f = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const reset = useStore((s) => s.resetFilters);
  return (
    <div className="filters">
      <input
        className="f-q"
        placeholder="Search make / model / year…"
        value={f.query}
        onChange={(e) => setFilter({ query: e.target.value })}
      />
      <select value={f.make} onChange={(e) => setFilter({ make: e.target.value })}>
        {MAKES.map((m) => (
          <option key={m} value={m}>
            {m || "All makes"}
          </option>
        ))}
      </select>
      <input
        className="f-n"
        placeholder="Model"
        value={f.model}
        onChange={(e) => setFilter({ model: e.target.value })}
      />
      <input
        className="f-n"
        type="number"
        placeholder="Max $"
        value={f.maxPrice ?? ""}
        onChange={(e) => setFilter({ maxPrice: e.target.value ? Number(e.target.value) : null })}
      />
      <input
        className="f-n"
        type="number"
        placeholder="Max miles"
        value={f.maxMiles ?? ""}
        onChange={(e) => setFilter({ maxMiles: e.target.value ? Number(e.target.value) : null })}
      />
      <label className="f-chk">
        <input
          type="checkbox"
          checked={f.excludeSalvage}
          onChange={(e) => setFilter({ excludeSalvage: e.target.checked })}
        />
        Clean title only
      </label>
      <button className="f-reset" onClick={reset}>
        Reset
      </button>
    </div>
  );
}
