import { NextRequest, NextResponse } from "next/server";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createLeadBodySchema, normalizeLeadEmail } from "@/lib/leads";
import { createLeadActivity } from "@/lib/lead-activity";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    return first || null;
  }
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = createLeadBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const email = normalizeLeadEmail(d.email);
    const ip = clientIp(req);

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);

    const emailToday = await prismaBase.lead.count({
      where: {
        email,
        isDeleted: false,
        createdAt: { gte: dayStart },
      },
    });
    if (emailToday >= 1) {
      return NextResponse.json(
        { error: "Bu e-posta ile bugün zaten başvuru alındı." },
        { status: 429 }
      );
    }

    if (ip) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const ipCount = await prismaBase.lead.count({
        where: {
          submitterIp: ip,
          createdAt: { gte: hourAgo },
        },
      });
      if (ipCount >= 5) {
        return NextResponse.json(
          { error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." },
          { status: 429 }
        );
      }
    }

    const lead = await prismaBase.lead.create({
      data: {
        email,
        companyName: d.companyName ?? undefined,
        name: d.name ?? undefined,
        phone: d.phone ?? undefined,
        message: d.message ?? undefined,
        source: d.source,
        submitterIp: ip ?? undefined,
      },
    });

    await createLeadActivity({
      leadId: lead.id,
      type: "CREATE",
      message: "Lead oluşturuldu",
      metadata: { source: lead.source },
    });

    return NextResponse.json({ data: { id: lead.id } }, { status: 201 });
  } catch (e) {
    logger.error("POST /api/leads failed", e);
    return NextResponse.json(
      { error: "İşlem başarısız." },
      { status: 500 }
    );
  }
}
