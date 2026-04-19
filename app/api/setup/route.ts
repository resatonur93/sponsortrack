import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { normalizeEmail, setupBodySchema } from "@/lib/registration";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const existing = await prismaBase.user.count();
    if (existing > 0) {
      return NextResponse.json(
        { error: "Kurulum zaten tamamlandı. Giriş yapın." },
        { status: 403 }
      );
    }

    const body: unknown = await req.json();
    const parsed = setupBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const email = normalizeEmail(d.email);

    const dup = await prismaBase.user.findUnique({ where: { email } });
    if (dup) {
      return NextResponse.json(
        { error: "Bu e-posta zaten kayıtlı." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(d.password, 12);

    try {
      await prismaBase.$transaction(
        async (tx) => {
          const again = await tx.user.count();
          if (again > 0) {
            throw new Error("SETUP_ALREADY_COMPLETED");
          }
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
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (e) {
      if (e instanceof Error && e.message === "SETUP_ALREADY_COMPLETED") {
        return NextResponse.json(
          { error: "Kurulum zaten tamamlandı. Giriş yapın." },
          { status: 403 }
        );
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json(
          { error: "Bu lisans numarası zaten kullanılıyor." },
          { status: 409 }
        );
      }
      throw e;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("setup failed", { err: e });
    return NextResponse.json(
      { error: "Kurulum sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
