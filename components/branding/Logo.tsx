"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Tek resmî marka varlığı (`public/logo-sponsor-track.png`). */
const LOGO_SRC = "/logo-sponsor-track.png";

export type LogoVariant = "light" | "dark" | "monochrome";

/** Display height-led; genişlik içerik oranına göre `w-auto` ile ayarlanır. */
const SIZE_PX = {
  sm: { className: "h-9 w-auto max-w-[120px]" as const },
  md: { className: "h-11 w-auto max-w-[150px]" as const },
  lg: { className: "h-14 w-auto max-w-[190px]" as const },
};

export type LogoProps = {
  /** Geriye dönük uyumluluk; tüm değerler aynı PNG’yi kullanır. */
  variant?: LogoVariant;
  size?: keyof typeof SIZE_PX;
  withWordmark?: boolean;
  className?: string;
  href?: string;
};

export function Logo({
  variant: _variant = "light",
  size = "md",
  withWordmark: _withWordmark = true,
  className,
  href,
}: LogoProps): JSX.Element {
  const dim = SIZE_PX[size];

  const img = (
    <Image
      src={LOGO_SRC}
      alt="Sponsor Track"
      width={512}
      height={512}
      priority={Boolean(href)}
      sizes="(max-width: 768px) 140px, 200px"
      className={cn(
        "object-contain object-left",
        dim.className,
        className
      )}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group/logo inline-flex max-w-full shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 rounded-sm"
      >
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
