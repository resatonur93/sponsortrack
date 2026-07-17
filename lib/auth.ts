import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/registration";
import { canAccessAdminPanel } from "@/lib/admin-panel-access";
import { readClientIpFromHeaders } from "@/lib/security/ip-match";
import { bootstrapAuthArtifactsOnSignIn } from "@/lib/security/bootstrap-jwt-session";
import { isTenantLoginIpAllowed } from "@/lib/security/tenant-login-ip";
import { isLoginRateLimited, recordLoginFailure, LoginAttemptScope } from "@/lib/security/login-rate-limit";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          logger.warn("login validation failed", { issues: parsed.error.flatten() });
          return null;
        }
        const { email, password } = parsed.data;
        const normalized = normalizeEmail(email);

        let ip = "0.0.0.0";
        try {
          ip = readClientIpFromHeaders(await headers());
        } catch {
          logger.warn("login: request headers unavailable for IP resolution");
        }

        if (
          await isLoginRateLimited({
            email: normalized,
            ip,
            scope: LoginAttemptScope.TENANT_USER,
          })
        ) {
          logger.warn("login rejected: rate limited", { email: normalized, ip });
          return null;
        }

        const user = await prismaBase.user.findFirst({
          where: { email: normalized, isActive: true },
          include: { tenant: true },
        });
        if (!user?.tenant.isActive) {
          await recordLoginFailure({
            email: normalized,
            ip,
            scope: LoginAttemptScope.TENANT_USER,
          });
          return null;
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
          await recordLoginFailure({
            email: normalized,
            ip,
            scope: LoginAttemptScope.TENANT_USER,
          });
          return null;
        }

        if (user.role !== Role.SYSTEM_ADMIN) {
          const allowed = await isTenantLoginIpAllowed({
            tenantId: user.tenantId,
            resolvedClientIp: ip,
          });
          if (!allowed) return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          firstName: user.firstName,
          lastName: user.lastName,
        };
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
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
