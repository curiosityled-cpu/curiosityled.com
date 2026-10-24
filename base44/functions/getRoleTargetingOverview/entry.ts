/**
 * getRoleTargetingOverview — everything the Role Targeting admin surface needs:
 *
 *  - the tenant's role taxonomy (tiers, tracks, title mappings)
 *  - open profile-data conflicts awaiting an admin decision, plus recently
 *    resolved ones so earlier decisions stay reviewable
 *  - job titles found on tenant profiles that are not yet mapped, with counts
 *    and sample people, so nobody silently misses role-targeted questions
 *  - coverage counts of people per tier and per track
 *
 * Admins only. Reads User / RoleTaxonomy / ProfileDataConflict with the service
 * role so the tenant scope is decided here rather than by RLS.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  loadTaxonomy,
  loadTenantPeople,
  sanitizeTaxonomy,
  resolveRoleProfile,
  findTitleMapping,
  isTenantAdmin,
  isPlatformAdmin,
  clientIdOf,
  normalizeTitle,
  labelFor,
} from "../../shared/roleTargeting.ts";

const MAX_UNMAPPED = 60;
const MAX_RESOLVED = 10;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTenantAdmin(user)) {
      return Response.json({ error: "You do not have access to role targeting" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const clientId: string =
      (isPlatformAdmin(user) && String(body.client_id || "").trim()) || clientIdOf(user);
    if (!clientId) {
      return Response.json({ error: "No client linked to your account" }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const [taxonomyRaw, people] = await Promise.all([
      svc.entities.RoleTaxonomy.filter({ client_id: clientId }, "-updated_date", 1).catch(() => []),
      loadTenantPeople(svc, clientId),
    ]);
    const taxonomyRows = Array.isArray(taxonomyRaw) ? taxonomyRaw : taxonomyRaw?.items || [];
    const taxonomy = sanitizeTaxonomy(taxonomyRows[0]);

    const [openRaw, resolvedRaw] = await Promise.all([
      svc.entities.ProfileDataConflict
        .filter({ client_id: clientId, status: "open" }, "-detected_at", 200)
        .catch(() => []),
      svc.entities.ProfileDataConflict
        .filter({ client_id: clientId, status: { $ne: "open" } }, "-resolved_at", MAX_RESOLVED)
        .catch(() => []),
    ]);

    const openConflicts = (Array.isArray(openRaw) ? openRaw : openRaw?.items || []).map((c: any) => ({
      id: c.id,
      user_email: c.user_email,
      user_name: c.user_name || c.user_email,
      field: c.field,
      current_value: c.current_value || "",
      current_label: conflictValueLabel(c, c.current_value, taxonomy),
      current_source: c.current_source || "",
      incoming_value: c.incoming_value || "",
      incoming_label: conflictValueLabel(c, c.incoming_value, taxonomy),
      incoming_source: c.incoming_source || "",
      detected_at: c.detected_at || c.created_date || null,
    }));

    const resolvedConflicts = (Array.isArray(resolvedRaw) ? resolvedRaw : resolvedRaw?.items || []).map(
      (c: any) => ({
        id: c.id,
        user_email: c.user_email,
        user_name: c.user_name || c.user_email,
        field: c.field,
        resolution: c.resolution || c.status,
        resolved_value: c.resolved_value || "",
        resolved_value_label: conflictValueLabel(c, c.resolved_value, taxonomy),
        resolved_by_email: c.resolved_by_email || "",
        resolved_at: c.resolved_at || null,
      })
    );

    // ── Profiles + coverage ───────────────────────────────────────────────
    const unmappedMap = new Map<string, { title: string; count: number; emails: string[] }>();
    const tierCounts = new Map<string, number>();
    const trackCounts = new Map<string, number>();
    let profiled = 0;
    let unprofiled = 0;

    for (const person of people) {
      const profile = resolveRoleProfile(person, taxonomy);
      const hasRoleProfile = !!(profile.tier_id || profile.track_id);

      if (hasRoleProfile) profiled++;
      else {
        unprofiled++;
        // Only a mapping can rescue this person — without one they see baseline
        // questions plus anything targeting their exact title.
        if (profile.job_title && !findTitleMapping(taxonomy, profile.job_title)) {
          const key = normalizeTitle(profile.job_title);
          const entry = unmappedMap.get(key) || { title: profile.job_title, count: 0, emails: [] };
          entry.count++;
          if (entry.emails.length < 5 && person.email) entry.emails.push(person.email);
          unmappedMap.set(key, entry);
        }
      }

      if (profile.tier_id) tierCounts.set(profile.tier_id, (tierCounts.get(profile.tier_id) || 0) + 1);
      if (profile.track_id) trackCounts.set(profile.track_id, (trackCounts.get(profile.track_id) || 0) + 1);
    }

    const unmapped = [...unmappedMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_UNMAPPED);

    // Distinct titles present on profiles, so admins can map what actually exists.
    const titleSeen = new Map<string, { title: string; count: number; mapped: boolean }>();
    for (const person of people) {
      const title = String(person?.current_role || person?.data?.current_role || "").trim();
      if (!title) continue;
      const key = normalizeTitle(title);
      const existing = titleSeen.get(key);
      if (existing) existing.count++;
      else titleSeen.set(key, { title, count: 1, mapped: !!findTitleMapping(taxonomy, title) });
    }

    return Response.json({
      taxonomy,
      open_conflicts: openConflicts,
      resolved_conflicts: resolvedConflicts,
      unmapped_titles: unmapped,
      roster_titles: [...titleSeen.values()].sort((a, b) => b.count - a.count),
      coverage: {
        total_people: people.length,
        profiled,
        unprofiled,
        by_tier: taxonomy.tiers.map((t) => ({
          id: t.id,
          label: t.label,
          count: tierCounts.get(t.id) || 0,
        })),
        by_track: taxonomy.tracks.map((t) => ({
          id: t.id,
          label: t.label,
          count: trackCounts.get(t.id) || 0,
        })),
      },
    });
  } catch (error) {
    console.error("[getRoleTargetingOverview] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function conflictValueLabel(conflict: any, value: string, taxonomy: any): string {
  if (!value) return "—";
  if (conflict?.field === "tier") return labelFor(taxonomy.tiers, value) || value;
  if (conflict?.field === "track") return labelFor(taxonomy.tracks, value) || value;
  return value;
}