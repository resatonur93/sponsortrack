import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

function isCosReferenceTenantUniqueViolation(
  err: Prisma.PrismaClientKnownRequestError
): boolean {
  if (err.code !== "P2002") return false;
  const target = err.meta?.target;
  if (Array.isArray(target))
    return target.includes("cosReference") && target.includes("tenantId");
  return err.message.includes("cosReference") && err.message.includes("tenantId");
}

/** `P2002` → 409 + TR/EN gövdesi; aksi halde null (çağıran genel 500 yazabilir). */
export function nextResponseForPrismaUniqueViolation(
  err: unknown
): NextResponse | null {
  if (
    !(err instanceof Prisma.PrismaClientKnownRequestError) ||
    err.code !== "P2002"
  ) {
    return null;
  }
  if (isCosReferenceTenantUniqueViolation(err)) {
    return NextResponse.json(
      {
        error:
          "This CoS reference is already registered for your organisation.",
        errorTr:
          "Bu CoS referansı bu kuruluş için zaten kayıtlı. Mevcut çalışanı düzenleyin veya referansı kontrol edin.",
        code: "DUPLICATE_COS_REFERENCE",
      },
      { status: 409 }
    );
  }
  return NextResponse.json(
    {
      error: "A record with this unique value already exists.",
      errorTr: "Bu benzersiz alan başka bir kayıtta kullanılıyor.",
      code: "UNIQUE_CONSTRAINT",
    },
    { status: 409 }
  );
}
