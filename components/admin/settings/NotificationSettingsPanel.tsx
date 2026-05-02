"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Eye, Loader2, Mail, Pencil, Save } from "lucide-react";
import type { EmailTemplate, NotificationConfig } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSurfaceCard } from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { applyTemplateVars } from "@/lib/notifications/email/apply-template-vars";

function clampReminderDay(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 730) return 730;
  return Math.floor(n);
}

const SAMPLE_PRESET: Record<string, string> = {
  workerName: "Jane Worker",
  companyName: "Demo Sponsor Ltd",
  expiryDate: "2027-06-01",
  cosReference: "COS9876543210",
  workerUrl: "https://example.com/workers/demo",
  notificationsUrl: "https://example.com/notifications",
  anchorLabelTr: "Örnek tarih etiketi (TR)",
  anchorLabelEn: "Sample anchor label (EN)",
  documentTypeTr: "Pasaport",
  documentTypeEn: "Passport",
  fileName: "passport-jane.pdf",
  documentId: "clxvaultdemo001",
};

function SlotRow(props: {
  label: string;
  enabledKey: keyof NotificationConfig;
  daysKey?: keyof NotificationConfig;
  cfg: NotificationConfig;
  patch: (p: Partial<NotificationConfig>) => void;
  hideDays?: boolean;
}): JSX.Element {
  const { label, enabledKey, daysKey, cfg, patch, hideDays } = props;
  const enabled = Boolean(cfg[enabledKey]);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-navy/10 bg-white/80 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <Label className="flex cursor-pointer items-center gap-3 text-brand-navy">
        <input
          type="checkbox"
          className={cn(
            "h-4 w-4 rounded border-brand-navy/35 text-brand-navy accent-brand-navy"
          )}
          checked={enabled}
          onChange={(e) =>
            patch({ [enabledKey]: e.target.checked } as Partial<NotificationConfig>)
          }
          aria-checked={enabled}
        />
        <span className="font-medium">{label}</span>
      </Label>
      {!hideDays && daysKey ? (
        <div className="flex items-center gap-2 md:min-w-[140px]">
          <Label className="text-xs uppercase tracking-wide text-brand-slate">Δ gün</Label>
          <Input
            type="number"
            min={1}
            max={730}
            disabled={!enabled}
            value={(cfg[daysKey] as number) ?? 1}
            onChange={(e) =>
              patch({
                [daysKey]: clampReminderDay(Number(e.target.value)),
              } as Partial<NotificationConfig>)
            }
            className="h-9 w-24 border-brand-navy/15"
          />
        </div>
      ) : hideDays ? (
        <span className="text-xs text-brand-slate">—</span>
      ) : null}
    </div>
  );
}

export function NotificationSettingsPanel(): JSX.Element {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cfg, setCfg] = useState<NotificationConfig | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  const [testBusy, setTestBusy] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState<{ variant: "ok" | "err"; text: string } | null>(
    null
  );

  const [editTpl, setEditTpl] = useState<EmailTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [draftSubjectTr, setDraftSubjectTr] = useState("");
  const [draftSubjectEn, setDraftSubjectEn] = useState("");
  const [draftBodyTr, setDraftBodyTr] = useState("");
  const [draftBodyEn, setDraftBodyEn] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/notifications", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        config?: NotificationConfig;
        templates?: EmailTemplate[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? t("admin.settings.notifications.loadError"));
        return;
      }
      if (json.config) setCfg(json.config);
      if (json.templates) setTemplates(json.templates);
    } catch {
      setError(t("admin.settings.notifications.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function persistPatch(p: Partial<NotificationConfig>): Promise<void> {
    if (!cfg) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const json = (await res.json().catch(() => ({}))) as {
        config?: NotificationConfig;
        error?: string;
      };
      if (!res.ok || !json.config) {
        setError(json.error ?? t("admin.settings.notifications.saveError"));
        return;
      }
      setCfg(json.config);
    } catch {
      setError(t("admin.settings.notifications.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function saveAllLocal(): Promise<void> {
    if (!cfg) return;
    await persistPatch(cfg);
  }

  function cfgPatch(inner: Partial<NotificationConfig>): void {
    setCfg((c) => (c ? { ...c, ...inner } : c));
  }

  function openEditor(tpl: EmailTemplate): void {
    setEditTpl(tpl);
    setDraftSubjectTr(tpl.subjectTr);
    setDraftSubjectEn(tpl.subjectEn);
    setDraftBodyTr(tpl.bodyTr);
    setDraftBodyEn(tpl.bodyEn);
  }

  async function saveTemplate(): Promise<void> {
    if (!editTpl) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/notifications/email-template", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: editTpl.templateKey,
          subjectTr: draftSubjectTr,
          subjectEn: draftSubjectEn,
          bodyTr: draftBodyTr,
          bodyEn: draftBodyEn,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        template?: EmailTemplate;
        error?: string;
      };
      if (!res.ok || !json.template) {
        setError(json.error ?? t("admin.settings.notifications.templateSaveError"));
        return;
      }
      setTemplates((prev) =>
        prev.map((x) =>
          x.templateKey === json.template!.templateKey ? json.template! : x
        )
      );
      setEditTpl(null);
    } catch {
      setError(t("admin.settings.notifications.templateSaveError"));
    } finally {
      setBusy(false);
    }
  }

  async function sendTestMail(): Promise<void> {
    setTestBusy(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/settings/notifications/test-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testTo.trim() ? { to: testTo.trim() } : {}),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && json.ok) {
        setTestMsg({ variant: "ok", text: t("admin.settings.notifications.testSent") });
      } else {
        setTestMsg({
          variant: "err",
          text: json.error ?? t("admin.settings.notifications.testFailed"),
        });
      }
    } catch {
      setTestMsg({ variant: "err", text: t("admin.settings.notifications.testFailed") });
    } finally {
      setTestBusy(false);
    }
  }

  const previewSubject =
    applyTemplateVars(draftSubjectTr, SAMPLE_PRESET).trim() ||
    applyTemplateVars(draftSubjectEn, SAMPLE_PRESET).trim();

  const previewBodyBlocks = [draftBodyTr, draftBodyEn];

  if (loading || !cfg) {
    return (
      <AdminSurfaceCard className="flex items-center gap-3 p-8">
        <Loader2 className="h-5 w-5 animate-spin text-brand-navy" aria-hidden />
        <span className="text-sm text-brand-slate">{t("common.loading")}</span>
      </AdminSurfaceCard>
    );
  }

  return (
    <div className="space-y-8">
      {error ? (
        <AdminSurfaceCard className="border-red-200/80 bg-red-50/70 p-4 text-sm text-red-900">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void load()}
          >
            {t("common.retry")}
          </button>
        </AdminSurfaceCard>
      ) : null}

      <AdminSurfaceCard className="p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-900 ring-1 ring-sky-500/20">
              <Mail className="h-7 w-7" aria-hidden strokeWidth={1.75} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-brand-navy">
                {t("admin.settings.notifications.generalTitle")}
              </h2>
              <p className="max-w-xl text-sm text-brand-slate">
                {t("admin.settings.notifications.generalSubtitle")}
              </p>
            </div>
          </div>
          <div className="w-full max-w-md space-y-4">
            <Label className="flex cursor-pointer items-center gap-3 text-brand-navy">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-brand-navy/35 accent-brand-navy"
                checked={cfg.emailEnabled}
                onChange={(e) => void persistPatch({ emailEnabled: e.target.checked })}
              />
              {t("admin.settings.notifications.emailEnabled")}
            </Label>
            <div className="space-y-2">
              <Label htmlFor="notif-cc">{t("admin.settings.notifications.cc")}</Label>
              <Input
                id="notif-cc"
                placeholder="cc1@…, cc2@…"
                value={cfg.ccRecipients ?? ""}
                onChange={(e) =>
                  setCfg((c) => (c ? { ...c, ccRecipients: e.target.value } : c))
                }
                className="border-brand-navy/15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-bcc">{t("admin.settings.notifications.bcc")}</Label>
              <Input
                id="notif-bcc"
                placeholder="bcc@…"
                value={cfg.bccRecipients ?? ""}
                onChange={(e) =>
                  setCfg((c) => (c ? { ...c, bccRecipients: e.target.value } : c))
                }
                className="border-brand-navy/15"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                className="gap-2 font-semibold"
                onClick={() =>
                  void persistPatch({
                    ccRecipients: cfg.ccRecipients,
                    bccRecipients: cfg.bccRecipients,
                  })
                }
              >
                <Save className="h-4 w-4" aria-hidden />
                {t("admin.settings.notifications.saveRecipients")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={testBusy || !cfg.emailEnabled}
                className="gap-2"
                onClick={() => void sendTestMail()}
              >
                {testBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Bell className="h-4 w-4" aria-hidden />
                )}
                {t("admin.settings.notifications.testSend")}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-test-to">{t("admin.settings.notifications.testOptionalTo")}</Label>
              <Input
                id="notif-test-to"
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                className="border-brand-navy/15"
              />
            </div>
            {testMsg ? (
              <p
                role="status"
                className={
                  testMsg.variant === "ok"
                    ? "rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950"
                    : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                }
              >
                {testMsg.text}
              </p>
            ) : null}
            <Label className="flex cursor-pointer items-center gap-3 text-brand-navy">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-brand-navy/35 accent-brand-navy"
                checked={cfg.sendAfterExpired}
                onChange={(e) =>
                  void persistPatch({ sendAfterExpired: e.target.checked })
                }
              />
              {t("admin.settings.notifications.afterExpired")}
            </Label>
          </div>
        </div>
      </AdminSurfaceCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-brand-navy/12 shadow-md">
          <CardHeader>
            <CardTitle className="text-brand-navy">
              {t("admin.settings.notifications.visaCosTitle")}
            </CardTitle>
            <CardDescription>
              {t("admin.settings.notifications.visaCosSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SlotRow label={t("admin.settings.notifications.tier60")} enabledKey="visaRemind60Enabled" daysKey="visaRemind60Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.tier30")} enabledKey="visaRemind30Enabled" daysKey="visaRemind30Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.tier7")} enabledKey="visaRemind7Enabled" daysKey="visaRemind7Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.lastDay")} enabledKey="visaRemindLastDayEnabled" cfg={cfg} patch={cfgPatch} hideDays />
          </CardContent>
        </Card>

        <Card className="border-brand-navy/12 shadow-md">
          <CardHeader>
            <CardTitle className="text-brand-navy">{t("admin.settings.notifications.scTitle")}</CardTitle>
            <CardDescription>{t("admin.settings.notifications.scSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SlotRow label={t("admin.settings.notifications.tier60")} enabledKey="sponsorshipRemind60Enabled" daysKey="sponsorshipRemind60Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.tier30")} enabledKey="sponsorshipRemind30Enabled" daysKey="sponsorshipRemind30Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.tier7")} enabledKey="sponsorshipRemind7Enabled" daysKey="sponsorshipRemind7Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.lastDayOptional")} enabledKey="sponsorshipRemindLastDayEnabled" cfg={cfg} patch={cfgPatch} hideDays />
          </CardContent>
        </Card>

        <Card className="border-brand-navy/12 shadow-md">
          <CardHeader>
            <CardTitle className="text-brand-navy">{t("admin.settings.notifications.rtwTitle")}</CardTitle>
            <CardDescription>{t("admin.settings.notifications.rtwSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SlotRow label={t("admin.settings.notifications.tier60")} enabledKey="rtwRemind60Enabled" daysKey="rtwRemind60Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.tier30")} enabledKey="rtwRemind30Enabled" daysKey="rtwRemind30Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.tier7")} enabledKey="rtwRemind7Enabled" daysKey="rtwRemind7Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.lastDayOptional")} enabledKey="rtwRemindLastDayEnabled" cfg={cfg} patch={cfgPatch} hideDays />
          </CardContent>
        </Card>

        <Card className="border-brand-navy/12 shadow-md">
          <CardHeader>
            <CardTitle className="text-brand-navy">{t("admin.settings.notifications.docTitle")}</CardTitle>
            <CardDescription>{t("admin.settings.notifications.docSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SlotRow label={t("admin.settings.notifications.tier60")} enabledKey="documentRemind60Enabled" daysKey="documentRemind60Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.tier30")} enabledKey="documentRemind30Enabled" daysKey="documentRemind30Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.tier7")} enabledKey="documentRemind7Enabled" daysKey="documentRemind7Days" cfg={cfg} patch={cfgPatch} />
            <SlotRow label={t("admin.settings.notifications.lastDay")} enabledKey="documentRemindLastDayEnabled" cfg={cfg} patch={cfgPatch} hideDays />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          className="min-w-[200px] gap-2 font-semibold"
          disabled={busy}
          onClick={() => void saveAllLocal()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("admin.settings.notifications.saveSchedule")}
        </Button>
      </div>

      <AdminSurfaceCard className="overflow-hidden p-0">
        <div className="flex items-start justify-between border-b border-brand-navy/10 bg-brand-navy/[0.04] px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-brand-navy">
              {t("admin.settings.notifications.templatesTitle")}
            </h3>
            <p className="text-sm text-brand-slate">{t("admin.settings.notifications.templatesSubtitle")}</p>
          </div>
          <Bell className="mt-1 h-5 w-5 text-brand-navy/60" aria-hidden />
        </div>
        <div className="max-h-[520px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[220px]">{t("admin.settings.notifications.tableKey")}</TableHead>
                <TableHead>{t("admin.settings.notifications.tableSubjectTr")}</TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("admin.settings.notifications.tableVars")}
                </TableHead>
                <TableHead className="w-[100px] text-end">{t("common.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="align-top font-mono text-xs font-semibold">
                    {row.templateKey}
                  </TableCell>
                  <TableCell className="align-top text-sm text-brand-slate">
                    {row.subjectTr.slice(0, 140)}
                    {row.subjectTr.length > 140 ? "…" : ""}
                  </TableCell>
                  <TableCell className="hidden align-top lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(row.variableHints.length
                        ? row.variableHints
                        : ["workerName", "expiryDate", "companyName"]
                      ).map((v) => (
                        <Badge key={v} variant="outline" className="text-[10px] font-normal">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-end align-top">
                    <Button variant="outline" size="sm" type="button" className="gap-1.5" onClick={() => openEditor(row)}>
                      <Pencil className="h-3.5 w-3.5" />
                      {t("common.details")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AdminSurfaceCard>

      <Dialog open={Boolean(editTpl)} onOpenChange={(o) => !o && !busy && setEditTpl(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl gap-6 overflow-y-auto border-brand-navy/15 px-8 py-10">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-brand-navy">
              <span className="block font-mono text-sm tracking-tight">{editTpl?.templateKey}</span>
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="subj" className="w-full space-y-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="subj">{t("admin.settings.notifications.tabSubject")}</TabsTrigger>
              <TabsTrigger value="body">{t("admin.settings.notifications.tabBody")}</TabsTrigger>
            </TabsList>
            <TabsContent value="subj" className="space-y-3 pt-1">
              <div className="space-y-2">
                <Label>TR</Label>
                <Input
                  value={draftSubjectTr}
                  onChange={(e) => setDraftSubjectTr(e.target.value)}
                  className="border-brand-navy/15"
                />
              </div>
              <div className="space-y-2">
                <Label>EN</Label>
                <Input
                  value={draftSubjectEn}
                  onChange={(e) => setDraftSubjectEn(e.target.value)}
                  className="border-brand-navy/15"
                />
              </div>
            </TabsContent>
            <TabsContent value="body" className="space-y-3 pt-1">
              <div className="space-y-2">
                <Label>{t("admin.settings.notifications.bodyTrLabel")}</Label>
                <textarea
                  className={cn(
                    "min-h-[180px] w-full rounded-xl border border-brand-navy/15 bg-white px-3 py-2 text-sm text-brand-navy shadow-sm focus-visible:outline focus-visible:ring-2 focus-visible:ring-brand-navy/20"
                  )}
                  value={draftBodyTr}
                  onChange={(e) => setDraftBodyTr(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.settings.notifications.bodyEnLabel")}</Label>
                <textarea
                  className={cn(
                    "min-h-[180px] w-full rounded-xl border border-brand-navy/15 bg-white px-3 py-2 text-sm text-brand-navy shadow-sm focus-visible:outline focus-visible:ring-2 focus-visible:ring-brand-navy/20"
                  )}
                  value={draftBodyEn}
                  onChange={(e) => setDraftBodyEn(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-4 w-4" />
              {t("admin.settings.notifications.preview")}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditTpl(null)} disabled={busy}>
                {t("common.cancel")}
              </Button>
              <Button type="button" className="gap-2 font-semibold" disabled={busy} onClick={() => void saveTemplate()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("common.save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl border-brand-navy/15">
          <DialogHeader>
            <DialogTitle>{t("admin.settings.notifications.previewTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 rounded-lg border border-brand-navy/12 bg-muted/40 p-4 text-sm">
            <p className="font-semibold text-brand-navy">{previewSubject}</p>
            {previewBodyBlocks.map((chunk, idx) => (
              <pre
                key={`b-${idx}`}
                className="whitespace-pre-wrap break-words font-sans text-brand-slate"
              >
                {applyTemplateVars(chunk, SAMPLE_PRESET)}
              </pre>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
