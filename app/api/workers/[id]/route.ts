import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { workerUpdateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { visaNotificationsToCreate } from "@/lib/notification-rules";
import { buildComplianceEventData } from "@/lib/compliance-event-factory";
import { getReportDeadlineForEvent } from "@/lib/deadline-rules";
import { createComplianceReportingEvent } from "@/lib/compliance-reporting-engine";
import { normalizeEmail } from "@/lib/registration";
import { nextResponseForPrismaUniqueViolation } from "@/lib/prisma-unique-response";
import { computeWorkerRiskSnapshot } from "@/lib/risk/snapshot";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function GET(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = context.params;

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findUnique({
        where: { id },
        include: {
          lineManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          roleCompliance: {
            select: { lastReviewed: true, reviewedBy: true },
          },
          documents: { where: { isDeleted: false }, orderBy: { uploadDate: "desc" } },
          notifications: { orderBy: { dueDate: "desc" }, take: 150 },
          changeLogs: { orderBy: { createdAt: "desc" }, take: 100 },
          absences: { orderBy: { startDate: "desc" }, take: 100 },
          supplementaryEmployments: { orderBy: { startDate: "desc" }, take: 100 },
          rtwChecks: { orderBy: { checkedAt: "desc" }, take: 50 },
          salaryHistory: { orderBy: { effectiveDate: "desc" }, take: 30 },
        },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const riskSnapshot = computeWorkerRiskSnapshot({
        notifications: worker.notifications,
        documents: worker.documents,
      });
      return NextResponse.json({
        data: { ...worker, riskSnapshot },
      });
    });
  } catch (error) {
    logger.error("GET /api/workers/[id] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = context.params;
    const body: unknown = await req.json();
    const parsed = workerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const existing = await prisma.worker.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const d = parsed.data;

      if (d.lineManagerId !== undefined && d.lineManagerId) {
        const mgr = await prisma.user.findFirst({
          where: {
            id: d.lineManagerId,
            tenantId: existing.tenantId,
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

      if (
        d.salary !== undefined &&
        d.salary < existing.salary &&
        (!d.salaryReductionJustification ||
          d.salaryReductionJustification.trim().length < 5)
      ) {
        return NextResponse.json(
          {
            error:
              "Maaş düşüşü için gerekçe zorunludur (en az 5 karakter).",
          },
          { status: 400 }
        );
      }

      const data: Record<string, unknown> = {};

      const set = (key: string, v: unknown) => {
        if (v !== undefined) data[key] = v;
      };

      set("firstName", d.firstName);
      set("lastName", d.lastName);
      set("email", d.email);
      set("phone", d.phone ?? undefined);
      set("workPhone", d.workPhone ?? undefined);
      set("personalEmail", d.personalEmail ?? undefined);
      set("nationality", d.nationality);
      set("dateOfBirth", d.dateOfBirth ? new Date(d.dateOfBirth) : undefined);
      set("passportNumber", d.passportNumber ?? undefined);
      set("brpNumber", d.brpNumber ?? undefined);
      set(
        "nationalInsuranceNumber",
        d.nationalInsuranceNumber ?? undefined
      );
      set("visaType", d.visaType);
      set("cosReference", d.cosReference);
      set(
        "cosAssignDate",
        d.cosAssignDate ? new Date(d.cosAssignDate) : undefined
      );
      set(
        "cosExpiryDate",
        d.cosExpiryDate ? new Date(d.cosExpiryDate) : undefined
      );
      set(
        "visaStartDate",
        d.visaStartDate ? new Date(d.visaStartDate) : undefined
      );
      set(
        "visaExpiryDate",
        d.visaExpiryDate ? new Date(d.visaExpiryDate) : undefined
      );
      set("jobTitle", d.jobTitle);
      set("occupationCode", d.occupationCode);
      set("jobDescription", d.jobDescription ?? undefined);
      set("contractJobDescription", d.contractJobDescription ?? undefined);
      set("actualDayToDayDuties", d.actualDayToDayDuties ?? undefined);
      set(
        "occupationCodeJustification",
        d.occupationCodeJustification ?? undefined
      );
      set("salary", d.salary);
      set("contractedHoursPerWeek", d.contractedHoursPerWeek ?? undefined);
      set("workLocation", d.workLocation);
      set("employmentStatus", d.employmentStatus);
      set("isOffshoreWorker", d.isOffshoreWorker);
      set("vesselName", d.vesselName ?? undefined);
      set(
        "employmentStartDate",
        d.employmentStartDate ? new Date(d.employmentStartDate) : undefined
      );
      set("lineManagerId", d.lineManagerId);
      set("lineManagerName", d.lineManagerName ?? undefined);
      set("lineManagerEmail", d.lineManagerEmail ?? undefined);
      set("currentAddress", d.currentAddress ?? undefined);
      set("emergencyContact", d.emergencyContact ?? undefined);
      set("emergencyPhone", d.emergencyPhone ?? undefined);
      set(
        "rightToWorkLastCheckedAt",
        d.rightToWorkLastCheckedAt
          ? new Date(d.rightToWorkLastCheckedAt)
          : undefined
      );
      set(
        "sponsorshipStartDate",
        d.sponsorshipStartDate ? new Date(d.sponsorshipStartDate) : undefined
      );
      set(
        "sponsorshipEndDate",
        d.sponsorshipEndDate ? new Date(d.sponsorshipEndDate) : undefined
      );
      set("requiresAtasCertificate", d.requiresAtasCertificate);
      set("preRegistrationNurse", d.preRegistrationNurse);

      if (d.employmentStatus === "TERMINATED" && d.sponsorshipEndDate === undefined) {
        data.sponsorshipEndDate = new Date();
      }

      const updated = await prisma.worker.update({
        where: { id },
        data: data as object,
      });

      const wName = `${updated.firstName} ${updated.lastName}`;

      if (d.salary !== undefined && d.salary !== existing.salary) {
        await prisma.salaryHistory.create({
          data: {
            workerId: id,
            tenantId: user.tenantId,
            effectiveDate: new Date(),
            oldSalary: existing.salary,
            newSalary: d.salary,
            justification: d.salaryReductionJustification ?? undefined,
            createdByUserId: user.id,
          },
        });
      }

      if (d.salary !== undefined && d.salary < existing.salary) {
        const occurred = new Date();
        const deadline = getReportDeadlineForEvent("SALARY_REDUCTION", occurred);
        const key = `${id}-SALARY_REDUCTION-${Date.now()}`;
        await prisma.notificationEvent.create({
          data: buildComplianceEventData({
            workerId: id,
            tenantId: user.tenantId,
            eventType: "SALARY_REDUCTION",
            idempotencyKey: key,
            dueDate: deadline,
            reportDeadlineAt: deadline,
            occurredAt: occurred,
            workerName: wName,
            cosReference: updated.cosReference,
            metadata: {
              oldSalary: existing.salary,
              newSalary: d.salary,
              justification: d.salaryReductionJustification ?? null,
            },
          }),
        });
        await createComplianceReportingEvent({
          tenantId: user.tenantId,
          workerId: id,
          eventType: "SALARY_REDUCTION",
          eventDate: occurred,
          workerName: wName,
          cosReference: updated.cosReference,
          notes: d.salaryReductionJustification ?? null,
        });
      }

      if (
        d.workLocation !== undefined &&
        d.workLocation !== existing.workLocation
      ) {
        const occurred = new Date();
        const deadline = getReportDeadlineForEvent(
          "WORK_LOCATION_CHANGE",
          occurred
        );
        const key = `${id}-WORK_LOCATION_CHANGE-${Date.now()}`;
        await prisma.notificationEvent.create({
          data: buildComplianceEventData({
            workerId: id,
            tenantId: user.tenantId,
            eventType: "WORK_LOCATION_CHANGE",
            idempotencyKey: key,
            dueDate: deadline,
            reportDeadlineAt: deadline,
            occurredAt: occurred,
            workerName: wName,
            cosReference: updated.cosReference,
            metadata: {
              oldLocation: existing.workLocation,
              newLocation: d.workLocation,
            },
          }),
        });
        await createComplianceReportingEvent({
          tenantId: user.tenantId,
          workerId: id,
          eventType: "WORK_LOCATION_CHANGE",
          eventDate: occurred,
          workerName: wName,
          cosReference: updated.cosReference,
          notes: `Location: ${existing.workLocation} → ${d.workLocation}`,
        });
      }

      if (d.employmentStatus === "ACTIVE" && existing.employmentStatus !== "ACTIVE") {
        await prisma.notificationEvent.updateMany({
          where: {
            workerId: id,
            eventType: "NO_SHOW",
            status: "PENDING",
          },
          data: { status: "CANCELLED" },
        });
        await prisma.complianceEvent.updateMany({
          where: {
            workerId: id,
            eventType: "NO_SHOW_28_DAYS",
            status: "PENDING",
          },
          data: { status: "CANCELLED" },
        });
      }

      if (
        d.employmentStatus === "TERMINATED" &&
        existing.employmentStatus !== "TERMINATED"
      ) {
        const end = updated.sponsorshipEndDate ?? new Date();
        const occurred = new Date();
        const deadline = getReportDeadlineForEvent("SPONSORSHIP_ENDED", occurred);
        const key = `${id}-SPONSORSHIP_ENDED-${Date.now()}`;
        await prisma.notificationEvent.create({
          data: buildComplianceEventData({
            workerId: id,
            tenantId: user.tenantId,
            eventType: "SPONSORSHIP_ENDED",
            idempotencyKey: key,
            dueDate: deadline,
            reportDeadlineAt: deadline,
            occurredAt: occurred,
            workerName: wName,
            cosReference: updated.cosReference,
            metadata: { endedAt: end.toISOString() },
          }),
        });
        await createComplianceReportingEvent({
          tenantId: user.tenantId,
          workerId: id,
          eventType: "SPONSORSHIP_ENDED",
          eventDate: occurred,
          workerName: wName,
          cosReference: updated.cosReference,
          notes: `Sponsorship ended at ${end.toISOString()}`,
        });
      }

      const occurredContact = new Date();
      if (
        d.email !== undefined &&
        normalizeEmail(d.email) !== normalizeEmail(existing.email)
      ) {
        await createComplianceReportingEvent({
          tenantId: user.tenantId,
          workerId: id,
          eventType: "EMAIL_CHANGE",
          eventDate: occurredContact,
          workerName: wName,
          cosReference: updated.cosReference,
          notes: `Work email: ${existing.email} → ${d.email}`,
        });
      }
      if (
        d.personalEmail !== undefined &&
        (existing.personalEmail ?? "") !== (d.personalEmail ?? "")
      ) {
        await createComplianceReportingEvent({
          tenantId: user.tenantId,
          workerId: id,
          eventType: "EMAIL_CHANGE",
          eventDate: occurredContact,
          workerName: wName,
          cosReference: updated.cosReference,
          notes: "Personal email updated",
        });
      }
      if (
        (d.phone !== undefined && d.phone !== existing.phone) ||
        (d.workPhone !== undefined && d.workPhone !== existing.workPhone)
      ) {
        await createComplianceReportingEvent({
          tenantId: user.tenantId,
          workerId: id,
          eventType: "PHONE_CHANGE",
          eventDate: occurredContact,
          workerName: wName,
          cosReference: updated.cosReference,
        });
      }
      if (
        d.occupationCode !== undefined &&
        d.occupationCode !== existing.occupationCode
      ) {
        await createComplianceReportingEvent({
          tenantId: user.tenantId,
          workerId: id,
          eventType: "ROLE_CHANGE",
          eventDate: occurredContact,
          workerName: wName,
          cosReference: updated.cosReference,
          notes: `SOC: ${existing.occupationCode} → ${d.occupationCode}`,
        });
      } else if (
        d.jobTitle !== undefined &&
        d.jobTitle !== existing.jobTitle
      ) {
        await createComplianceReportingEvent({
          tenantId: user.tenantId,
          workerId: id,
          eventType: "PROMOTION_SAME_CODE",
          eventDate: occurredContact,
          workerName: wName,
          cosReference: updated.cosReference,
          notes: `Title: ${existing.jobTitle} → ${d.jobTitle}`,
        });
      }
      if (
        d.isOffshoreWorker !== undefined &&
        d.isOffshoreWorker !== existing.isOffshoreWorker
      ) {
        await createComplianceReportingEvent({
          tenantId: user.tenantId,
          workerId: id,
          eventType: d.isOffshoreWorker
            ? "OFFSHORE_ARRIVAL"
            : "OFFSHORE_DEPARTURE",
          eventDate: occurredContact,
          workerName: wName,
          cosReference: updated.cosReference,
        });
      }

      if (
        d.visaExpiryDate !== undefined &&
        updated.visaExpiryDate &&
        (!existing.visaExpiryDate ||
          updated.visaExpiryDate.getTime() !==
            existing.visaExpiryDate.getTime())
      ) {
        const rows = visaNotificationsToCreate(
          id,
          user.tenantId,
          updated.visaExpiryDate,
          {
            firstName: updated.firstName,
            lastName: updated.lastName,
            cosReference: updated.cosReference,
          }
        );
        if (rows.length > 0) {
          await prisma.notificationEvent.createMany({
            data: rows,
            skipDuplicates: true,
          });
        }
      }

      const fresh = await prisma.worker.findUnique({
        where: { id },
        include: {
          lineManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          documents: { where: { isDeleted: false } },
          notifications: { orderBy: { dueDate: "desc" }, take: 150 },
          changeLogs: { orderBy: { createdAt: "desc" }, take: 100 },
          absences: { orderBy: { startDate: "desc" }, take: 100 },
          supplementaryEmployments: { orderBy: { startDate: "desc" }, take: 100 },
          rtwChecks: { orderBy: { checkedAt: "desc" }, take: 50 },
          salaryHistory: { orderBy: { effectiveDate: "desc" }, take: 30 },
        },
      });

      const riskSnapshot = fresh
        ? computeWorkerRiskSnapshot({
            notifications: fresh.notifications,
            documents: fresh.documents,
          })
        : ("LOW" as const);

      // complianceRiskLevel'ı snapshot ile senkronize et
      if (fresh && fresh.complianceRiskLevel !== riskSnapshot) {
        await prisma.worker.update({
          where: { id },
          data: { complianceRiskLevel: riskSnapshot },
        });
      }

      return NextResponse.json({
        data: fresh ? { ...fresh, riskSnapshot, complianceRiskLevel: riskSnapshot } : null,
      });
    });
  } catch (error) {
    const uniqueRes = nextResponseForPrismaUniqueViolation(error);
    if (uniqueRes) return uniqueRes;
    logger.error("PUT /api/workers/[id] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = context.params;

    return await withTenant(user, req, async () => {
      const existing = await prisma.worker.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const end = new Date();
      const updated = await prisma.worker.update({
        where: { id },
        data: {
          employmentStatus: "TERMINATED",
          sponsorshipEndDate: end,
        },
      });
      const occurred = new Date();
      const deadline = getReportDeadlineForEvent("SPONSORSHIP_ENDED", occurred);
      const key = `${id}-SPONSORSHIP_ENDED-${Date.now()}`;
      const wName = `${updated.firstName} ${updated.lastName}`;
      await prisma.notificationEvent.create({
        data: buildComplianceEventData({
          workerId: id,
          tenantId: user.tenantId,
          eventType: "SPONSORSHIP_ENDED",
          idempotencyKey: key,
          dueDate: deadline,
          reportDeadlineAt: deadline,
          occurredAt: occurred,
          workerName: wName,
          cosReference: updated.cosReference,
          metadata: { reason: "DELETE", endedAt: end.toISOString() },
        }),
      });
      await createComplianceReportingEvent({
        tenantId: user.tenantId,
        workerId: id,
        eventType: "SPONSORSHIP_ENDED",
        eventDate: occurred,
        workerName: wName,
        cosReference: updated.cosReference,
        notes: "Termination via DELETE",
      });
      logger.info("worker terminated via DELETE", { workerId: id });
      return NextResponse.json({ data: updated });
    });
  } catch (error) {
    logger.error("DELETE /api/workers/[id] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
