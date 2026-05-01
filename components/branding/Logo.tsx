"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const VARIANT_SRC = {
  light: "/brand/logo-primary.svg",
  dark: "/brand/logo-dark.svg",
  monochrome: "/brand/logo-mono.svg",
} as const;

/** Display width presets — lockup SVG is wide; height drives scale */
const SIZE_PX = {
  sm: { className: "h-9 w-[148px]" as const },
  md: { className: "h-11 w-[188px]" as const },
  lg: { className: "h-14 w-[236px]" as const },
};

export type LogoProps = {
  variant?: keyof typeof VARIANT_SRC;
  size?: keyof typeof SIZE_PX;
  withWordmark?: boolean;
  className?: string;
  href?: string;
};

/** Official Sponsor Track lockup (SVG asset). Sizes match header / sidebar rails. */
export function Logo({
  variant = "light",
  size = "md",
  withWordmark: _withWordmark = true,
  className,
  href,
}: LogoProps): JSX.Element {
  const src = VARIANT_SRC[variant];
  const dim = SIZE_PX[size];

  const img = (
    <Image
      src={src}
      alt="Sponsor Track"
      width={260}
      height={52}
      priority={Boolean(href)}
      sizes="(max-width: 768px) 160px, 240px"
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
