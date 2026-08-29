"use client";

import { useStore } from "@/lib/store";

export function ApprovalCard() {
  const approvals = useStore((s) => s.approvals);
  const resolve = useStore((s) => s.resolveApproval);
  const pending = approvals.filter((a) => a.status === "PENDING");
  if (pending.length === 0) return null;
  return (
    <div className="approvals">
      {pending.map((a) => (
        <div className="approval-card" key={a.id}>
          <div className="ac-head">
            <span className="gbadge g-approval">HUMAN APPROVAL REQUIRED</span>
            <span className="ac-risk">Risk {a.riskScore} · financial + outreach to a real person</span>
          </div>
          <div className="ac-summary">{a.summary}</div>
          <div className="ac-actions">
            <button className="btn-approve" onClick={() => resolve(a.id, true)}>
              Approve ${a.amount.toLocaleString()}
            </button>
            <button className="btn-deny" onClick={() => resolve(a.id, false)}>
              Deny
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
