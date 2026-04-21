import type { SessionUser } from "@/lib/api-context";
import { canAccessAdminPanel } from "@/lib/admin-panel-access";

/** Admin API ve panel: yalnızca tanımlı e-posta + AUTHORISING_OFFICER */
export function requireAuthorisingOfficer(
  user: SessionUser | null
): user is SessionUser {
  return user !== null && canAccessAdminPanel(user.email, user.role);
}
