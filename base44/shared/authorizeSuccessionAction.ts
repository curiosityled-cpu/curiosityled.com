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
import { isGrantFeatureEnabled, GRANT_DISABLED_MESSAGE } from "./successionConstants.ts";
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
  required_confidentiality_clearance?: string;
  target_entity_type?: string;
  target_entity_id?: string;
}

export async function authorizeSuccessionAction(
  params: AuthorizeParams
): Promise<AuthorizationResult> {
  const { base44, auth, action } = params;
  const target_client_id = params.target_client_id || auth.client_id || null;

  // ── 1. Permission check ──────────────────────────────────────────────────
  if (params.required_permission) {
    const hasPermission =
      auth.isPlatformAdmin ||
      auth.permissions.includes(params.required_permission) ||
      auth.permissions.includes("*");
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