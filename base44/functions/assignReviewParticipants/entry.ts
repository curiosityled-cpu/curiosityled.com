import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { asList, clientIdOf, isReviewAdmin, logReviewEvent, normEmail } from "../../shared/reviewCycleCore.ts";

/**
 * Replaces a draft cycle's participant roster.
 * The roster is locked once the cycle is launched, so assignments that already
 * govern submitted work cannot be rewritten silently.
 *
 * Payload: {
 *   review_cycle_id: string,
 *   participants: [{ employee_email, employee_name?, manager_email?, peer_emails?, self_assessment_due?, manager_review_due? }]
 * }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!isReviewAdmin(user)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const clientId = clientIdOf(user);
    if (!clientId) return Response.json({ error: "No client context" }, { status: 403 });

    const { review_cycle_id, participants } = await req.json().catch(() => ({}));
    if (!review_cycle_id || !Array.isArray(participants)) {
      return Response.json(
        { error: "review_cycle_id and participants array required" },
        { status: 400 }
      );
    }

    const cycle = await base44.asServiceRole.entities.CustomForm
      .get(review_cycle_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!cycle || cycle.form_type !== "review_cycle") {
      return Response.json({ error: "Review cycle not found" }, { status: 404 });
    }
    if (cycle.client_id !== clientId) return Response.json({ error: "Forbidden" }, { status: 403 });
    if (cycle.status === "active" || cycle.status === "closed") {
      return Response.json(
        {
          error:
            "The roster is locked once a cycle is launched. Reassign individual reviewers instead.",
        },
        { status: 400 }
      );
    }

    const allEmails = new Set<string>();
    for (const p of participants) {
      if (p.employee_email) allEmails.add(normEmail(p.employee_email));
      if (p.manager_email) allEmails.add(normEmail(p.manager_email));
      for (const e of p.peer_emails || []) allEmails.add(normEmail(e));
    }

    const tenantUsers = await base44.asServiceRole.entities.User.list(500);
    const tenantEmails = new Set(
      (tenantUsers || []).map((u: any) => normEmail(u.email)).filter(Boolean)
    );
    const invalidEmails = [...allEmails].filter((e) => !tenantEmails.has(e));
    if (invalidEmails.length > 0) {
      return Response.json(
        { error: "Some assigned emails are not users in this tenant", invalid_emails: invalidEmails },
        { status: 400 }
      );
    }

    const previous = asList(
      await base44.asServiceRole.entities.ReviewParticipant.filter({
        review_cycle_id,
        client_id: clientId,
      })
    );

    await base44.asServiceRole.entities.ReviewParticipant.deleteMany({
      review_cycle_id,
      client_id: clientId,
    });

    const records = participants.map((p: any) => ({
      client_id: clientId,
      review_cycle_id,
      employee_email: normEmail(p.employee_email),
      employee_name: p.employee_name || "",
      manager_email: normEmail(p.manager_email),
      peer_emails: (p.peer_emails || []).map(normEmail).filter(Boolean),
      self_assessment_due: p.self_assessment_due || null,
      manager_review_due: p.manager_review_due || null,
      status: "assigned",
      release_status: "pending",
    }));

    const created = await base44.asServiceRole.entities.ReviewParticipant.bulkCreate(records);

    await logReviewEvent(base44, {
      client_id: clientId,
      review_cycle_id,
      event_type: "participant_added",
      actor_email: user.email,
      actor_name: user.full_name || "",
      actor_role: "admin",
      before: { roster: previous.map((p: any) => normEmail(p.employee_email)) },
      after: { roster: records.map((r: any) => r.employee_email) },
      reason: "Roster replaced",
    });

    return Response.json({ assigned: created.length, participants: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}