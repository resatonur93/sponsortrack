"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { AlertLevel } from "@prisma/client";

export function AlertCountPill(): JSX.Element | null {
  const pathname = usePathname();
  const [state, setState] = useState<{
    unread: number;
    topLevel: AlertLevel | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/alerts?limit=0", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok || cancelled) return;
      const json = (await res.json()) as {
        meta?: {
          unreadCount?: number;
          byLevelUnread?: Partial<Record<AlertLevel, number>>;
        };
      };
      const by = json.meta?.byLevelUnread ?? {};
      const order: AlertLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
      let topLevel: AlertLevel | null = null;
      for (const lv of order) {
        if ((by[lv] ?? 0) > 0) {
          topLevel = lv;
          break;
        }
      }
      setState({
        unread: json.meta?.unreadCount ?? 0,
        topLevel,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (state === null || state.unread === 0) return null;

  const dot =
    state.topLevel === "CRITICAL" || state.topLevel === "HIGH"
      ? "bg-red-600"
      : state.topLevel === "MEDIUM"
        ? "bg-amber-400"
        : "bg-emerald-500";

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${dot}`}
        title={state.topLevel ?? ""}
        aria-hidden
      />
      <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-slate-800 px-1.5 text-[10px] font-bold text-white">
        {state.unread > 99 ? "99+" : state.unread}
      </span>
    </span>
  );
}

export function AlertLevelDot({
  level,
}: {
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}): JSX.Element {
  const color =
    level === "CRITICAL"
      ? "bg-red-600"
      : level === "HIGH"
        ? "bg-orange-500"
        : level === "MEDIUM"
          ? "bg-amber-400"
          : "bg-emerald-500";
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`}
      aria-hidden
    />
  );
}
