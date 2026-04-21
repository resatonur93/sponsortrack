import type { SessionUser } from "@/lib/api-context";

export function requireAuthorisingOfficer(
  user: SessionUser | null
): user is SessionUser {
  return user !== null && user.role === "AUTHORISING_OFFICER";
}
