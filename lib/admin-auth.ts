import type { SessionUser } from "@/lib/api-context";
import { canAccessAdminPanel } from "@/lib/admin-panel-access";

/** Admin API ve panel: tanımlı e-posta + AUTHORISING_OFFICER veya SYSTEM_ADMIN */
export function requireAuthorisingOfficer(
  user: SessionUser | null
): user is SessionUser {
  return user !== null && canAccessAdminPanel(user.email, user.role);
}
