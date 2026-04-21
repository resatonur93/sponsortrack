"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type {
  AbsenceRecord,
  ComplianceRiskLevel,
  Document,
  EmploymentStatus,
  NotificationEvent,
  RightToWorkCheck,
  RiskLevel,
  Worker,
  WorkerChangeLog,
} from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentTimeline } from "@/components/documents/DocumentTimeline";
import { WorkerDocumentChecklist } from "@/components/workers/WorkerDocumentChecklist";
import { RoleComplianceCard } from "@/components/workers/RoleComplianceCard";
import { SalaryVerificationCard } from "@/components/workers/SalaryVerificationCard";
import { AbsenceTrackerPanel } from "@/components/workers/AbsenceTrackerPanel";
import { UkLawComplianceTab } from "@/components/workers/UkLawComplianceTab";
import { useTranslation } from "@/contexts/LanguageContext";
import type { Locale } from "@/lib/i18n/types";

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

type LineManagerBrief = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
} | null;

type WorkerDetail = Worker & {
  lineManager: LineManagerBrief;
  documents: Document[];
  notifications: NotificationEvent[];
  changeLogs: WorkerChangeLog[];
  absences: AbsenceRecord[];
  rtwChecks: RightToWorkCheck[];
  riskSnapshot: ComplianceRiskLevel;
};

type TenantUserOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type EngineRiskRow = {
  id: string;
  score: number;
  level: RiskLevel;
  calculatedAt: string;
  factors: unknown;
};

export default function WorkerDetailPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const fmt = (d: Date | string | null | undefined) => formatLocaleDate(d, locale);
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<WorkerDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docRefresh, setDocRefresh] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantUserOption[]>([]);
  const [engineRisk, setEngineRisk] = useState<EngineRiskRow | null | undefined>(
    undefined
  );

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
    const res = await fetch(`/api/workers/${id}`, { credentials: "include" });
    if (!res.ok) {
      setLoadError(true);
      return;
    }
    const json = (await res.json()) as { data: WorkerDetail };
    setData(json.data);
    setLoadError(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/workers/${id}/risk-score`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        data: EngineRiskRow | null;
      };
      setEngineRisk(json.data ?? null);
    })();
  }, [id, load]);

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
      alert(t("workerDetail.saveFailed"));
      return;
    }
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

  async function onUpload(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fileName = String(fd.get("fileName") ?? "");
    const documentType = String(fd.get("documentType") ?? "PASSPORT");
    const vaultFolder = String(fd.get("vaultFolder") ?? "OTHER");
    if (!fileName) return;
    setUploading(true);
    const metaRaw = String(fd.get("metadataJson") ?? "").trim();
    let metadata: Record<string, unknown> | undefined;
    if (metaRaw) {
      try {
        metadata = JSON.parse(metaRaw) as Record<string, unknown>;
      } catch {
        alert(t("workerDetail.invalidJson"));
        setUploading(false);
        return;
      }
    }
    await fetch("/api/documents", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: id,
        documentType,
        vaultFolder,
        fileName,
        fileUrl: `placeholder://${encodeURIComponent(fileName)}`,
        metadata,
      }),
    });
    setUploading(false);
    e.currentTarget.reset();
    void load();
    setDocRefresh((x) => x + 1);
  }

  if (!data) {
    return (
      <p className="text-slate-600">
        {loadError ? t("workerDetail.loadFailed") : t("workerDetail.loading")}
      </p>
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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/workers" className="text-sm text-brand-navy hover:underline">
          {t("workerDetail.backLink")}
        </Link>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          <TabsTrigger value="overview" className="text-sm">
            {t("workerDetail.tabOverview")}
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-sm">
            {t("workerDetail.tabDocuments")}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-sm">
            {t("workerDetail.tabHistory")}
          </TabsTrigger>
          <TabsTrigger value="compliance" className="text-sm">
            {t("workerDetail.tabCompliance")}
          </TabsTrigger>
          <TabsTrigger value="uk-law" className="text-sm">
            {t("workerDetail.tabUkLaw")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="overflow-hidden border-slate-200">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
                  {initials}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-brand-navy sm:text-2xl">
                    {data.firstName} {data.lastName}
                  </h1>
                  <p className="text-sm text-slate-600">{data.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={statusVariant}>
                      {t(
                        `workerDetail.employment.${data.employmentStatus}`,
                        data.employmentStatus
                      )}
                    </Badge>
                    <Badge variant={riskVariant}>
                      {t("workerDetail.risk")}: {data.riskSnapshot}
                    </Badge>
                    <Badge variant="outline">
                      {t("workerDetail.registered")}: {data.complianceRiskLevel}
                    </Badge>
                    {engineRisk ? (
                      <Badge variant={engineVariant}>
                        {t("workerDetail.engine")}: {engineRisk.level} ·{" "}
                        {engineRisk.score} {t("workerDetail.points")}
                      </Badge>
                    ) : engineRisk === null ? (
                      <Badge variant="outline">
                        {t("workerDetail.engine")}: {t("workerDetail.engineNone")}
                      </Badge>
                    ) : null}
                  </div>
                  {engineRisk &&
                  Array.isArray(engineRisk.factors) &&
                  engineRisk.factors.length > 0 ? (
                    <details className="mt-2 text-xs text-slate-600">
                      <summary className="cursor-pointer text-brand-navy">
                        {t("workerDetail.riskFactors")} ({engineRisk.factors.length})
                      </summary>
                      <ul className="mt-2 list-inside list-disc space-y-1">
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
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <RoleComplianceCard workerId={id} />

          <SalaryVerificationCard workerId={id} />

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("workerDetail.cardCos")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label={t("workerDetail.fieldCosRef")} value={data.cosReference} />
                <Row label={t("workerDetail.fieldAssignDate")} value={fmt(data.cosAssignDate)} />
                <Row label={t("workerDetail.fieldExpiryDate")} value={fmt(data.cosExpiryDate)} />
                <Row label={t("workerDetail.fieldVisaType")} value={data.visaType} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("workerDetail.cardEmployment")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label={t("workerDetail.fieldJobTitle")} value={data.jobTitle} />
                <Row label={t("workerDetail.fieldSoc")} value={data.occupationCode} />
                <Row label={t("workerDetail.fieldSalary")} value={String(data.salary)} />
                <Row label={t("workerDetail.fieldWorkLocation")} value={data.workLocation} />
                <Row label={t("workerDetail.fieldStartDate")} value={fmt(data.employmentStartDate)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("workerDetail.cardLineManager")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label={t("workerDetail.fieldName")} value={managerName} />
                <Row label={t("workerDetail.fieldContactEmail")} value={managerEmail} />
                <Row label={t("workerDetail.fieldPhone")} value="—" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("workerDetail.cardContact")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label={t("workerDetail.fieldWorkEmail")} value={data.email} />
                <Row label={t("workerDetail.fieldPhone")} value={data.phone ?? "—"} />
                <Row label={t("workerDetail.fieldPersonalEmail")} value={data.personalEmail ?? "—"} />
                <Row label={t("workerDetail.fieldCurrentAddress")} value={data.currentAddress ?? "—"} />
                {data.emergencyContact || data.emergencyPhone ? (
                  <>
                    <Row
                      label={t("workerDetail.fieldEmergencyContact")}
                      value={data.emergencyContact ?? "—"}
                    />
                    <Row
                      label={t("workerDetail.fieldEmergencyPhone")}
                      value={data.emergencyPhone ?? "—"}
                    />
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("workerDetail.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen((v) => !v)}
              >
                {editOpen ? t("workerDetail.closeEdit") : t("workerDetail.edit")}
              </Button>
              <Button type="button" variant="danger" onClick={() => void terminate()}>
                {t("workerDetail.terminate")}
              </Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>
                {t("workerDetail.generateReport")}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/compliance/audit">{t("workerDetail.viewAudit")}</Link>
              </Button>
            </CardContent>
          </Card>

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
                <div className="flex gap-2 sm:col-span-2">
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
                    onClick={() => setEditOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <WorkerDocumentChecklist workerId={id} refreshKey={docRefresh} />

          <Card className="border-brand-navy/15 bg-slate-50/60">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {t("workerDetail.docsVaultTitle")}
                </p>
                <p className="text-xs text-slate-600">{t("workerDetail.docsVaultHint")}</p>
              </div>
              <Button size="sm" asChild>
                <Link href={`/workers/${id}/documents`}>{t("workerDetail.docsVaultBtn")}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("workerDetail.uploadNew")}</CardTitle>
              <p className="text-xs text-slate-600">{t("workerDetail.uploadHint")}</p>
            </CardHeader>
            <CardContent>
          <form
            onSubmit={onUpload}
            className="grid gap-3 lg:grid-cols-2"
          >
            <div>
              <Label>{t("workerDetail.labelFileName")}</Label>
              <Input name="fileName" required placeholder="ornek-pasaport.pdf" />
            </div>
            <div>
              <Label>{t("workerDetail.labelDocType")}</Label>
              <select
                name="documentType"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                defaultValue="PASSPORT"
              >
                {[
                  "PASSPORT",
                  "BRP",
                  "EVISA",
                  "SHARE_CODE",
                  "VISA",
                  "COS",
                  "ATAS_CERTIFICATE",
                  "NMC_REGISTRATION",
                  "VESSEL_ASSIGNMENT_LETTER",
                  "RIGHT_TO_WORK",
                  "EMPLOYMENT_CONTRACT",
                  "PROOF_OF_ADDRESS",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("workerDetail.labelVaultFolder")}</Label>
              <select
                name="vaultFolder"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                defaultValue="IDENTITY_IMMIGRATION"
              >
                {[
                  "IDENTITY_IMMIGRATION",
                  "RIGHT_TO_WORK",
                  "COS_APPLICATION",
                  "EMPLOYMENT_CONTRACT",
                  "PAYROLL_SALARY",
                  "ABSENCE_LEAVE",
                  "ADDRESS_CONTACT",
                  "ROLE_ORG_CHART",
                  "RECRUITMENT_VACANCY",
                  "REPORTING_SUBMISSIONS",
                  "COMPLIANCE_VISIT_PACK",
                  "OTHER",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <Label>{t("workerDetail.labelMetadata")}</Label>
              <textarea
                name="metadataJson"
                className="min-h-[72px] w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
                placeholder='{"number":"1234","expiryDate":"2030-01-01"}'
              />
            </div>
            <div className="flex items-end lg:col-span-2">
              <Button type="submit" disabled={uploading}>
                {uploading ? t("workerDetail.uploading") : t("workerDetail.upload")}
              </Button>
            </div>
          </form>
            </CardContent>
          </Card>
          <DocumentTimeline key={docRefresh} workerId={id} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Tabs defaultValue="summary" className="w-full space-y-4">
            <TabsList className="grid h-auto w-full max-w-md grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <TabsTrigger value="summary" className="text-sm">
                {t("workerDetail.tabSummary")}
              </TabsTrigger>
              <TabsTrigger value="absence" className="text-sm">
                {t("workerDetail.tabAbsence")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="space-y-6">
              <HistoryForms workerId={id} onDone={() => void load()} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("workerDetail.unifiedTimeline")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <UnifiedTimeline data={data} />
                </CardContent>
              </Card>
              <div>
                <h3 className="mb-2 font-semibold text-brand-navy">{t("workerDetail.changeLog")}</h3>
                <ul className="space-y-2 text-sm">
                  {data.changeLogs.map((c) => (
                    <li key={c.id} className="rounded border border-slate-100 p-3">
                      <strong>{c.changeCategory}</strong> — {c.summary}
                      <div className="text-xs text-slate-500">
                        {formatLocaleDateTime(c.createdAt, locale)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="absence">
              <AbsenceTrackerPanel workerId={id} onChanged={() => void load()} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("workerDetail.checklist")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ComplianceChecklist status={data.employmentStatus} />
            </CardContent>
          </Card>
          <RtwSection workerId={id} data={data} onDone={() => void load()} />
          <div>
            <h3 className="mb-2 font-semibold text-brand-navy">
              {t("workerDetail.notificationsReporting")}
            </h3>
            <p className="mb-3 text-sm text-slate-600">
              {t("workerDetail.notificationsReportingHint")}
            </p>
            <div className="space-y-3">
              {data.notifications.map((n) => (
                <Card key={n.id}>
                  <CardHeader className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-sm font-semibold">
                        {n.eventType}
                      </CardTitle>
                      <Badge variant={n.status === "OVERDUE" ? "danger" : "outline"}>
                        {n.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-700">
                    <p>
                      <strong>{t("workerDetail.eventReport")}:</strong>{" "}
                      {fmt(n.occurredAt)} → {t("workerDetail.deadline")}:{" "}
                      {fmt(n.reportDeadlineAt ?? n.dueDate)}
                    </p>
                    {n.evidenceRequired ? (
                      <p>
                        <strong>{t("workerDetail.evidence")}:</strong> {n.evidenceRequired}
                      </p>
                    ) : null}
                    {n.smsDraft ? (
                      <div className="rounded bg-slate-50 p-3 font-mono text-xs">
                        {n.smsDraft}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="uk-law" className="space-y-6">
          <UkLawComplianceTab workerId={id} defaultAnnualSalary={data.salary} />
        </TabsContent>
      </Tabs>
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

function Row(props: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-xs text-slate-500">{props.label}</p>
      <p className="font-medium">{props.value}</p>
    </div>
  );
}

function UnifiedTimeline(props: { data: WorkerDetail }): JSX.Element {
  const { t, locale } = useTranslation();
  type Entry = { t: number; title: string; detail: string };
  const rows: Entry[] = [];
  for (const c of props.data.changeLogs) {
    rows.push({
      t: new Date(c.createdAt).getTime(),
      title: `${t("workerDetail.changePrefix")} · ${c.changeCategory}`,
      detail: c.summary,
    });
  }
  for (const a of props.data.absences) {
    const start = formatLocaleDate(a.startDate, locale);
    const end = a.endDate ? formatLocaleDate(a.endDate, locale) : "…";
    rows.push({
      t: new Date(a.startDate).getTime(),
      title:
        a.type === "UNAUTHORISED"
          ? t("workerDetail.absenceUnauth")
          : t("workerDetail.absenceFmt").replace(
              "{type}",
              a.type.replace(/_/g, " ")
            ),
      detail: a.notes ?? `${start} – ${end}`,
    });
  }
  for (const doc of props.data.documents) {
    rows.push({
      t: new Date(doc.uploadDate).getTime(),
      title: `${t("workerDetail.docPrefix")} · ${doc.documentType}`,
      detail: doc.fileName,
    });
  }
  for (const r of props.data.rtwChecks) {
    rows.push({
      t: new Date(r.checkedAt).getTime(),
      title: `${t("workerDetail.rtwPrefix")} · ${r.checkMethod}`,
      detail:
        [r.outcomeSummary, r.shareCodeUsed, r.notes].filter(Boolean).join(" · ") ||
        "—",
    });
  }
  rows.sort((a, b) => b.t - a.t);
  return (
    <ol className="space-y-3 border-l-2 border-blue-200 pl-4">
      {rows.map((r, i) => (
        <li key={`${r.t}-${i}`} className="text-sm">
          <p className="text-xs text-slate-500">
            {formatLocaleDateTime(r.t, locale)}
          </p>
          <p className="font-medium text-slate-900">{r.title}</p>
          <p className="text-slate-700">{r.detail}</p>
        </li>
      ))}
      {rows.length === 0 ? (
        <li className="text-slate-500">{t("workerDetail.timelineEmpty")}</li>
      ) : null}
    </ol>
  );
}

function RtwSection(props: {
  workerId: string;
  data: WorkerDetail;
  onDone: () => void;
}): JSX.Element {
  const { t, locale } = useTranslation();
  async function submitRtw(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nextDue = String(fd.get("nextCheckDueAt") ?? "").trim();
    await fetch(`/api/workers/${props.workerId}/rtw-checks`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkMethod: fd.get("checkMethod"),
        outcomeSummary: fd.get("outcomeSummary") || null,
        shareCodeUsed: fd.get("shareCodeUsed") || null,
        notes: fd.get("notes") || null,
        nextCheckDueAt: nextDue || null,
      }),
    });
    e.currentTarget.reset();
    props.onDone();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("workerDetail.rtwTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3 text-sm">
          {(props.data.rtwChecks ?? []).map((r) => (
            <li key={r.id} className="rounded border border-slate-100 p-3">
              <div className="font-medium">
                {formatLocaleDateTime(r.checkedAt, locale)} · {r.checkMethod}
              </div>
              {r.shareCodeUsed ? (
                <div className="text-xs text-slate-600">
                  {t("workerDetail.rtwShareCode")}: {r.shareCodeUsed}
                </div>
              ) : null}
              {r.outcomeSummary ? (
                <div className="mt-1 text-slate-700">{r.outcomeSummary}</div>
              ) : null}
              {r.nextCheckDueAt ? (
                <div className="text-xs text-slate-500">
                  {t("workerDetail.rtwNext")}:{" "}
                  {formatLocaleDate(r.nextCheckDueAt, locale)}
                </div>
              ) : null}
            </li>
          ))}
          {(props.data.rtwChecks ?? []).length === 0 ? (
            <li className="text-slate-500">{t("workerDetail.rtwEmpty")}</li>
          ) : null}
        </ul>
        <form onSubmit={submitRtw} className="grid gap-2 border-t border-slate-100 pt-4 text-sm">
          <Label>{t("workerDetail.rtwMethod")}</Label>
          <select
            name="checkMethod"
            required
            className="rounded border border-slate-300 p-2"
            defaultValue="ONLINE_SHARE_CODE"
          >
            <option value="ONLINE_SHARE_CODE">{t("workerDetail.rtwOptOnline")}</option>
            <option value="MANUAL_DOCUMENT_CHECK">{t("workerDetail.rtwOptManual")}</option>
            <option value="EMPLOYER_PORTAL">{t("workerDetail.rtwOptPortal")}</option>
            <option value="RE_VERIFICATION">{t("workerDetail.rtwOptReverify")}</option>
            <option value="OTHER">{t("workerDetail.rtwOptOther")}</option>
          </select>
          <Input
            name="shareCodeUsed"
            placeholder={t("workerDetail.rtwPlaceholderShare")}
          />
          <Input
            name="outcomeSummary"
            placeholder={t("workerDetail.rtwPlaceholderOutcome")}
          />
          <Input name="notes" placeholder={t("workerDetail.rtwPlaceholderNotes")} />
          <div>
            <Label>{t("workerDetail.rtwNextDue")}</Label>
            <Input name="nextCheckDueAt" type="date" />
          </div>
          <Button type="submit" size="sm">
            {t("workerDetail.rtwAdd")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function HistoryForms(props: {
  workerId: string;
  onDone: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  async function addChange(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/workers/${props.workerId}/change-logs`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        changeCategory: fd.get("changeCategory"),
        summary: fd.get("summary"),
        previousValue: fd.get("previousValue") || null,
        newValue: fd.get("newValue") || null,
      }),
    });
    e.currentTarget.reset();
    props.onDone();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("workerDetail.addChangeLog")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={addChange} className="space-y-2 text-sm">
          <select
            name="changeCategory"
            required
            className="w-full rounded border border-slate-300 p-2"
          >
            <option value="ADDRESS">ADDRESS</option>
            <option value="PHONE_EMAIL">PHONE_EMAIL</option>
            <option value="SALARY">SALARY</option>
            <option value="WORK_LOCATION">WORK_LOCATION</option>
            <option value="ROLE_TITLE">ROLE_TITLE</option>
            <option value="PROMOTION">PROMOTION</option>
            <option value="ABSENCE">ABSENCE</option>
            <option value="OTHER">OTHER</option>
          </select>
          <Input
            name="summary"
            placeholder={t("workerDetail.placeholderSummary")}
            required
          />
          <Input
            name="previousValue"
            placeholder={t("workerDetail.placeholderPrev")}
          />
          <Input name="newValue" placeholder={t("workerDetail.placeholderNew")} />
          <Button type="submit" size="sm">
            {t("common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ComplianceChecklist(props: {
  status: EmploymentStatus;
}): JSX.Element {
  const { t } = useTranslation();
  const items = [
    { ok: props.status === "ACTIVE", labelKey: "workerDetail.checkStart" },
    { ok: true, labelKey: "workerDetail.checkCosVisa" },
    { ok: true, labelKey: "workerDetail.checkSalarySoc" },
  ];
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.labelKey} className="flex items-center gap-2 text-sm">
          <span className={i.ok ? "text-emerald-600" : "text-amber-600"}>
            {i.ok ? "✓" : "○"}
          </span>
          {t(i.labelKey)}
        </li>
      ))}
    </ul>
  );
}
