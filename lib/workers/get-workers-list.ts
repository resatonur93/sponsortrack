import type { Prisma } from "@prisma/client";
import type { PrismaTenantClient } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { startOfDay } from "@/lib/dates";
import {
  getVisaExpiryVisualState,
  visaExpiringPrismaWindow,
} from "@/lib/compliance/status-calculator";
import { deriveWorkerListStatus } from "./worker-status";
import type { WorkerListFilters, WorkerListItem } from "./types";

function buildSearchWhere(search: string): Prisma.WorkerWhereInput {
  const raw = search.trim();
  if (!raw) return {};

  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    return {
      AND: tokens.map(
        (tok): Prisma.WorkerWhereInput => ({
          OR: [
            { firstName: { contains: tok, mode: "insensitive" } },
            { lastName: { contains: tok, mode: "insensitive" } },
            { email: { contains: tok, mode: "insensitive" } },
            { personalEmail: { contains: tok, mode: "insensitive" } },
            { cosReference: { contains: tok, mode: "insensitive" } },
          ],
        })
      ),
    };
  }

  const t = tokens[0] ?? raw;
  return {
    OR: [
      { firstName: { contains: t, mode: "insensitive" } },
      { lastName: { contains: t, mode: "insensitive" } },
      { email: { contains: t, mode: "insensitive" } },
      { personalEmail: { contains: t, mode: "insensitive" } },
      { cosReference: { contains: t, mode: "insensitive" } },
    ],
  };
}

function buildListFilterWhere(
  listFilter: NonNullable<WorkerListFilters["listFilter"]>,
  now: Date
): Prisma.WorkerWhereInput {
  const dayStart = startOfDay(now);
  const expiring = visaExpiringPrismaWindow(now);

  switch (listFilter) {
    case "all":
      return {};
    case "active":
      return { employmentStatus: "ACTIVE" };
    case "pending_onboarding":
      return { employmentStatus: "PENDING_START" };
    case "visa_expiring":
      return {
        employmentStatus: { not: "TERMINATED" },
        visaExpiryDate: {
          not: null,
          gte: expiring.gte,
          lte: expiring.lte,
        },
      };
    case "visa_expired":
      return {
        employmentStatus: { not: "TERMINATED" },
        visaExpiryDate: { not: null, lt: dayStart },
      };
    case "suspended":
      return { employmentStatus: "SUSPENDED" };
    case "terminated":
      return { employmentStatus: "TERMINATED" };
    default:
      return {};
  }
}

/**
 * Kiracı kapsamlı liste. `withTenant` içinde çağrılmalı; `tenantId` oturumla eşleşmelidir.
 */
export async function getWorkersList(
  tenantId: string,
  db: PrismaTenantClient,
  filters: WorkerListFilters = {},
  now: Date = new Date()
): Promise<WorkerListItem[]> {
  const ctx = getTenantContext();
  if (!ctx || ctx.tenantId !== tenantId) {
    throw new Error(
      "getWorkersList: tenantId eşleşmiyor veya tenant bağlamı yok (withTenant kullanın)."
    );
  }

  const listFilter = filters.listFilter ?? "all";
  const searchWhere = filters.search
    ? buildSearchWhere(filters.search)
    : {};
  const filterWhere = buildListFilterWhere(listFilter, now);

  const clauses: Prisma.WorkerWhereInput[] = [];
  if (Object.keys(searchWhere).length > 0) clauses.push(searchWhere);
  if (Object.keys(filterWhere).length > 0) clauses.push(filterWhere);
  const where: Prisma.WorkerWhereInput =
    clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0]! : { AND: clauses };

  const rows = await db.worker.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      cosReference: true,
      employmentStatus: true,
      visaExpiryDate: true,
    },
  });

  return rows.map((w) => {
    const visaUrgency = getVisaExpiryVisualState(w.visaExpiryDate, now);
    const derivedStatus = deriveWorkerListStatus(
      {
        employmentStatus: w.employmentStatus,
        visaExpiryDate: w.visaExpiryDate,
      },
      now
    );
    return {
      id: w.id,
      firstName: w.firstName,
      lastName: w.lastName,
      email: w.email,
      cosReference: w.cosReference,
      employmentStatus: w.employmentStatus,
      visaExpiryDate: w.visaExpiryDate
        ? w.visaExpiryDate.toISOString()
        : null,
      derivedStatus,
      visaUrgency,
    };
  });
}
