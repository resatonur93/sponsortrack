"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, ...props }: CalendarProps): JSX.Element {
  return (
    <DayPicker
      className={cn("rounded-lg border-0 p-2 text-brand-navy", className)}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
