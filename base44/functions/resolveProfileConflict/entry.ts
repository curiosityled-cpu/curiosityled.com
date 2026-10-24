/**
 * resolveProfileConflict — an admin's decision on a profile-data conflict.
 *
 * 'kept_current' leaves the stored (authoritative) value in place.
 * 'took_incoming' applies the value from the other source and records that
 * source as the profile's source, since an admin has now ruled in its favour.
 *
 * Either way the conflict is closed with who decided and when, so the decision
 * stays reviewable instead of disappearing.
 *
 * Body: { conflict_id, resolution: "kept_current" | "took_incoming", note? }
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  isTenantAdmin,
  isPlatformAdmin,
  clientIdOf,
  loadTenantPeople,
} from "../../shared/roleTargeting.ts";

const RESOLUTIONS = ["kept_current", "took_incoming"];

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTenantAdmin(user)) {
      return Response.json({ error: "You do not have access to role targeting" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const conflictId = String(body.conflict_id || "").trim();
    const resolution = String(body.resolution || "").trim();
    if (!conflictId) return Response.json({ error: "conflict_id is required" }, { status: 400 });
    if (!RESOLUTIONS.includes(resolution)) {
      return Response.json({ error: "resolution must be 'kept_current' or 'took_incoming'" }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const rows = await svc.entities.ProfileDataConflict.filter({ id: conflictId }, null, 1).catch(() => []);
    const conflict = (Array.isArray(rows) ? rows : rows?.items || [])[0];
    if (!conflict) return Response.json({ error: "Conflict not found" }, { status: 404 });

    const clientId = clientIdOf(user);
    if (!isPlatformAdmin(user) && conflict.client_id !== clientId) {
      return Response.json({ error: "Conflict is outside your organisation" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const resolvedValue = resolution === "took_incoming"
      ? conflict.incoming_value || ""
      : conflict.current_value || "";

    if (resolution === "took_incoming") {
      const people = await loadTenantPeople(svc, conflict.client_id);
      const email = String(conflict.user_email || "").toLowerCase();
      const person = people.find((p) => String(p.email || "").toLowerCase() === email);
      if (!person) {
        return Response.json({ error: "The person on this conflict is no longer in the organisation" }, { status: 404 });
      }
      const fieldKey =
        conflict.field === "job_title" ? "current_role" : conflict.field === "tier" ? "role_tier" : "role_track";
      await svc.entities.User.update(person.id, {
        [fieldKey]: resolvedValue,
        profile_source: conflict.incoming_source || "manual",
        profile_synced_at: now,
      });
    }

    const updated = await svc.entities.ProfileDataConflict.update(conflict.id, {
      status: "resolved",
      resolution,
      resolved_value: resolvedValue,
      resolved_by_email: user.email || "",
      resolved_at: now,
      note: String(body.note || "").slice(0, 1000),
    });

    return Response.json({ success: true, conflict: updated, resolved_value: resolvedValue });
  } catch (error) {
    console.error("[resolveProfileConflict] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}