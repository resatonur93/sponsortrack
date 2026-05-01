"use client";

import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/contexts/LanguageContext";

export function LanguageSwitcher({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}): JSX.Element {
  const { locale, setLocale, t } = useTranslation();

  const baseBtn =
    variant === "dark"
      ? "border-brand-navy/30 text-slate-200 hover:bg-brand-gold/15 hover:text-white"
      : "border-transparent text-brand-navy/80 hover:bg-brand-gold/20 hover:text-brand-navy";

  const activeBtn =
    variant === "dark"
      ? "border-brand-gold bg-brand-gold text-brand-navy shadow-sm"
      : "border-brand-navy bg-brand-navy text-white shadow-sm";

  function pill(next: Locale): void {
    setLocale(next);
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border p-0.5 text-xs font-semibold tracking-wide",
        variant === "dark"
          ? "border-brand-navy/40 bg-brand-navy/40"
          : "border-brand-navy/15 bg-brand-surface",
        className
      )}
      role="group"
      aria-label={t("lang.label")}
    >
      <button
        type="button"
        onClick={() => pill("tr")}
        className={cn(
          "rounded-md px-2.5 py-1 transition-colors",
          locale === "tr" ? activeBtn : baseBtn
        )}
      >
        {t("lang.tr")}
      </button>
      <button
        type="button"
        onClick={() => pill("en")}
        className={cn(
          "rounded-md px-2.5 py-1 transition-colors",
          locale === "en" ? activeBtn : baseBtn
        )}
      >
        {t("lang.en")}
      </button>
    </div>
  );
}
