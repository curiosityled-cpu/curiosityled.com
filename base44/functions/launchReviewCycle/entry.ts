import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { waitUntil } from 'base44:runtime';
import {
  asList,
  clientIdOf,
  cycleConfig,
  isReviewAdmin,
  logReviewEvent,
  normEmail,
} from "../../shared/reviewCycleCore.ts";

/**
 * Launches a review cycle: verifies authorization and tenant scope, freezes the
 * configuration that will govern the cycle, activates it, records the launch in
 * the append-only history, and notifies participants.
 *
 * Payload: { review_cycle_id: string }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!isReviewAdmin(user)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const clientId = clientIdOf(user);
    if (!clientId) return Response.json({ error: "No client context" }, { status: 403 });

    const { review_cycle_id } = await req.json().catch(() => ({}));
    if (!review_cycle_id) return Response.json({ error: "review_cycle_id required" }, { status: 400 });

    const cycle = await base44.asServiceRole.entities.CustomForm
      .get(review_cycle_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!cycle || cycle.form_type !== "review_cycle") {
      return Response.json({ error: "Review cycle not found" }, { status: 404 });
    }
    if (cycle.client_id !== clientId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (cycle.status === "active") {
      return Response.json({ error: "This cycle is already active" }, { status: 400 });
    }
    if (cycle.status === "closed") {
      return Response.json({ error: "This cycle is closed" }, { status: 400 });
    }

    const roster = asList(
      await base44.asServiceRole.entities.ReviewParticipant.filter({
        review_cycle_id,
        client_id: clientId,
      })
    );
    if (roster.length === 0) {
      return Response.json(
        { error: "Add at least one participant before launching" },
        { status: 400 }
      );
    }

    const cfg = cycleConfig(cycle);

    // Freeze the rules that govern this cycle so later edits cannot rewrite them.
    const snapshot = {
      review_type: cfg.review_type,
      cycle_length: cfg.cycle_length,
      period_start: cfg.period_start,
      period_end: cfg.period_end,
      self_assessment_due: cfg.self_assessment_due,
      manager_review_due: cfg.manager_review_due,
      peer_enabled: cfg.peer_enabled,
      peer_attribution: cfg.peer_attribution,
      peer_feedback_visibility: cfg.peer_feedback_visibility,
      release_policy: cfg.release_policy,
      require_conversation: cfg.require_conversation,
      skip_level_review_enabled: cfg.skip_level_review_enabled,
      rubric: cfg.rubric,
      criteria: cfg.criteria,
      rating_anchors: cfg.rating_anchors || [],
      launched_at: new Date().toISOString(),
      launched_by: normEmail(user.email),
      roster_size: roster.length,
    };

    const updated = await base44.asServiceRole.entities.CustomForm.update(review_cycle_id, {
      status: "active",
      settings: {
        ...(cycle.settings || {}),
        config_snapshot: snapshot,
        launched_at: snapshot.launched_at,
        launched_by: snapshot.launched_by,
      },
    });

    await logReviewEvent(base44, {
      client_id: clientId,
      review_cycle_id,
      event_type: "cycle_launched",
      actor_email: user.email,
      actor_name: user.full_name || "",
      actor_role: "admin",
      before: { status: cycle.status },
      after: { status: "active", config_snapshot: snapshot },
    });

    const cycleTitle = cycle.title || "Review Cycle";
    const missingManagers = roster.filter((p: any) => !normEmail(p.manager_email)).length;

    // Notifications run after the response; failures never block the launch.
    waitUntil(
      (async () => {
        const seen = new Set<string>();
        for (const p of roster) {
          const targets = [
            {
              email: normEmail(p.employee_email),
              key: "self",
              title: `Self review opened: ${cycleTitle}`,
              message: "Your self review is ready. Complete it by the due date.",
            },
            {
              email: normEmail(p.manager_email),
              key: "mgr",
              title: `Manager review assigned: ${cycleTitle}`,
              message: `Complete the manager review for ${p.employee_name || p.employee_email}.`,
            },
          ];
          for (const peer of p.peer_emails || []) {
            targets.push({
              email: normEmail(peer),
              key: "peer",
              title: `Feedback request: ${cycleTitle}`,
              message: `You were asked to provide feedback for ${p.employee_name || p.employee_email}.`,
            });
          }
          for (const t of targets) {
            const dedupeKey = `${t.email}:${t.key}`;
            if (!t.email || seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);
            try {
              await base44.asServiceRole.entities.Notification.create({
                user_email: t.email,
                title: t.title,
                message: t.message,
                type: "review_assigned",
                is_read: false,
              });
            } catch (e) {
              /* notification failures are non-blocking */
            }
          }
        }
      })()
    );

    return Response.json({
      launched: true,
      cycle_title: cycleTitle,
      participants_notified: roster.length,
      missing_managers: missingManagers,
      cycle: updated,
      config_snapshot: snapshot,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}