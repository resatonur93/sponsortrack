import { NextRequest, NextResponse } from "next/server";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { selfServiceProfileUpdateSchema } from "@/lib/schemas";
import { emitSelfServiceProfileChanges } from "@/lib/self-service-compliance";
import { COOKIE_NAME, verifyWorkerPortalToken } from "@/lib/self-service-token";

export const dynamic = "force-dynamic";

function getSession(req: NextRequest): { workerId: string; tenantId: string } | null {
  const raw = req.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifyWorkerPortalToken(raw);
}

const PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  currentAddress: true,
  phone: true,
  personalEmail: true,
  emergencyContact: true,
  emergencyPhone: true,
  employmentStatus: true,
} as const;

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const worker = await prismaBase.worker.findFirst({
      where: { id: session.workerId, tenantId: session.tenantId },
      select: PROFILE_SELECT,
    });
    if (!worker) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        workerId: worker.id,
        firstName: worker.firstName,
        lastName: worker.lastName,
        workEmail: worker.email,
        employmentStatus: worker.employmentStatus,
        currentAddress: worker.currentAddress,
        phone: worker.phone,
        personalEmail: worker.personalEmail,
        emergencyContact: worker.emergencyContact,
        emergencyPhone: worker.emergencyPhone,
      },
    });
  } catch (e) {
    logger.error("GET /api/self-service/profile failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed = selfServiceProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prismaBase.worker.findFirst({
      where: {
        id: session.workerId,
        tenantId: session.tenantId,
        employmentStatus: { not: "TERMINATED" },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const p = parsed.data;
    const before = {
      currentAddress: existing.currentAddress,
      phone: existing.phone,
      personalEmail: existing.personalEmail,
      emergencyContact: existing.emergencyContact,
      emergencyPhone: existing.emergencyPhone,
    };

    const data: Record<string, unknown> = {};
    if (p.currentAddress !== undefined) data.currentAddress = p.currentAddress;
    if (p.phone !== undefined) data.phone = p.phone;
    if (p.personalEmail !== undefined) data.personalEmail = p.personalEmail;
    if (p.emergencyContact !== undefined) data.emergencyContact = p.emergencyContact;
    if (p.emergencyPhone !== undefined) data.emergencyPhone = p.emergencyPhone;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 }
      );
    }

    const updated = await prismaBase.worker.update({
      where: { id: session.workerId },
      data: data as object,
      select: PROFILE_SELECT,
    });

    const after = {
      currentAddress: updated.currentAddress,
      phone: updated.phone,
      personalEmail: updated.personalEmail,
      emergencyContact: updated.emergencyContact,
      emergencyPhone: updated.emergencyPhone,
    };

    await emitSelfServiceProfileChanges({
      tenantId: session.tenantId,
      workerId: session.workerId,
      before,
      after,
      workerName: `${updated.firstName} ${updated.lastName}`,
      cosReference: existing.cosReference,
    });

    return NextResponse.json({
      data: {
        workerId: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        workEmail: updated.email,
        employmentStatus: updated.employmentStatus,
        currentAddress: updated.currentAddress,
        phone: updated.phone,
        personalEmail: updated.personalEmail,
        emergencyContact: updated.emergencyContact,
        emergencyPhone: updated.emergencyPhone,
      },
    });
  } catch (e) {
    logger.error("PUT /api/self-service/profile failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
