"use client";

import { VEHICLES, valueDelta } from "@/lib/catalog";
import { dealScore, verdict } from "@/lib/dealScore";
import { useStore } from "@/lib/store";

export function ApprovalCard() {
  const approvals = useStore((s) => s.approvals);
  const resolve = useStore((s) => s.resolveApproval);
  const pending = approvals.filter((a) => a.status === "PENDING");
  if (pending.length === 0) return null;
  return (
    <div className="approvals">
      {pending.map((a) => {
        const v = VEHICLES.find((x) => x.id === a.vehicleId);
        const d = v ? valueDelta(v) : 0;
        const score = v ? dealScore(v) : 0;
        return (
          <div className="approval-card" key={a.id}>
            <div className="ac-head">
              <span className="gbadge g-approval">HUMAN APPROVAL REQUIRED</span>
              <span className="ac-risk">Risk {a.riskScore} · financial + outreach to a real person</span>
            </div>
            <div className="ac-summary">{a.summary}</div>
            {v && (
              <div className="ac-context">
                {d >= 0 ? `${d}% below` : `${Math.abs(d)}% above`} fair value · deal score {score}/100 ({verdict(score)})
              </div>
            )}
            <div className="ac-actions">
              <button className="btn-approve" onClick={() => resolve(a.id, true)}>
                Approve ${a.amount.toLocaleString()}
              </button>
              <button className="btn-deny" onClick={() => resolve(a.id, false)}>
                Deny
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
