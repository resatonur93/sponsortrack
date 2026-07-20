import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withTenant } from "@/lib/api-context";
import { prisma, prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { escalateExternalSchema } from "@/lib/schemas";
import { isSmtpConfigured, sendSmtpMail } from "@/lib/email/smtp";
import { translate } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: unknown = await req.json().catch(() => ({}));
    const parsed = escalateExternalSchema.safeParse(
      typeof body === "object" && body !== null ? body : {}
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return await withTenant(user, req, async () => {
      const event = await prisma.complianceEvent.findFirst({
        where: { id: params.id, tenantId: user.tenantId },
        include: {
          worker: { select: { firstName: true, lastName: true, cosReference: true } },
        },
      });
      if (!event) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const config = await prismaBase.notificationConfig.findUnique({
        where: { tenantId: user.tenantId },
        select: { externalAdviserEmail: true, externalAdviserName: true },
      });
      const adviserEmail = config?.externalAdviserEmail?.trim();
      if (!adviserEmail) {
        return NextResponse.json(
          {
            error:
              "Danışman e-postası ayarlanmamış. Ayarlar > Bildirimler'den ekleyin.",
          },
          { status: 400 }
        );
      }

      const notes = parsed.data.notes?.trim() || null;
      const now = new Date();
      const updated = await prisma.complianceEvent.update({
        where: { id: params.id },
        data: {
          escalatedAt: now,
          escalatedByUserId: user.id,
          escalationNote: notes,
        },
      });

      if (isSmtpConfigured()) {
        const workerName = `${event.worker.firstName} ${event.worker.lastName}`;
        const eventTypeTr = translate("tr", `events.eventType.${event.eventType}`, event.eventType);
        const eventTypeEn = translate("en", `events.eventType.${event.eventType}`, event.eventType);
        const deadline = event.reportDeadline.toISOString().slice(0, 10);
        const subject = `SponsorTrack — Uyum olayı danışman incelemesi bekliyor / Compliance event needs adviser review`;
        const text = [
          `Çalışan / Worker: ${workerName} (${event.worker.cosReference})`,
          `Olay türü / Event type: ${eventTypeTr} / ${eventTypeEn}`,
          `Son rapor tarihi / Report deadline: ${deadline}`,
          notes ? `Not / Note: ${notes}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        const ok = await sendSmtpMail({ to: adviserEmail, subject, text });
        if (!ok) {
          logger.error("escalate-external: email send failed", undefined, {
            eventId: params.id,
            tenantId: user.tenantId,
          });
        }
      } else {
        logger.warn("escalate-external: SMTP not configured, event flagged without email", {
          eventId: params.id,
        });
      }

      return NextResponse.json({ data: updated });
    });
  } catch (e) {
    logger.error("POST /api/events/[id]/escalate-external failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
