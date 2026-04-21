import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AdminLeadsLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
