// Full money-flow E2E: the scripted demo chain, driven through the real tool executes, asserting
// the governed outcome (offer sent exactly once, only after approval).

import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./store";
import { TOOLS } from "./webmcp-tools";

const tool = (n: string) => {
  const t = TOOLS.find((x) => x.name === n);
  if (!t) throw new Error(`missing tool ${n}`);
  return t;
};

function reset() {
  useStore.setState({
    offers: [], approvals: [], saved: [], activity: [], compareIds: [], selectedId: null, _seq: 0, _act: 0,
  });
}

describe("end-to-end money flow", () => {
  beforeEach(reset);

  it("search → explain → compare → prepare → submit → approve sends exactly once", async () => {
    // 1. research
    const s: any = await tool("search_vehicles").execute({ make: "Tesla", maxPrice: 22000, excludeSalvage: true });
    expect(s.count).toBeGreaterThan(0);
    const ids: string[] = s.results.slice(0, 3).map((r: any) => r.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);

    for (const id of ids) {
      const r: any = await tool("explain_deal").execute({ vehicleId: id });
      expect(typeof r.verdict).toBe("string");
    }

    // 2. compare → best pick
    const c: any = await tool("compare_vehicles").execute({ vehicleIds: ids });
    const best: string = c.bestId;
    expect(ids).toContain(best);

    // 3. prepare + submit (gated) — nothing sent yet
    await tool("prepare_offer").execute({ vehicleId: best, amount: 18500 });
    const sub: any = await tool("submit_offer").execute({ vehicleId: best, amount: 18500 });
    expect(sub.status).toBe("AWAITING_HUMAN_APPROVAL");
    expect(useStore.getState().offers.find((o) => o.status === "SENT")).toBeUndefined();

    // 4. human approves (twice — idempotent)
    useStore.getState().resolveApproval(sub.approvalId, true);
    useStore.getState().resolveApproval(sub.approvalId, true);

    const sent = useStore.getState().offers.filter((o) => o.status === "SENT");
    expect(sent).toHaveLength(1);
    expect(sent[0].vehicleId).toBe(best);
    expect(sent[0].ref).toBe(`demo_offer_${sub.approvalId}`);
  });

  it("a denied offer can be re-submitted and then approved (deny → re-try)", async () => {
    const first: any = await tool("submit_offer").execute({ vehicleId: "h1", amount: 18000 });
    useStore.getState().resolveApproval(first.approvalId, false);
    expect(useStore.getState().offers.find((o) => o.status === "SENT")).toBeUndefined();

    const second: any = await tool("submit_offer").execute({ vehicleId: "h1", amount: 18500 });
    expect(second.approvalId).not.toBe(first.approvalId);
    useStore.getState().resolveApproval(second.approvalId, true);
    expect(useStore.getState().offers.filter((o) => o.status === "SENT")).toHaveLength(1);
  });
});
