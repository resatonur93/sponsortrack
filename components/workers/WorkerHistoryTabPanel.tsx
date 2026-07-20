"use client";

import { useMemo, useState } from "react";
import type { ChangeCategory } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/timeline/ActivityTimeline";
import { AbsenceTrackerPanel } from "@/components/workers/AbsenceTrackerPanel";
import { SupplementaryEmploymentPanel } from "@/components/workers/SupplementaryEmploymentPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { buildWorkerActivityTimelineEntries } from "@/lib/workers/history-timeline";
import type { WorkerDetailPayload } from "@/lib/workers/types";

/** Display order only; aligns with richer change log presets. */
const CHANGE_CATEGORY_OPTIONS: ChangeCategory[] = [
  "ADDRESS",
  "VISA",
  "CONTRACT",
  "SALARY",
  "ROLE_TITLE",
  "WORK_LOCATION",
  "CONTACT",
  "PHONE_EMAIL",
  "PROMOTION",
  "ABSENCE",
  "OTHER",
];

const innerTabTriggerClass =
  "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium sm:flex-initial data-[state=active]:bg-brand-navy data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-slate-600";

export function WorkerHistoryTabPanel(props: {
  workerId: string;
  data: WorkerDetailPayload;
  onRefresh: () => void;
}): JSX.Element {
  const { workerId, data, onRefresh } = props;
  const { t } = useTranslation();

  const innerTabsListClass =
    "flex h-auto w-full snap-x snap-mandatory flex-col gap-1 overflow-x-auto pb-1 rounded-xl border border-brand-navy/12 bg-white p-1.5 shadow-sm sm:flex-row sm:max-w-md sm:flex-nowrap sm:overflow-visible sm:pb-0";

  const entries = useMemo(
    () => buildWorkerActivityTimelineEntries(data),
    [data]
  );

  return (
    <Tabs defaultValue="summary" className="w-full space-y-6">
      <TabsList className={innerTabsListClass}>
        <TabsTrigger
          value="summary"
          className={cn(innerTabTriggerClass, "snap-start")}
        >
          {t("workerDetail.tabSummary")}
        </TabsTrigger>
        <TabsTrigger
          value="absence"
          className={cn(innerTabTriggerClass, "snap-start")}
        >
          {t("workerDetail.tabAbsence")}
        </TabsTrigger>
        <TabsTrigger
          value="supplementary-employment"
          className={cn(innerTabTriggerClass, "snap-start")}
        >
          {t("workerDetail.tabSupplementaryEmployment")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="summary" className="space-y-6">
        <WorkerChangeLogForm
          workerId={workerId}
          onSaved={() => onRefresh()}
          changeCategoryKeys={CHANGE_CATEGORY_OPTIONS}
        />
        <Card className="border-slate-200/90 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-brand-navy">
              {t("workerDetail.unifiedTimeline")}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed text-slate-600">
              {t("workerDetail.unifiedTimelineDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6 pt-0 sm:pb-8">
            <ActivityTimeline entries={entries} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="absence" className="space-y-4">
        <AbsenceTrackerPanel workerId={workerId} onChanged={() => onRefresh()} />
      </TabsContent>
      <TabsContent value="supplementary-employment" className="space-y-4">
        <SupplementaryEmploymentPanel workerId={workerId} onChanged={() => onRefresh()} />
      </TabsContent>
    </Tabs>
  );
}

function WorkerChangeLogForm(props: {
  workerId: string;
  changeCategoryKeys: ChangeCategory[];
  onSaved: () => void;
}): JSX.Element {
  const { workerId, changeCategoryKeys, onSaved } = props;
  const { t } = useTranslation();
  const [category, setCategory] = useState<ChangeCategory>("ADDRESS");

  async function addChange(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const summary = String(fd.get("summary") ?? "").trim();
    const effectiveRaw = String(fd.get("effectiveDate") ?? "").trim();

    await fetch(`/api/workers/${workerId}/change-logs`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        changeCategory: category,
        summary,
        previousValue: fd.get("previousValue") || null,
        newValue: fd.get("newValue") || null,
        effectiveDate: effectiveRaw || null,
      }),
    });
    e.currentTarget.reset();
    setCategory("ADDRESS");
    onSaved();
  }

  return (
    <Card className="overflow-hidden border-slate-200/90 shadow-md ring-1 ring-slate-200/60">
      <CardHeader className="border-b border-slate-100 bg-slate-50/70 pb-4">
        <CardTitle className="text-lg text-brand-navy">
          {t("workerDetail.addChangeLog")}
        </CardTitle>
        <CardDescription className="text-sm text-slate-600">
          {t("workerDetail.addChangeLogSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={(e) => void addChange(e)} className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor={`chg-cat-${workerId}`}>{t("workerDetail.labelChangeCategory")}</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ChangeCategory)}
              required
            >
              <SelectTrigger
                id={`chg-cat-${workerId}`}
                className="h-11 w-full border-slate-200 bg-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {changeCategoryKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`workerDetail.changeCategory.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`chg-sum-${workerId}`}>{t("workerDetail.labelChangeSummary")}</Label>
            <Input
              id={`chg-sum-${workerId}`}
              name="summary"
              placeholder={t("workerDetail.placeholderSummaryDetail")}
              className="h-11 border-slate-200"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`chg-prev-${workerId}`}>
                {t("workerDetail.labelPreviousValue")}
              </Label>
              <Input
                id={`chg-prev-${workerId}`}
                name="previousValue"
                placeholder={t("workerDetail.placeholderPreviousValue")}
                className="h-11 border-slate-200"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`chg-new-${workerId}`}>
                {t("workerDetail.labelNewValue")}
              </Label>
              <Input
                id={`chg-new-${workerId}`}
                name="newValue"
                placeholder={t("workerDetail.placeholderNewValue")}
                className="h-11 border-slate-200"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor={`chg-eff-${workerId}`}>
              {t("workerDetail.labelEffectiveDate")}
            </Label>
            <Input
              id={`chg-eff-${workerId}`}
              name="effectiveDate"
              type="date"
              className="h-11 border-slate-200"
            />
          </div>
          <Button type="submit" className="h-11 min-w-[8.5rem] px-8 font-semibold shadow-sm">
            {t("common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
