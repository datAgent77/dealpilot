"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { registerAllTools } from "@/lib/webmcp-tools";
import { invokeToolForTest } from "@/lib/webmcp-compat";
import { Filters } from "@/components/market/Filters";
import { VehicleGrid } from "@/components/market/VehicleGrid";
import { VehicleDetail } from "@/components/market/VehicleDetail";
import { CompareView } from "@/components/market/CompareView";
import { SavedList } from "@/components/market/SavedList";
import { AgentActivity } from "@/components/agent/AgentActivity";
import { ToolsPanel } from "@/components/agent/ToolsPanel";
import { ApprovalCard } from "@/components/gate/ApprovalCard";

export default function Home() {
  const selectedId = useStore((s) => s.selectedId);
  const compareIds = useStore((s) => s.compareIds);
  const webmcp = useStore((s) => s.webmcp);

  // Register all WebMCP tools (through the compat layer). They drive the SAME store the human uses.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let interval: ReturnType<typeof setInterval> | undefined;

    async function tryRegister(): Promise<boolean> {
      const n = await registerAllTools(signal);
      if (n > 0) {
        useStore.getState().setWebmcp("on");
        useStore.getState().logActivity({ tool: "system", detail: `${n} WebMCP tools registered` });
      }
      return n > 0;
    }

    void (async () => {
      (window as any).dealpilotInvoke = invokeToolForTest;
      (window as any).dealpilotStore = useStore; // dev/debug convenience
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
        “find the best Tesla under $22,000, no salvage, and rank the top three by value.”
      </p>

      <div className="grid">
        <div className="main">
          <ApprovalCard />
          {selectedId ? (
            <VehicleDetail id={selectedId} />
          ) : compareIds.length > 0 ? (
            <CompareView />
          ) : (
            <>
              <Filters />
              <VehicleGrid />
            </>
          )}
        </div>
        <div className="side">
          <ToolsPanel />
          <SavedList />
          <AgentActivity />
        </div>
      </div>
    </div>
  );
}
