"use client";

import { useEffect, useRef, useState } from "react";
import {
  VEHICLES,
  searchVehicles,
  valueDelta,
  type Vehicle,
  type SearchArgs,
} from "@/lib/catalog";
import { registerTool, invokeToolForTest } from "@/lib/webmcp-compat";

type Activity = { id: number; tool: string; detail: string; ts: string };

export default function Home() {
  const [results, setResults] = useState<Vehicle[]>(VEHICLES);
  const [query, setQuery] = useState("");
  const [webmcp, setWebmcp] = useState<"checking" | "on" | "off">("checking");
  const [activity, setActivity] = useState<Activity[]>([]);
  const actId = useRef(0);

  function log(tool: string, detail: string) {
    actId.current += 1;
    setActivity((a) =>
      [{ id: actId.current, tool, detail, ts: new Date().toLocaleTimeString() }, ...a].slice(0, 20),
    );
  }

  // Human free-text search (same result set the agent tool produces).
  function onQuery(q: string) {
    setQuery(q);
    const t = q.toLowerCase().trim();
    setResults(
      !t
        ? VEHICLES
        : VEHICLES.filter((v) => `${v.make} ${v.model} ${v.year}`.toLowerCase().includes(t)),
    );
  }

  // Register the WebMCP tool (through the compat layer) so agents drive the same search.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let interval: ReturnType<typeof setInterval> | undefined;

    const searchTool = {
      name: "search_vehicles",
      description:
        "Search the used-car catalog by make, model, max price, max mileage, and title status. Returns matching vehicles with price and fair-value delta.",
      inputSchema: {
        type: "object",
        properties: {
          make: { type: "string" },
          model: { type: "string" },
          maxPrice: { type: "number" },
          maxMiles: { type: "number" },
          excludeSalvage: { type: "boolean" },
        },
        required: [],
      },
      annotations: { readOnlyHint: true },
      execute: async (args: SearchArgs) => {
        const found = searchVehicles(args ?? {});
        setResults(found); // the page visibly updates when the agent calls this
        log("search_vehicles", `${JSON.stringify(args ?? {})} → ${found.length} result(s)`);
        // Return a compact, serializable plain object (no MCP content-wrapper required).
        return {
          count: found.length,
          results: found.map((v) => ({
            id: v.id,
            title: `${v.year} ${v.make} ${v.model}`,
            price: v.price,
            miles: v.miles,
            titleClean: v.titleClean,
            valueDeltaPct: valueDelta(v),
            location: v.location,
          })),
        };
      },
    };

    async function tryRegister(): Promise<boolean> {
      const ok = await registerTool(searchTool, signal);
      if (ok) {
        setWebmcp("on");
        log("system", "WebMCP tool registered: search_vehicles");
      }
      return ok;
    }

    void (async () => {
      // Expose a console helper for manual testing: await dealpilotInvoke("search_vehicles", {...})
      (window as any).dealpilotInvoke = invokeToolForTest;

      if (await tryRegister()) return;
      // API may be injected slightly after load — retry briefly, then give up.
      let tries = 0;
      interval = setInterval(async () => {
        tries += 1;
        if (signal.aborted) {
          if (interval) clearInterval(interval);
          return;
        }
        const ok = await tryRegister();
        if (ok || tries > 6) {
          if (interval) clearInterval(interval);
          if (!ok && !document.modelContext) setWebmcp("off");
        }
      }, 500);
    })();

    return () => {
      if (interval) clearInterval(interval);
      controller.abort(new DOMException("component unmounted", "AbortError"));
    };
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <span aria-hidden style={{ fontSize: 22 }}>🚗</span>
          <div>
            <h1>DealPilot</h1>
            <div className="tag">agent-native vehicle marketplace</div>
          </div>
        </div>
        {webmcp === "on" && <span className="status on">✓ WebMCP detected — agents can use this page</span>}
        {webmcp === "off" && (
          <span className="status off">
            WebMCP not detected — enable chrome://flags/#enable-webmcp-testing or open in ChatGPT
          </span>
        )}
        {webmcp === "checking" && <span className="status">checking for WebMCP…</span>}
      </header>

      <p className="thesis">
        Traditional websites make agents navigate pages. <strong>DealPilot gives agents the tools
        to understand the market.</strong> Try it yourself below — or ask your agent to
        “search for a Tesla Model 3 under $22,000, no salvage.”
      </p>

      <div className="grid">
        <div>
          <div className="searchbar">
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search make / model / year…"
            />
          </div>
          <div className="count">{results.length} vehicle(s)</div>
          <div className="cards">
            {results.map((v) => {
              const d = valueDelta(v);
              return (
                <div className="card" key={v.id}>
                  <div className="name">
                    {v.year} {v.make} {v.model}
                  </div>
                  <div className="meta">
                    {v.miles.toLocaleString()} mi · {v.location}
                  </div>
                  <div className="price">${v.price.toLocaleString()}</div>
                  <span className={`badge ${d >= 0 ? "deal" : "over"}`}>
                    {d >= 0 ? `${d}% below fair value` : `${Math.abs(d)}% above fair value`}
                  </span>
                  {!v.titleClean && <span className="badge salvage">salvage</span>}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="panel">
          <h3>Agent activity</h3>
          <div className="log">
            {activity.length === 0 && (
              <div className="empty">No agent calls yet. Tool calls will appear here.</div>
            )}
            {activity.map((a) => (
              <div className="row" key={a.id}>
                <span className="tool">{a.tool}</span>
                <div className="detail">{a.detail}</div>
                <div className="detail" style={{ fontSize: 11 }}>{a.ts}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
