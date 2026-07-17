import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SelfServicePortalBrand } from "@/components/self-service/SelfServicePortalBrand";

export const metadata: Metadata = {
  title: "Worker self-service",
};

export default function SelfServiceLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="min-h-screen bg-brand-surface">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <SelfServicePortalBrand />
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">{children}</main>
    </div>
  );
}
