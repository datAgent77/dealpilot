// WebMCP contract tests — invariants that keep the tool surface correct and safe under judging.

import { beforeEach, describe, expect, it } from "vitest";
import { TOOLS, TOOL_META } from "./webmcp-tools";
import { registerTool } from "./webmcp-compat";
import { useStore } from "./store";

function reset() {
  useStore.setState({ offers: [], approvals: [], saved: [], activity: [], _seq: 0, _act: 0 });
}

describe("WebMCP contract", () => {
  beforeEach(reset);

  it("has unique tool names", () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every tool has a valid JSON Schema and a description <= 500 chars", () => {
    for (const t of TOOLS) {
      const s = t.inputSchema as any;
      expect(s.type).toBe("object");
      expect(typeof s.properties).toBe("object");
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.description.length).toBeLessThanOrEqual(500);
    }
  });

  it("read tools are read-only; action tools are not", () => {
    for (const m of TOOL_META) {
      if (m.riskClass === "READ") expect(m.readOnly).toBe(true);
      else expect(m.readOnly).toBe(false);
    }
  });

  it("handles malformed arguments without throwing", async () => {
    for (const t of TOOLS) {
      const r = await t.execute({});
      expect(r === null || typeof r === "object").toBe(true);
    }
  });

  it("submit_offer cannot bypass approval (never sends by itself)", async () => {
    const t = TOOLS.find((x) => x.name === "submit_offer")!;
    await t.execute({ vehicleId: "h1", amount: 18500 });
    expect(useStore.getState().offers.find((o) => o.status === "SENT")).toBeUndefined();
    expect(useStore.getState().approvals[0]?.status).toBe("PENDING");
  });

  it("a duplicate approval cannot duplicate an offer", async () => {
    const t = TOOLS.find((x) => x.name === "submit_offer")!;
    const r: any = await t.execute({ vehicleId: "h1", amount: 18500 });
    useStore.getState().resolveApproval(r.approvalId, true);
    useStore.getState().resolveApproval(r.approvalId, true);
    expect(useStore.getState().offers.filter((o) => o.status === "SENT")).toHaveLength(1);
  });

  it("registration is aborted-safe (no duplicate registration on unmount)", async () => {
    const calls: string[] = [];
    (globalThis as any).document = { modelContext: { registerTool: async (d: any) => { calls.push(d.name); } } };
    try {
      const live = new AbortController();
      const ok = await registerTool(
        { name: "t", description: "d", inputSchema: { type: "object", properties: {} }, execute: async () => ({}) } as any,
        live.signal,
      );
      expect(ok).toBe(true);
      expect(calls).toEqual(["t"]);

      const dead = new AbortController();
      dead.abort();
      const ok2 = await registerTool(
        { name: "t2", description: "d", inputSchema: { type: "object", properties: {} }, execute: async () => ({}) } as any,
        dead.signal,
      );
      expect(ok2).toBe(false);
      expect(calls).toEqual(["t"]); // aborted signal → t2 never registered
    } finally {
      delete (globalThis as any).document;
    }
  });
});
