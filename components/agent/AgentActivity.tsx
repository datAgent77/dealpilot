"use client";

import { useStore } from "@/lib/store";

export function AgentActivity() {
  const activity = useStore((s) => s.activity);
  return (
    <aside className="panel">
      <h3>Agent research</h3>
      <div className="log">
        {activity.length === 0 && (
          <div className="empty">No agent calls yet — ask your agent to research a car.</div>
        )}
        {activity.map((a) => (
          <div className="row" key={a.id}>
            <div className="rline">
              {a.tool !== "system" && <span className="chk">✓</span>}
              <span className="tool">{a.tool}</span>
            </div>
            <div className="detail-sm">{a.detail}</div>
            <div className="detail-sm ts">{a.ts}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
