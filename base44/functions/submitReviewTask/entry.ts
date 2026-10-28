import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  asList,
  clientIdOf,
  cycleConfig,
  latestSubmission,
  logReviewEvent,
  normEmail,
  statusForParticipant,
} from "../../shared/reviewCycleCore.ts";

/**
 * Server-validated review submission.
 *
 * The reviewer role and the employee being reviewed are derived from the roster
 * assignment, never from the request. A caller cannot submit as a role they do
 * not hold, about a person they were not assigned.
 *
 * Payload: {
 *   review_cycle_id: string,
 *   employee_email?: string,        // required only when the caller has several tasks in the cycle
 *   action: "save_draft" | "submit",
 *   responses: object
 * }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = clientIdOf(user);
    if (!clientId) return Response.json({ error: "No client context" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { review_cycle_id, action = "submit", responses = {} } = body;
    const requestedEmployee = body.employee_email ? normEmail(body.employee_email) : null;

    if (!review_cycle_id) {
      return Response.json({ error: "review_cycle_id is required" }, { status: 400 });
    }
    if (!["save_draft", "submit"].includes(action)) {
      return Response.json({ error: "action must be save_draft or submit" }, { status: 400 });
    }

    const cycle = await base44.asServiceRole.entities.CustomForm
      .get(review_cycle_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!cycle || cycle.form_type !== "review_cycle") {
      return Response.json({ error: "Review cycle not found" }, { status: 404 });
    }
    if (cycle.client_id !== clientId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (cycle.status === "closed" || cycle.status === "archived") {
      return Response.json({ error: "This cycle is closed" }, { status: 400 });
    }
    if (cycle.status === "draft") {
      return Response.json({ error: "This cycle has not been launched yet" }, { status: 400 });
    }

    const email = normEmail(user.email);
    const cfg = cycleConfig(cycle);

    const roster = asList(
      await base44.asServiceRole.entities.ReviewParticipant.filter({
        review_cycle_id,
        client_id: clientId,
      })
    );

    // Resolve the assignment: the caller must hold a role on the target row.
    const candidates = roster.filter((row: any) => {
      if (requestedEmployee && normEmail(row.employee_email) !== requestedEmployee) return false;
      return (
        normEmail(row.employee_email) === email ||
        normEmail(row.manager_email) === email ||
        (row.peer_emails || []).map(normEmail).includes(email)
      );
    });

    if (candidates.length === 0) {
      return Response.json(
        { error: "You are not assigned to review this person in this cycle" },
        { status: 403 }
      );
    }
    if (candidates.length > 1 && !requestedEmployee) {
      return Response.json(
        {
          error: "employee_email is required because you have more than one task in this cycle",
          candidates: candidates.map((row: any) => ({
            participant_id: row.id,
            employee_email: normEmail(row.employee_email),
            employee_name: row.employee_name || row.employee_email,
          })),
        },
        { status: 400 }
      );
    }

    const participant = candidates[0];
    const employeeEmail = normEmail(participant.employee_email);

    // A manager cannot review themselves through the manager task.
    let role: string | null = null;
    if (normEmail(participant.manager_email) === email) role = "manager";
    else if ((participant.peer_emails || []).map(normEmail).includes(email)) role = "peer";
    else if (employeeEmail === email) role = "self";

    if (!role) return Response.json({ error: "Forbidden" }, { status: 403 });
    if (role === "manager" && employeeEmail === email) {
      return Response.json({ error: "You cannot complete your own manager review" }, { status: 403 });
    }

    if (action === "submit" && !responses?.overall_rating) {
      return Response.json(
        { error: "An overall rating is required before submitting" },
        { status: 400 }
      );
    }
    if (action === "submit" && Object.keys(responses || {}).length === 0) {
      return Response.json({ error: "No responses supplied" }, { status: 400 });
    }

    const existing = asList(
      await base44.asServiceRole.entities.CustomFormSubmission.filter({
        review_cycle_id,
        submitter_role: role,
        submitter_email: email,
        linked_employee_email: employeeEmail,
      })
    );

    const current = existing
      .filter((s: any) => !s.metadata?.superseded)
      .sort(
        (a: any, b: any) =>
          new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()
      )[0];

    // A submitted review is immutable: further change requires a recorded amendment.
    if (current && current.status === "submitted" && action === "submit") {
      return Response.json(
        {
          error:
            "This review has already been submitted. Use an amendment to change it so the original is preserved.",
          submission_id: current.id,
        },
        { status: 409 }
      );
    }

    const formSnapshot = {
      title: cycle.title,
      settings: cycle.settings || {},
      config_snapshot: (cycle.settings || {}).config_snapshot || null,
    };

    let saved;
    if (current) {
      saved = await base44.asServiceRole.entities.CustomFormSubmission.update(current.id, {
        responses,
        status: action === "submit" ? "submitted" : "in_progress",
        submitted_at: action === "submit" ? new Date().toISOString() : current.submitted_at || null,
        form_snapshot: formSnapshot,
        form_version: (current.form_version || 0) + 1,
      });
    } else {
      saved = await base44.asServiceRole.entities.CustomFormSubmission.create({
        form_id: review_cycle_id,
        client_id: clientId,
        form_version: 1,
        form_snapshot: formSnapshot,
        submitter_email: email,
        submitter_name: user.full_name || email,
        submitter_role: role,
        linked_employee_email: employeeEmail,
        review_cycle_id,
        responses,
        status: action === "submit" ? "submitted" : "in_progress",
        submitted_at: action === "submit" ? new Date().toISOString() : null,
        submission_source: "assigned",
        metadata: {
          task_role: role,
          peer_attribution: role === "peer" ? cfg.peer_attribution : undefined,
        },
      });
    }

    await logReviewEvent(base44, {
      client_id: clientId,
      review_cycle_id,
      event_type: action === "submit" ? "task_submitted" : "task_draft_saved",
      actor_email: email,
      actor_name: user.full_name || "",
      actor_role: role,
      subject_email: employeeEmail,
      participant_id: participant.id,
      source_entity: "CustomFormSubmission",
      source_id: saved.id,
      after: {
        status: saved.status,
        version: saved.form_version || 1,
        overall_rating: responses?.overall_rating ?? null,
      },
    });

    // Keep the roster status in step with the submitted set.
    const cycleSubs = asList(
      await base44.asServiceRole.entities.CustomFormSubmission.filter({
        review_cycle_id,
        linked_employee_email: employeeEmail,
      })
    );
    if (action === "submit") {
      const nextStatus = statusForParticipant(participant, cycleSubs);
      if (nextStatus !== participant.status) {
        await base44.asServiceRole.entities.ReviewParticipant.update(participant.id, {
          status: nextStatus,
        });
      }
    }

    return Response.json({
      saved,
      role,
      employee_email: employeeEmail,
      has_manager_review: !!latestSubmission(cycleSubs, "manager", employeeEmail),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}