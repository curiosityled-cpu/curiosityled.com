import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { resolvePlatformOperatorContext, PlatformOperatorError } from "../../shared/resolvePlatformOperatorContext.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { isGrantFeatureEnabled, GRANT_DISABLED_MESSAGE } from "../../shared/successionConstants.ts";

/**
 * POST /successionGrantRequest
 *
 * Control-plane function for requesting a cross-tenant access grant.
 * Uses the dedicated platform-control authorization path (not tenant-domain).
 * Customer succession data is NEVER read during this operation.
 *
 * DISABLED until the grant workflow + dedicated read function pass security
 * testing and the server-side feature flag is enabled.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const opCtx = await resolvePlatformOperatorContext(base44);

    // Feature flag check — server-side, not frontend-overridable
    if (!isGrantFeatureEnabled()) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "grant_requested_disabled",
        actor_context_type_override: "platform_operator",
        metadata: {
          reason: "feature_flag_disabled",
          message: GRANT_DISABLED_MESSAGE,
        },
      });
      return Response.json(
        { enabled: false, message: GRANT_DISABLED_MESSAGE },
        { status: 503 }
      );
    }

    // Even when enabled, Phase 0 does not implement the full workflow.
    // This stub validates the platform-control path only.
    await writeSuccessionAuditEvent({
      base44,
      action_type: "grant_requested",
      actor_context_type_override: "platform_operator",
      metadata: { note: "Phase 0 stub — full workflow not yet implemented" },
    });

    return Response.json(
      { enabled: true, message: "Grant request path is enabled but the full workflow is not yet implemented in Phase 0." },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PlatformOperatorError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}