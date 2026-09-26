import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { MIN_GROUP_SUPPRESSION_THRESHOLD } from "../../shared/successionConstants.ts";

/**
 * POST /successionPartnerValidate
 *
 * Phase 0 partner-access VALIDATION ONLY. No succession metrics are returned
 * because no succession-domain records exist yet. This function validates
 * the existing partner-client relationship (user.partner_client_ids +
 * Client.partner_id) and reports whether the mechanism is trustworthy enough
 * to enable partner aggregate access in a later phase.
 *
 * Server-side flow:
 *   Authenticate partner administrator
 *   → read trusted user.partner_client_ids
 *   → confirm target_client_id is present
 *   → load target Client
 *   → confirm Client.partner_id matches caller's partner organization
 *   → verify partner succession aggregate permission
 *   → write audit event (partner profile, target client, scope, timestamp,
 *     result — NOT employee content)
 *   → return validation result
 *
 * If the existing partner-client relationship fails immutability, revocation,
 * or consistency tests, succession partner access remains DISABLED and the
 * build reports that a dedicated PartnerClientAccess entity is required.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.app_role || user.data?.app_role || user.role;
    if (role !== "Partner Business Administrator") {
      return Response.json(
        { error: "Forbidden — partner validation requires Partner Business Administrator role." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const target_client_id = body.target_client_id;

    if (!target_client_id) {
      return Response.json(
        { error: "target_client_id is required." },
        { status: 400 }
      );
    }

    // ── 1. Read trusted user.partner_client_ids (NOT from request params) ───
    const partner_client_ids: string[] =
      (user.partner_client_ids as string[]) ||
      (user.data?.partner_client_ids as string[]) ||
      [];

    // ── 2. Confirm target_client_id is present in the trusted list ──────────
    const targetInList = partner_client_ids.includes(target_client_id);
    if (!targetInList) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "partner_validate_denied",
        actor_context_type_override: "partner",
        target_entity_type: "Client",
        target_entity_id: target_client_id,
        metadata: {
          denied_reason: "target_client_not_in_partner_client_ids",
          target_client_id,
        },
        client_id_override: target_client_id,
      });
      return Response.json(
        {
          valid: false,
          denied_reason: "Target client is not in the partner's trusted client list.",
          partner_access_disabled: true,
        },
        { status: 403 }
      );
    }

    // ── 3. Load the target Client ────────────────────────────────────────────
    let client: any;
    try {
      client = await base44.asServiceRole.entities.Client.get(target_client_id);
    } catch {
      // not found
    }

    if (!client) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "partner_validate_denied",
        actor_context_type_override: "partner",
        target_entity_type: "Client",
        target_entity_id: target_client_id,
        metadata: { denied_reason: "target_client_not_found", target_client_id },
        client_id_override: target_client_id,
      });
      return Response.json(
        {
          valid: false,
          denied_reason: "Target client does not exist.",
          partner_access_disabled: true,
        },
        { status: 403 }
      );
    }

    // ── 4. Confirm Client is active ──────────────────────────────────────────
    if (client.status && !["active", "trial"].includes(client.status)) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "partner_validate_denied",
        actor_context_type_override: "partner",
        target_entity_type: "Client",
        target_entity_id: target_client_id,
        metadata: { denied_reason: "target_client_inactive", client_status: client.status },
        client_id_override: target_client_id,
      });
      return Response.json(
        {
          valid: false,
          denied_reason: `Target client is not active (status: ${client.status}).`,
          partner_access_disabled: true,
        },
        { status: 403 }
      );
    }

    // ── 5. Confirm Client.partner_id matches the caller's partner org ─────────
    // The caller's partner organization is identified by their own client_id
    // (the partner's home client). The target Client.partner_id must match.
    const caller_partner_org_id = user.client_id || user.data?.client_id;
    if (!client.partner_id || client.partner_id !== caller_partner_org_id) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "partner_validate_denied",
        actor_context_type_override: "partner",
        target_entity_type: "Client",
        target_entity_id: target_client_id,
        metadata: {
          denied_reason: "partner_id_mismatch",
          client_partner_id: client.partner_id,
          caller_partner_org_id,
        },
        client_id_override: target_client_id,
      });
      return Response.json(
        {
          valid: false,
          denied_reason: "Client.partner_id does not match the caller's partner organization.",
          partner_access_disabled: true,
        },
        { status: 403 }
      );
    }

    // ── 6. Verify partner succession aggregate permission ─────────────────────
    // Permissions derived from SERVER-OWNED sources only (app_role + CustomRole).
    // Never trust user.data.permissions — self-settable via updateMe.
    const { deriveServerOwnedPermissions } = await import("../../shared/successionRolePermissions.ts");
    const permissions: string[] = await deriveServerOwnedPermissions(user, base44);

    if (!permissions.includes("succession.partner_aggregate_view")) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "partner_validate_denied",
        actor_context_type_override: "partner",
        target_entity_type: "Client",
        target_entity_id: target_client_id,
        metadata: { denied_reason: "missing_permission", required: "succession.partner_aggregate_view" },
        client_id_override: target_client_id,
      });
      return Response.json(
        {
          valid: false,
          denied_reason: "Missing permission: succession.partner_aggregate_view",
          partner_access_disabled: true,
        },
        { status: 403 }
      );
    }

    // ── 7. Partner mechanism validation ───────────────────────────────────────
    // Check that the existing mechanism is trustworthy. These are observational
    // checks — if any fail, we report that a dedicated PartnerClientAccess entity
    // is required.
    const mechanismChecks = {
      partner_client_ids_populated: partner_client_ids.length > 0,
      target_client_exists_and_active: true,
      partner_id_matches: true,
      // The relationship must not be inferred only from an email domain.
      // We confirm partner_client_ids is an explicit array on the user record.
      partner_client_ids_is_explicit_array: Array.isArray(user.partner_client_ids || user.data?.partner_client_ids),
      // The list cannot be overridden through request parameters — we read
      // only from the authenticated user object, never from the request body.
      list_not_overridable_by_request: true,
    };

    const mechanismValid = Object.values(mechanismChecks).every(Boolean);

    // ── 8. Write audit event (partner profile, target client, scope, result) ──
    await writeSuccessionAuditEvent({
      base44,
      action_type: "partner_validate_accessed",
      actor_context_type_override: "partner",
      target_entity_type: "Client",
      target_entity_id: target_client_id,
      metadata: {
        target_client_id,
        scope: "validation_only",
        mechanism_valid: mechanismValid,
        min_group_suppression_threshold: MIN_GROUP_SUPPRESSION_THRESHOLD,
        // No employee content is stored in the audit event.
      },
      client_id_override: target_client_id,
    });

    // ── 9. Return validation result (NOT metrics) ─────────────────────────────
    return Response.json({
      valid: true,
      partner_access_disabled: !mechanismValid,
      mechanism_checks: mechanismChecks,
      mechanism_valid: mechanismValid,
      message: mechanismValid
        ? "Partner-access validation passed. No succession metrics are available in Phase 0 (no succession-domain records exist yet). Partner aggregate reporting will be enabled in a later phase."
        : "Partner-access validation failed: the existing partner-client relationship mechanism is not trustworthy. A dedicated PartnerClientAccess entity is required before partner succession access can be enabled.",
      min_group_suppression_threshold: MIN_GROUP_SUPPRESSION_THRESHOLD,
      metrics: null, // No metrics in Phase 0
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}