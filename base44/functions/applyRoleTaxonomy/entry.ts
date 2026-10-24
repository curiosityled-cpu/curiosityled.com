/**
 * applyRoleTaxonomy — saves the tenant's role taxonomy (tiers, tracks, title
 * mappings) and propagates the title mappings onto people whose profile has
 * never been written by a source feed.
 *
 * Precedence: an HRIS- or roster-sourced tier/track is authoritative and is
 * left alone — the mapping only fills in manual/unset profiles. People holding
 * a tier or track that no longer exists in the taxonomy are cleared so they
 * surface for remapping instead of silently mismatching.
 *
 * Body: { tiers, tracks, title_mappings, propagate?: boolean }
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  sanitizeTaxonomy,
  resolveRoleProfile,
  deriveTierTrack,
  isTenantAdmin,
  clientIdOf,
  profileSourceOf,
  profilePayload,
} from "../../shared/roleTargeting.ts";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTenantAdmin(user)) {
      return Response.json({ error: "You do not have access to role targeting" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const clientId = clientIdOf(user);
    if (!clientId) {
      return Response.json({ error: "No client linked to your account" }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const taxonomy = sanitizeTaxonomy({
      tiers: body.tiers,
      tracks: body.tracks,
      title_mappings: body.title_mappings,
    });

    if (taxonomy.tiers.length === 0 && taxonomy.tracks.length === 0) {
      return Response.json({ error: "Add at least one tier or track before saving" }, { status: 400 });
    }

    const payload = {
      client_id: clientId,
      tiers: taxonomy.tiers,
      tracks: taxonomy.tracks,
      title_mappings: taxonomy.title_mappings,
      updated_by_email: user.email || "",
      updated_at: new Date().toISOString(),
    };

    const existing = await svc.entities.RoleTaxonomy
      .filter({ client_id: clientId }, "-updated_date", 1)
      .catch(() => []);
    const rows = Array.isArray(existing) ? existing : existing?.items || [];
    const saved = rows[0]?.id
      ? await svc.entities.RoleTaxonomy.update(rows[0].id, payload)
      : await svc.entities.RoleTaxonomy.create(payload);

    const stats = { updated: 0, cleared: 0, unchanged: 0, skipped_sourced: 0, still_unmapped: 0 };

    if (body.propagate !== false) {
      const allUsers = await svc.entities.User.list(null, 5000).catch(() => []);
      const people = (Array.isArray(allUsers) ? allUsers : allUsers?.items || []).filter(
        (u: any) => clientIdOf(u) === clientId && u?.email
      );

      const tierIds = new Set(taxonomy.tiers.map((t) => t.id));
      const trackIds = new Set(taxonomy.tracks.map((t) => t.id));
      const now = new Date().toISOString();

      for (const person of people) {
        const source = profileSourceOf(person);
        const storedTier = String(person?.role_tier || person?.data?.role_tier || "").trim();
        const storedTrack = String(person?.role_track || person?.data?.role_track || "").trim();
        const profile = resolveRoleProfile(person, taxonomy);

        // A feed-sourced tier/track outranks the mapping — never overwrite it.
        if (source === "hris" || source === "roster") {
          stats.skipped_sourced++;
          continue;
        }

        let nextTier = storedTier;
        let nextTrack = storedTrack;

        if (storedTier && !tierIds.has(storedTier)) nextTier = "";
        if (storedTrack && !trackIds.has(storedTrack)) nextTrack = "";

        const derived = deriveTierTrack(taxonomy, profile.job_title);
        if (!nextTier && derived.tier_id) nextTier = derived.tier_id;
        if (!nextTrack && derived.track_id) nextTrack = derived.track_id;

        if (!nextTier && !nextTrack && !profile.job_title) {
          stats.still_unmapped++;
          continue;
        }

        if (nextTier === storedTier && nextTrack === storedTrack) {
          if (!nextTier && !nextTrack) stats.still_unmapped++;
          else stats.unchanged++;
          continue;
        }

        await svc.entities.User.update(person.id, {
          role_tier: nextTier,
          role_track: nextTrack,
          profile_source: "manual",
          profile_synced_at: now,
        }).catch(() => null);

        if (!nextTier && !nextTrack) stats.still_unmapped++;
        else stats.updated++;
      }
    }

    return Response.json({ taxonomy, saved_id: saved?.id || null, stats });
  } catch (error) {
    console.error("[applyRoleTaxonomy] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}