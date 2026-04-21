import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { smsDraftMarkSentSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PUT(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    const parsed = smsDraftMarkSentSchema.safeParse(
      typeof body === "object" && body !== null ? body : {}
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const existing = await prisma.smsReportDraft.findFirst({
        where: { id: params.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (!existing.approvedAt) {
        return NextResponse.json(
          { error: "Approve the draft before marking sent" },
          { status: 409 }
        );
      }
      if (existing.sentToHO) {
        return NextResponse.json(
          { error: "Already marked sent" },
          { status: 409 }
        );
      }

      const sentAt =
        parsed.data.sentAt && parsed.data.sentAt !== ""
          ? new Date(parsed.data.sentAt)
          : new Date();

      const updated = await prisma.smsReportDraft.update({
        where: { id: params.id },
        data: {
          sentToHO: true,
          sentAt,
        },
        include: {
          event: {
            select: {
              id: true,
              eventType: true,
              worker: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  cosReference: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({ data: updated });
    });
  } catch (e) {
    logger.error("PUT /api/sms-drafts/[id]/mark-sent failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
