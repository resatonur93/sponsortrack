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
  Worker,
  WorkerChangeLog,
} from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentTimeline } from "@/components/documents/DocumentTimeline";

type WorkerDetail = Worker & {
  documents: Document[];
  notifications: NotificationEvent[];
  changeLogs: WorkerChangeLog[];
  absences: AbsenceRecord[];
  rtwChecks: RightToWorkCheck[];
  riskSnapshot: ComplianceRiskLevel;
};

export default function WorkerDetailPage(): JSX.Element {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<WorkerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docRefresh, setDocRefresh] = useState(0);

  const load = useCallback(async (): Promise<void> => {
    const res = await fetch(`/api/workers/${id}`, { credentials: "include" });
    if (!res.ok) {
      setError("Yüklenemedi");
      return;
    }
    const json = (await res.json()) as { data: WorkerDetail };
    setData(json.data);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function terminate(): Promise<void> {
    if (!confirm("Sponsorluğu sonlandırmak istiyor musunuz?")) return;
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
        alert("Metadata geçerli JSON olmalı");
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

  if (error || !data) {
    return <p className="text-slate-600">{error ?? "Yükleniyor..."}</p>;
  }

  const riskBadge =
    data.riskSnapshot === "CRITICAL"
      ? "danger"
      : data.riskSnapshot === "HIGH"
        ? "danger"
        : data.riskSnapshot === "MEDIUM"
          ? "warning"
          : "success";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/workers" className="text-sm text-blue-900 hover:underline">
            ← Çalışanlar
          </Link>
          <h1 className="text-2xl font-bold text-blue-900">
            {data.firstName} {data.lastName}{" "}
            <Badge variant={riskBadge}>Risk: {data.riskSnapshot}</Badge>
          </h1>
          <p className="text-slate-600">
            {data.email}
            {data.personalEmail ? ` · ${data.personalEmail}` : ""}
          </p>
        </div>
        <Button variant="danger" type="button" onClick={() => void terminate()}>
          Sponsorluğu sonlandır
        </Button>
      </div>

      <Tabs defaultValue="master">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="master">Ana dosya</TabsTrigger>
          <TabsTrigger value="identity">Kimlik &amp; RTW</TabsTrigger>
          <TabsTrigger value="duties">İş tanımı / SOC</TabsTrigger>
          <TabsTrigger value="documents">Belge kasası</TabsTrigger>
          <TabsTrigger value="reporting">Raporlama (SMS)</TabsTrigger>
          <TabsTrigger value="timeline">Zaman çizelgesi</TabsTrigger>
          <TabsTrigger value="history">Geçmiş &amp; devamsızlık</TabsTrigger>
          <TabsTrigger value="compliance">Uyum</TabsTrigger>
        </TabsList>

        <TabsContent value="master" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CoS</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label="Referans" value={data.cosReference} />
                <Row
                  label="Atama"
                  value={fmt(data.cosAssignDate)}
                />
                <Row label="CoS bitiş" value={fmt(data.cosExpiryDate)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vize</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label="Tip" value={data.visaType} />
                <Row label="Başlangıç" value={fmt(data.visaStartDate)} />
                <Row label="Bitiş" value={fmt(data.visaExpiryDate)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">İstihdam</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label="Ünvan" value={data.jobTitle} />
                <Row label="SOC kodu" value={data.occupationCode} />
                <Row label="Maaş (GBP/yıl)" value={String(data.salary)} />
                <Row label="Çalışma yeri" value={data.workLocation} />
                <Row label="İşe başlama" value={fmt(data.employmentStartDate)} />
                <Row label="Sponsorluk başlangıç" value={fmt(data.sponsorshipStartDate)} />
                <div>
                  <p className="text-xs text-slate-500">Durum</p>
                  <Badge>{data.employmentStatus}</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Yönetici &amp; iletişim</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label="Line manager" value={data.lineManagerName ?? "—"} />
                <Row label="Manager e-posta" value={data.lineManagerEmail ?? "—"} />
                <Row label="İş e-posta" value={data.email} />
                <Row label="Kişisel e-posta" value={data.personalEmail ?? "—"} />
                <Row label="İş telefonu" value={data.workPhone ?? data.phone ?? "—"} />
                <Row
                  label="RTW son kontrol (özet)"
                  value={fmt(data.rightToWorkLastCheckedAt)}
                />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Kimlik &amp; göç (kayıtlı numaralar)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                <Row
                  label="Pasaport No"
                  value={data.passportNumber ?? "—"}
                />
                <Row label="BRP No" value={data.brpNumber ?? "—"} />
                <Row label="NI numarası" value={data.nationalInsuranceNumber ?? "—"} />
                <Row label="Uyruk" value={data.nationality} />
              </CardContent>
              <p className="border-t border-slate-100 px-6 pb-4 text-xs text-slate-500">
                eVisa / share code geçmişi için &quot;Kimlik &amp; RTW&quot; sekmesindeki
                belge listesi ve RTW kontrol kayıtlarına bakın.
              </p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="identity" className="space-y-6">
          <RtwSection workerId={id} data={data} onDone={() => void load()} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Pasaport / BRP / eVisa / share code belgeleri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {data.documents
                  .filter((d) =>
                    ["PASSPORT", "BRP", "EVISA", "SHARE_CODE", "VISA"].includes(
                      d.documentType
                    )
                  )
                  .map((d) => (
                    <li key={d.id} className="rounded border border-slate-100 p-2">
                      <strong>{d.documentType}</strong> · {d.fileName} ·{" "}
                      {new Date(d.uploadDate).toLocaleDateString("en-GB")}
                      {d.expiryDate
                        ? ` · bitiş ${new Date(d.expiryDate).toLocaleDateString("en-GB")}`
                        : ""}
                    </li>
                  ))}
                {data.documents.filter((d) =>
                  ["PASSPORT", "BRP", "EVISA", "SHARE_CODE", "VISA"].includes(
                    d.documentType
                  )
                ).length === 0 ? (
                  <li className="text-slate-500">Bu kategoride belge yok.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CoS / sözleşme iş tanımı</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {data.jobDescription ?? data.contractJobDescription ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sözleşme görevleri (ayrı)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {data.contractJobDescription ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fiili günlük görevler</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {data.actualDayToDayDuties ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SOC gerekçesi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {data.occupationCodeJustification ?? "—"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <form
            onSubmit={onUpload}
            className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-2"
          >
            <div>
              <Label>Belge adı</Label>
              <Input name="fileName" required placeholder="passport.pdf" />
            </div>
            <div>
              <Label>Belge tipi</Label>
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
              <Label>Klasör (vault)</Label>
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
              <Label>Metadata (JSON, isteğe bağlı)</Label>
              <textarea
                name="metadataJson"
                className="min-h-[72px] w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
                placeholder='{"number":"1234","expiryDate":"2030-01-01"}'
              />
            </div>
            <div className="flex items-end lg:col-span-2">
              <Button type="submit" disabled={uploading}>
                Yükle
              </Button>
            </div>
          </form>
          <DocumentTimeline key={docRefresh} workerId={id} />
        </TabsContent>

        <TabsContent value="reporting" className="space-y-3">
          <p className="text-sm text-slate-600">
            Her olay için rapor son tarihi, kanıt beklentisi ve SMS taslağı. Son hukuki
            kontrol kullanıcıya aittir.
          </p>
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
                  <strong>Olay / rapor:</strong>{" "}
                  {fmt(n.occurredAt)} → son tarih:{" "}
                  {fmt(n.reportDeadlineAt ?? n.dueDate)}
                </p>
                {n.evidenceRequired ? (
                  <p>
                    <strong>Kanıt:</strong> {n.evidenceRequired}
                  </p>
                ) : null}
                {n.smsDraft ? (
                  <div className="rounded bg-slate-50 p-3 font-mono text-xs">
                    {n.smsDraft}
                  </div>
                ) : null}
                {n.internalApprovalNote ? (
                  <p className="text-xs text-slate-500">{n.internalApprovalNote}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <p className="text-sm text-slate-600">
            Adres, maaş, rol, devamsızlık, belge yüklemeleri ve RTW kontrolleri tek
            kronolojide (en yeni üstte).
          </p>
          <UnifiedTimeline data={data} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <HistoryForms workerId={id} onDone={() => void load()} />
          <div>
            <h3 className="mb-2 font-semibold text-blue-900">Değişiklik geçmişi</h3>
            <ul className="space-y-2 text-sm">
              {data.changeLogs.map((c) => (
                <li key={c.id} className="rounded border border-slate-100 p-3">
                  <strong>{c.changeCategory}</strong> — {c.summary}
                  <div className="text-xs text-slate-500">
                    {new Date(c.createdAt).toLocaleString("en-GB")}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-blue-900">Devamsızlık</h3>
            <ul className="space-y-2 text-sm">
              {data.absences.map((a) => (
                <li key={a.id} className="rounded border border-slate-100 p-3">
                  {fmt(a.startDate)} — {a.endDate ? fmt(a.endDate) : "devam"}{" "}
                  · {a.absenceType ?? (a.isAuthorised ? "AUTHORISED" : "UNAUTHORISED")}
                  {a.consecutiveWorkingDays != null
                    ? ` · ardışık iş günü: ${a.consecutiveWorkingDays}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceChecklist status={data.employmentStatus} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
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
  type Entry = { t: number; title: string; detail: string };
  const rows: Entry[] = [];
  for (const c of props.data.changeLogs) {
    rows.push({
      t: new Date(c.createdAt).getTime(),
      title: `Değişiklik · ${c.changeCategory}`,
      detail: c.summary,
    });
  }
  for (const a of props.data.absences) {
    rows.push({
      t: new Date(a.startDate).getTime(),
      title:
        a.absenceType === "UNAUTHORISED" || (!a.absenceType && !a.isAuthorised)
          ? "Devamsızlık (izinsiz)"
          : `Devamsızlık (${a.absenceType ?? "—"})`,
      detail:
        a.notes ??
        `${fmt(a.startDate)} – ${a.endDate ? fmt(a.endDate) : "…"}`,
    });
  }
  for (const doc of props.data.documents) {
    rows.push({
      t: new Date(doc.uploadDate).getTime(),
      title: `Belge · ${doc.documentType}`,
      detail: doc.fileName,
    });
  }
  for (const r of props.data.rtwChecks) {
    rows.push({
      t: new Date(r.checkedAt).getTime(),
      title: `RTW · ${r.checkMethod}`,
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
            {new Date(r.t).toLocaleString("en-GB")}
          </p>
          <p className="font-medium text-slate-900">{r.title}</p>
          <p className="text-slate-700">{r.detail}</p>
        </li>
      ))}
      {rows.length === 0 ? (
        <li className="text-slate-500">Henüz kayıt yok.</li>
      ) : null}
    </ol>
  );
}

function RtwSection(props: {
  workerId: string;
  data: WorkerDetail;
  onDone: () => void;
}): JSX.Element {
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
        <CardTitle className="text-base">Right to work kontrol kayıtları</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3 text-sm">
          {(props.data.rtwChecks ?? []).map((r) => (
            <li key={r.id} className="rounded border border-slate-100 p-3">
              <div className="font-medium">
                {new Date(r.checkedAt).toLocaleString("en-GB")} · {r.checkMethod}
              </div>
              {r.shareCodeUsed ? (
                <div className="text-xs text-slate-600">
                  Share code: {r.shareCodeUsed}
                </div>
              ) : null}
              {r.outcomeSummary ? (
                <div className="mt-1 text-slate-700">{r.outcomeSummary}</div>
              ) : null}
              {r.nextCheckDueAt ? (
                <div className="text-xs text-slate-500">
                  Sonraki: {fmt(r.nextCheckDueAt)}
                </div>
              ) : null}
            </li>
          ))}
          {(props.data.rtwChecks ?? []).length === 0 ? (
            <li className="text-slate-500">Henüz RTW kaydı yok.</li>
          ) : null}
        </ul>
        <form onSubmit={submitRtw} className="grid gap-2 border-t border-slate-100 pt-4 text-sm">
          <Label>Yöntem</Label>
          <select
            name="checkMethod"
            required
            className="rounded border border-slate-300 p-2"
            defaultValue="ONLINE_SHARE_CODE"
          >
            <option value="ONLINE_SHARE_CODE">Online share code</option>
            <option value="MANUAL_DOCUMENT_CHECK">Manuel belge</option>
            <option value="EMPLOYER_PORTAL">İşveren portalı</option>
            <option value="RE_VERIFICATION">Yeniden doğrulama</option>
            <option value="OTHER">Diğer</option>
          </select>
          <Input name="shareCodeUsed" placeholder="Share code (varsa)" />
          <Input name="outcomeSummary" placeholder="Sonuç özeti" />
          <Input name="notes" placeholder="Not" />
          <div>
            <Label>Sonraki kontrol (tarih)</Label>
            <Input name="nextCheckDueAt" type="date" />
          </div>
          <Button type="submit" size="sm">
            RTW kaydı ekle
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

  async function addAbsence(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/workers/${props.workerId}/absences`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: fd.get("startDate"),
        endDate: fd.get("endDate") || null,
        absenceType: fd.get("absenceType"),
        notes: fd.get("notes") || null,
        approvedBy: fd.get("approvedBy") || null,
      }),
    });
    e.currentTarget.reset();
    props.onDone();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Değişiklik kaydı ekle</CardTitle>
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
            <Input name="summary" placeholder="Özet" required />
            <Input name="previousValue" placeholder="Eski (opsiyonel)" />
            <Input name="newValue" placeholder="Yeni (opsiyonel)" />
            <Button type="submit" size="sm">
              Kaydet
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Devamsızlık kaydı</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addAbsence} className="space-y-2 text-sm">
            <Input name="startDate" type="date" required />
            <Input name="endDate" type="date" />
            <select
              name="absenceType"
              className="w-full rounded border border-slate-300 p-2"
              defaultValue="UNAUTHORISED"
            >
              <option value="SICK">Hastalık</option>
              <option value="AUTHORISED">İzinli</option>
              <option value="UNAUTHORISED">İzinsiz</option>
            </select>
            <Input name="approvedBy" placeholder="Onaylayan (opsiyonel)" />
            <Input name="notes" placeholder="Not" />
            <Button type="submit" size="sm">
              Kaydet
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceChecklist(props: {
  status: EmploymentStatus;
}): JSX.Element {
  const items = [
    { ok: props.status === "ACTIVE", label: "İşe başlama / ACTIVE durumu" },
    { ok: true, label: "CoS ve vize tarihleri kayıtlı" },
    { ok: true, label: "Maaş ve SOC kodu tanımlı" },
  ];
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-sm">
          <span className={i.ok ? "text-emerald-600" : "text-amber-600"}>
            {i.ok ? "✓" : "○"}
          </span>
          {i.label}
        </li>
      ))}
    </ul>
  );
}
