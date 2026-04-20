import { cn } from "@/lib/utils";

export type ComplianceScoreLevel = "LOW" | "MEDIUM" | "HIGH";

const scoreConfig: Record<
  ComplianceScoreLevel,
  { label: string; stroke: string; track: string; caption: string }
> = {
  LOW: {
    label: "Düşük risk",
    stroke: "#059669",
    track: "#D1FAE5",
    caption: "Uyum durumu iyi",
  },
  MEDIUM: {
    label: "Orta risk",
    stroke: "#D97706",
    track: "#FEF3C7",
    caption: "İzleme önerilir",
  },
  HIGH: {
    label: "Yüksek risk",
    stroke: "#E11D48",
    track: "#FFE4E6",
    caption: "Acil aksiyon",
  },
};

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function ComplianceScore(props: {
  score: ComplianceScoreLevel;
  points: number;
  className?: string;
}): JSX.Element {
  const cfg = scoreConfig[props.score];
  const pct = clampPct(props.points);
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - pct / 100);

  return (
    <div
      className={cn("flex items-center gap-4", props.className)}
      role="img"
      aria-label={`Uyum skoru ${props.score}, ${pct} puan`}
    >
      <div className="relative h-20 w-20 shrink-0">
        <svg className="-rotate-90" width="80" height="80" viewBox="0 0 80 80" aria-hidden>
          <circle cx="40" cy="40" r={r} fill="none" stroke={cfg.track} strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={cfg.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dash}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-brand-navy">
          {pct}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-brand-navy">{cfg.label}</p>
        <p className="text-xs text-brand-slate">{cfg.caption}</p>
      </div>
    </div>
  );
}
