import type { AuditLog } from "@prisma/client";

export type AuditLogFeedItem = Pick<
  AuditLog,
  "id" | "action" | "entityType" | "entityId" | "changes" | "createdAt" | "performedBy"
> & {
  createdAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

export function parseAuditAction(action: string): { model: string; verb: string } {
  const idx = action.indexOf(".");
  if (idx === -1) return { model: action, verb: "UPDATE" };
  return {
    model: action.slice(0, idx),
    verb: action.slice(idx + 1).toUpperCase() || "UPDATE",
  };
}

export function extractAuditDetail(
  changes: unknown,
  entityType: string
): string | null {
  if (!changes || typeof changes !== "object") return null;
  const c = changes as { after?: Record<string, unknown>; before?: Record<string, unknown> };
  const blob = c.after ?? c.before;
  if (!blob || typeof blob !== "object") return null;

  if (entityType === "Worker" && "firstName" in blob && "lastName" in blob) {
    return `${String(blob.firstName)} ${String(blob.lastName)}`.trim();
  }
  if (entityType === "Document" && "fileName" in blob) {
    return String(blob.fileName);
  }
  if (entityType === "Policy" && "title" in blob) {
    return String(blob.title);
  }
  if (entityType === "NotificationEvent" && "workerName" in blob) {
    return String(blob.workerName);
  }
  if ("title" in blob && typeof blob.title === "string") return blob.title;
  if ("name" in blob && typeof blob.name === "string") return blob.name;
  return null;
}

export type AuditDisplayParts = {
  detail: string;
  entityLabel: string;
  verbLabel: string;
};

/** Split labels for richer timeline rows (detail + subtitles). */
export function getAuditDisplayParts(
  t: (key: string, fallback?: string) => string,
  log: AuditLogFeedItem
): AuditDisplayParts {
  const { model, verb } = parseAuditAction(log.action);
  const entityLabel = t(`compliance.audit.entity.${model}`, prettifyModel(model));
  const verbLabel = t(`compliance.audit.verb.${verb}`, verb);
  const detail =
    extractAuditDetail(log.changes, model) ??
    `#${log.entityId.slice(0, 8)}…`;
  return { detail, entityLabel, verbLabel };
}

function prettifyModel(model: string): string {
  return model.replace(/([A-Z])/g, " $1").trim();
}
