import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { workerCreateSchema } from "@/lib/schemas";
import { visaNotificationsToCreate } from "@/lib/notification-rules";
import { logger } from "@/lib/logger";
import type { EmploymentStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status") as EmploymentStatus | null;
    const visaExpiringSoon = searchParams.get("visaExpiringSoon") === "true";

    return await withTenant(user, req, async () => {
      const where: Prisma.WorkerWhereInput = {};
      if (status) {
        where.employmentStatus = status;
      }
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { cosReference: { contains: search, mode: "insensitive" } },
        ];
      }
      if (visaExpiringSoon) {
        const soon = new Date();
        soon.setDate(soon.getDate() + 90);
        where.visaExpiryDate = { not: null, lte: soon, gte: new Date() };
      }

      const workers = await prisma.worker.findMany({
        where,
        orderBy: { lastName: "asc" },
      });
      return NextResponse.json({ data: workers });
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

      logger.info("worker created", { workerId: worker.id, tenantId: user.tenantId });
      return NextResponse.json({ data: worker }, { status: 201 });
    });
  } catch (error) {
    logger.error("POST /api/workers failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
