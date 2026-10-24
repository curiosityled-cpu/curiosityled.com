/**
 * applyRoleProfiles — ingests a role-profile feed (an HRIS export or a roster
 * upload) and writes title / tier / track onto people's profiles under strict
 * source precedence:
 *
 *   HRIS is authoritative. With no HRIS value present, the latest roster import
 *   wins. A lower-precedence source that disagrees is never applied silently —
 *   the disagreement is recorded in ProfileDataConflict for admin review. When
 *   a lower source later agrees with the authoritative value, the open conflict
 *   closes itself.
 *
 * Body: {
 *   source: "hris" | "roster",
 *   records: [{ email, job_title?, tier?, track? }],   // tier/track accept an id or a label
 *   dry_run?: boolean
 * }
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  loadTaxonomy,
  sanitizeTaxonomy,
  resolveValueId,
  deriveTierTrack,
  isTenantAdmin,
  clientIdOf,
  normalizeTitle,
  sourceRank,
  resolveRoleProfile,
  userFieldValue,
  loadTenantPeople,
} from "../../shared/roleTargeting.ts";

const SOURCES = ["hris", "roster"];
const MAX_RECORDS = 5000;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTenantAdmin(user)) {
      return Response.json({ error: "You do not have access to role targeting" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const source = String(body.source || "").trim().toLowerCase();
    if (!SOURCES.includes(source)) {
      return Response.json({ error: "source must be 'hris' or 'roster'" }, { status: 400 });
    }
    const clientId = clientIdOf(user);
    if (!clientId) {
      return Response.json({ error: "No client linked to your account" }, { status: 403 });
    }

    const records = Array.isArray(body.records) ? body.records.slice(0, MAX_RECORDS) : [];
    if (records.length === 0) {
      return Response.json({ error: "No profile rows supplied" }, { status: 400 });
    }
    const dryRun = body.dry_run === true;

    const svc = base44.asServiceRole;
    const taxonomyRaw = await svc.entities.RoleTaxonomy
      .filter({ client_id: clientId }, "-updated_date", 1)
      .catch(() => []);
    const taxonomyRows = Array.isArray(taxonomyRaw) ? taxonomyRaw : taxonomyRaw?.items || [];
    const taxonomy = sanitizeTaxonomy(taxonomyRows[0]);

    const [people, openRaw] = await Promise.all([
      loadTenantPeople(svc, clientId),
      svc.entities.ProfileDataConflict
        .filter({ client_id: clientId, status: "open" }, null, 500)
        .catch(() => []),
    ]);

    const byEmail = new Map<string, any>();
    for (const person of people) {
      const key = String(person.email || "").toLowerCase();
      if (key) byEmail.set(key, person);
    }

    const openMap = new Map<string, any>();
    for (const c of Array.isArray(openRaw) ? openRaw : openRaw?.items || []) {
      openMap.set(`${String(c.user_email || "").toLowerCase()}|${c.field}`, c);
    }

    const stats = {
      applied: 0,
      kept: 0,
      conflicts_open: 0,
      conflicts_closed: 0,
      unchanged: 0,
      people_updated: 0,
    };
    const unmatchedEmails: string[] = [];
    const unmappedTitles = new Map<string, { title: string; count: number }>();
    const planned: any[] = [];

    const now = new Date().toISOString();

    for (const record of records) {
      const email = String(record?.email || "").trim().toLowerCase();
      if (!email) continue;
      const person = byEmail.get(email);
      if (!person) {
        unmatchedEmails.push(email);
        continue;
      }

      const incomingTitle = String(record?.job_title || "").trim();
      const incomingTier = resolveValueId(taxonomy.tiers, record?.tier);
      const incomingTrack = resolveValueId(taxonomy.tracks, record?.track);

      const fields: { field: "job_title" | "tier" | "track"; incoming: string }[] = [];
      if (incomingTitle) fields.push({ field: "job_title", incoming: incomingTitle });
      if (incomingTier) fields.push({ field: "tier", incoming: incomingTier });
      if (incomingTrack) fields.push({ field: "track", incoming: incomingTrack });

      // With no explicit tier/track on the row, fall back to the title mapping.
      const titleForDerive = incomingTitle || String(person?.current_role || person?.data?.current_role || "");
      if (!incomingTier && !incomingTrack && titleForDerive) {
        const derived = deriveTierTrack(taxonomy, titleForDerive);
        if (derived.tier_id) fields.push({ field: "tier", incoming: derived.tier_id });
        if (derived.track_id) fields.push({ field: "track", incoming: derived.track_id });
      }

      const currentSource = String(person.profile_source || person?.data?.profile_source || "").toLowerCase();
      const patch: any = {};
      let changed = false;

      for (const { field, incoming } of fields) {
        const current = userFieldValue(person, field);
        if (!current) {
          patch[fieldKey(field)] = incoming;
          changed = true;
          stats.applied++;
          continue;
        }
        if (current === incoming) {
          stats.unchanged++;
          const key = `${email}|${field}`;
          const open = openMap.get(key);
          if (open) {
            stats.conflicts_closed++;
            if (!dryRun) {
              await svc.entities.ProfileDataConflict.update(open.id, {
                status: "resolved",
                resolution: "kept_current",
                resolved_value: current,
                resolved_by_email: "system",
                resolved_at: now,
                note: `The ${source} feed now agrees with the stored value.`,
              }).catch(() => null);
            }
            openMap.delete(key);
          }
          continue;
        }

        // Values disagree: the higher-precedence source wins; same-tier feed
        // refreshes the stored value (latest import wins).
        if (sourceRank(source) >= sourceRank(currentSource)) {
          patch[fieldKey(field)] = incoming;
          changed = true;
          stats.applied++;
        } else {
          stats.kept++;
          stats.conflicts_open++;
          const key = `${email}|${field}`;
          const payload = {
            client_id: clientId,
            user_email: email,
            user_name: person?.display_name || person?.data?.display_name || person?.full_name || email,
            field,
            current_value: current,
            current_source: currentSource || "manual",
            incoming_value: incoming,
            incoming_source: source,
            status: "open",
            detected_at: now,
          };
          if (dryRun) {
            // report only
          } else if (openMap.get(key)) {
            await svc.entities.ProfileDataConflict.update(openMap.get(key).id, payload).catch(() => null);
          } else {
            const created = await svc.entities.ProfileDataConflict.create(payload).catch(() => null);
            if (created?.id) openMap.set(key, created);
          }
        }
      }

      // Flag titles that still have no mapping, so admins can map them.
      const effectiveTitle = incomingTitle || String(person?.current_role || person?.data?.current_role || "");
      if (effectiveTitle) {
        const after = resolveRoleProfile({ ...person, ...patch }, taxonomy);
        if (!after.tier_id && !after.track_id) {
          const key = normalizeTitle(effectiveTitle);
          const entry = unmappedTitles.get(key) || { title: effectiveTitle, count: 0 };
          entry.count++;
          unmappedTitles.set(key, entry);
        }
      }

      if (changed) {
        stats.people_updated++;
        if (!dryRun) {
          await svc.entities.User.update(person.id, {
            ...patch,
            profile_source: source,
            profile_synced_at: now,
          }).catch(() => null);
        } else {
          planned.push({ email, ...patch });
        }
      }
    }

    return Response.json({
      source,
      dry_run: dryRun,
      stats,
      planned: dryRun ? planned.slice(0, 50) : [],
      unmatched_emails: unmatchedEmails.slice(0, 50),
      unmatched_count: unmatchedEmails.length,
      unmapped_titles: [...unmappedTitles.values()].sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    console.error("[applyRoleProfiles] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function fieldKey(field: "job_title" | "tier" | "track"): string {
  if (field === "job_title") return "current_role";
  if (field === "tier") return "role_tier";
  return "role_track";
}