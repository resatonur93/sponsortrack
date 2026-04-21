import { Prisma, PrismaClient } from "@prisma/client";
import { getTenantContext } from "@/lib/tenant-context";
import { logger } from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
};

export const prismaBase =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = prismaBase;
}

const TENANT_MODELS = new Set([
  "User",
  "Worker",
  "NotificationEvent",
  "ComplianceEvent",
  "Alert",
  "Document",
  "DocumentVault",
  "AuditLog",
  "WorkerChangeLog",
  "AbsenceRecord",
  "OrganisationChange",
  "RightToWorkCheck",
  "SalaryHistory",
  "RoleCompliance",
  "SalaryRecord",
]);

function toDelegateKey(model: string): keyof PrismaClient {
  return (model.charAt(0).toLowerCase() +
    model.slice(1)) as keyof PrismaClient;
}

function mergeWhere(where: object | undefined, tenantId: string): object {
  if (!where || Object.keys(where).length === 0) {
    return { tenantId };
  }
  return { AND: [where, { tenantId }] };
}

export const prisma = prismaBase.$extends({
  name: "tenant-scope",
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        const ctx = getTenantContext();
        if (!ctx?.tenantId || !TENANT_MODELS.has(model)) {
          return query(args);
        }
        const nextArgs = {
          ...args,
          where: mergeWhere(args.where as object | undefined, ctx.tenantId),
        } as Parameters<typeof query>[0];
        return query(nextArgs);
      },
      async findFirst({ model, args, query }) {
        const ctx = getTenantContext();
        if (!ctx?.tenantId || !TENANT_MODELS.has(model)) {
          return query(args);
        }
        const nextArgs = {
          ...args,
          where: mergeWhere(args.where as object | undefined, ctx.tenantId),
        } as Parameters<typeof query>[0];
        return query(nextArgs);
      },
      async count({ model, args, query }) {
        const ctx = getTenantContext();
        if (!ctx?.tenantId || !TENANT_MODELS.has(model)) {
          return query(args);
        }
        const nextArgs = {
          ...args,
          where: mergeWhere(args.where as object | undefined, ctx.tenantId),
        } as Parameters<typeof query>[0];
        return query(nextArgs);
      },
      async findUnique({ model, args, query }) {
        const ctx = getTenantContext();
        if (!ctx?.tenantId || !TENANT_MODELS.has(model)) {
          return query(args);
        }
        const where = args.where as { id?: string } | undefined;
        const id = where?.id;
        if (!id) {
          return query(args);
        }
        const key = toDelegateKey(model);
        const delegate = prismaBase[key] as {
          findFirst: (a: object) => Promise<unknown>;
        };
        return delegate.findFirst({
          where: { id, tenantId: ctx.tenantId },
          include: (args as { include?: object }).include,
          select: (args as { select?: object }).select,
        });
      },
      async create({ model, args, query }) {
        const ctx = getTenantContext();
        if (!ctx?.tenantId || !TENANT_MODELS.has(model)) {
          return query(args);
        }
        if (model === "AuditLog") {
          return query(args);
        }
        const data = {
          ...(args as { data: Record<string, unknown> }).data,
          tenantId: ctx.tenantId,
        };
        const created = await query({
          ...args,
          data,
        } as Parameters<typeof query>[0]);
        await writeAuditSafe(model, "CREATE", created, ctx).catch((e) =>
          logger.error("audit log failed", e, { model })
        );
        return created;
      },
      async createMany({ model, args, query }) {
        const ctx = getTenantContext();
        if (!ctx?.tenantId || !TENANT_MODELS.has(model)) {
          return query(args);
        }
        const payload = args as {
          data: Record<string, unknown> | Record<string, unknown>[];
        };
        const data = Array.isArray(payload.data)
          ? payload.data.map((d) => ({ ...d, tenantId: ctx!.tenantId }))
          : { ...payload.data, tenantId: ctx.tenantId };
        return query({
          ...args,
          data,
        } as Parameters<typeof query>[0]);
      },
      async update({ model, args, query }) {
        const ctx = getTenantContext();
        if (!ctx?.tenantId || !TENANT_MODELS.has(model)) {
          return query(args);
        }
        if (model === "AuditLog") {
          return query(args);
        }
        const prev = await fetchPrevious(model, args.where, ctx.tenantId);
        const updated = await query({
          ...args,
          where: mergeWhere(args.where as object | undefined, ctx.tenantId),
        } as Parameters<typeof query>[0]);
        await writeAuditSafe(model, "UPDATE", updated, ctx, prev).catch((e) =>
          logger.error("audit log failed", e, { model })
        );
        return updated;
      },
      async updateMany({ model, args, query }) {
        const ctx = getTenantContext();
        if (!ctx?.tenantId || !TENANT_MODELS.has(model)) {
          return query(args);
        }
        return query({
          ...args,
          where: mergeWhere(args.where as object | undefined, ctx.tenantId),
        } as Parameters<typeof query>[0]);
      },
      async delete({ model, args, query }) {
        const ctx = getTenantContext();
        if (!ctx?.tenantId || !TENANT_MODELS.has(model)) {
          return query(args);
        }
        if (model === "AuditLog") {
          return query(args);
        }
        const prev = await fetchPrevious(model, args.where, ctx.tenantId);
        const deleted = await query({
          ...args,
          where: mergeWhere(args.where as object | undefined, ctx.tenantId),
        } as Parameters<typeof query>[0]);
        await writeAuditSafe(model, "DELETE", deleted, ctx, prev).catch((e) =>
          logger.error("audit log failed", e, { model })
        );
        return deleted;
      },
      async deleteMany({ model, args, query }) {
        const ctx = getTenantContext();
        if (!ctx?.tenantId || !TENANT_MODELS.has(model)) {
          return query(args);
        }
        return query({
          ...args,
          where: mergeWhere(args.where as object | undefined, ctx.tenantId),
        } as Parameters<typeof query>[0]);
      },
    },
  },
});

async function fetchPrevious(
  model: string,
  where: unknown,
  tenantId: string
): Promise<unknown> {
  const delegate = prismaBase[toDelegateKey(model)] as {
    findFirst: (a: object) => Promise<unknown>;
  };
  return delegate.findFirst({
    where: mergeWhere(where as object | undefined, tenantId) as object,
  });
}

async function writeAuditSafe(
  model: string,
  action: string,
  entity: unknown,
  ctx: { tenantId: string; userId: string; ipAddress?: string; userAgent?: string },
  before?: unknown
): Promise<void> {
  const id =
    entity && typeof entity === "object" && "id" in entity
      ? String((entity as { id: string }).id)
      : "unknown";
  await prismaBase.auditLog.create({
    data: {
      action: `${model}.${action}`,
      entityType: model,
      entityId: id,
      changes: (before
        ? { before, after: entity }
        : { after: entity }) as Prisma.InputJsonValue,
      performedBy: ctx.userId,
      tenantId: ctx.tenantId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
  });
}
