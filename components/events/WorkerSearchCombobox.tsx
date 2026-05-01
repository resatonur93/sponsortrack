"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { WorkerListItem } from "@/lib/workers/types";

type Props = {
  valueWorkerId: string;
  selectedLabel?: string | null;
  onSelect: (worker: WorkerListItem) => void;
  onClear: () => void;
  placeholder: string;
  searchPlaceholder: string;
  hintMinChars: string;
  emptyHint: string;
};

function initials(w: WorkerListItem): string {
  const a = w.firstName?.[0] ?? "";
  const b = w.lastName?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

export function WorkerSearchCombobox(props: Props): JSX.Element {
  const {
    valueWorkerId,
    selectedLabel,
    onSelect,
    onClear,
    placeholder,
    searchPlaceholder,
    hintMinChars,
    emptyHint,
  } = props;

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<WorkerListItem[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 320);
    return () => window.clearTimeout(t);
  }, [q]);

  const fetchSearch = useCallback(async (term: string): Promise<void> => {
    setLoading(true);
    try {
      const url = `/api/workers?filter=all${term ? `&search=${encodeURIComponent(term)}` : ""}`;
      const res = await fetch(url, { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        setResults([]);
        return;
      }
      const json = (await res.json()) as { data: WorkerListItem[] };
      setResults(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounced.length >= 2) {
      void fetchSearch(debounced);
      return;
    }
    setResults([]);
    setLoading(false);
  }, [open, debounced, fetchSearch]);

  function pick(w: WorkerListItem): void {
    onSelect(w);
    setOpen(false);
    setQ("");
    setDebounced("");
  }

  const displayTrigger =
    selectedLabel ||
    placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-11 min-h-[2.75rem] w-full justify-between border-slate-200 bg-white px-3 text-left font-normal text-slate-900 hover:bg-slate-50",
            !valueWorkerId && "text-slate-500"
          )}
        >
          <span className="line-clamp-1">{displayTrigger}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(440px,var(--radix-popover-trigger-width))] p-3" align="start">
        <Input
          className="h-11 border-slate-200"
          placeholder={searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        {valueWorkerId ? (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="text-xs font-medium text-rose-600 hover:underline"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              ×
            </button>
          </div>
        ) : null}
        <div className="relative mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/80">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            </div>
          ) : debounced.length < 2 ? (
            <p className="px-3 py-8 text-center text-xs text-slate-500">{hintMinChars}</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-slate-500">{emptyHint}</p>
          ) : (
            <ul className="divide-y divide-slate-100/90 p-1" role="listbox">
              {results.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full gap-3 rounded-md px-2 py-2.5 text-left text-sm hover:bg-white",
                      w.id === valueWorkerId && "bg-white ring-1 ring-brand-navy/15"
                    )}
                    onClick={() => pick(w)}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-xs font-semibold text-brand-navy">
                      {initials(w)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-medium text-slate-900">
                        {w.firstName} {w.lastName}
                        {w.id === valueWorkerId ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                        ) : null}
                      </span>
                      <span className="line-clamp-1 block text-xs text-slate-600">{w.email}</span>
                      <span className="font-mono text-[11px] text-slate-500">{w.cosReference}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
