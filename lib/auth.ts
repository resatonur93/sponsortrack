import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { canAccessAdminPanel } from "@/lib/admin-panel-access";
import { readClientIpFromHeaders } from "@/lib/security/ip-match";
import { bootstrapAuthArtifactsOnSignIn } from "@/lib/security/bootstrap-jwt-session";
import { verifyTenantCredentials } from "@/lib/security/verify-tenant-credentials";
import { verifyOtpChallenge } from "@/lib/security/login-otp";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  otpCode: z.string().trim().regex(/^\d{6}$/),
  challengeId: z.string().trim().min(1),
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otpCode: { label: "OTP", type: "text" },
        challengeId: { label: "ChallengeId", type: "text" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          logger.warn("login validation failed", { issues: parsed.error.flatten() });
          return null;
        }
        const { email, password, otpCode, challengeId } = parsed.data;

        let ip = "0.0.0.0";
        try {
          ip = readClientIpFromHeaders(await headers());
        } catch {
          logger.warn("login: request headers unavailable for IP resolution");
        }

        const cred = await verifyTenantCredentials({ email, password, ip });
        if (!cred.ok) return null;

        const otpResult = await verifyOtpChallenge({
          challengeId,
          userId: cred.user.id,
          code: otpCode,
        });
        if (!otpResult.ok) {
          logger.warn("login rejected: otp", { userId: cred.user.id, reason: otpResult.reason });
          throw new Error(`OTP_${otpResult.reason}`);
        }

        return cred.user;
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.email = user.email;
        token.pageAccessOverrides = user.pageAccessOverrides ?? {};
        try {
          token.authSid = await bootstrapAuthArtifactsOnSignIn({
            id: user.id,
            tenantId: user.tenantId as string,
          });
        } catch (e) {
          logger.error("bootstrapAuthArtifactsOnSignIn failed", e);
          delete token.authSid;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.tenantId = token.tenantId as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.email = (token.email as string | null | undefined) ?? session.user.email;
        session.user.canAccessAdminPanel = canAccessAdminPanel(
          session.user.email,
          session.user.role
        );
        session.user.authSid = token.authSid;
        session.user.pageAccessOverrides = token.pageAccessOverrides ?? {};
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
