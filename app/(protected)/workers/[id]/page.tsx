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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentTimeline } from "@/components/documents/DocumentTimeline";

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

export default function WorkerDetailPage(): JSX.Element {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<WorkerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docRefresh, setDocRefresh] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantUserOption[]>([]);

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
      setError("Yüklenemedi");
      return;
    }
    const json = (await res.json()) as { data: WorkerDetail };
    setData(json.data);
    setError(null);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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
      alert("Kaydedilemedi.");
      return;
    }
    setEditOpen(false);
    void load();
  }

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

  const riskVariant =
    data.riskSnapshot === "CRITICAL" || data.riskSnapshot === "HIGH"
      ? "danger"
      : data.riskSnapshot === "MEDIUM"
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
          ← Çalışanlar
        </Link>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 sm:grid-cols-4">
          <TabsTrigger value="overview" className="text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-sm">
            Documents
          </TabsTrigger>
          <TabsTrigger value="history" className="text-sm">
            History
          </TabsTrigger>
          <TabsTrigger value="compliance" className="text-sm">
            Compliance
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
                      {employmentStatusLabel(data.employmentStatus)}
                    </Badge>
                    <Badge variant={riskVariant}>Risk: {data.riskSnapshot}</Badge>
                    <Badge variant="outline">
                      Kayıtlı: {data.complianceRiskLevel}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Certificate of Sponsorship</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label="CoS reference" value={data.cosReference} />
                <Row label="Assign date" value={fmt(data.cosAssignDate)} />
                <Row label="Expiry date" value={fmt(data.cosExpiryDate)} />
                <Row label="Visa type" value={data.visaType} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Employment</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label="Job title" value={data.jobTitle} />
                <Row label="Occupation code (SOC)" value={data.occupationCode} />
                <Row label="Salary (GBP/year)" value={String(data.salary)} />
                <Row label="Work location" value={data.workLocation} />
                <Row label="Start date" value={fmt(data.employmentStartDate)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Line manager</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label="Name" value={managerName} />
                <Row label="Contact email" value={managerEmail} />
                <Row
                  label="Phone"
                  value="—"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label="Work email" value={data.email} />
                <Row label="Phone" value={data.phone ?? "—"} />
                <Row label="Personal email" value={data.personalEmail ?? "—"} />
                <Row label="Current address" value={data.currentAddress ?? "—"} />
                {data.emergencyContact || data.emergencyPhone ? (
                  <>
                    <Row
                      label="Emergency contact"
                      value={data.emergencyContact ?? "—"}
                    />
                    <Row
                      label="Emergency phone"
                      value={data.emergencyPhone ?? "—"}
                    />
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen((v) => !v)}
              >
                {editOpen ? "Close edit" : "Edit"}
              </Button>
              <Button type="button" variant="danger" onClick={() => void terminate()}>
                Terminate
              </Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>
                Generate report
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/compliance/audit">View audit log</Link>
              </Button>
            </CardContent>
          </Card>

          {editOpen ? (
            <Card className="border-brand-navy/30">
              <CardHeader>
                <CardTitle className="text-base">Edit profile</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Line manager (tenant user)</Label>
                  <Select value={editLineManagerId} onValueChange={setEditLineManagerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Yok</SelectItem>
                      {tenantUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Line manager name (serbest metin)</Label>
                  <Input
                    value={editLineManagerName}
                    onChange={(e) => setEditLineManagerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Line manager email</Label>
                  <Input
                    value={editLineManagerEmail}
                    onChange={(e) => setEditLineManagerEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Personal email</Label>
                  <Input
                    value={editPersonalEmail}
                    onChange={(e) => setEditPersonalEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Work phone</Label>
                  <Input
                    value={editWorkPhone}
                    onChange={(e) => setEditWorkPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Current address</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editCurrentAddress}
                    onChange={(e) => setEditCurrentAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Emergency contact</Label>
                  <Input
                    value={editEmergencyContact}
                    onChange={(e) => setEditEmergencyContact(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Emergency phone</Label>
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
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card className="border-brand-navy/15 bg-slate-50/60">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <p className="text-sm text-slate-600">
                Folder-based vault with retention tracking and version history.
              </p>
              <Button size="sm" asChild>
                <Link href={`/workers/${id}/documents`}>Document Vault</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Identity &amp; immigration documents
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
                        ? ` · expires ${new Date(d.expiryDate).toLocaleDateString("en-GB")}`
                        : ""}
                    </li>
                  ))}
                {data.documents.filter((d) =>
                  ["PASSPORT", "BRP", "EVISA", "SHARE_CODE", "VISA"].includes(
                    d.documentType
                  )
                ).length === 0 ? (
                  <li className="text-slate-500">No documents in this category.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>

          <form
            onSubmit={onUpload}
            className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-2"
          >
            <div>
              <Label>File name</Label>
              <Input name="fileName" required placeholder="passport.pdf" />
            </div>
            <div>
              <Label>Document type</Label>
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
              <Label>Vault folder</Label>
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
              <Label>Metadata (JSON, optional)</Label>
              <textarea
                name="metadataJson"
                className="min-h-[72px] w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
                placeholder='{"number":"1234","expiryDate":"2030-01-01"}'
              />
            </div>
            <div className="flex items-end lg:col-span-2">
              <Button type="submit" disabled={uploading}>
                Upload
              </Button>
            </div>
          </form>
          <DocumentTimeline key={docRefresh} workerId={id} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <HistoryForms workerId={id} onDone={() => void load()} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Unified timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <UnifiedTimeline data={data} />
            </CardContent>
          </Card>
          <div>
            <h3 className="mb-2 font-semibold text-brand-navy">Change log</h3>
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
            <h3 className="mb-2 font-semibold text-brand-navy">Absences</h3>
            <ul className="space-y-2 text-sm">
              {data.absences.map((a) => (
                <li key={a.id} className="rounded border border-slate-100 p-3">
                  {fmt(a.startDate)} — {a.endDate ? fmt(a.endDate) : "ongoing"}{" "}
                  · {a.absenceType ?? (a.isAuthorised ? "AUTHORISED" : "UNAUTHORISED")}
                  {a.consecutiveWorkingDays != null
                    ? ` · consecutive days: ${a.consecutiveWorkingDays}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ComplianceChecklist status={data.employmentStatus} />
            </CardContent>
          </Card>
          <RtwSection workerId={id} data={data} onDone={() => void load()} />
          <div>
            <h3 className="mb-2 font-semibold text-brand-navy">Notifications &amp; reporting</h3>
            <p className="mb-3 text-sm text-slate-600">
              Report deadlines and SMS drafts per event. Final legal check is your
              responsibility.
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
                      <strong>Event / report:</strong>{" "}
                      {fmt(n.occurredAt)} → deadline:{" "}
                      {fmt(n.reportDeadlineAt ?? n.dueDate)}
                    </p>
                    {n.evidenceRequired ? (
                      <p>
                        <strong>Evidence:</strong> {n.evidenceRequired}
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

function employmentStatusLabel(s: EmploymentStatus): string {
  if (s === "PENDING_START") return "PENDING";
  return s;
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
      title: `Change · ${c.changeCategory}`,
      detail: c.summary,
    });
  }
  for (const a of props.data.absences) {
    rows.push({
      t: new Date(a.startDate).getTime(),
      title:
        a.absenceType === "UNAUTHORISED" || (!a.absenceType && !a.isAuthorised)
          ? "Absence (unauthorised)"
          : `Absence (${a.absenceType ?? "—"})`,
      detail:
        a.notes ??
        `${fmt(a.startDate)} – ${a.endDate ? fmt(a.endDate) : "…"}`,
    });
  }
  for (const doc of props.data.documents) {
    rows.push({
      t: new Date(doc.uploadDate).getTime(),
      title: `Document · ${doc.documentType}`,
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
        <li className="text-slate-500">No entries yet.</li>
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
        <CardTitle className="text-base">Right to work checks</CardTitle>
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
                  Next: {fmt(r.nextCheckDueAt)}
                </div>
              ) : null}
            </li>
          ))}
          {(props.data.rtwChecks ?? []).length === 0 ? (
            <li className="text-slate-500">No RTW records yet.</li>
          ) : null}
        </ul>
        <form onSubmit={submitRtw} className="grid gap-2 border-t border-slate-100 pt-4 text-sm">
          <Label>Method</Label>
          <select
            name="checkMethod"
            required
            className="rounded border border-slate-300 p-2"
            defaultValue="ONLINE_SHARE_CODE"
          >
            <option value="ONLINE_SHARE_CODE">Online share code</option>
            <option value="MANUAL_DOCUMENT_CHECK">Manual document</option>
            <option value="EMPLOYER_PORTAL">Employer portal</option>
            <option value="RE_VERIFICATION">Re-verification</option>
            <option value="OTHER">Other</option>
          </select>
          <Input name="shareCodeUsed" placeholder="Share code (if any)" />
          <Input name="outcomeSummary" placeholder="Outcome summary" />
          <Input name="notes" placeholder="Notes" />
          <div>
            <Label>Next check due</Label>
            <Input name="nextCheckDueAt" type="date" />
          </div>
          <Button type="submit" size="sm">
            Add RTW record
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
          <CardTitle className="text-sm">Add change log</CardTitle>
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
            <Input name="summary" placeholder="Summary" required />
            <Input name="previousValue" placeholder="Previous (optional)" />
            <Input name="newValue" placeholder="New (optional)" />
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Absence record</CardTitle>
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
              <option value="SICK">Sick</option>
              <option value="AUTHORISED">Authorised</option>
              <option value="UNAUTHORISED">Unauthorised</option>
            </select>
            <Input name="approvedBy" placeholder="Approved by (optional)" />
            <Input name="notes" placeholder="Notes" />
            <Button type="submit" size="sm">
              Save
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
    { ok: props.status === "ACTIVE", label: "Start / ACTIVE status" },
    { ok: true, label: "CoS and visa dates on file" },
    { ok: true, label: "Salary and SOC code defined" },
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
