/**
 * Shared authorization helper for scheduled-task / batch backend functions.
 *
 * Scheduled tasks run without a user session, so they must be gated behind
 * the INTERNAL_FUNCTION_SECRET (automation-to-automation) or an authenticated
 * Platform Admin / Super Administrator. Anonymous callers are always rejected.
 */
import { isInternalCall } from "./urlValidation.ts";

export function authorizeScheduledTask(req: Request, base44: any): Promise<{ authorized: boolean; response?: Response }> {
  return (async () => {
    // 1. Internal automation call (shared secret) — always allowed
    if (isInternalCall(req)) {
      return { authorized: true };
    }

    // 2. Authenticated admin — allowed for manual invocation
    let callerUser = null;
    try {
      callerUser = await base44.auth.me();
    } catch (_) {
      // not authenticated
    }

    if (!callerUser) {
      return {
        authorized: false,
        response: Response.json({ error: "Unauthorized — internal secret or admin credentials required" }, { status: 401 }),
      };
    }

    const adminRoles = ["Platform Admin", "Super Administrator"];
    if (!adminRoles.includes(callerUser.app_role)) {
      return {
        authorized: false,
        response: Response.json({ error: "Forbidden — admin access required" }, { status: 403 }),
      };
    }

    return { authorized: true };
  })();
}