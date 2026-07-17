import { NextRequest, NextResponse } from "next/server";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/registration";
import { selfServiceLoginSchema } from "@/lib/schemas";
import {
  COOKIE_NAME,
  signWorkerPortalToken,
  verifyWorkerPortalToken,
} from "@/lib/self-service-token";
import { readClientIpFromHeaders } from "@/lib/security/ip-match";
import {
  isLoginRateLimited,
  recordLoginFailure,
  LoginAttemptScope,
} from "@/lib/security/login-rate-limit";

export const dynamic = "force-dynamic";

const MAX_AGE = 60 * 60 * 8;

function dobMatches(db: Date | null, iso: string): boolean {
  if (!db) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return (
    db.getUTCFullYear() === y &&
    db.getUTCMonth() + 1 === mo &&
    db.getUTCDate() === d
  );
}

function portalCookieResponse(token: string): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = selfServiceLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { portalToken, email, dateOfBirth } = parsed.data;

    if (portalToken) {
      const session = verifyWorkerPortalToken(portalToken.trim());
      if (!session) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }
      const worker = await prismaBase.worker.findFirst({
        where: {
          id: session.workerId,
          tenantId: session.tenantId,
          employmentStatus: { not: "TERMINATED" },
        },
      });
      if (!worker) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }
      const token = signWorkerPortalToken(worker.id, worker.tenantId, MAX_AGE);
      return portalCookieResponse(token);
    }

    if (!email || !dateOfBirth) {
      return NextResponse.json(
        { error: "Email and date of birth are required" },
        { status: 400 }
      );
    }

    const normalized = normalizeEmail(email);
    const ip = readClientIpFromHeaders(req.headers);

    if (
      await isLoginRateLimited({
        email: normalized,
        ip,
        scope: LoginAttemptScope.SELF_SERVICE_WORKER,
      })
    ) {
      logger.warn("self-service login rejected: rate limited", { email: normalized, ip });
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const worker = await prismaBase.worker.findFirst({
      where: {
        OR: [{ email: normalized }, { personalEmail: normalized }],
        employmentStatus: { not: "TERMINATED" },
      },
    });

    if (!worker || !dobMatches(worker.dateOfBirth, dateOfBirth)) {
      await recordLoginFailure({
        email: normalized,
        ip,
        scope: LoginAttemptScope.SELF_SERVICE_WORKER,
      });
      return NextResponse.json(
        { error: "Invalid email or date of birth" },
        { status: 401 }
      );
    }

    const token = signWorkerPortalToken(worker.id, worker.tenantId, MAX_AGE);
    return portalCookieResponse(token);
  } catch (e) {
    logger.error("POST /api/self-service/login failed", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
