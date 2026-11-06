/**
 * checkInAccess — who may change check-in settings, and who counts as their staff.
 *
 * Check-in configuration (default measures, automation, sending) belongs to the
 * organization, so only HR administrators and above may change it. Everyone else
 * can still send check-ins and write custom questions — but only to the people
 * who report to them.
 */
import { base44 } from "@/api/base44Client";

export const HR_ADMIN_ROLES = [
  "Admin Level 1",
  "Admin Level 2",
  "Super Administrator",
  "Partner Business Administrator",
  "Platform Admin",
];

export function isHRAdminUser(user) {
  const role = user?.app_role || user?.data?.app_role || user?.role || "";
  return HR_ADMIN_ROLES.includes(role);
}

/**
 * The people who report to this user — resolved server-side so the list is
 * tenant-scoped (getTeamRoster applies the caller's tenant and role rules).
 */
export async function fetchDirectReports(user) {
  if (!user?.email) return [];
  const res = await base44.functions.invoke("getTeamRoster", {}).catch(() => null);
  const roster = res?.data?.users || res?.users || [];
  const subordinateEmails = user.subordinate_emails || user?.data?.subordinate_emails || [];
  return roster.filter(
    (u) =>
      u.email &&
      u.email !== user.email &&
      (u.manager_email === user.email || subordinateEmails.includes(u.email))
  );
}