"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { DocumentFolder, DocumentVault } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { WorkerDocumentChecklist } from "@/components/workers/WorkerDocumentChecklist";
import { useTranslation } from "@/contexts/LanguageContext";

const FOLDER_KEYS: DocumentFolder[] = [
  "IDENTITY_IMMIGRATION",
  "RIGHT_TO_WORK",
  "COS_APPLICATION",
  "EMPLOYMENT_CONTRACT",
  "PAYROLL_SALARY",
  "ABSENCE_LEAVE",
  "ADDRESS_CONTACT",
  "ROLE_DUTIES",
  "ROLE_ORG_CHART",
  "RECRUITMENT_VACANCY",
  "REPORTING_SUBMISSIONS",
  "COMPLIANCE_VISIT_PACK",
  "OTHER",
];

function folderLabel(
  folder: DocumentFolder,
  t: (key: string, fallback?: string) => string
): string {
  const v = t(`documentVault.folder.${folder}`, folder);
  return v === `documentVault.folder.${folder}` ? folder : v;
}

type VaultPayload = {
  folders: DocumentFolder[];
  grouped: Record<string, DocumentVault[]>;
};

function isDocumentFolderKey(v: string): v is DocumentFolder {
  return (FOLDER_KEYS as string[]).includes(v);
}

type VersionEntry = {
  version: number;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
  expiryDate?: string | null;
};

function parseHistory(raw: unknown): VersionEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is VersionEntry =>
      typeof x === "object" &&
      x !== null &&
      "version" in x &&
      typeof (x as VersionEntry).version === "number"
  );
}

function expiryBadge(
  expiry: Date | string | null | undefined,
  t: (key: string, fallback?: string) => string
): {
  label: string;
  className: string;
} {
  if (!expiry) {
    return {
      label: t("docChecklist.noExpiry"),
      className: "border-brand-navy/20 bg-brand-surface text-brand-navy/75",
    };
  }
  const d = typeof expiry === "string" ? new Date(expiry) : expiry;
  const now = new Date();
  const dayMs = 86400000;
  const days = Math.ceil((d.getTime() - now.getTime()) / dayMs);
  const daysLeftLabel = t("documentVault.daysLeft").replace("{n}", String(days));
  if (days < 0) {
    return {
      label: t("documentVault.expired"),
      className: "bg-red-100 text-red-800 border-red-200",
    };
  }
  if (days <= 7) {
    return {
      label: daysLeftLabel,
      className: "bg-red-100 text-red-800 border-red-200",
    };
  }
  if (days <= 30) {
    return {
      label: daysLeftLabel,
      className: "bg-amber-100 text-amber-900 border-amber-200",
    };
  }
  return {
    label: daysLeftLabel,
    className: "bg-emerald-100 text-emerald-900 border-emerald-200",
  };
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", ab);
  return toHex(digest);
}

async function uploadWithPresign(input: {
  workerId: string;
  folder: DocumentFolder;
  file: File;
  t: (key: string, fallback?: string) => string;
}): Promise<{
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  fileHash: string;
}> {
  const mimeType = input.file.type || "application/octet-stream";
  const sizeBytes = input.file.size;
  const fileHash = await sha256(input.file);
  const presign = await fetch("/api/storage/presign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workerId: input.workerId,
      folder: input.folder,
      fileName: input.file.name,
      mimeType,
      sizeBytes,
      fileHash,
    }),
  });
  const presignJson = (await presign.json().catch(() => ({}))) as {
    data?: {
      uploadUrl: string;
      fileUrl: string;
      /** Supabase Storage: signed URL bekler multipart FormData ile PUT (@supabase/storage-js ile uyumlu). */
      uploadTransport?: "supabase-formdata" | "s3-binary";
    };
    error?: string;
  };
  if (!presign.ok || !presignJson.data) {
    throw new Error(presignJson.error ?? input.t("documentVault.presignFailed"));
  }

  const transport = presignJson.data.uploadTransport ?? "s3-binary";
  let put: Response;
  if (transport === "supabase-formdata") {
    const fd = new FormData();
    fd.append("cacheControl", "3600");
    fd.append("", input.file);
    put = await fetch(presignJson.data.uploadUrl, { method: "PUT", body: fd });
  } else {
    put = await fetch(presignJson.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: input.file,
    });
  }
  if (!put.ok) {
    const detail = await put.text().catch(() => "");
    const base = input.t("documentVault.storageUploadFailed");
    throw new Error(detail ? `${base}: ${detail.slice(0, 200)}` : base);
  }
  return {
    fileName: input.file.name,
    fileUrl: presignJson.data.fileUrl,
    mimeType,
    sizeBytes,
    fileHash,
  };
}

export default function WorkerDocumentVaultPage(): JSX.Element {
  const { t, locale } = useTranslation();
  const localeTag = locale === "tr" ? "tr-TR" : "en-GB";
  const params = useParams();
  const workerId = params.id as string;
  const [vault, setVault] = useState<VaultPayload | null>(null);
  const [workerName, setWorkerName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingFolder, setUploadingFolder] = useState<DocumentFolder | null>(
    null
  );
  const [dragOver, setDragOver] = useState<DocumentFolder | null>(null);
  const [expiryByFolder, setExpiryByFolder] = useState<
    Partial<Record<DocumentFolder, string>>
  >({});

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<DocumentVault | null>(null);

  const [versionOpen, setVersionOpen] = useState(false);
  const [versionTarget, setVersionTarget] = useState<DocumentVault | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionSaving, setVersionSaving] = useState(false);
  const [checklistRev, setChecklistRev] = useState(0);

  const bumpChecklist = useCallback((): void => {
    setChecklistRev((r) => r + 1);
  }, []);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [wRes, vRes] = await Promise.all([
        fetch(`/api/workers/${workerId}`, { credentials: "include" }),
        fetch(`/api/workers/${workerId}/documents`, { credentials: "include" }),
      ]);
      if (!vRes.ok) {
        setError(t("documentVault.loadFailed"));
        setVault(null);
        return;
      }
      const vJson = (await vRes.json()) as { data: VaultPayload };
      setVault(vJson.data);
      setError(null);
      if (wRes.ok) {
        const wJson = (await wRes.json()) as {
          data: { firstName: string; lastName: string };
        };
        setWorkerName(
          `${wJson.data.firstName} ${wJson.data.lastName}`.trim()
        );
      }
    } finally {
      setLoading(false);
    }
  }, [workerId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const searchParams = useSearchParams();
  const vaultFolderFocus = searchParams.get("vaultFolder");

  useEffect(() => {
    if (loading || !vault || !vaultFolderFocus || !isDocumentFolderKey(vaultFolderFocus)) {
      return;
    }
    if (!vault.folders.includes(vaultFolderFocus)) return;

    const timer = window.setTimeout(() => {
      const el = document.getElementById(`vault-folder-${vaultFolderFocus}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add(
        "ring-2",
        "ring-brand-gold",
        "ring-offset-2",
        "rounded-lg",
        "transition-shadow",
        "duration-500"
      );
      window.setTimeout(() => {
        el.classList.remove(
          "ring-2",
          "ring-brand-gold",
          "ring-offset-2",
          "rounded-lg"
        );
      }, 2600);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [loading, vault, vaultFolderFocus]);

  const uploadFiles = async (
    files: FileList | File[],
    folder: DocumentFolder
  ): Promise<void> => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadingFolder(folder);
    setError(null);
    try {
      const expStr = expiryByFolder[folder];
      for (const file of list) {
        const upload = await uploadWithPresign({ workerId, folder, file, t });
        const res = await fetch(`/api/workers/${workerId}/documents`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folder,
            fileName: upload.fileName,
            fileUrl: upload.fileUrl,
            mimeType: upload.mimeType,
            sizeBytes: upload.sizeBytes,
            fileHash: upload.fileHash,
            expiryDate: expStr && expStr !== "" ? expStr : undefined,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? t("documentVault.uploadFailed"));
        }
      }
      await load();
      bumpChecklist();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("documentVault.uploadFailed"));
    } finally {
      setUploadingFolder(null);
    }
  };

  const historyEntries = useMemo(() => {
    if (!historyTarget) return [];
    const past = parseHistory(historyTarget.previousVersions);
    const current: VersionEntry = {
      version: historyTarget.version,
      fileName: historyTarget.fileName,
      fileUrl: historyTarget.fileUrl,
      uploadedBy: historyTarget.uploadedBy,
      createdAt:
        typeof historyTarget.createdAt === "string"
          ? historyTarget.createdAt
          : new Date(historyTarget.createdAt).toISOString(),
      expiryDate: historyTarget.expiryDate
        ? new Date(historyTarget.expiryDate).toISOString()
        : null,
    };
    return [...past, current].sort((a, b) => a.version - b.version);
  }, [historyTarget]);

  async function softDelete(doc: DocumentVault): Promise<void> {
    if (!window.confirm(t("documentVault.removeConfirm").replace("{name}", doc.fileName))) return;
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      setError(t("documentVault.deleteFailed"));
      return;
    }
    await load();
    bumpChecklist();
  }

  async function submitNewVersion(): Promise<void> {
    if (!versionTarget || !versionFile) return;
    setVersionSaving(true);
    setError(null);
    try {
      const upload = await uploadWithPresign({
        workerId,
        folder: versionTarget.folder,
        file: versionFile,
        t,
      });
      const res = await fetch(`/api/documents/${versionTarget.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: upload.fileName,
          fileUrl: upload.fileUrl,
          mimeType: upload.mimeType,
          sizeBytes: upload.sizeBytes,
          fileHash: upload.fileHash,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? t("documentVault.updateFailed"));
      }
      setVersionOpen(false);
      setVersionTarget(null);
      setVersionFile(null);
      await load();
      bumpChecklist();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("documentVault.updateFailed"));
    } finally {
      setVersionSaving(false);
    }
  }

  if (loading && !vault) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-sm text-slate-600">
        {t("documentVault.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t("documentVault.title")}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {workerName || t("documentVault.workerFallback")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t("documentVault.subtitle")}</p>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`/workers/${workerId}`}>{t("documentVault.backToProfile")}</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <WorkerDocumentChecklist workerId={workerId} refreshKey={checklistRev} />

      <div className="space-y-10">
        {(vault?.folders ?? []).map((folder) => {
          const docs = vault?.grouped[folder] ?? [];
          return (
            <section
              key={folder}
              id={`vault-folder-${folder}`}
              className="scroll-mt-24 space-y-3"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-lg font-medium text-brand-navy">
                  {folderLabel(folder, t)}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="sr-only" htmlFor={`exp-${folder}`}>
                    {t("documentVault.defaultExpiryLabel")}
                  </Label>
                  <Input
                    id={`exp-${folder}`}
                    type="date"
                    className="h-9 w-40 text-sm"
                    value={expiryByFolder[folder] ?? ""}
                    onChange={(e) =>
                      setExpiryByFolder((s) => ({
                        ...s,
                        [folder]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingFolder === folder}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.multiple = true;
                      input.onchange = () => {
                        if (input.files) void uploadFiles(input.files, folder);
                      };
                      input.click();
                    }}
                  >
                    {uploadingFolder === folder
                      ? t("documentVault.uploading")
                      : t("documentVault.upload")}
                  </Button>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-lg border-2 border-dashed p-4 transition-colors",
                  dragOver === folder
                    ? "border-brand-navy bg-brand-navy/5"
                    : "border-brand-navy/20 bg-brand-surface/80"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(folder);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  if (e.dataTransfer.files?.length) {
                    void uploadFiles(e.dataTransfer.files, folder);
                  }
                }}
              >
                {docs.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    {t("documentVault.dropHint")}
                  </p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {docs.map((doc) => {
                      const exp = expiryBadge(doc.expiryDate, t);
                      return (
                        <li key={doc.id}>
                          <Card className="h-full border-brand-navy/15 shadow-card">
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="line-clamp-2 text-sm font-medium leading-snug">
                                  {doc.fileName}
                                </CardTitle>
                                <Badge
                                  variant="outline"
                                  className={cn("shrink-0 text-xs", exp.className)}
                                >
                                  {exp.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500">
                                v{doc.version} ·{" "}
                                {new Date(doc.createdAt).toLocaleDateString(localeTag)}
                              </p>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2 pt-0">
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {t("documentVault.open")}
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => {
                                  setHistoryTarget(doc);
                                  setHistoryOpen(true);
                                }}
                              >
                                {t("documentVault.versions")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => {
                                  setVersionTarget(doc);
                                  setVersionFile(null);
                                  setVersionOpen(true);
                                }}
                              >
                                {t("documentVault.newVersion")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-700 hover:text-red-800"
                                type="button"
                                onClick={() => void softDelete(doc)}
                              >
                                {t("documentVault.remove")}
                              </Button>
                            </CardContent>
                          </Card>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("documentVault.versionHistoryTitle")}</DialogTitle>
            {historyTarget ? (
              <p className="text-sm text-slate-600">{historyTarget.fileName}</p>
            ) : null}
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            {historyEntries.map((h) => (
              <li
                key={`${h.version}-${h.createdAt}`}
                className="rounded border border-brand-navy/12 bg-brand-surface p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">v{h.version}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(h.createdAt).toLocaleString(localeTag)}
                  </span>
                </div>
                <p className="mt-1 break-all text-slate-800">{h.fileName}</p>
                <a
                  href={h.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-brand-navy underline-offset-2 hover:underline"
                >
                  {t("documentVault.openFile")}
                </a>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>

      <Dialog
        open={versionOpen}
        onOpenChange={(o) => {
          setVersionOpen(o);
          if (!o) {
            setVersionTarget(null);
            setVersionFile(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("documentVault.uploadNewVersionTitle")}</DialogTitle>
            {versionTarget ? (
              <p className="text-sm text-slate-600">
                {t("documentVault.replacesVersion")
                  .replace("{version}", String(versionTarget.version))
                  .replace("{fileName}", versionTarget.fileName)}
              </p>
            ) : null}
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="file"
              onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVersionOpen(false)}
              >
                {t("documentVault.cancel")}
              </Button>
              <Button
                type="button"
                disabled={!versionFile || versionSaving}
                onClick={() => void submitNewVersion()}
              >
                {versionSaving ? t("documentVault.saving") : t("documentVault.saveVersion")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
