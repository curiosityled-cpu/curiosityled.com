/**
 * getPersonCheckIns — one person's individual daily check-ins, for the leader
 * drill-down in Check-In Insights.
 *
 * Authorisation: the requested person must be the caller or somewhere in the
 * caller's own reporting tree (self + subtree, subordinate_emails seeds
 * included), so a leader reads their directs and roll-ups and nobody outside
 * their line. DailyCheckIn RLS is owner-only, so this runs as the service role
 * after that check.
 *
 * Returns the tenant's measure meta plus normalized sessions, so the frontend
 * renders whatever the org's preset defines without hard-coding field names.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { getPreset, DEFAULT_PRESET_ID } from "../../shared/checkInPresets.ts";
import { createReportingTree, normalizeEmail, subordinateSeeds } from "../../shared/checkInScope.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const subjectEmail = normalizeEmail(body.user_email);
    if (!subjectEmail) return Response.json({ error: "user_email is required" }, { status: 400 });
    const days: number = Math.min(Math.max(parseInt(body.days) || 90, 7), 365);

    const svc = base44.asServiceRole;
    const callerEmail = normalizeEmail(user.email);
    const clientId = user?.data?.client_id || user?.client_id || "";

    const allUsers = await svc.entities.User.list(null, 2000).catch(() => []);
    const nameByEmail = new Map<string, string>();
    for (const u of allUsers || []) {
      if (u?.email) nameByEmail.set(u.email.toLowerCase(), u?.data?.display_name || u?.full_name || u.email);
    }
    const nameOf = (email: string) => nameByEmail.get(normalizeEmail(email)) || email;

    // ── Authorisation: the person must be in the caller's line ──
    const tree = createReportingTree(allUsers || [], nameOf);
    const allowed = new Set(
      tree.emailsWithSubtree(user.email, subordinateSeeds(user)).map(normalizeEmail)
    );
    if (!allowed.has(subjectEmail)) {
      return Response.json(
        { error: "You can only view check-ins for your own team" },
        { status: 403 }
      );
    }

    const person = (allUsers || []).find((u) => normalizeEmail(u.email) === subjectEmail);
    const personEmail = person?.email || subjectEmail;

    // ── Individual check-ins in range ────────────────────────────
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const raw = await svc.entities.DailyCheckIn.filter(
      { user_email: personEmail },
      "-check_in_date",
      200
    ).catch(() => []);
    const records = (Array.isArray(raw) ? raw : raw?.items || []).filter((r: any) => {
      const d = r.check_in_date || r.created_date;
      return d && new Date(d) >= sinceDate;
    });

    // ── Custom question labels for this tenant ───────────────────
    const tenantId = clientId || person?.data?.client_id || person?.client_id || "";
    const labelByKey = new Map<string, { label: string; unit: string }>();
    if (tenantId) {
      const res = await svc.entities.CheckInCustomQuestion.filter(
        { client_id: tenantId },
        { sort: "display_order", limit: 200 }
      ).catch(() => ({ items: [] }));
      for (const q of (res?.items || res || []) as any[]) {
        if (q?.question_key) {
          labelByKey.set(q.question_key, { label: q.title || q.question_key, unit: q.unit_label || "" });
        }
      }
    }

    // ── Normalize sessions against the person's preset ───────────
    const preset = getPreset(person?.data?.check_in_preset || DEFAULT_PRESET_ID);
    const measures = preset.measures.map((m) => ({ key: m.key, label: m.label, emoji: m.emoji }));

    const sessions = records
      .map((r: any) => {
        const scores: Record<string, number> = {};
        const notes: Record<string, string> = {};
        for (const m of preset.measures) {
          const score = r[`${m.key}_score`];
          if (score != null) scores[m.key] = Number(score);
          const note = r[`${m.key}_note`];
          if (note) notes[m.key] = String(note);
        }

        const custom = Object.entries(r.custom_answers || {})
          .filter(([, value]) => value != null && value !== "")
          .map(([key, value]) => {
            const meta = labelByKey.get(key);
            return {
              key,
              label: meta?.label || key.replace(/_/g, " "),
              unit: meta?.unit || "",
              value: String(value),
            };
          });

        const big3 = (r.big3_priorities || []).map((p: any) => ({
          title: p?.title || "",
          status: p?.status || "",
          context: p?.context || "",
        }));

        return {
          id: r.id,
          date: r.check_in_date || "",
          type: r.check_in_type || "",
          scores,
          notes,
          custom,
          big3,
          observation: r.atreus_observation || "",
          flags: r.atreus_flags || [],
        };
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return Response.json({
      person: {
        email: personEmail,
        name: nameOf(personEmail),
        is_self: subjectEmail === callerEmail,
      },
      measures,
      sessions,
      total_check_ins: sessions.length,
    });
  } catch (error) {
    console.error("[getPersonCheckIns] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}