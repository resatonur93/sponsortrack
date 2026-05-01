import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { documentVerifySchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

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
    const parsed = documentVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const doc = await prisma.document.findFirst({
        where: { id: params.id },
      });
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const updated = await prisma.document.update({
        where: { id: params.id },
        data: {
          verifiedAt: new Date(),
          verifiedByUserId: user.id,
          verificationNote: parsed.data.verificationNote ?? undefined,
          complianceRecordStatus: "VERIFIED",
        },
      });
      return NextResponse.json({ data: updated });
    });
  } catch (error) {
    logger.error("POST document verify failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
