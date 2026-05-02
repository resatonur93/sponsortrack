import type { Role } from "@prisma/client";

/** Can create / edit policies and view org-wide acknowledgement roster. */
export function canManagePolicies(role: Role): boolean {
  return (
    role === "AUTHORISING_OFFICER" ||
    role === "LEVEL_1_USER" ||
    role === "SYSTEM_ADMIN"
  );
}
