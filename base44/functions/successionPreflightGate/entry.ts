import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { evaluateSodCompliance } from "../../shared/successionSoDRules.ts";
import { evaluateDeliberationReadiness } from "../../shared/successionDataQualityGate.ts";

/**
 * POST /successionPreflightGate
 *
 * Read-only. Answers, before a deliberation opens: do the stored records breach
 * any declared segregation-of-duties rule, and is there enough defensible
 * material to judge these candidates at all.
 *
 * Returns both reports. It never changes anything.
 */
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { cycle_id } = body || {};

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44,
    auth,
    action: "successionPreflightGate",
    target_client_id: auth.client_id,
    required_permission: "succession.deliberate.view",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  if (!cycle_id) {
    return Response.json({ error: "cycle_id is required" }, { status: 400 });
  }

  try {
    const [sod, dataQuality] = await Promise.all([
      evaluateSodCompliance({ base44, client_id: auth.client_id, cycle_id }),
      evaluateDeliberationReadiness({
        base44,
        client_id: auth.client_id,
        cycle_id,
        conclusion_ids: Array.isArray(body.conclusion_ids) ? body.conclusion_ids : undefined,
      }),
    ]);

    return Response.json({
      cycle_id,
      ready_to_deliberate: dataQuality.ok && sod.counts.violations === 0,
      segregation_of_duties: sod,
      data_quality: dataQuality,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}