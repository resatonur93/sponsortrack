import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { parseDocumentMetadata } from "@/lib/document-metadata";
import { getDocumentExpiryBand } from "@/lib/document-expiry-status";
import {
  evaluateMissingDocuments,
  type MissingDocumentItem,
} from "@/lib/required-documents";
import type { Document } from "@prisma/client";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export type TimelineItem = {
  document: Document;
  display: Record<string, unknown>;
  status: ReturnType<typeof getDocumentExpiryBand>;
};

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
          documents: {
            where: { isDeleted: false },
            orderBy: { uploadDate: "desc" },
          },
        },
      });
      if (!worker) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const now = new Date();
      const items: TimelineItem[] = worker.documents.map((doc) => ({
        document: doc,
        display: parseDocumentMetadata(doc.documentType, doc.metadata),
        status: getDocumentExpiryBand(doc.expiryDate, now),
      }));

      const missingRequired: MissingDocumentItem[] = evaluateMissingDocuments(
        worker,
        worker.documents,
        now
      );

      return NextResponse.json({ data: { items, missingRequired } });
    });
  } catch (error) {
    logger.error("GET documents timeline failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
