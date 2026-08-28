"use client";

import { useEffect } from "react";
import { searchVehicles, valueDelta, type SearchArgs } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { registerTool, invokeToolForTest } from "@/lib/webmcp-compat";
import { Filters } from "@/components/market/Filters";
import { VehicleGrid } from "@/components/market/VehicleGrid";
import { VehicleDetail } from "@/components/market/VehicleDetail";
import { SavedList } from "@/components/market/SavedList";
import { AgentActivity } from "@/components/agent/AgentActivity";

export default function Home() {
  const selectedId = useStore((s) => s.selectedId);
  const webmcp = useStore((s) => s.webmcp);

  // Register the WebMCP tool (through the compat layer). It drives the SAME store the human uses.
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
        const a = args ?? {};
        const st = useStore.getState();
        // Reflect the agent's search in the human UI (one shared surface).
        st.setFilter({
          make: a.make ?? "",
          model: a.model ?? "",
          maxPrice: a.maxPrice ?? null,
          maxMiles: a.maxMiles ?? null,
          excludeSalvage: !!a.excludeSalvage,
          query: "",
        });
        st.select(null);
        const found = searchVehicles(a);
        st.logActivity("search_vehicles", `${JSON.stringify(a)} → ${found.length} result(s)`);
        return {
          count: found.length,
          results: found.slice(0, 20).map((v) => ({
            id: v.id,
            title: `${v.year} ${v.make} ${v.model} ${v.trim}`,
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
        useStore.getState().setWebmcp("on");
        useStore.getState().logActivity("system", "WebMCP tool registered: search_vehicles");
      }
      return ok;
    }

    void (async () => {
      (window as any).dealpilotInvoke = invokeToolForTest;
      if (await tryRegister()) return;
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
          if (!ok && !document.modelContext) useStore.getState().setWebmcp("off");
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
        to understand the market.</strong> Browse it yourself — or ask your agent to
        “search for a Tesla Model 3 under $22,000, no salvage.”
      </p>

      <div className="grid">
        <div className="main">
          {selectedId ? (
            <VehicleDetail id={selectedId} />
          ) : (
            <>
              <Filters />
              <VehicleGrid />
            </>
          )}
        </div>
        <div className="side">
          <SavedList />
          <AgentActivity />
        </div>
      </div>
    </div>
  );
}
