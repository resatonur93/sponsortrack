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
      ? "border-slate-600 text-slate-200 hover:bg-slate-700"
      : "border-slate-200 text-slate-700 hover:bg-slate-50";

  const activeBtn =
    variant === "dark"
      ? "border-[#1E5BB5] bg-[#1E5BB5] text-white"
      : "border-brand-navy bg-brand-navy text-white";

  function pill(next: Locale): void {
    setLocale(next);
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border p-0.5 text-xs font-medium",
        variant === "dark"
          ? "border-slate-600 bg-slate-800/80"
          : "border-slate-200 bg-white",
        className
      )}
      role="group"
      aria-label={t("lang.label")}
    >
      <button
        type="button"
        onClick={() => pill("tr")}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          locale === "tr" ? activeBtn : baseBtn
        )}
      >
        {t("lang.tr")}
      </button>
      <button
        type="button"
        onClick={() => pill("en")}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          locale === "en" ? activeBtn : baseBtn
        )}
      >
        {t("lang.en")}
      </button>
    </div>
  );
}
