// The DealPilot Action Gate — a deterministic classifier (no LLM) that labels every WebMCP tool
// call by risk and decides whether it runs automatically or needs the human. It is a feature of
// the marketplace, not a separate security console. READ/WRITE run immediately; CONFIRM/APPROVAL
// branching (the submit_offer flow) lands in P05.

import { useStore } from "./store";
import type { ToolDef } from "./webmcp-compat";

export type RiskClass = "READ" | "WRITE" | "PII" | "OUTREACH_FINANCIAL";
export type Decision = "AUTO" | "ALLOW" | "CONFIRM" | "APPROVAL";

export function classify(rc: RiskClass): Decision {
  switch (rc) {
    case "READ":
      return "AUTO";
    case "WRITE":
      return "ALLOW";
    case "PII":
      return "CONFIRM";
    case "OUTREACH_FINANCIAL":
      return "APPROVAL";
  }
}

export type RiskInfo = { score: number; reason: string };

export function riskInfo(rc: RiskClass): RiskInfo {
  switch (rc) {
    case "READ":
      return { score: 8, reason: "read-only — no state change" };
    case "WRITE":
      return { score: 22, reason: "reversible change to your session" };
    case "PII":
      return { score: 55, reason: "shares personal data" };
    case "OUTREACH_FINANCIAL":
      return { score: 78, reason: "financial commitment + outreach to a real person" };
  }
}

export type ApprovalPayload = { vehicleId: string; amount: number; summary: string };
export type RunResult = { result: unknown; detail: string; approval?: ApprovalPayload };
export type Runner = (args: any) => RunResult | Promise<RunResult>;

// Wrap a tool's logic with the Action Gate. AUTO/ALLOW run immediately. When a tool is APPROVAL
// and its run produced an approval payload, the gate does NOT perform the side effect: it enqueues
// an approval, logs it, and returns immediately with AWAITING_HUMAN_APPROVAL — the agent stops. The
// human approves in the page (store.resolveApproval), which performs the action exactly once.
export function gate(name: string, riskClass: RiskClass, run: Runner): ToolDef["execute"] {
  return async (args: any) => {
    const decision = classify(riskClass);
    const { score } = riskInfo(riskClass);
    const out = await run(args ?? {});

    if (decision === "APPROVAL" && out.approval) {
      const approvalId = useStore.getState().createApproval({
        tool: name,
        vehicleId: out.approval.vehicleId,
        amount: out.approval.amount,
        summary: out.approval.summary,
        riskScore: score,
      });
      useStore.getState().logActivity({
        tool: name,
        detail: `awaiting approval — ${out.detail}`,
        riskClass,
        decision,
        riskScore: score,
      });
      return { status: "AWAITING_HUMAN_APPROVAL", approvalId, summary: out.approval.summary };
    }

    useStore.getState().logActivity({ tool: name, detail: out.detail, riskClass, decision, riskScore: score });
    return out.result;
  };
}
