"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { EmploymentStatus } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentTimeline } from "@/components/documents/DocumentTimeline";
import { WorkerDocumentsVaultBanner } from "@/components/workers/WorkerDocumentsVaultBanner";
import { WorkerDocumentChecklist } from "@/components/workers/WorkerDocumentChecklist";
import { RoleComplianceCard } from "@/components/workers/RoleComplianceCard";
import { SalaryVerificationCard } from "@/components/workers/SalaryVerificationCard";
import { WorkerHistoryTabPanel } from "@/components/workers/WorkerHistoryTabPanel";
import { WorkerComplianceTabPanel } from "@/components/workers/WorkerComplianceTabPanel";
import { UkLawComplianceTab } from "@/components/workers/UkLawComplianceTab";
import { WorkerProfileFieldRow } from "@/components/workers/WorkerProfileFieldRow";
import { useTranslation } from "@/contexts/LanguageContext";
import type { Locale } from "@/lib/i18n/types";
import { fetchWorkerDetail, fetchWorkerEngineRisk } from "@/lib/workers/detail";
import type {
  EngineRiskSnapshot,
  TenantUserOption,
  WorkerDetailPayload,
} from "@/lib/workers/types";
import { cn } from "@/lib/utils";

function formatLocaleDate(
  d: Date | string | null | undefined,
  locale: Locale
): string {
  if (!d) return "—";
  const tag = locale === "tr" ? "tr-TR" : "en-GB";
  return new Date(d).toLocaleDateString(tag);
}

function formatLocaleDateTime(
  d: Date | string | number,
  locale: Locale
): string {
  const tag = locale === "tr" ? "tr-TR" : "en-GB";
  return new Date(d).toLocaleString(tag);
}

export function WorkerDetailView(): JSX.Element {
  const { t, locale } = useTranslation();
  const fmt = (d: Date | string | null | undefined) => formatLocaleDate(d, locale);
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<WorkerDetailPayload | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadPending, setLoadPending] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantUserOption[]>([]);
  const [engineRisk, setEngineRisk] = useState<
    EngineRiskSnapshot | null | undefined
  >(undefined);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [editPersonalEmail, setEditPersonalEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWorkPhone, setEditWorkPhone] = useState("");
  const [editCurrentAddress, setEditCurrentAddress] = useState("");
  const [editEmergencyContact, setEditEmergencyContact] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editLineManagerName, setEditLineManagerName] = useState("");
  const [editLineManagerEmail, setEditLineManagerEmail] = useState("");
  const [editLineManagerId, setEditLineManagerId] = useState<string>("none");

  const load = useCallback(async (): Promise<void> => {
    setLoadPending(true);
    setLoadError(false);
    const result = await fetchWorkerDetail(id);
    setLoadPending(false);
    if (!result.ok) {
      setLoadError(true);
      setData(null);
      return;
    }
    setData(result.data);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      setEngineRisk(undefined);
      const risk = await fetchWorkerEngineRisk(id);
      setEngineRisk(risk);
    })();
  }, [id]);

  useEffect(() => {
    if (!editOpen) return;
    void (async () => {
      const res = await fetch("/api/tenant-users", { credentials: "include" });
      if (res.ok) {
        const j = (await res.json()) as { data: TenantUserOption[] };
        setTenantUsers(j.data);
      }
    })();
  }, [editOpen]);

  useEffect(() => {
    if (!data || !editOpen) return;
    setEditPersonalEmail(data.personalEmail ?? "");
    setEditPhone(data.phone ?? "");
    setEditWorkPhone(data.workPhone ?? "");
    setEditCurrentAddress(data.currentAddress ?? "");
    setEditEmergencyContact(data.emergencyContact ?? "");
    setEditEmergencyPhone(data.emergencyPhone ?? "");
    setEditLineManagerName(data.lineManagerName ?? "");
    setEditLineManagerEmail(data.lineManagerEmail ?? "");
    setEditLineManagerId(data.lineManagerId ?? "none");
  }, [data, editOpen]);

  async function saveProfileEdit(): Promise<void> {
    if (!data) return;
    setSaving(true);
    const res = await fetch(`/api/workers/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalEmail: editPersonalEmail.trim() || null,
        phone: editPhone.trim() || null,
        workPhone: editWorkPhone.trim() || null,
        currentAddress: editCurrentAddress.trim() || null,
        emergencyContact: editEmergencyContact.trim() || null,
        emergencyPhone: editEmergencyPhone.trim() || null,
        lineManagerName: editLineManagerName.trim() || null,
        lineManagerEmail: editLineManagerEmail.trim() || null,
        lineManagerId:
          editLineManagerId === "none" ? null : editLineManagerId,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(t("workerDetail.saveFailed"));
      return;
    }
    setSaveError(null);
    setEditOpen(false);
    void load();
  }

  async function terminate(): Promise<void> {
    if (!confirm(t("workerDetail.confirmTerminate"))) return;
    const res = await fetch(`/api/workers/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) void load();
  }

  if (loadPending && data === null) {
    return <WorkerProfileSkeleton />;
  }

  if (loadError && data === null) {
    return (
      <Card className="mx-auto max-w-lg border-danger-border bg-danger-muted/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-danger">
            {t("workerDetail.loadFailed")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            {t("workerDetail.loadErrorHint")}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void load()}
          >
            {t("workerDetail.retryLoad")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <p className="text-slate-600">{t("workerDetail.loadFailed")}</p>
    );
  }

  const riskVariant =
    data.riskSnapshot === "CRITICAL" || data.riskSnapshot === "HIGH"
      ? "danger"
      : data.riskSnapshot === "MEDIUM"
        ? "warning"
        : "success";

  const engineVariant =
    engineRisk &&
    (engineRisk.level === "CRITICAL" || engineRisk.level === "HIGH")
      ? "danger"
      : engineRisk && engineRisk.level === "MEDIUM"
        ? "warning"
        : "success";

  const statusVariant = employmentStatusVariant(data.employmentStatus);
  const initials =
    `${data.firstName?.[0] ?? ""}${data.lastName?.[0] ?? ""}`.toUpperCase() ||
    "?";

  const managerName = data.lineManager
    ? `${data.lineManager.firstName} ${data.lineManager.lastName}`
    : (data.lineManagerName ?? "—");
  const managerEmail = data.lineManager?.email ?? data.lineManagerEmail ?? "—";

  const tabTriggerClass =
    "shrink-0 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap sm:px-4 sm:py-2.5 sm:text-sm data-[state=active]:bg-brand-navy data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-slate-700 data-[state=inactive]:hover:text-brand-navy";

  const lastReviewLabel = data.roleCompliance?.lastReviewed
    ? formatLocaleDateTime(data.roleCompliance.lastReviewed, locale)
    : t("workerDetail.lastReviewedNone");
  const riskLoud =
    data.riskSnapshot === "HIGH" || data.riskSnapshot === "CRITICAL";

  return (
    <div className="space-y-5">
      <div className="relative -mx-4 md:-mx-8">
        <div
          className={cn(
            "sticky top-0 z-30 border-b border-slate-200/90 bg-brand-surface/95",
            "px-4 py-3 shadow-sm backdrop-blur-md md:px-8"
          )}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/workers"
              className="text-sm font-medium text-brand-navy hover:underline"
            >
              {t("workerDetail.backLink")}
            </Link>
            <nav
              className="flex flex-wrap items-center gap-2"
              aria-label={t("workerDetail.quickActions")}
            >
              <Button
                type="button"
                variant="default"
                size="sm"
                className="min-h-[2.5rem] min-w-[7rem] font-semibold sm:min-h-0"
                onClick={() => setEditOpen((v) => !v)}
              >
                {editOpen ? t("workerDetail.closeEdit") : t("workerDetail.edit")}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="min-h-[2.5rem] font-semibold sm:min-h-0"
                onClick={() => void terminate()}
              >
                {t("workerDetail.terminate")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-[2.5rem] sm:min-h-0"
                onClick={() => window.print()}
              >
                {t("workerDetail.generateReport")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-[2.5rem] sm:min-h-0"
                asChild
              >
                <Link href="/compliance/audit">{t("workerDetail.viewAudit")}</Link>
              </Button>
            </nav>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList
          className={cn(
            "flex h-auto w-full flex-row gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "rounded-xl border border-brand-navy/12 bg-white p-1.5 shadow-sm sm:flex-wrap sm:overflow-visible sm:pb-0"
          )}
        >
          <TabsTrigger value="overview" className={cn(tabTriggerClass, "snap-start")}>
            {t("workerDetail.tabOverview")}
          </TabsTrigger>
          <TabsTrigger value="documents" className={cn(tabTriggerClass, "snap-start")}>
            {t("workerDetail.tabDocuments")}
          </TabsTrigger>
          <TabsTrigger value="history" className={cn(tabTriggerClass, "snap-start")}>
            {t("workerDetail.tabHistory")}
          </TabsTrigger>
          <TabsTrigger value="compliance" className={cn(tabTriggerClass, "snap-start")}>
            {t("workerDetail.tabCompliance")}
          </TabsTrigger>
          <TabsTrigger value="uk-law" className={cn(tabTriggerClass, "snap-start")}>
            {t("workerDetail.tabUkLaw")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="overflow-hidden border-slate-200/90 shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:justify-between lg:gap-10">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div
                    className={cn(
                      "flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-navy/18 to-brand-navy/8 text-2xl font-bold tracking-tight text-brand-navy ring-[3px] ring-white shadow-md sm:h-28 sm:w-28 sm:text-3xl"
                    )}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <h1 className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl lg:text-3xl">
                        {data.firstName} {data.lastName}
                      </h1>
                      <p className="mt-1 text-sm text-slate-600">{data.email}</p>
                      <dl className="mt-4 flex flex-col gap-1 text-xs text-slate-600">
                        <div>
                          <dt className="inline font-semibold text-slate-700">
                            {t("workerDetail.lastReviewed")}:
                          </dt>{" "}
                          <dd className="inline">{lastReviewLabel}</dd>
                        </div>
                        {data.roleCompliance?.reviewedBy ? (
                          <div>
                            <dt className="inline font-semibold text-slate-700">
                              {t("workerDetail.reviewedBy")}:
                            </dt>{" "}
                            <dd className="inline font-mono text-[11px]">
                              {data.roleCompliance.reviewedBy}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusVariant} className="px-3 py-1">
                        {t(
                          `workerDetail.employment.${data.employmentStatus}`,
                          data.employmentStatus
                        )}
                      </Badge>
                      <Badge
                        variant={riskVariant}
                        className={cn(
                          "px-3 py-1",
                          riskLoud &&
                            "ring-2 ring-red-500/45 shadow-md uppercase tracking-wide"
                        )}
                      >
                        {t("workerDetail.risk")}: {data.riskSnapshot}
                      </Badge>
                      <Badge variant="outline" className="border-slate-300 px-3 py-1">
                        {t("workerDetail.registered")}:{" "}
                        {data.complianceRiskLevel}
                      </Badge>
                      {engineRisk ? (
                        <Badge variant={engineVariant} className="px-3 py-1">
                          {t("workerDetail.engine")}: {engineRisk.level} ·{" "}
                          {engineRisk.score} {t("workerDetail.points")}
                        </Badge>
                      ) : engineRisk === null ? (
                        <Badge variant="outline" className="px-3 py-1">
                          {t("workerDetail.engine")}:{" "}
                          {t("workerDetail.engineNone")}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                {engineRisk &&
                Array.isArray(engineRisk.factors) &&
                engineRisk.factors.length > 0 ? (
                  <div className="w-full shrink-0 rounded-xl border border-slate-100 bg-slate-50/80 p-4 lg:max-w-sm">
                    <details className="text-xs text-slate-700">
                      <summary className="cursor-pointer select-none font-semibold text-brand-navy">
                        {t("workerDetail.riskFactors")} (
                        {engineRisk.factors.length})
                      </summary>
                      <ul className="mt-3 list-inside list-disc space-y-1.5 marker:text-brand-navy/60">
                        {engineRisk.factors.map((raw, idx) => {
                          const f = raw as {
                            factor: string;
                            points: number;
                            description: string;
                          };
                          return (
                            <li key={`${f.factor}-${idx}`}>
                              <span className="font-medium">{f.factor}</span>{" "}
                              (+{f.points}): {f.description}
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <RoleComplianceCard workerId={id} />

          <SalaryVerificationCard workerId={id} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Card
              className={cn(
                "md:col-span-2 xl:col-span-6",
                "border-2 border-brand-navy/25 bg-gradient-to-br from-brand-navy/[0.07] via-white to-white shadow-lg ring-1 ring-brand-navy/10"
              )}
            >
              <CardHeader className="space-y-2 border-b border-brand-navy/10 bg-brand-navy/[0.035] pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="text-[11px]">
                    CoS
                  </Badge>
                  <CardTitle className="text-lg font-semibold text-brand-navy">
                    {t("workerDetail.cardCos")}
                  </CardTitle>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  {t("workerDetail.cosCardHint")}
                </p>
              </CardHeader>
              <CardContent className="grid gap-5 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldCosRef")}
                  value={data.cosReference ?? "—"}
                  mono
                />
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldAssignDate")}
                  value={fmt(data.cosAssignDate)}
                />
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldExpiryDate")}
                  value={fmt(data.cosExpiryDate)}
                />
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldVisaType")}
                  value={data.visaType ?? "—"}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200/90 shadow-sm md:col-span-2 xl:col-span-3">
              <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-3">
                <CardTitle className="text-base font-semibold text-brand-navy">
                  {t("workerDetail.cardEmployment")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldJobTitle")}
                  value={data.jobTitle ?? "—"}
                />
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldSoc")}
                  value={data.occupationCode ?? "—"}
                  mono
                />
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldSalary")}
                  value={String(data.salary ?? "—")}
                />
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldWorkLocation")}
                  value={data.workLocation ?? "—"}
                />
                <WorkerProfileFieldRow
                  className="sm:col-span-2"
                  label={t("workerDetail.fieldStartDate")}
                  value={fmt(data.employmentStartDate)}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200/90 shadow-sm md:col-span-2 xl:col-span-3">
              <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-3">
                <CardTitle className="text-base font-semibold text-brand-navy">
                  {t("workerDetail.cardLineManager")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 pt-6">
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldName")}
                  value={managerName}
                />
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldContactEmail")}
                  value={managerEmail}
                />
                <WorkerProfileFieldRow label={t("workerDetail.fieldPhone")} value="—" />
              </CardContent>
            </Card>

            <Card className="border-slate-200/90 shadow-sm md:col-span-2 xl:col-span-6">
              <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-3">
                <CardTitle className="text-base font-semibold text-brand-navy">
                  {t("workerDetail.cardContact")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 pt-6 sm:grid-cols-2 lg:grid-cols-3">
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldWorkEmail")}
                  value={data.email ?? "—"}
                />
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldPhone")}
                  value={data.phone ?? "—"}
                />
                <WorkerProfileFieldRow
                  label={t("workerDetail.fieldPersonalEmail")}
                  value={data.personalEmail ?? "—"}
                />
                <WorkerProfileFieldRow
                  className="sm:col-span-2 lg:col-span-3"
                  label={t("workerDetail.fieldCurrentAddress")}
                  value={data.currentAddress ?? "—"}
                />
                {data.emergencyContact || data.emergencyPhone ? (
                  <>
                    <WorkerProfileFieldRow
                      label={t("workerDetail.fieldEmergencyContact")}
                      value={data.emergencyContact ?? "—"}
                    />
                    <WorkerProfileFieldRow
                      label={t("workerDetail.fieldEmergencyPhone")}
                      value={data.emergencyPhone ?? "—"}
                    />
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {editOpen ? (
            <Card className="border-brand-navy/30">
              <CardHeader>
                <CardTitle className="text-base">{t("workerDetail.editProfile")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label>{t("workerDetail.lineManagerPick")}</Label>
                  <Select value={editLineManagerId} onValueChange={setEditLineManagerId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("workerDetail.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("workerDetail.none")}</SelectItem>
                      {tenantUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("workerDetail.labelLmNameFree")}</Label>
                  <Input
                    value={editLineManagerName}
                    onChange={(e) => setEditLineManagerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("workerDetail.labelLmEmail")}</Label>
                  <Input
                    value={editLineManagerEmail}
                    onChange={(e) => setEditLineManagerEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("workerDetail.fieldPersonalEmail")}</Label>
                  <Input
                    value={editPersonalEmail}
                    onChange={(e) => setEditPersonalEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("workerDetail.fieldPhone")}</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t("workerDetail.labelWorkPhone")}</Label>
                  <Input
                    value={editWorkPhone}
                    onChange={(e) => setEditWorkPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>{t("workerDetail.labelCurrentAddress")}</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editCurrentAddress}
                    onChange={(e) => setEditCurrentAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("workerDetail.fieldEmergencyContact")}</Label>
                  <Input
                    value={editEmergencyContact}
                    onChange={(e) => setEditEmergencyContact(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("workerDetail.fieldEmergencyPhone")}</Label>
                  <Input
                    value={editEmergencyPhone}
                    onChange={(e) => setEditEmergencyPhone(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  {saveError && (
                    <p role="alert" className="text-sm text-red-600">
                      {saveError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveProfileEdit()}
                    >
                      {saving ? t("workerDetail.saving") : t("common.save")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setEditOpen(false); setSaveError(null); }}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="documents" className="space-y-8">
          <WorkerDocumentsVaultBanner workerId={id} />

          <WorkerDocumentChecklist workerId={id} refreshKey={0} />

          <DocumentTimeline workerId={id} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <WorkerHistoryTabPanel workerId={id} data={data} onRefresh={() => void load()} />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <WorkerComplianceTabPanel
            workerId={id}
            data={data}
            onRefresh={() => void load()}
          />
        </TabsContent>

        <TabsContent value="uk-law" className="space-y-6">
          <UkLawComplianceTab workerId={id} defaultAnnualSalary={data.salary} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkerProfileSkeleton(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      className="space-y-5"
      aria-busy="true"
      aria-live="polite"
      aria-label={t("workerDetail.loading")}
    >
      <div className="-mx-4 flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:-mx-8 md:px-8">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-full lg:max-w-md" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    </div>
  );
}

function employmentStatusVariant(
  s: EmploymentStatus
): "success" | "warning" | "danger" {
  if (s === "ACTIVE") return "success";
  if (s === "TERMINATED") return "danger";
  return "warning";
}
