/**
 * resolveCheckInQuestions — the check-in questions that apply to the caller,
 * resolved server-side against their role profile.
 *
 * Audience matching lives here (not in the browser) so a question reaches
 * exactly the people its audience describes:
 *   - no role targeting        → everyone in the tenant
 *   - target_role              → existing app-role filter
 *   - target_tiers/tracks      → the person's tier and track (ANDed, empty = any)
 *   - target_titles            → exact-title match, so people whose title is not
 *                                yet mapped to a tier/track still receive them
 *
 * Returns the applicable questions plus the caller's resolved profile, so the
 * UI can explain which audience they fall into.
 *
 * Body: { check_in_type: "morning" | "evening" | "both" }
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  loadTaxonomy,
  sanitizeTaxonomy,
  resolveRoleProfile,
  matchesAudience,
  questionAudienceLabel,
  findTitleMapping,
  appRoleOf,
  clientIdOf,
  emailKey,
  loadUsers,
} from "../../shared/roleTargeting.ts";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const checkInType = ["morning", "evening"].includes(body.check_in_type)
      ? body.check_in_type
      : "both";

    const svc = base44.asServiceRole;
    const clientId = clientIdOf(user);

    const [taxonomyRaw, questionRaw, allUsers] = await Promise.all([
      clientId
        ? svc.entities.RoleTaxonomy.filter({ client_id: clientId }, "-updated_date", 1).catch(() => [])
        : Promise.resolve([]),
      clientId
        ? svc.entities.CheckInCustomQuestion
            .filter({ client_id: clientId, is_active: true }, { sort: "display_order", limit: 200 })
            .catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
      loadUsers(svc, 5000),
    ]);

    const taxonomyRows = Array.isArray(taxonomyRaw) ? taxonomyRaw : taxonomyRaw?.items || [];
    const taxonomy = sanitizeTaxonomy(taxonomyRows[0]);
    const questions = (Array.isArray(questionRaw) ? questionRaw : questionRaw?.items || []) as any[];

    // Prefer the stored profile record, falling back to the auth payload.
    const callerEmail = emailKey(user);
    const person = allUsers.find((u) => emailKey(u) === callerEmail) || user;
    const profile = resolveRoleProfile(person, taxonomy);
    const userRole = appRoleOf(user);

    const applicable = questions
      .filter((q) => {
        if (q.target_role && q.target_role !== userRole) return false;
        if (
          checkInType !== "both" &&
          q.applies_to !== "both" &&
          q.applies_to !== checkInType
        ) {
          return false;
        }
        return matchesAudience(q, profile);
      })
      .map((q) => ({
        ...q,
        audience_label: questionAudienceLabel(q, taxonomy),
      }));

    return Response.json({
      questions: applicable,
      profile: {
        job_title: profile.job_title,
        tier_id: profile.tier_id,
        tier_label: profile.tier_label,
        track_id: profile.track_id,
        track_label: profile.track_label,
        source: profile.source,
        has_role_profile: !!(profile.tier_id || profile.track_id),
        title_mapped: !!findTitleMapping(taxonomy, profile.job_title),
      },
      taxonomy: { tiers: taxonomy.tiers, tracks: taxonomy.tracks },
    });
  } catch (error) {
    console.error("[resolveCheckInQuestions] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}