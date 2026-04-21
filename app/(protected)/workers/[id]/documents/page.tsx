"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

const FOLDER_LABELS: Record<DocumentFolder, string> = {
  IDENTITY_IMMIGRATION: "Identity & Immigration",
  RIGHT_TO_WORK: "Right to Work",
  COS_APPLICATION: "CoS & Application",
  EMPLOYMENT_CONTRACT: "Employment Contract",
  PAYROLL_SALARY: "Payroll & Salary Evidence",
  ABSENCE_LEAVE: "Absence & Leave",
  ADDRESS_CONTACT: "Address / Contact Evidence",
  ROLE_DUTIES: "Role / Duties / Org Chart",
  RECRUITMENT_VACANCY: "Recruitment / Vacancy Evidence",
  REPORTING_SUBMISSIONS: "Reporting Submissions",
  COMPLIANCE_VISIT_PACK: "Compliance Visit Pack",
};

type VaultPayload = {
  folders: DocumentFolder[];
  grouped: Record<string, DocumentVault[]>;
};

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

function expiryBadge(expiry: Date | string | null | undefined): {
  label: string;
  className: string;
} {
  if (!expiry) {
    return {
      label: "No expiry",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    };
  }
  const d = typeof expiry === "string" ? new Date(expiry) : expiry;
  const now = new Date();
  const dayMs = 86400000;
  const days = Math.ceil((d.getTime() - now.getTime()) / dayMs);
  if (days < 0) {
    return {
      label: "Expired",
      className: "bg-red-100 text-red-800 border-red-200",
    };
  }
  if (days <= 7) {
    return {
      label: `${days}d left`,
      className: "bg-red-100 text-red-800 border-red-200",
    };
  }
  if (days <= 30) {
    return {
      label: `${days}d left`,
      className: "bg-amber-100 text-amber-900 border-amber-200",
    };
  }
  return {
    label: `${days}d left`,
    className: "bg-emerald-100 text-emerald-900 border-emerald-200",
  };
}

async function fileToPayload(file: File): Promise<{
  fileName: string;
  fileUrl: string;
  fileData: string | null;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      const base64 = comma >= 0 ? result.slice(comma + 1) : null;
      resolve({ fileName: file.name, fileUrl: result, fileData: base64 });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function WorkerDocumentVaultPage(): JSX.Element {
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

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [wRes, vRes] = await Promise.all([
        fetch(`/api/workers/${workerId}`, { credentials: "include" }),
        fetch(`/api/workers/${workerId}/documents`, { credentials: "include" }),
      ]);
      if (!vRes.ok) {
        setError("Could not load document vault");
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
  }, [workerId]);

  useEffect(() => {
    void load();
  }, [load]);

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
        const { fileName, fileUrl, fileData } = await fileToPayload(file);
        const res = await fetch(`/api/workers/${workerId}/documents`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folder,
            fileName,
            fileUrl,
            fileData,
            expiryDate: expStr && expStr !== "" ? expStr : undefined,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? "Upload failed");
        }
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
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
    if (!window.confirm(`Remove “${doc.fileName}” from the vault?`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    await load();
  }

  async function submitNewVersion(): Promise<void> {
    if (!versionTarget || !versionFile) return;
    setVersionSaving(true);
    setError(null);
    try {
      const { fileName, fileUrl, fileData } = await fileToPayload(versionFile);
      const res = await fetch(`/api/documents/${versionTarget.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileUrl, fileData }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Update failed");
      }
      setVersionOpen(false);
      setVersionTarget(null);
      setVersionFile(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setVersionSaving(false);
    }
  }

  if (loading && !vault) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-sm text-slate-600">
        Loading document vault…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Document Vault
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {workerName || "Worker"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Folder-based compliance documents with retention and version history.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`/workers/${workerId}`}>← Back to profile</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="space-y-10">
        {(vault?.folders ?? []).map((folder) => {
          const docs = vault?.grouped[folder] ?? [];
          return (
            <section key={folder} className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-lg font-medium text-slate-900">
                  {FOLDER_LABELS[folder]}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="sr-only" htmlFor={`exp-${folder}`}>
                    Default expiry for uploads
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
                    {uploadingFolder === folder ? "Uploading…" : "Upload"}
                  </Button>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-lg border-2 border-dashed p-4 transition-colors",
                  dragOver === folder
                    ? "border-brand-navy bg-brand-navy/5"
                    : "border-slate-200 bg-slate-50/50"
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
                    Drop files here or use Upload.
                  </p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {docs.map((doc) => {
                      const exp = expiryBadge(doc.expiryDate);
                      return (
                        <li key={doc.id}>
                          <Card className="h-full border-slate-200 shadow-sm">
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
                                {new Date(doc.createdAt).toLocaleDateString(
                                  "en-GB"
                                )}
                              </p>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2 pt-0">
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open
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
                                Versions
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
                                New version
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-700 hover:text-red-800"
                                type="button"
                                onClick={() => void softDelete(doc)}
                              >
                                Remove
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
            <DialogTitle>Version history</DialogTitle>
            {historyTarget ? (
              <p className="text-sm text-slate-600">{historyTarget.fileName}</p>
            ) : null}
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            {historyEntries.map((h) => (
              <li
                key={`${h.version}-${h.createdAt}`}
                className="rounded border border-slate-100 bg-slate-50/80 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">v{h.version}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(h.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="mt-1 break-all text-slate-800">{h.fileName}</p>
                <a
                  href={h.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-brand-navy underline-offset-2 hover:underline"
                >
                  Open file
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
            <DialogTitle>Upload new version</DialogTitle>
            {versionTarget ? (
              <p className="text-sm text-slate-600">
                Replaces v{versionTarget.version} of {versionTarget.fileName}
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
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!versionFile || versionSaving}
                onClick={() => void submitNewVersion()}
              >
                {versionSaving ? "Saving…" : "Save version"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
