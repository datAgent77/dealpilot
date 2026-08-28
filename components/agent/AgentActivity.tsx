"use client";

import { useStore } from "@/lib/store";
import { RiskBadge } from "@/components/gate/RiskBadge";

export function AgentActivity() {
  const activity = useStore((s) => s.activity);
  return (
    <aside className="panel">
      <h3>Agent activity</h3>
      <div className="gate-byline">
        DealPilot Action Gate — reads run automatically; actions need your approval.
      </div>
      <div className="log">
        {activity.length === 0 && (
          <div className="empty">No agent calls yet — ask your agent to research a car.</div>
        )}
        {activity.map((a) => (
          <div className="row" key={a.id}>
            <div className="rline">
              <span className="tool">{a.tool}</span>
              <RiskBadge decision={a.decision} />
            </div>
            <div className="detail-sm">{a.detail}</div>
            <div className="detail-sm ts">{a.ts}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
