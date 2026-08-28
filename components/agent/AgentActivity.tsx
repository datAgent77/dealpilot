"use client";

import { useStore } from "@/lib/store";

export function AgentActivity() {
  const activity = useStore((s) => s.activity);
  return (
    <aside className="panel">
      <h3>Agent activity</h3>
      <div className="log">
        {activity.length === 0 && (
          <div className="empty">No agent calls yet. Tool calls will appear here.</div>
        )}
        {activity.map((a) => (
          <div className="row" key={a.id}>
            <span className="tool">{a.tool}</span>
            <div className="detail-sm">{a.detail}</div>
            <div className="detail-sm ts">{a.ts}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
