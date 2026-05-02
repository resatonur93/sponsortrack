import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { prismaBase } from "@/lib/prisma";
import {
  deviceLabelFromUserAgent,
  uaFingerprint,
} from "@/lib/security/ua-device";
import { readClientIpFromHeaders } from "@/lib/security/ip-match";

type SignInUserSlice = {
  id: string;
  tenantId: string;
};

/** İlk Credentials girişinde DB oturumu ve cihaz parmak izi oluşturulur. */
export async function bootstrapAuthArtifactsOnSignIn(
  user: SignInUserSlice
): Promise<string> {
  const authSid = randomUUID();

  const hdrs = await headers();
  const ip = readClientIpFromHeaders(hdrs);
  const ua = hdrs.get("user-agent") ?? "";
  const deviceLabel = deviceLabelFromUserAgent(ua);
  const fingerprint = uaFingerprint(ua);
  const { tenantId, id: userId } = user;

  await prismaBase.$transaction([
    prismaBase.userAuthSession.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        sessionToken: authSid,
        userAgent: ua || null,
        deviceLabel,
        ip,
      },
    }),
    prismaBase.userTrustedDevice.upsert({
      where: {
        userId_fingerprint: { userId, fingerprint },
      },
      update: {
        tenantId,
        lastSeenAt: new Date(),
        lastIp: ip,
      },
      create: {
        id: randomUUID(),
        tenantId,
        userId,
        fingerprint,
        label: deviceLabel,
        trusted: false,
        lastIp: ip,
      },
    }),
  ]);

  return authSid;
}
