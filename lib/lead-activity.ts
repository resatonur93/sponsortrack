import type { Prisma } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";

export async function createLeadActivity(params: {
  leadId: string;
  type: string;
  message?: string | null;
  userId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prismaBase.leadActivity.create({
    data: {
      leadId: params.leadId,
      type: params.type,
      message: params.message ?? undefined,
      userId: params.userId ?? undefined,
      metadata: params.metadata,
    },
  });
}
