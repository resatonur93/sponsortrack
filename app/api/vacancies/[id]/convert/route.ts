import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma, prismaBase } from "@/lib/prisma";
import { vacancyConvertSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { nextResponseForPrismaUniqueViolation } from "@/lib/prisma-unique-response";
import { ensureRoleComplianceRecord } from "@/lib/role-compliance-repo";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json();
    const parsed = vacancyConvertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    return await withTenant(user, req, async () => {
      const vacancy = await prisma.vacancy.findFirst({ where: { id: params.id } });
      if (!vacancy) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (vacancy.status === "CONVERTED") {
        return NextResponse.json(
          { error: "Bu vacancy zaten bir çalışana dönüştürülmüş." },
          { status: 409 }
        );
      }

      try {
        const { worker } = await prismaBase.$transaction(async (tx) => {
          const createdWorker = await tx.worker.create({
            data: {
              tenantId: user.tenantId,
              firstName: d.firstName,
              lastName: d.lastName,
              email: d.email,
              nationality: d.nationality,
              visaType: d.visaType,
              cosReference: d.cosReference,
              cosAssignDate: new Date(d.cosAssignDate),
              cosExpiryDate: new Date(d.cosExpiryDate),
              jobTitle: vacancy.jobTitle,
              occupationCode: vacancy.occupationCode,
              jobDescription: vacancy.jobDescription,
              salary: vacancy.proposedSalary,
              workLocation: vacancy.workLocation,
              employmentStartDate: d.employmentStartDate
                ? new Date(d.employmentStartDate)
                : undefined,
            },
          });
          await tx.vacancy.update({
            where: { id: vacancy.id },
            data: { status: "CONVERTED", convertedWorkerId: createdWorker.id },
          });
          return { worker: createdWorker };
        });

        await ensureRoleComplianceRecord(worker.id, user.tenantId, {
          jobDescription: worker.jobDescription,
          occupationCode: worker.occupationCode,
          contractJobDescription: null,
          actualDayToDayDuties: null,
        });

        return NextResponse.json({ data: { workerId: worker.id } }, { status: 201 });
      } catch (err) {
        const uniqueRes = nextResponseForPrismaUniqueViolation(err);
        if (uniqueRes) return uniqueRes;
        throw err;
      }
    });
  } catch (e) {
    logger.error("POST /api/vacancies/[id]/convert failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
