import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { normalizeEmail, setupBodySchema } from "@/lib/registration";

export async function POST(req: Request): Promise<NextResponse> {
  try {
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
        { error: "Bu e-posta ile zaten bir hesap var. Giriş yapın veya başka e-posta kullanın." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(d.password, 12);

    try {
      await prismaBase.$transaction(
        async (tx) => {
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
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const target = (e.meta?.target as string[] | undefined) ?? [];
        if (target.some((t) => String(t).includes("licenceNumber"))) {
          return NextResponse.json(
            { error: "Bu lisans numarası zaten kullanılıyor." },
            { status: 409 }
          );
        }
        if (target.some((t) => String(t).includes("email"))) {
          return NextResponse.json(
            { error: "Bu e-posta ile zaten bir hesap var." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "Bu bilgilerle kayıt mümkün değil (benzersiz alan çakışması)." },
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
