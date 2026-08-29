"use client";

import { TOOL_META } from "@/lib/webmcp-tools";
import { RiskBadge } from "@/components/gate/RiskBadge";

export function ToolsPanel() {
  return (
    <aside className="panel">
      <h3>WebMCP · {TOOL_META.length} tools exposed</h3>
      <div className="tools-list">
        {TOOL_META.map((t) => (
          <div className="tool-row" key={t.name}>
            <span className="mono tname">{t.name}</span>
            <RiskBadge decision={t.decision} />
          </div>
        ))}
      </div>
    </aside>
  );
}
