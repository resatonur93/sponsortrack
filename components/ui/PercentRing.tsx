"use client";

import { cn } from "@/lib/utils";

/** SVG ring showing 0–100% (conversion, compliance, etc.). */
export function PercentRing(props: {
  percent: number;
  className?: string;
  size?: number;
  stroke?: string;
  trackStroke?: string;
}): JSX.Element {
  const { percent, className, size = 88, stroke = "#0A2A5E", trackStroke = "rgba(10,42,94,0.12)" } = props;
  const r = (size / 2) * 0.72;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const dash = (clamped / 100) * c;
  const pad = (size - 2 * r) / 2 + r;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden viewBox={`0 0 ${size} ${size}`}>
        <circle cx={pad} cy={pad} r={r} fill="none" stroke={trackStroke} strokeWidth={size * 0.09} />
        <circle
          cx={pad}
          cy={pad}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={size * 0.09}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums leading-none text-brand-navy">{clamped}%</span>
      </div>
    </div>
  );
}
