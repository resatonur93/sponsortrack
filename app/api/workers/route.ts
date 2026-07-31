import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { workerCreateSchema } from "@/lib/schemas";
import { visaNotificationsToCreate } from "@/lib/notification-rules";
import { logger } from "@/lib/logger";
import { nextResponseForPrismaUniqueViolation } from "@/lib/prisma-unique-response";
import { getWorkersList } from "@/lib/workers/get-workers-list";
import type { WorkerListFilter } from "@/lib/workers/types";

export const dynamic = "force-dynamic";

const WORKER_LIST_FILTERS = new Set<WorkerListFilter>([
  "all",
  "active",
  "pending_onboarding",
  "visa_expiring",
  "visa_expired",
  "suspended",
  "terminated",
]);

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const filterRaw = searchParams.get("filter");
    const listFilter: WorkerListFilter =
      filterRaw && WORKER_LIST_FILTERS.has(filterRaw as WorkerListFilter)
        ? (filterRaw as WorkerListFilter)
        : "all";

    return await withTenant(user, req, async () => {
      const data = await getWorkersList(
        user.tenantId,
        prisma,
        { search: search || undefined, listFilter },
        new Date()
      );
      return NextResponse.json({ data });
    });
  } catch (error) {
    logger.error("GET /api/workers failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json();
    const parsed = workerCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      if (d.lineManagerId) {
        const mgr = await prisma.user.findFirst({
          where: {
            id: d.lineManagerId,
            tenantId: user.tenantId,
            isActive: true,
          },
        });
        if (!mgr) {
          return NextResponse.json(
            { error: "Line manager bulunamadı veya bu kuruma ait değil." },
            { status: 400 }
          );
        }
      }

      const worker = await prisma.worker.create({
        data: {
          tenantId: user.tenantId,
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          phone: d.phone ?? undefined,
          workPhone: d.workPhone ?? undefined,
          personalEmail: d.personalEmail ?? undefined,
          nationality: d.nationality,
          dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : undefined,
          passportNumber: d.passportNumber ?? undefined,
          brpNumber: d.brpNumber ?? undefined,
          nationalInsuranceNumber: d.nationalInsuranceNumber ?? undefined,
          visaType: d.visaType,
          cosReference: d.cosReference,
          cosAssignDate: new Date(d.cosAssignDate),
          cosExpiryDate: new Date(d.cosExpiryDate),
          visaStartDate: d.visaStartDate
            ? new Date(d.visaStartDate)
            : undefined,
          visaExpiryDate: d.visaExpiryDate
            ? new Date(d.visaExpiryDate)
            : undefined,
          jobTitle: d.jobTitle,
          occupationCode: d.occupationCode,
          jobDescription: d.jobDescription ?? undefined,
          contractJobDescription: d.contractJobDescription ?? undefined,
          actualDayToDayDuties: d.actualDayToDayDuties ?? undefined,
          occupationCodeJustification:
            d.occupationCodeJustification ?? undefined,
          salary: d.salary,
          contractedHoursPerWeek: d.contractedHoursPerWeek ?? undefined,
          applicableSalaryThreshold: d.applicableSalaryThreshold ?? undefined,
          workLocation: d.workLocation,
          employmentStatus: d.employmentStatus ?? "PENDING_START",
          employmentStartDate: d.employmentStartDate
            ? new Date(d.employmentStartDate)
            : undefined,
          lineManagerId: d.lineManagerId ?? undefined,
          lineManagerName: d.lineManagerName ?? undefined,
          lineManagerEmail: d.lineManagerEmail ?? undefined,
          currentAddress: d.currentAddress ?? undefined,
          emergencyContact: d.emergencyContact ?? undefined,
          emergencyPhone: d.emergencyPhone ?? undefined,
          rightToWorkLastCheckedAt: d.rightToWorkLastCheckedAt
            ? new Date(d.rightToWorkLastCheckedAt)
            : undefined,
          isOffshoreWorker: d.isOffshoreWorker ?? false,
          vesselName: d.vesselName ?? undefined,
          sponsorshipStartDate: d.sponsorshipStartDate
            ? new Date(d.sponsorshipStartDate)
            : undefined,
          sponsorshipEndDate: d.sponsorshipEndDate
            ? new Date(d.sponsorshipEndDate)
            : undefined,
          complianceRiskLevel: d.complianceRiskLevel,
          requiresAtasCertificate: d.requiresAtasCertificate ?? false,
          preRegistrationNurse: d.preRegistrationNurse ?? false,
        },
      });

      if (worker.visaExpiryDate) {
        const rows = visaNotificationsToCreate(
          worker.id,
          user.tenantId,
          worker.visaExpiryDate,
          {
            firstName: worker.firstName,
            lastName: worker.lastName,
            cosReference: worker.cosReference,
          }
        );
        if (rows.length > 0) {
          await prisma.notificationEvent.createMany({
            data: rows,
            skipDuplicates: true,
          });
        }
      }

      logger.info("worker created", {
        workerId: worker.id,
        tenantId: user.tenantId,
      });
      return NextResponse.json({ data: worker }, { status: 201 });
    });
  } catch (error: unknown) {
    const prismaResp = nextResponseForPrismaUniqueViolation(error);
    if (prismaResp) return prismaResp;

    logger.error("POST /api/workers failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
