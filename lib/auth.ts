import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prismaBase } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  tenantId: z.string().trim().min(1),
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantId: { label: "Tenant ID", type: "text" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          logger.warn("login validation failed", { issues: parsed.error.flatten() });
          return null;
        }
        const { email, password, tenantId } = parsed.data;
        const user = await prismaBase.user.findFirst({
          where: { email, tenantId, isActive: true },
          include: { tenant: true },
        });
        if (!user?.tenant.isActive) {
          return null;
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
          return null;
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
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
