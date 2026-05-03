"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { tr, enGB } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/types";

type Props = {
  id?: string;
  value?: string | null | undefined;
  onChange: (yyyyMmDd: string) => void;
  placeholder: string;
  disabled?: boolean;
  locale: Locale;
  className?: string;
  /** Takvimde gezinilebilecek en erken ay. Varsayılan: 80 yıl önce. */
  startMonth?: Date;
  /** Takvimde gezinilebilecek en son ay. Varsayılan: 10 yıl sonra. */
  endMonth?: Date;
};

export function FormDatePicker({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  locale,
  className,
  startMonth,
  endMonth,
}: Props): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const ln = locale === "tr" ? tr : enGB;

  const now = new Date();
  const resolvedStartMonth = startMonth ?? new Date(now.getFullYear() - 80, 0, 1);
  const resolvedEndMonth = endMonth ?? new Date(now.getFullYear() + 10, 11, 31);

  const selected = React.useMemo(() => {
    if (!value) return undefined;
    try {
      const d =
        typeof value === "string" && value.includes("T")
          ? parseISO(value)
          : parseISO(`${value}T12:00:00`);
      return isValid(d) ? d : undefined;
    } catch {
      return undefined;
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          type="button"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-start border-slate-300/95 bg-white text-left font-normal text-slate-900 hover:bg-slate-50",
            !selected && "text-slate-500",
            className
          )}
        >
          <CalendarIcon className="mr-3 h-4 w-4 shrink-0 text-brand-navy" aria-hidden />
          {selected ? format(selected, "PP", { locale: ln }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden bg-white p-0" align="start">
        <Calendar
          mode="single"
          required={false}
          locale={ln}
          captionLayout="dropdown"
          startMonth={resolvedStartMonth}
          endMonth={resolvedEndMonth}
          defaultMonth={selected ?? resolvedEndMonth}
          selected={selected}
          onSelect={(date) => {
            if (!date) {
              onChange("");
              return;
            }
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
