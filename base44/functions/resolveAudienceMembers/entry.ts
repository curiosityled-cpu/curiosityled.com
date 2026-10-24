/**
 * resolveAudienceMembers — turns an audience (tiers / tracks / exact titles)
 * into the people it matches, resolved server-side against their role profile.
 *
 * Check-in questions resolve audiences for delivery; every other surface that
 * needs role-based assignment (learning, journeys, signals, notifications…)
 * resolves them here rather than re-implementing the matching rules. The
 * matching itself lives in shared/roleTargeting.ts.
 *
 * Body: {
 *   target_tiers?: string[],
 *   target_tracks?: string[],
 *   target_titles?: string[],
 *   client_id?: string   // Platform Admin may act on a chosen tenant
 * }
 * Returns: { people: [...], total, client_id, audience_label }
 *
 * An audience with no tiers, tracks or titles means everyone in the tenant,
 * the same baseline rule the check-in engine uses.
 *
 * Admin-only: the same roles that are allowed to assign learning.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  loadTaxonomy,
  loadTenantPeople,
  resolveRoleProfile,
  matchesAudience,
  questionAudienceLabel,
  isTenantAdmin,
  isPlatformAdmin,
  clientIdOf,
} from "../../shared/roleTargeting.ts";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTenantAdmin(user)) {
      return Response.json({ error: "You do not have access to audience targeting" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const clientId: string =
      (isPlatformAdmin(user) && String(body.client_id || "").trim()) || clientIdOf(user);
    if (!clientId) {
      return Response.json({ error: "No client linked to your account" }, { status: 403 });
    }

    const audience = {
      target_tiers: Array.isArray(body.target_tiers) ? body.target_tiers.filter(Boolean) : [],
      target_tracks: Array.isArray(body.target_tracks) ? body.target_tracks.filter(Boolean) : [],
      target_titles: Array.isArray(body.target_titles) ? body.target_titles.filter(Boolean) : [],
    };

    const svc = base44.asServiceRole;
    const [taxonomy, people] = await Promise.all([
      loadTaxonomy(svc, clientId),
      loadTenantPeople(svc, clientId),
    ]);

    const rows: any[] = [];
    for (const person of people) {
      const profile = resolveRoleProfile(person, taxonomy);
      if (!matchesAudience(audience, profile)) continue;
      rows.push({
        email: String(person.email || "").toLowerCase(),
        name: person.display_name || person.full_name || person.email,
        job_title: profile.job_title,
        tier_id: profile.tier_id,
        tier_label: profile.tier_label,
        track_id: profile.track_id,
        track_label: profile.track_label,
        source: profile.source,
      });
    }
    rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    return Response.json({
      people: rows,
      total: rows.length,
      client_id: clientId,
      audience_label: questionAudienceLabel(audience, taxonomy),
    });
  } catch (error) {
    console.error("[resolveAudienceMembers] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}