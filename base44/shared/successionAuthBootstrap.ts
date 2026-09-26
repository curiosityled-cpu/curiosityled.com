/**
 * successionAuthBootstrap — authorization bootstrap layer.
 *
 * Performs MINIMAL privileged reads of identity, Client, permissions,
 * partner access (user.partner_client_ids + Client.partner_id), and grant
 * records BEFORE domain authorization. It NEVER reads succession-domain data
 * (none exist in Phase 0 by design). It returns an authz context that
 * authorizeSuccessionAction consumes.
 *
 * This layer may perform privileged reads because it runs before domain
 * authorization — it is the "who are you and what tenant are you in" step.
 * It does NOT authorize succession actions itself.
 */

import { isGrantFeatureEnabled } from "./successionConstants.ts";
import { deriveServerOwnedPermissions } from "./successionRolePermissions.ts";

export interface BootstrapAuthContext {
  user: any;
  role: string;
  email: string;
  profile_id: string;
  client_id: string | null;
  client: any | null;
  isPlatformAdmin: boolean;
  isPartnerBusinessAdministrator: boolean;
  partner_client_ids: string[];
  permissions: string[];
  grant_feature_enabled: boolean;
}

export async function bootstrapSuccessionAuth(base44: any): Promise<BootstrapAuthContext> {
  const user = await base44.auth.me();
  if (!user) {
    throw new Error("Unauthorized — no authenticated user.");
  }

  // SECURITY: Read ONLY the top-level app_role (server-owned). Never read
  // user.data?.app_role — it is self-settable via updateMe. Default to
  // 'User Level 1' (least privilege) if absent.
  const role = user.app_role || "User Level 1";
  const email = user.email || "";
  const profile_id = user.id || "";

  const isPlatformAdmin =
    role === "Platform Admin" ||
    role === "Platform Administrator" ||
    role === "admin";

  const isPartnerBusinessAdministrator = role === "Partner Business Administrator";

  // ── Minimal privileged reads (identity, Client, partner access) ────────
  const client_id = user.client_id || user.data?.client_id || null;

  let client: any = null;
  if (client_id) {
    try {
      client = await base44.asServiceRole.entities.Client.get(client_id);
    } catch {
      // Client may not exist; leave null
    }
  }

  // Partner access: trusted user.partner_client_ids (NOT from request params)
  const partner_client_ids: string[] =
    (user.partner_client_ids as string[]) ||
    (user.data?.partner_client_ids as string[]) ||
    [];

  // Permissions: derived from SERVER-OWNED sources only (app_role mapping +
  // CustomRole entity). We NEVER read user.permissions or user.data.permissions
  // — those fields are self-settable via the platform-owned updateMe SDK
  // method and are NOT trusted for authorization decisions. An ordinary user
  // calling base44.auth.updateMe({ permissions: ["succession.cycles.view"] })
  // has NO effect on the permissions returned here.
  const permissions: string[] = await deriveServerOwnedPermissions(user, base44);

  return {
    user,
    role,
    email,
    profile_id,
    client_id: client?.id || client_id,
    client,
    isPlatformAdmin,
    isPartnerBusinessAdministrator,
    partner_client_ids,
    permissions,
    grant_feature_enabled: isGrantFeatureEnabled(),
  };
}