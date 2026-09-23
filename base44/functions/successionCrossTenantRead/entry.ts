import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { resolvePlatformOperatorContext, PlatformOperatorError } from "../../shared/resolvePlatformOperatorContext.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { isGrantFeatureEnabled, GRANT_DISABLED_MESSAGE } from "../../shared/successionConstants.ts";

/**
 * POST /successionCrossTenantRead
 *
 * Control-plane function for cross-tenant succession reads via an active
 * CrossTenantAccessGrant. Uses the dedicated platform-control authorization path.
 *
 * DISABLED until the grant workflow + this dedicated read function pass
 * security testing and the server-side feature flag is enabled.
 * No grant can reach 'active' status in Phase 0.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const opCtx = await resolvePlatformOperatorContext(base44);

    if (!isGrantFeatureEnabled()) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "cross_tenant_read_disabled",
        actor_context_type_override: "platform_operator",
        metadata: { reason: "feature_flag_disabled" },
      });
      return Response.json(
        { enabled: false, message: GRANT_DISABLED_MESSAGE },
        { status: 503 }
      );
    }

    await writeSuccessionAuditEvent({
      base44,
      action_type: "cross_tenant_read_attempted",
      actor_context_type_override: "platform_operator",
      metadata: { note: "Phase 0 stub — full read path not yet implemented" },
    });

    return Response.json(
      { enabled: true, message: "Cross-tenant read path is enabled but the full implementation is not yet available in Phase 0.", records: [] },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PlatformOperatorError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}