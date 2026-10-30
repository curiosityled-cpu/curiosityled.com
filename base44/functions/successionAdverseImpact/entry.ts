import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { MIN_GROUP_SUPPRESSION_THRESHOLD } from "../../shared/successionConstants.ts";

/**
 * POST /successionAdverseImpact
 *
 * Answers one question from ratified outcomes: does any group come out of this
 * cycle's succession decisions at a materially lower rate than the best-served
 * group? Uses the four-fifths (80%) convention.
 *
 * Method:
 *   - Only ratified, non-quarantined decision records in the cycle are used.
 *   - The denominator is exposure: every candidate each decision actually
 *     considered, so a group cannot look high simply by being considered less.
 *   - The numerator is the candidates that decision selected.
 *   - Groups below the suppression threshold are counted but never reported as
 *     a rate, so a group of two people cannot be re-identified or read as a
 *     finding.
 *
 * Returns aggregates only. No candidate, email or sealed value is ever returned.
 */

const DEFAULT_ATTRIBUTE = "gender";

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { cycle_id } = body || {};
  const attribute = body?.attribute || DEFAULT_ATTRIBUTE;

  if (!cycle_id) {
    return Response.json({ error: "cycle_id is required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44,
    auth,
    action: "successionAdverseImpact",
    target_client_id: auth.client_id,
    required_permission: "succession.compliance_view",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  try {
    const [decisions, demographics] = await Promise.all([
      base44.asServiceRole.entities.SuccessionDecisionRecord.filter({
        client_id: auth.client_id,
        cycle_id,
        status: "ratified",
      }),
      base44.asServiceRole.entities.SuccessionSealedDemographic.filter({
        client_id: auth.client_id,
        status: "sealed",
      }),
    ]);

    const usable = (decisions || []).filter((d) => (d.integrity_status || "active") === "active");
    if (usable.length === 0) {
      return Response.json({
        cycle_id,
        attribute,
        decision_count: 0,
        candidates_considered: 0,
        groups: [],
        adverse_impact_detected: false,
        note: "No ratified decisions in this cycle yet. Adverse impact can only be assessed on outcomes that were actually ratified.",
        computed_at: new Date().toISOString(),
      });
    }

    // Sealed values keyed by email, used only inside this computation.
    const attributesByEmail: Record<string, any> = {};
    for (const row of demographics || []) {
      const key = String(row.subject_email || "").toLowerCase();
      if (key) attributesByEmail[key] = row.attributes || {};
    }

    // Exposure: one entry per (decision, candidate) pair.
    const exposures: { email: string; group: string | null; selected: boolean }[] = [];
    for (const decision of usable) {
      const considered = Array.isArray(decision.considered) ? decision.considered : [];
      for (const entry of considered) {
        const email = String(entry?.candidate_email || "").toLowerCase();
        if (!email) continue;
        const attrs = attributesByEmail[email] || null;
        const groupValue = attrs && attrs[attribute] ? String(attrs[attribute]) : null;
        exposures.push({
          email,
          group: groupValue,
          selected: entry?.outcome === "selected",
        });
      }
    }

    const unattributed = exposures.filter((e) => !e.group).length;
    const attributed = exposures.filter((e) => !!e.group);

    const byGroup: Record<string, { pool: number; selected: number }> = {};
    for (const e of attributed) {
      const g = e.group as string;
      if (!byGroup[g]) byGroup[g] = { pool: 0, selected: 0 };
      byGroup[g].pool += 1;
      if (e.selected) byGroup[g].selected += 1;
    }

    const raws = Object.entries(byGroup).map(([label, v]) => ({
      label,
      pool: v.pool,
      selected: v.selected,
      rate: v.pool > 0 ? v.selected / v.pool : 0,
      suppressed: v.pool < MIN_GROUP_SUPPRESSION_THRESHOLD,
    }));

    const reportable = raws.filter((g) => !g.suppressed && g.pool > 0);
    const referenceRate = reportable.reduce((max, g) => (g.rate > max ? g.rate : max), 0);

    const groups = raws
      .map((g) => {
        if (g.suppressed) {
          return {
            label: "suppressed",
            pool: g.pool,
            selected: null,
            rate: null,
            ratio: null,
            adverse_indicator: null,
            suppressed: true,
          };
        }
        const ratio = referenceRate > 0 ? g.rate / referenceRate : null;
        return {
          label: g.label,
          pool: g.pool,
          selected: g.selected,
          rate: Number(g.rate.toFixed(4)),
          ratio: ratio === null ? null : Number(ratio.toFixed(3)),
          adverse_indicator: ratio !== null && ratio < 0.8,
          suppressed: false,
        };
      })
      .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

    const flagged = groups.filter((g) => g.adverse_indicator === true);
    const suppressedGroups = groups.filter((g) => g.suppressed).length;
    const rates = groups.filter((g) => g.rate !== null).map((g) => g.rate as number);
    const impactRatio = rates.length > 0 ? Math.min(...rates) / Math.max(...rates) : null;

    return Response.json({
      cycle_id,
      attribute,
      decision_count: usable.length,
      candidates_considered: exposures.length,
      attributed_exposures: attributed.length,
      unattributed_exposures: unattributed,
      groups,
      suppressed_group_count: suppressedGroups,
      impact_ratio: impactRatio === null ? null : Number(impactRatio.toFixed(3)),
      adverse_impact_detected: flagged.length > 0,
      flagged_groups: flagged.map((g) => g.label),
      suppression_threshold: MIN_GROUP_SUPPRESSION_THRESHOLD,
      note:
        attributed.length === 0
          ? "No sealed attributes matched these candidates, so no comparison could be made. Ingest sealed attributes for the cycle's candidates first."
          : "Aggregate only. Individual sealed values are never returned, and groups below the suppression threshold are counted but not rated.",
      computed_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}