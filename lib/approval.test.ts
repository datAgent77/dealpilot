import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./store";
import { TOOLS } from "./webmcp-tools";

const tool = (n: string) => {
  const t = TOOLS.find((x) => x.name === n);
  if (!t) throw new Error(`missing tool ${n}`);
  return t;
};

function reset() {
  useStore.setState({ offers: [], approvals: [], saved: [], activity: [], _seq: 0, _act: 0 });
}

describe("action tools + human approval", () => {
  beforeEach(reset);

  it("save_vehicle adds to the saved list", async () => {
    await tool("save_vehicle").execute({ vehicleId: "h1" });
    expect(useStore.getState().saved).toContain("h1");
  });

  it("prepare_offer creates a DRAFT and sends nothing", async () => {
    await tool("prepare_offer").execute({ vehicleId: "h1", amount: 19000 });
    const { offers, approvals } = useStore.getState();
    expect(offers).toHaveLength(1);
    expect(offers[0].status).toBe("DRAFT");
    expect(approvals).toHaveLength(0);
  });

  it("submit_offer requires approval and does NOT send", async () => {
    const r: any = await tool("submit_offer").execute({ vehicleId: "h1", amount: 18500 });
    expect(r.status).toBe("AWAITING_HUMAN_APPROVAL");
    expect(r.approvalId).toBeTruthy();
    const st = useStore.getState();
    expect(st.approvals.find((a) => a.id === r.approvalId)?.status).toBe("PENDING");
    expect(st.offers.find((o) => o.status === "SENT")).toBeUndefined();
  });

  it("approval sends the offer exactly once (idempotent replay)", async () => {
    const r: any = await tool("submit_offer").execute({ vehicleId: "h1", amount: 18500 });
    useStore.getState().resolveApproval(r.approvalId, true);
    useStore.getState().resolveApproval(r.approvalId, true); // replay must not duplicate
    const sent = useStore.getState().offers.filter((o) => o.status === "SENT" && o.vehicleId === "h1");
    expect(sent).toHaveLength(1);
    expect(sent[0].ref).toBe(`demo_offer_${r.approvalId}`);
  });

  it("deny blocks the offer", async () => {
    const r: any = await tool("submit_offer").execute({ vehicleId: "h1", amount: 18500 });
    useStore.getState().resolveApproval(r.approvalId, false);
    const st = useStore.getState();
    expect(st.approvals.find((a) => a.id === r.approvalId)?.status).toBe("DENIED");
    expect(st.offers.find((o) => o.status === "SENT")).toBeUndefined();
  });
});
