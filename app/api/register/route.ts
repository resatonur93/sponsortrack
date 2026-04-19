import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  normalizeEmail,
  registerBodySchema,
  timingSafeEqualStrings,
} from "@/lib/registration";

export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.REGISTRATION_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Kayıt kapalı." }, { status: 403 });
  }

  try {
    const body: unknown = await req.json();
    const parsed = registerBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    if (!timingSafeEqualStrings(d.registrationSecret, secret)) {
      return NextResponse.json({ error: "Kayıt anahtarı geçersiz." }, { status: 401 });
    }

    const email = normalizeEmail(d.email);

    const dupUser = await prismaBase.user.findUnique({ where: { email } });
    if (dupUser) {
      return NextResponse.json(
        { error: "Bu e-posta zaten kayıtlı." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(d.password, 12);

    try {
      await prismaBase.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            companyName: d.companyName,
            licenceNumber: d.licenceNumber,
            address: d.address || undefined,
          },
        });
        await tx.user.create({
          data: {
            email,
            password: passwordHash,
            firstName: d.firstName,
            lastName: d.lastName,
            role: Role.AUTHORISING_OFFICER,
            tenantId: tenant.id,
          },
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json(
          { error: "Bu lisans numarası veya e-posta zaten kullanılıyor." },
          { status: 409 }
        );
      }
      throw e;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("register failed", { err: e });
    return NextResponse.json(
      { error: "Kayıt sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
