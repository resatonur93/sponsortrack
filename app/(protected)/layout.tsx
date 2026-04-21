import { ProtectedShell } from "@/components/layout/protected-shell";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return <ProtectedShell>{children}</ProtectedShell>;
}
