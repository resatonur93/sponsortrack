import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { evaluateMissingDocuments } from "@/lib/required-documents";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await withTenant(user, req, async () => {
      const worker = await prisma.worker.findUnique({
        where: { id: params.id },
        include: {
          documents: { where: { isDeleted: false } },
        },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const missing = evaluateMissingDocuments(
        worker,
        worker.documents,
        new Date()
      );
      return NextResponse.json({ data: { missing } });
    });
  } catch (error) {
    logger.error("GET missing-documents failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
