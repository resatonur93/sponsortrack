import {
  ComplianceRiskLevel,
  EventType,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma;

export type AuditWorkerFilters = {
  search: string | null;
  workerId: string | null;
  riskLevel: ComplianceRiskLevel | null;
  notificationEventType: NotificationType | null;
  complianceEventType: EventType | null;
  dateFrom: Date | null;
  dateTo: Date | null;
};

export function parseAuditWorkerFilters(
  searchParams: URLSearchParams
): AuditWorkerFilters {
  const search = searchParams.get("search")?.trim() || null;
  const workerId = searchParams.get("workerId")?.trim() || null;
  const risk = searchParams.get("riskLevel")?.trim() || null;
  const rawNotif = searchParams.get("notificationEventType")?.trim() || null;
  const notificationEventType =
    rawNotif &&
    (Object.values(NotificationType) as string[]).includes(rawNotif)
      ? (rawNotif as NotificationType)
      : null;
  const rawComp = searchParams.get("complianceEventType")?.trim() || null;
  const complianceEventType =
    rawComp && (Object.values(EventType) as string[]).includes(rawComp)
      ? (rawComp as EventType)
      : null;
  const df = searchParams.get("dateFrom")?.trim() || null;
  const dt = searchParams.get("dateTo")?.trim() || null;

  const riskLevel =
    risk &&
    (Object.values(ComplianceRiskLevel) as string[]).includes(risk)
      ? (risk as ComplianceRiskLevel)
      : null;

  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;
  if (df && !Number.isNaN(Date.parse(df))) {
    dateFrom = new Date(df);
  }
  if (dt && !Number.isNaN(Date.parse(dt))) {
    dateTo = new Date(dt);
    dateTo.setHours(23, 59, 59, 999);
  }

  return {
    search,
    workerId,
    riskLevel,
    notificationEventType,
    complianceEventType,
    dateFrom,
    dateTo,
  };
}

export async function buildAuditWorkerWhere(
  db: Db,
  f: AuditWorkerFilters
): Promise<Prisma.WorkerWhereInput> {
  const and: Prisma.WorkerWhereInput[] = [
    { employmentStatus: { not: "TERMINATED" } },
  ];

  if (f.workerId) {
    and.push({ id: f.workerId });
  }

  if (f.riskLevel) {
    and.push({ complianceRiskLevel: f.riskLevel });
  }

  if (f.search) {
    and.push({
      OR: [
        { firstName: { contains: f.search, mode: "insensitive" } },
        { lastName: { contains: f.search, mode: "insensitive" } },
        { email: { contains: f.search, mode: "insensitive" } },
      ],
    });
  }

  if (f.notificationEventType) {
    const rows = await db.notificationEvent.findMany({
      where: {
        eventType: f.notificationEventType,
        status: { in: ["PENDING", "OVERDUE"] },
      },
      select: { workerId: true },
    });
    const ids = Array.from(new Set(rows.map((r) => r.workerId)));
    if (ids.length === 0) {
      and.push({ id: { in: [] } });
    } else {
      and.push({ id: { in: ids } });
    }
  }

  if (f.complianceEventType) {
    const rows = await db.complianceEvent.findMany({
      where: {
        eventType: f.complianceEventType,
        status: { notIn: ["CANCELLED", "REPORTED"] },
      },
      select: { workerId: true },
    });
    const ids = Array.from(new Set(rows.map((r) => r.workerId)));
    if (ids.length === 0) {
      and.push({ id: { in: [] } });
    } else {
      and.push({ id: { in: ids } });
    }
  }

  if (f.dateFrom && f.dateTo) {
    const [compRows, notifRows] = await Promise.all([
      db.complianceEvent.findMany({
        where: {
          OR: [
            { eventDate: { gte: f.dateFrom, lte: f.dateTo } },
            { reportDeadline: { gte: f.dateFrom, lte: f.dateTo } },
          ],
        },
        select: { workerId: true },
      }),
      db.notificationEvent.findMany({
        where: {
          OR: [
            { dueDate: { gte: f.dateFrom, lte: f.dateTo } },
            {
              reportDeadlineAt: {
                gte: f.dateFrom,
                lte: f.dateTo,
              },
            },
          ],
        },
        select: { workerId: true },
      }),
    ]);
    const ids = Array.from(
      new Set([
        ...compRows.map((r) => r.workerId),
        ...notifRows.map((r) => r.workerId),
      ])
    );
    if (ids.length === 0) {
      and.push({ id: { in: [] } });
    } else {
      and.push({ id: { in: ids } });
    }
  }

  return { AND: and };
}
