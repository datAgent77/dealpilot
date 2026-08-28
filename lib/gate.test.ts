import { describe, expect, it } from "vitest";
import { classify, riskInfo, type RiskClass } from "./gate";

describe("action gate", () => {
  it("maps risk classes to the right decision", () => {
    expect(classify("READ")).toBe("AUTO");
    expect(classify("WRITE")).toBe("ALLOW");
    expect(classify("PII")).toBe("CONFIRM");
    expect(classify("OUTREACH_FINANCIAL")).toBe("APPROVAL");
  });

  it("assigns monotonically increasing risk scores", () => {
    const order: RiskClass[] = ["READ", "WRITE", "PII", "OUTREACH_FINANCIAL"];
    const scores = order.map((rc) => riskInfo(rc).score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });

  it("gives every class a human-readable reason", () => {
    for (const rc of ["READ", "WRITE", "PII", "OUTREACH_FINANCIAL"] as RiskClass[]) {
      expect(riskInfo(rc).reason.length).toBeGreaterThan(0);
    }
  });
});
