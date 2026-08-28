const CLASS: Record<string, string> = {
  AUTO: "g-auto",
  ALLOW: "g-allow",
  CONFIRM: "g-confirm",
  APPROVAL: "g-approval",
};

export function RiskBadge({ decision }: { decision?: string }) {
  if (!decision) return null;
  return <span className={`gbadge ${CLASS[decision] ?? ""}`}>{decision}</span>;
}
