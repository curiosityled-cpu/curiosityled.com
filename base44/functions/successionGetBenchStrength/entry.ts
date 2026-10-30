import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";

/**
 * POST /successionGetBenchStrength
 *
 * The one screen an executive actually asks for: for every critical role, how
 * much bench exists behind it right now.
 *
 * Counted from ratified (or overridden) readiness conclusions only — a proposal
 * that nobody has countersigned does not count as bench. Where a candidacy has
 * more than one conclusion, the highest version wins, so superseded judgements
 * are never double-counted.
 *
 * Coverage:
 *   covered — at least one ready_now
 *   thin    — no ready_now, but at least one ready_with_conditions
 *   gap     — nobody at ready_now or ready_with_conditions
 */
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44,
    auth,
    action: "successionGetBenchStrength",
    target_client_id: auth.client_id,
    required_permission: "succession.cycles.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  try {
    const [roles, conclusions, candidacies, positions] = await Promise.all([
      base44.asServiceRole.entities.CriticalRole.filter({ client_id: auth.client_id }, "-created_date", 500),
      base44.asServiceRole.entities.ReadinessConclusion.filter({ client_id: auth.client_id }, "-created_date", 1000),
      base44.asServiceRole.entities.SuccessorCandidacy.filter({ client_id: auth.client_id }, "-created_date", 1000),
      base44.asServiceRole.entities.OrgPosition.filter({ client_id: auth.client_id }, "-created_date", 1000),
    ]);

    const positionTitle = new Map<string, string>();
    for (const position of positions || []) {
      if (position?.id) positionTitle.set(position.id, position.title || position.position_identifier || "");
    }

    // Keep only the latest ratified conclusion per candidacy.
    const latestByCandidacy = new Map<string, any>();
    for (const conclusion of conclusions || []) {
      if (conclusion.workflow_status !== "ratified" && conclusion.workflow_status !== "overridden") continue;
      if (conclusion.integrity_status === "quarantined") continue;
      const key = conclusion.candidacy_id || conclusion.id;
      const existing = latestByCandidacy.get(key);
      if (!existing || (conclusion.version || 0) > (existing.version || 0)) {
        latestByCandidacy.set(key, conclusion);
      }
    }

    const benchByRole = new Map<string, { ready_now: number; ready_with_conditions: number; emerging: number; other: number }>();
    for (const conclusion of latestByCandidacy.values()) {
      const roleId = conclusion.critical_role_id;
      if (!roleId) continue;
      const bucket = benchByRole.get(roleId) || { ready_now: 0, ready_with_conditions: 0, emerging: 0, other: 0 };
      const value = conclusion.ratified_value || conclusion.calibrated_value;
      if (value === "ready_now") bucket.ready_now += 1;
      else if (value === "ready_with_conditions") bucket.ready_with_conditions += 1;
      else if (value === "emerging") bucket.emerging += 1;
      else bucket.other += 1;
      benchByRole.set(roleId, bucket);
    }

    const poolByRole = new Map<string, number>();
    for (const candidacy of candidacies || []) {
      if (candidacy.status === "withdrawn" || candidacy.status === "removed") continue;
      if (candidacy.integrity_status === "quarantined") continue;
      const roleId = candidacy.critical_role_id;
      if (!roleId) continue;
      poolByRole.set(roleId, (poolByRole.get(roleId) || 0) + 1);
    }

    const rows = (roles || [])
      .filter((role: any) => role.status !== "removed")
      .map((role: any) => {
        const bench = benchByRole.get(role.id) || { ready_now: 0, ready_with_conditions: 0, emerging: 0, other: 0 };
        const pool = poolByRole.get(role.id) || 0;
        let coverage = "gap";
        if (bench.ready_now > 0) coverage = "covered";
        else if (bench.ready_with_conditions > 0) coverage = "thin";

        return {
          role_id: role.id,
          role_title: positionTitle.get(role.org_position_id) || "Untitled role",
          criticality_level: role.criticality_level || null,
          status: role.status || null,
          cycle_id: role.cycle_id || null,
          pool_size: pool,
          ready_now: bench.ready_now,
          ready_with_conditions: bench.ready_with_conditions,
          emerging: bench.emerging,
          uncovered_candidates: bench.other,
          coverage,
        };
      })
      .sort((a: any, b: any) => {
        const order: Record<string, number> = { gap: 0, thin: 1, covered: 2 };
        return order[a.coverage] - order[b.coverage] || a.role_title.localeCompare(b.role_title);
      });

    const totals = {
      roles: rows.length,
      covered: rows.filter((r: any) => r.coverage === "covered").length,
      thin: rows.filter((r: any) => r.coverage === "thin").length,
      gap: rows.filter((r: any) => r.coverage === "gap").length,
      ready_now: rows.reduce((sum: number, r: any) => sum + r.ready_now, 0),
    };

    return Response.json({ rows, totals });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}