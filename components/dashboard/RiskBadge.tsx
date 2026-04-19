import { Badge } from "@/components/ui/badge";
import type { RiskLevel } from "@/lib/risk-score";

export function RiskBadge(props: {
  level: RiskLevel;
  score: number;
}): JSX.Element {
  const variant =
    props.level === "HIGH"
      ? "danger"
      : props.level === "MEDIUM"
        ? "warning"
        : "success";
  const label =
    props.level === "HIGH"
      ? "Yüksek risk"
      : props.level === "MEDIUM"
        ? "Orta risk"
        : "Düşük risk";
  return (
    <div className="flex items-center gap-3">
      <Badge variant={variant}>
        {label} · {props.score} puan
      </Badge>
    </div>
  );
}
