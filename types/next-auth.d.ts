import { type DefaultSession } from "next-auth";
import { type Role } from "@prisma/client";
import { type PageAccessOverrides } from "@/lib/authorization/page-access";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      tenantId: string;
      firstName: string;
      lastName: string;
      canAccessAdminPanel: boolean;
      pageAccessOverrides: PageAccessOverrides;
      /** JWT ile eşleşen sunucu oturumu kimliği — güvenlik API’leri */
      authSid?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    tenantId: string;
    firstName: string;
    lastName: string;
    pageAccessOverrides?: PageAccessOverrides;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    tenantId: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    authSid?: string;
    pageAccessOverrides?: PageAccessOverrides;
  }
}
