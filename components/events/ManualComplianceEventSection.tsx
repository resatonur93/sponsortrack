"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import type { EventType } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/LanguageContext";
import { WorkerSearchCombobox } from "@/components/events/WorkerSearchCombobox";
import { MANUAL_EVENT_TYPE_GROUPS } from "@/lib/events/manual-event-type-groups";
import type { WorkerListItem } from "@/lib/workers/types";

type ManualForm = {
  workerId: string;
  eventType: EventType;
};

function eventTypeLabel(
  t: (key: string, fallback?: string) => string,
  et: EventType
): string {
  const k = `events.eventType.${et}`;
  const v = t(k, et);
  return v === k ? et.replace(/_/g, " ") : v;
}

type Props = {
  onCreated: () => void;
};

export function ManualComplianceEventSection(props: Props): JSX.Element {
  const { t } = useTranslation();
  const [selectedWorkerLabel, setSelectedWorkerLabel] = useState<string | null>(null);
  const form = useForm<ManualForm>({
    defaultValues: {
      workerId: "",
      eventType: "SALARY_REDUCTION",
    },
  });

  const { watch, setValue, control, handleSubmit, reset } = form;
  const workerId = watch("workerId");

  async function onSubmit(data: ManualForm): Promise<void> {
    if (!data.workerId.trim()) {
      alert(t("events.manualWorkerRequired"));
      return;
    }
    const res = await fetch("/api/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: data.workerId.trim(),
        eventType: data.eventType,
      }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      alert(j.error ?? t("events.manualCreateFallback"));
      return;
    }
    setSelectedWorkerLabel(null);
    reset({ workerId: "", eventType: "SALARY_REDUCTION" });
    props.onCreated();
  }

  return (
    <Card className="border-slate-200/90 shadow-md ring-1 ring-slate-100">
      <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
        <CardTitle className="text-lg text-brand-navy">{t("events.manualTitle")}</CardTitle>
        <CardDescription>{t("events.manualSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-12"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(onSubmit)();
          }}
        >
        <div className="space-y-2 sm:col-span-2 lg:col-span-6">
          <Label>{t("events.workerPick")}</Label>
          <WorkerSearchCombobox
            valueWorkerId={workerId}
            selectedLabel={selectedWorkerLabel}
            onSelect={(w: WorkerListItem) => {
              setValue("workerId", w.id, { shouldDirty: true });
              setSelectedWorkerLabel(
                `${w.firstName} ${w.lastName} · ${w.cosReference}`
              );
            }}
            onClear={() => {
              setValue("workerId", "", { shouldDirty: true });
              setSelectedWorkerLabel(null);
            }}
            placeholder={t("events.workerPickPlaceholder")}
            searchPlaceholder={t("events.workerSearchPlaceholder")}
            hintMinChars={t("events.workerSearchMin")}
            emptyHint={t("events.workerSearchEmpty")}
          />
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
          <Label>{t("events.type")}</Label>
          <Controller
            name="eventType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as EventType)}>
                <SelectTrigger className="h-11 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_EVENT_TYPE_GROUPS.map((g) => (
                    <SelectGroup key={g.labelKey}>
                      <SelectLabel>{t(g.labelKey)}</SelectLabel>
                      {g.types.map((et) => (
                        <SelectItem key={et} value={et}>
                          {eventTypeLabel(t, et)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-2">
          <Button
            type="submit"
            className="h-11 w-full min-w-[8rem] font-semibold shadow-sm"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? t("common.loading") : t("events.create")}
          </Button>
        </div>
        </form>
      </CardContent>
    </Card>
  );
}
