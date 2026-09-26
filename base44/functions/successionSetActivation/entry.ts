import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { isPlatformAdminFullAccessEnabled } from "../../shared/successionConstants.ts";

/**
 * POST /successionSetActivation
 *
 * Protected per-tenant activation control for the Succession module.
 *
 * Authorization:
 *   - Super Administrator may toggle activation for their OWN tenant.
 *   - Platform Admin may toggle ONLY when PLATFORM_ADMIN_FULL_ACCESS is enabled
 *     (the approved temporary-access mechanism).
 *   - All other roles are denied.
 *
 * The tenant is derived server-side from the authenticated user — never from
 * request input. The update preserves all unrelated Client.settings values.
 * A reason is required. Activation and deactivation are audited. Repeated
 * requests with the same value are idempotent (no-op, still audited).
 */
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { enabled, reason } = body;

  if (typeof enabled !== "boolean") {
    return Response.json({ error: "enabled (boolean) is required" }, { status: 400 });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    return Response.json({ error: "reason is required (min 3 chars)" }, { status: 400 });
  }

  // ── 1. Bootstrap auth context (canonical tenant resolution + role) ──────────
  // Uses bootstrapSuccessionAuth for canonical tenant resolution. We do NOT
  // call authorizeSuccessionAction because this function must work even when
  // succession is DISABLED — it IS the activation control.
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = auth.role;
  const isPlatformAdmin = auth.isPlatformAdmin;
  const isSuperAdmin = role === "Super Administrator";

  // ── 2. Authorization: only Super Admin (own tenant) or Platform Admin (full access) ──
  if (!isSuperAdmin && !isPlatformAdmin) {
    return Response.json({
      error: "Only Super Administrator or Platform Admin may manage succession activation.",
    }, { status: 403 });
  }

  if (isPlatformAdmin && !isPlatformAdminFullAccessEnabled()) {
    return Response.json({
      error: "Platform Admin may manage activation only through the approved temporary-access mechanism.",
    }, { status: 403 });
  }

  // ── 3. Tenant is resolved server-side by the bootstrap ─────────────────────
  if (!auth.client_id || !auth.client) {
    return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });
  }

  const client = auth.client;
  const canonicalId = auth.client_id!;

  // ── 4. Read current settings and toggle ───────────────────────────────────
  const currentSettings = client.settings || {};
  const currentValue = Boolean(currentSettings.succession_enabled);

  // Idempotent: if the value is already the requested value, still audit but
  // don't perform a write.
  if (currentValue === enabled) {
    await writeSuccessionAuditEvent({
      base44,
      action_type: "activation_unchanged",
      target_entity_type: "Client",
      target_entity_id: canonicalId,
      metadata: {
        succession_enabled: enabled,
        reason: reason.trim(),
        actor_role: role,
        idempotent: true,
      },
      client_id_override: canonicalId,
    });
    return Response.json({
      client_id: canonicalId,
      succession_enabled: enabled,
      unchanged: true,
      message: "Activation already set to requested value — no change made.",
    });
  }

  // Preserve all other settings, only change succession_enabled
  const updatedSettings = {
    ...currentSettings,
    succession_enabled: enabled,
  };

  await base44.asServiceRole.entities.Client.update(canonicalId, {
    settings: updatedSettings,
  });

  // ── 5. Audit ──────────────────────────────────────────────────────────────
  await writeSuccessionAuditEvent({
    base44,
    action_type: enabled ? "activation_enabled" : "activation_disabled",
    target_entity_type: "Client",
    target_entity_id: canonicalId,
    metadata: {
      succession_enabled: enabled,
      previous_value: currentValue,
      reason: reason.trim(),
      actor_role: role,
      actor_email: user.email,
    },
    client_id_override: canonicalId,
  });

  return Response.json({
    client_id: canonicalId,
    succession_enabled: enabled,
    unchanged: false,
    message: enabled
      ? "Succession module activated for this tenant."
      : "Succession module deactivated for this tenant.",
  });
}