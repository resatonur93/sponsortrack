"use client";

import Link from "next/link";
import { useTranslation } from "@/contexts/LanguageContext";

export function SelfServicePortalBrand(): JSX.Element {
  const { t } = useTranslation();
  return (
    <Link href="/self-service/login" className="text-sm font-semibold text-brand-navy">
      {t("selfService.portal")}
    </Link>
  );
}
