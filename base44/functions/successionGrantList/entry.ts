import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { resolvePlatformOperatorContext, PlatformOperatorError } from "../../shared/resolvePlatformOperatorContext.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { isGrantFeatureEnabled, GRANT_DISABLED_MESSAGE } from "../../shared/successionConstants.ts";

/**
 * POST /successionGrantList
 *
 * Control-plane function for listing cross-tenant access grants.
 * Uses the dedicated platform-control authorization path.
 * Customer succession data is NEVER read during this operation — only
 * CrossTenantAccessGrant control-plane records (which hold grant metadata,
 * not customer succession content).
 *
 * DISABLED until security testing passes and the feature flag is enabled.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const opCtx = await resolvePlatformOperatorContext(base44);

    if (!isGrantFeatureEnabled()) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "grant_list_disabled",
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
      action_type: "grant_list_attempted",
      actor_context_type_override: "platform_operator",
      metadata: { note: "Phase 0 stub — full workflow not yet implemented" },
    });

    return Response.json(
      { enabled: true, message: "Grant list path is enabled but the full workflow is not yet implemented in Phase 0.", grants: [] },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PlatformOperatorError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}