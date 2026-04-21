import Link from "next/link";
import { DemoRequestForm } from "@/components/landing/DemoRequestForm";
import { Logo } from "@/components/branding/Logo";

export const dynamic = "force-dynamic";

export default function DemoPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Logo size="md" variant="light" />
          <Link href="/login" className="text-sm font-medium text-brand-royal underline">
            Giriş
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-2xl font-bold tracking-tight">Demo talep edin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          SponsorTrack ile sponsor uyum süreçlerinizi tek yerden yönetin. Formu doldurun,
          ekibimiz sizinle iletişime geçsin.
        </p>
        <div className="mt-8">
          <DemoRequestForm />
        </div>
      </main>
    </div>
  );
}
