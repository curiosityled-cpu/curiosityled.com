/**
 * Agent tenant application.
 *
 * Atreus action handlers read `user.client_id` to decide which organisation a
 * write lands in. That value must come from the server resolver — the caller's
 * selected organisation, else their home organisation — and never from request
 * input or from whichever of the two membership fields happens to be set.
 *
 * This sets it once, before any handler runs, so all of them read the same
 * server-decided value. Extracted here because invokeAgent is past the editing
 * limit and the change must not grow it.
 */
import { membershipClientId, resolveActiveClient } from './tenantContext.ts';

// Re-exported so invokeAgent takes one import for both: it is past the editing
// limit, so the confirmation policy and the tenant both arrive through this module.
export { CONFIRMATION_LEVELS, getConfirmationLevel } from './agentConfirmation.ts';

export async function applyAgentTenant(base44: any, user: any) {
  const tenant = await resolveActiveClient(base44, user);
  const clientId = tenant?.client_id || membershipClientId(user) || null;
  user.client_id = clientId;
  user.data = { ...(user.data || {}), client_id: clientId };
  return clientId;
}