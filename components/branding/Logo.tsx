import Link from "next/link";
import { cn } from "@/lib/utils";

const COLORS = {
  light: {
    s: "#1E5BB5",
    accent: "#0D9488",
    word: "#0F2B5B",
    trackWord: "#1E5BB5",
  },
  dark: {
    s: "#FFFFFF",
    accent: "#0D9488",
    word: "#FFFFFF",
    trackWord: "#60A5FA",
  },
  monochrome: {
    s: "#0F2B5B",
    accent: "#0F2B5B",
    word: "#0F2B5B",
    trackWord: "#0F2B5B",
  },
} as const;

const WIDTH: Record<"sm" | "md" | "lg", number> = {
  sm: 120,
  md: 160,
  lg: 200,
};

export type LogoProps = {
  variant?: "light" | "dark" | "monochrome";
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  className?: string;
  href?: string;
};

export function Logo({
  variant = "light",
  size = "md",
  withWordmark = true,
  className,
  href,
}: LogoProps): JSX.Element {
  const c = COLORS[variant];
  const w = WIDTH[size];
  const h = withWordmark ? Math.round(w * 0.2) : Math.round(w * 0.22);

  const svg = (
    <svg
      width={w}
      height={h}
      viewBox={withWordmark ? "0 0 200 40" : "0 0 44 36"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("logo-brand block max-w-full", className)}
      role="img"
      aria-label="SponsorTrack"
    >
      <title>SponsorTrack</title>
      <g className="logo-brand-icon transition-transform duration-300 ease-out group-hover/logo:translate-x-0.5">
        <path
          d={
            withWordmark
              ? "M8 8C8 5.79086 9.79086 4 12 4H20C22.2091 4 24 5.79086 24 8V12C24 14.2091 22.2091 16 20 16H12C9.79086 16 8 17.7909 8 20V24C8 26.2091 9.79086 28 12 28H20"
              : "M4 8C4 5.79086 5.79086 4 8 4H16C18.2091 4 20 5.79086 20 8V12C20 14.2091 18.2091 16 16 16H8C5.79086 16 4 17.7909 4 20V24C4 26.2091 5.79086 28 8 28H16"
          }
          stroke={c.s}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d={
            withWordmark
              ? "M20 28L28 28C30.2091 28 32 26.2091 32 24V20"
              : "M16 28L24 28C26.2091 28 28 26.2091 28 24V20"
          }
          stroke={c.accent}
          strokeWidth="3"
          strokeLinecap="round"
          className="logo-brand-track"
        />
        <path
          d={withWordmark ? "M28 16L32 20L40 12" : "M24 16L28 20L36 12"}
          stroke={c.accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={24}
          strokeDashoffset={24}
          className="animate-draw-check"
        />
      </g>
      {withWordmark ? (
        <text
          x="48"
          y="26"
          fontFamily="var(--font-inter), Inter, system-ui, sans-serif"
          fontSize="22"
          fontWeight="700"
          fill={c.word}
        >
          Sponsor
          <tspan fill={c.trackWord}>Track</tspan>
        </text>
      ) : null}
    </svg>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group/logo inline-flex min-w-[120px] items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal focus-visible:ring-offset-2"
      >
        {svg}
      </Link>
    );
  }

  return <span className="group/logo inline-flex min-w-[120px] items-center">{svg}</span>;
}
