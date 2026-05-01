"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyHint: string;
  pickFromTenant: string;
};

export function CosReferenceCombobox({
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyHint,
  pickFromTenant,
}: Props): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [list, setList] = React.useState<string[]>([]);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/workers/cos-references", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data: string[] };
      setList(json.data ?? []);
    })();
  }, []);

  const filtered = React.useMemo(() => {
    const s = q.trim().toUpperCase();
    if (!s) return list.slice(0, 40);
    return list.filter((r) => r.toUpperCase().includes(s)).slice(0, 40);
  }, [list, q]);

  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) =>
          onChange(e.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 32))
        }
        placeholder={placeholder}
        className="border-slate-300/95 font-mono text-sm uppercase tracking-wide"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full gap-2 sm:w-auto"
          >
            {pickFromTenant}
            <ChevronsUpDown className="h-4 w-4 opacity-60" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(360px,100vw)] p-3">
          <Input
            placeholder={searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mb-2"
          />
          <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-md border border-slate-100 bg-slate-50/80 p-1">
            {filtered.length === 0 ? (
              <li className="px-2 py-2 text-xs text-slate-500">{emptyHint}</li>
            ) : (
              filtered.map((r) => (
                <li key={r}>
                  <button
                    type="button"
                    className={cn(
                      "w-full cursor-pointer rounded-md px-2 py-1.5 text-left font-mono text-xs hover:bg-white",
                      r === value && "bg-white shadow-sm ring-1 ring-brand-navy/15"
                    )}
                    onClick={() => {
                      onChange(r);
                      setOpen(false);
                    }}
                  >
                    {r}
                  </button>
                </li>
              ))
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
