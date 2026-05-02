"use client";

import Image from "next/image";
import Link from "next/link";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tam genişlik görsel (`public/logo-sponsor-track.png`). */
const LOGO_SRC = "/logo-sponsor-track.png";

export type LogoVariant = "light" | "dark" | "monochrome";

/** Görsel PNG yüksekliği (mark=full). */
const SIZE_PX = {
  sm: { className: "h-9 w-auto max-w-[120px]" as const },
  md: { className: "h-11 w-auto max-w-[150px]" as const },
  lg: { className: "h-14 w-auto max-w-[190px]" as const },
};

/** Kalkan + SponsorTrack (~180–200px; sidebar için). */
const COMPACT = {
  sm: { icon: "h-8 w-8", iconStroke: 2.25 as const, text: "text-sm" as const },
  md: { icon: "h-9 w-9", iconStroke: 2.35 as const, text: "text-[0.9375rem]" as const },
  lg: { icon: "h-9 w-9", iconStroke: 2.5 as const, text: "text-base" as const },
} as const;

const compactTone: Record<LogoVariant, { icon: string; text: string; iconHover: string }> = {
  light: {
    icon: "text-brand-navy",
    text: "text-brand-navy",
    iconHover: "group-hover/logo:text-brand-gold",
  },
  dark: {
    icon: "text-slate-100",
    text: "text-slate-50",
    iconHover: "group-hover/logo:text-brand-gold",
  },
  monochrome: {
    icon: "text-slate-700",
    text: "text-slate-900",
    iconHover: "group-hover/logo:text-brand-navy",
  },
};

export type LogoProps = {
  variant?: LogoVariant;
  size?: keyof typeof SIZE_PX;
  /** Varsayılan: tam PNG. `compact` = kalkan + SponsorTrack yazısı. */
  mark?: "full" | "compact";
  /** Geriye dönük uyumluluk — mark=compact iken kullanılmaz */
  withWordmark?: boolean;
  className?: string;
  href?: string;
};

function CompactMark({
  size,
  variant,
  className,
}: Pick<LogoProps, "size" | "variant" | "className"> &
  Pick<Required<LogoProps>, "variant" | "size">): JSX.Element {
  const s = COMPACT[size];
  const tone = compactTone[variant];

  return (
    <span
      className={cn(
        "inline-flex max-w-[200px] shrink-0 items-center gap-2.5 tracking-tight",
        className
      )}
    >
      <Shield
        className={cn(
          s.icon,
          "shrink-0 transition-[transform,color] duration-200 ease-out",
          "group-hover/logo:scale-110",
          tone.icon,
          tone.iconHover
        )}
        aria-hidden
        strokeWidth={s.iconStroke}
      />
      <span
        className={cn(
          "logo-wordmark truncate font-semibold leading-none antialiased transition-colors duration-200",
          s.text,
          tone.text,
          variant === "dark" &&
            "drop-shadow-[0_1px_0_rgba(0,0,0,0.12)]",
          variant === "light" && "font-bold tracking-[-0.02em]",
          variant === "dark" && "font-bold tracking-[-0.015em]",
          variant === "monochrome" && "font-bold"
        )}
      >
        SponsorTrack
      </span>
    </span>
  );
}

export function Logo({
  variant = "light",
  size = "md",
  mark = "full",
  withWordmark: _withWordmark = true,
  className,
  href,
}: LogoProps): JSX.Element {
  const linkClass =
    "group/logo inline-flex max-w-full shrink-0 items-center rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 md:focus-visible:ring-offset-2";

  if (mark === "compact") {
    const compact = (
      <CompactMark size={size} variant={variant} className={className} />
    );
    if (href) {
      return (
        <Link href={href} className={cn(linkClass, "max-w-[200px]", variant === "dark" && "focus-visible:ring-offset-brand-navy")}>
          {compact}
        </Link>
      );
    }
    return compact;
  }

  const dim = SIZE_PX[size];

  const img = (
    <Image
      src={LOGO_SRC}
      alt="Sponsor Track"
      width={512}
      height={512}
      priority={Boolean(href)}
      sizes="(max-width: 768px) 140px, 200px"
      className={cn("object-contain object-left", dim.className, className)}
    />
  );

  if (href) {
    return (
      <Link href={href} className={linkClass}>
        {img}
      </Link>
    );
  }

  return (
    <span className={cn("inline-flex max-w-full items-center", className)}>
      {img}
    </span>
  );
}
