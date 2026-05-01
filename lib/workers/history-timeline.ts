import type { ChangeCategory } from "@prisma/client";
import type { WorkerDetailPayload } from "@/lib/workers/types";

export type WorkerActivityKind = "change" | "absence" | "document" | "rtw";

export type WorkerActivityTimelineEntry = {
  id: string;
  kind: WorkerActivityKind;
  at: Date;
  change?: {
    category: ChangeCategory;
    summary: string;
    previousValue: string | null;
    newValue: string | null;
  };
  absence?: {
    typeLabel: string;
    notes: string | null;
    startDate: Date;
    endDate: Date | null;
    isUnauthorised: boolean;
  };
  document?: {
    documentType: string;
    fileName: string;
  };
  rtw?: {
    checkMethod: string;
    detail: string;
  };
};

function compareDesc(
  a: WorkerActivityTimelineEntry,
  b: WorkerActivityTimelineEntry
): number {
  const td = b.at.getTime() - a.at.getTime();
  if (td !== 0) return td;
  return a.id.localeCompare(b.id);
}

export function buildWorkerActivityTimelineEntries(
  data: WorkerDetailPayload
): WorkerActivityTimelineEntry[] {
  const rows: WorkerActivityTimelineEntry[] = [];

  for (const c of data.changeLogs) {
    rows.push({
      id: `chg-${c.id}`,
      kind: "change",
      at: new Date(c.createdAt),
      change: {
        category: c.changeCategory,
        summary: c.summary,
        previousValue: c.previousValue ?? null,
        newValue: c.newValue ?? null,
      },
    });
  }

  for (const a of data.absences) {
    const start = new Date(a.startDate);
    const end = a.endDate ? new Date(a.endDate) : null;
    rows.push({
      id: `abs-${a.id}`,
      kind: "absence",
      at: start,
      absence: {
        typeLabel: a.type.replace(/_/g, " "),
        notes: a.notes ?? null,
        startDate: start,
        endDate: end,
        isUnauthorised: a.type === "UNAUTHORISED",
      },
    });
  }

  for (const doc of data.documents) {
    rows.push({
      id: `doc-${doc.id}`,
      kind: "document",
      at: new Date(doc.uploadDate),
      document: {
        documentType: doc.documentType,
        fileName: doc.fileName,
      },
    });
  }

  for (const r of data.rtwChecks) {
    rows.push({
      id: `rtw-${r.id}`,
      kind: "rtw",
      at: new Date(r.checkedAt),
      rtw: {
        checkMethod: r.checkMethod,
        detail:
          [r.outcomeSummary, r.shareCodeUsed, r.notes].filter(Boolean).join(" · ") ||
          "",
      },
    });
  }

  rows.sort(compareDesc);
  return rows;
}
