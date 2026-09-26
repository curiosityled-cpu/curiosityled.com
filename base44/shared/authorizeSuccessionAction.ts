/**
 * authorizeSuccessionAction — domain authorization gate.
 *
 * Called by EVERY asServiceRole domain function BEFORE any succession
 * read/write. Checks: role, scope, client_id match, confidentiality_level
 * clearance, and active CrossTenantAccessGrant for cross-tenant access.
 *
 * Logs denials via the private audit writer (successionAuditWriter). Does NOT
 * recursively call itself — the audit writer is a separate non-authorizing
 * module, so there is no infinite recursion.
 */

import { writeSuccessionAuditEvent } from "./successionAuditWriter.ts";
import { isWithinClearance } from "./confidentialityFilter.ts";
import { isGrantFeatureEnabled, GRANT_DISABLED_MESSAGE, isPlatformAdminFullAccessEnabled } from "./successionConstants.ts";
import type { BootstrapAuthContext } from "./successionAuthBootstrap.ts";

export interface AuthorizationResult {
  allowed: boolean;
  denied_reason?: string;
  target_client_id?: string;
}

export interface AuthorizeParams {
  base44: any;
  auth: BootstrapAuthContext;
  action: string;
  // The tenant the action targets. For same-tenant actions, this equals
  // auth.client_id. For cross-tenant, it differs and requires a grant.
  target_client_id?: string;
  required_permission?: string;
  // When true, the permission check requires an EXACT match in auth.permissions.
  // Platform Admin bypass and the "*" wildcard are BOTH disabled. Use this for
  // tenant-scoped approval actions where Platform Admin must NOT hold standing
  // approval authority (separation of platform and tenant governance).
  explicit_permission_only?: boolean;
  required_confidentiality_clearance?: string;
  target_entity_type?: string;
  target_entity_id?: string;
}

export async function authorizeSuccessionAction(
  params: AuthorizeParams
): Promise<AuthorizationResult> {
  const { base44, auth, action } = params;
  const target_client_id = params.target_client_id || auth.client_id || null;

  // ── 0. Platform Admin denial (Phase 1) ───────────────────────────────────
  // Platform Admin must have ZERO standing customer succession access.
  // The CrossTenantAccessGrant mechanism is disabled in Phase 1, so there is
  // no authorized path for Platform Admin to read, list, create, mutate, or
  // approve succession data — not even for the tenant matching its user
  // record's client_id. This denial runs BEFORE the permission check, tenant
  // scope check, wildcard check, and role bypass. It cannot be overridden by
  // client_id match, wildcard permission, role bypass, or support purpose.
  //
  // TEMPORARY OVERRIDE: When PLATFORM_ADMIN_FULL_ACCESS is enabled (see
  // successionConstants.ts), Platform Admin bypasses this denial and the
  // permission check below. This is a stabilization measure with a revisit
  // threshold — see the flag documentation for when to turn it off.
  if (auth.isPlatformAdmin && !isPlatformAdminFullAccessEnabled()) {
    await writeSuccessionAuditEvent({
      base44,
      action_type: "denied_action",
      target_entity_type: params.target_entity_type,
      target_entity_id: params.target_entity_id,
      metadata: {
        action,
        denied_reason: "platform_admin_standing_access_denied_phase1",
        actor_role: auth.role,
        actor_email: auth.email,
        actor_client_id: auth.client_id,
        target_client_id,
      },
      client_id_override: target_client_id || undefined,
      actor_context_type_override: "platform_operator",
    });
    return {
      allowed: false,
      denied_reason:
        "Platform Admin has no standing succession access in Phase 1. Cross-tenant grants are disabled.",
      target_client_id: target_client_id || undefined,
    };
  }

  // ── 0.5. Tenant activation gate ───────────────────────────────────────────
  // The Succession module must be explicitly activated per tenant via
  // Client.settings.succession_enabled. When false (the default), ALL
  // succession actions are denied regardless of role or permission. This
  // enforces the "disabled by default" invariant: no tenant gets succession
  // access unless an authorized admin has explicitly turned it on.
  if (!auth.succession_enabled) {
    await writeSuccessionAuditEvent({
      base44,
      action_type: "denied_action",
      target_entity_type: params.target_entity_type,
      target_entity_id: params.target_entity_id,
      metadata: {
        action,
        denied_reason: "succession_module_not_activated",
        actor_role: auth.role,
        actor_email: auth.email,
        actor_client_id: auth.client_id,
        target_client_id,
      },
      client_id_override: target_client_id || undefined,
    });
    return {
      allowed: false,
      denied_reason:
        "Succession Management is not activated for this tenant. A tenant admin or Platform Admin must enable it in Client settings.",
      target_client_id: target_client_id || undefined,
    };
  }

  // ── 1. Permission check ──────────────────────────────────────────────────
  // Platform Admin with full-access flag bypasses the permission check
  // entirely (including explicit_permission_only approval gates).
  if (params.required_permission && !(auth.isPlatformAdmin && isPlatformAdminFullAccessEnabled())) {
    // explicit_permission_only: require an exact grant. No Platform Admin
    // bypass, no "*" wildcard. Used for tenant-scoped approvals where the
    // platform operator must not hold standing approval authority.
    // Platform Admin is denied at the top of this function (step 0), so
    // auth.isPlatformAdmin is always false here. The wildcard "*" is honored
    // for non-approval actions; explicit_permission_only disables it for
    // approval actions where an exact grant is required.
    const hasPermission = params.explicit_permission_only
      ? auth.permissions.includes(params.required_permission)
      : (auth.permissions.includes(params.required_permission) ||
         auth.permissions.includes("*"));
    if (!hasPermission) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "denied_action",
        target_entity_type: params.target_entity_type,
        target_entity_id: params.target_entity_id,
        metadata: {
          action,
          denied_reason: "missing_permission",
          required_permission: params.required_permission,
          actor_role: auth.role,
        },
        client_id_override: target_client_id || undefined,
      });
      return {
        allowed: false,
        denied_reason: `Missing permission: ${params.required_permission}`,
        target_client_id: target_client_id || undefined,
      };
    }
  }

  // ── 2. Tenant scope check ────────────────────────────────────────────────
  const isCrossTenant =
    target_client_id && auth.client_id && target_client_id !== auth.client_id;

  if (isCrossTenant && !auth.isPlatformAdmin) {
    await writeSuccessionAuditEvent({
      base44,
      action_type: "denied_action",
      target_entity_type: params.target_entity_type,
      target_entity_id: params.target_entity_id,
      metadata: {
        action,
        denied_reason: "cross_tenant_without_grant",
        actor_client_id: auth.client_id,
        target_client_id,
        actor_role: auth.role,
      },
      client_id_override: target_client_id || undefined,
    });
    return {
      allowed: false,
      denied_reason: "Cross-tenant access denied — no grant.",
      target_client_id: target_client_id || undefined,
    };
  }

  // ── 3. Cross-tenant grant check (Platform Admin) ────────────────────────
  if (isCrossTenant && auth.isPlatformAdmin) {
    // Grant feature must be enabled server-side
    if (!isGrantFeatureEnabled()) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "denied_action",
        target_entity_type: params.target_entity_type,
        target_entity_id: params.target_entity_id,
        metadata: {
          action,
          denied_reason: "grant_feature_disabled",
          target_client_id,
          actor_role: auth.role,
        },
        client_id_override: target_client_id || undefined,
        actor_context_type_override: "platform_operator",
      });
      return {
        allowed: false,
        denied_reason: GRANT_DISABLED_MESSAGE,
        target_client_id: target_client_id || undefined,
      };
    }

    // Check for an active CrossTenantAccessGrant (service-role read, RLS-denied
    // for app users so we must use asServiceRole here).
    const grants = await base44.asServiceRole.entities.CrossTenantAccessGrant.filter({
      client_id: target_client_id,
      grantee_profile_id: auth.profile_id,
      status: "active",
    });

    const now = new Date();
    const activeGrant = grants.find((g: any) => {
      if (g.expires_at && new Date(g.expires_at) < now) return false;
      if (g.starts_at && new Date(g.starts_at) > now) return false;
      return true;
    });

    if (!activeGrant) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "denied_action",
        target_entity_type: params.target_entity_type,
        target_entity_id: params.target_entity_id,
        metadata: {
          action,
          denied_reason: "no_active_grant",
          target_client_id,
          actor_role: auth.role,
        },
        client_id_override: target_client_id || undefined,
        actor_context_type_override: "platform_operator",
      });
      return {
        allowed: false,
        denied_reason: "No active cross-tenant grant for this target tenant.",
        target_client_id: target_client_id || undefined,
      };
    }
  }

  // ── 4. Confidentiality clearance check ───────────────────────────────────
  if (params.required_confidentiality_clearance) {
    const recordLevel = params.required_confidentiality_clearance;
    if (!isWithinClearance(recordLevel, getCallerClearance(auth))) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "denied_action",
        target_entity_type: params.target_entity_type,
        target_entity_id: params.target_entity_id,
        metadata: {
          action,
          denied_reason: "insufficient_confidentiality_clearance",
          required_clearance: recordLevel,
          actor_role: auth.role,
        },
        client_id_override: target_client_id || undefined,
      });
      return {
        allowed: false,
        denied_reason: `Insufficient confidentiality clearance for level: ${recordLevel}`,
        target_client_id: target_client_id || undefined,
      };
    }
  }

  return { allowed: true, target_client_id: target_client_id || undefined };
}

function getCallerClearance(auth: BootstrapAuthContext): string {
  // Phase 0 default clearance mapping. Platform Admin status alone does NOT
  // grant legally_restricted access — that requires an explicit additional
  // authorization path not yet implemented. Platform Admins get
  // highly_confidential (same as tenant admins). Per-role clearance mapping
  // will be refined in later phases.
  //
  // TEMPORARY OVERRIDE: When PLATFORM_ADMIN_FULL_ACCESS is enabled, Platform
  // Admin receives legally_restricted clearance for full stabilization access.
  if (auth.isPlatformAdmin && isPlatformAdminFullAccessEnabled()) {
    return "legally_restricted";
  }
  const adminRoles = [
    "Platform Admin",
    "Platform Administrator",
    "admin",
    "Super Administrator",
    "Admin Level 2",
    "Admin Level 1",
  ];
  if (adminRoles.includes(auth.role)) return "highly_confidential";
  if (auth.role === "HRBP") return "confidential";
  return "standard";
}