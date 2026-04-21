import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role, LeadStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/api-context";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuthorisingOfficer } from "@/lib/admin-auth";
import { convertLeadBodySchema, normalizeLeadEmail } from "@/lib/leads";
import { createLeadActivity } from "@/lib/lead-activity";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    if (!requireAuthorisingOfficer(sessionUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const lead = await prismaBase.lead.findFirst({
      where: { id: params.id, isDeleted: false },
    });
    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (lead.status === LeadStatus.CONVERTED) {
      return NextResponse.json(
        { error: "Bu lead zaten dönüştürülmüş." },
        { status: 400 }
      );
    }

    const body: unknown = await req.json();
    const parsed = convertLeadBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { licenceNumber, password } = parsed.data;
    const email = normalizeLeadEmail(lead.email);

    const dupUser = await prismaBase.user.findUnique({ where: { email } });
    if (dupUser) {
      return NextResponse.json(
        { error: "Bu e-posta ile zaten kullanıcı var." },
        { status: 409 }
      );
    }
    const dupLicence = await prismaBase.tenant.findUnique({
      where: { licenceNumber },
    });
    if (dupLicence) {
      return NextResponse.json(
        { error: "Bu lisans numarası kullanılıyor." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const companyName = lead.companyName?.trim() || "New organisation";

    const result = await prismaBase.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          companyName,
          licenceNumber,
          address: undefined,
        },
      });
      const newUser = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          firstName: lead.name?.split(/\s+/)[0] || "Admin",
          lastName: lead.name?.split(/\s+/).slice(1).join(" ") || "User",
          role: Role.AUTHORISING_OFFICER,
          tenantId: tenant.id,
        },
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: { status: LeadStatus.CONVERTED },
      });
      return { tenant, user: newUser };
    });

    await createLeadActivity({
      leadId: lead.id,
      type: "CONVERTED",
      message: `Tenant oluşturuldu: ${result.tenant.id}`,
      userId: sessionUser.id,
      metadata: {
        tenantId: result.tenant.id,
        userId: result.user.id,
        licenceNumber,
      },
    });

    return NextResponse.json({
      data: {
        tenantId: result.tenant.id,
        userId: result.user.id,
      },
    });
  } catch (e) {
    logger.error("POST /api/admin/leads/[id]/convert failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
