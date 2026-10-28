import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  asList,
  calibratorFor,
  clientIdOf,
  cycleConfig,
  isReviewAdmin,
  logReviewEvent,
  normEmail,
  releaseBlockers,
  roleOnParticipant,
  statusForParticipant,
} from "../../shared/reviewCycleCore.ts";

/**
 * Consequential review-cycle actions. Every branch authorizes on the server
 * using the roster assignment, then writes an append-only event.
 *
 * Payload: { action, review_cycle_id, ... }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = clientIdOf(user);
    if (!clientId) return Response.json({ error: "No client context" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action, review_cycle_id } = body;
    if (!action) return Response.json({ error: "action is required" }, { status: 400 });
    if (!review_cycle_id) return Response.json({ error: "review_cycle_id is required" }, { status: 400 });

    const email = normEmail(user.email);
    const admin = isReviewAdmin(user);

    const cycle = await base44.asServiceRole.entities.CustomForm
      .get(review_cycle_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!cycle || cycle.form_type !== "review_cycle") {
      return Response.json({ error: "Review cycle not found" }, { status: 404 });
    }
    if (cycle.client_id !== clientId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const cfg = cycleConfig(cycle);

    const loadParticipant = async (id: string) => {
      if (!id) return null;
      const row = await base44.asServiceRole.entities.ReviewParticipant
        .get(id)
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!row || row.review_cycle_id !== review_cycle_id || row.client_id !== clientId) return null;
      return row;
    };

    // ── Configure a cycle ────────────────────────────────────────────────────
    if (action === "update_cycle") {
      if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
      const settings = body.settings || {};
      const launched = cycle.status !== "draft";

      const nextSettings = launched
        ? { ...(cycle.settings || {}) }
        : { ...(cycle.settings || {}), ...settings };

      const patch: any = { settings: nextSettings };
      if (body.title) patch.title = body.title;
      if (body.description !== undefined) patch.description = body.description;

      const updated = await base44.asServiceRole.entities.CustomForm.update(review_cycle_id, patch);

      await logReviewEvent(base44, {
        client_id: clientId,
        review_cycle_id,
        event_type: "cycle_configured",
        actor_email: email,
        actor_name: user.full_name || "",
        actor_role: "admin",
        before: { settings: cycle.settings || {} },
        after: { settings: nextSettings, locked: launched },
        reason: launched
          ? "Cycle already launched — the launch snapshot continues to govern submitted work"
          : body.reason || "",
      });

      return Response.json({ cycle: updated, locked: launched });
    }

    // ── Record that the review conversation took place ───────────────────────
    if (action === "record_conversation") {
      const participant = await loadParticipant(body.participant_id);
      if (!participant) return Response.json({ error: "Participant not found" }, { status: 404 });

      const isTheirManager = normEmail(participant.manager_email) === email;
      if (!admin && !isTheirManager) return Response.json({ error: "Forbidden" }, { status: 403 });

      const updated = await base44.asServiceRole.entities.ReviewParticipant.update(participant.id, {
        conversation_completed_at: new Date().toISOString(),
        conversation_completed_by: email,
        conversation_notes: body.notes || participant.conversation_notes || "",
        status: participant.release_status && participant.release_status !== "pending"
          ? participant.status
          : "conversation_done",
      });

      await logReviewEvent(base44, {
        client_id: clientId,
        review_cycle_id,
        event_type: "conversation_recorded",
        actor_email: email,
        actor_name: user.full_name || "",
        actor_role: isTheirManager ? "manager" : "admin",
        subject_email: participant.employee_email,
        participant_id: participant.id,
        before: { conversation_completed_at: participant.conversation_completed_at || null },
        after: { conversation_completed_at: updated.conversation_completed_at },
        reason: body.reason || "",
      });

      return Response.json({ participant: updated });
    }

    // ── Release the final outcome to the employee ────────────────────────────
    if (action === "release") {
      const participant = await loadParticipant(body.participant_id);
      if (!participant) return Response.json({ error: "Participant not found" }, { status: 404 });

      const isTheirManager = normEmail(participant.manager_email) === email;
      if (!admin && !isTheirManager) return Response.json({ error: "Forbidden" }, { status: 403 });

      const subs = asList(
        await base44.asServiceRole.entities.CustomFormSubmission.filter({
          review_cycle_id,
          linked_employee_email: normEmail(participant.employee_email),
        })
      );

      const calibrations = asList(
        await base44.asServiceRole.entities.ReviewCalibration.filter({
          review_cycle_id,
          client_id: clientId,
        })
      );
      const calibration = calibrations[0] || null;

      const blockers = releaseBlockers(participant, subs, calibration, cfg);
      if (blockers.length > 0) {
        return Response.json({ error: "Cannot release yet", blockers }, { status: 400 });
      }

      const managerReview = subs
        .filter((s: any) => s.submitter_role === "manager" && s.status === "submitted")
        .sort(
          (a: any, b: any) =>
            new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
        )[0];

      const calRow = calibratorFor(calibration, participant.employee_email);
      const useCalibrated =
        calibration?.status === "completed" && calRow?.calibrated_rating != null;
      const finalRating = useCalibrated
        ? calRow.calibrated_rating
        : managerReview?.responses?.overall_rating ?? null;

      const updated = await base44.asServiceRole.entities.ReviewParticipant.update(participant.id, {
        release_status: "released",
        final_rating: finalRating,
        final_rating_source: useCalibrated ? "calibrated" : "manager",
        final_released_at: new Date().toISOString(),
        final_released_by: email,
        status: "released",
      });

      await logReviewEvent(base44, {
        client_id: clientId,
        review_cycle_id,
        event_type: "review_released",
        actor_email: email,
        actor_name: user.full_name || "",
        actor_role: isTheirManager ? "manager" : "admin",
        subject_email: participant.employee_email,
        participant_id: participant.id,
        before: { release_status: participant.release_status || "pending" },
        after: {
          release_status: "released",
          final_rating: finalRating,
          final_rating_source: useCalibrated ? "calibrated" : "manager",
        },
        reason: body.reason || "",
      });

      return Response.json({ participant: updated, final_rating: finalRating });
    }

    // ── Employee acknowledgment or written response ──────────────────────────
    if (action === "acknowledge") {
      const participant = await loadParticipant(body.participant_id);
      if (!participant) return Response.json({ error: "Participant not found" }, { status: 404 });

      if (normEmail(participant.employee_email) !== email) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      if ((participant.release_status || "pending") === "pending") {
        return Response.json({ error: "This review has not been released yet" }, { status: 400 });
      }

      const hasResponse = String(body.response || "").trim().length > 0;
      const disagreement = !!body.disagreement;
      const releaseStatus = hasResponse || disagreement ? "responded" : "acknowledged";

      const updated = await base44.asServiceRole.entities.ReviewParticipant.update(participant.id, {
        release_status: releaseStatus,
        acknowledged_at: participant.acknowledged_at || new Date().toISOString(),
        acknowledged_by: email,
        acknowledgment_comments: body.comments || participant.acknowledgment_comments || "",
        acknowledgment_disagreement: disagreement,
        employee_response: body.response || participant.employee_response || "",
        responded_at: hasResponse ? new Date().toISOString() : participant.responded_at || null,
        status: "acknowledged",
      });

      await logReviewEvent(base44, {
        client_id: clientId,
        review_cycle_id,
        event_type: hasResponse ? "employee_responded" : "review_acknowledged",
        actor_email: email,
        actor_name: user.full_name || "",
        actor_role: "self",
        subject_email: participant.employee_email,
        participant_id: participant.id,
        before: { release_status: participant.release_status || "pending" },
        after: { release_status: releaseStatus, disagreement },
      });

      return Response.json({ participant: updated });
    }

    // ── Reassign a reviewer (recorded) ───────────────────────────────────────
    if (action === "reassign_reviewer") {
      if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
      if (!String(body.reason || "").trim()) {
        return Response.json({ error: "A reason is required to reassign a reviewer" }, { status: 400 });
      }
      const participant = await loadParticipant(body.participant_id);
      if (!participant) return Response.json({ error: "Participant not found" }, { status: 404 });

      const patch: any = {};
      if (body.manager_email !== undefined) {
        patch.manager_email = normEmail(body.manager_email);
      }
      if (body.peer_emails !== undefined) {
        patch.peer_emails = (body.peer_emails || []).map(normEmail).filter(Boolean);
      }
      if (Object.keys(patch).length === 0) {
        return Response.json({ error: "Nothing to reassign" }, { status: 400 });
      }

      const updated = await base44.asServiceRole.entities.ReviewParticipant.update(
        participant.id,
        patch
      );

      await logReviewEvent(base44, {
        client_id: clientId,
        review_cycle_id,
        event_type: "reviewer_reassigned",
        actor_email: email,
        actor_name: user.full_name || "",
        actor_role: "admin",
        subject_email: participant.employee_email,
        participant_id: participant.id,
        before: {
          manager_email: participant.manager_email || "",
          peer_emails: participant.peer_emails || [],
        },
        after: patch,
        reason: body.reason,
      });

      return Response.json({ participant: updated });
    }

    // ── Amend a submitted review without destroying the original ────────────
    if (action === "amend_submission") {
      if (!String(body.reason || "").trim()) {
        return Response.json({ error: "A reason is required to amend a review" }, { status: 400 });
      }
      const original = await base44.asServiceRole.entities.CustomFormSubmission
        .get(body.submission_id)
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!original || original.review_cycle_id !== review_cycle_id) {
        return Response.json({ error: "Submission not found" }, { status: 404 });
      }

      const participant = asList(
        await base44.asServiceRole.entities.ReviewParticipant.filter({
          review_cycle_id,
          employee_email: normEmail(original.linked_employee_email),
        })
      )[0];
      const isTheirManager = participant && normEmail(participant.manager_email) === email;
      const isAuthor = normEmail(original.submitter_email) === email;
      if (!admin && !isTheirManager && !isAuthor) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      const amendment = await base44.asServiceRole.entities.CustomFormSubmission.create({
        form_id: original.form_id,
        client_id: clientId,
        form_version: (original.form_version || 1) + 1,
        form_snapshot: original.form_snapshot || null,
        submitter_email: email,
        submitter_name: user.full_name || email,
        submitter_role: original.submitter_role,
        linked_employee_email: original.linked_employee_email,
        review_cycle_id,
        responses: body.responses || {},
        status: "submitted",
        submitted_at: new Date().toISOString(),
        submission_source: "assigned",
        metadata: {
          amends_submission_id: original.id,
          amendment_reason: body.reason,
          amended_from_version: original.form_version || 1,
        },
      });

      // The original record keeps its content; only its currency is marked.
      await base44.asServiceRole.entities.CustomFormSubmission.update(original.id, {
        metadata: {
          ...(original.metadata || {}),
          superseded: true,
          superseded_by: amendment.id,
          superseded_at: new Date().toISOString(),
        },
      });

      await logReviewEvent(base44, {
        client_id: clientId,
        review_cycle_id,
        event_type: "task_amended",
        actor_email: email,
        actor_name: user.full_name || "",
        actor_role: original.submitter_role,
        subject_email: original.linked_employee_email,
        participant_id: participant?.id || "",
        source_entity: "CustomFormSubmission",
        source_id: amendment.id,
        before: { submission_id: original.id, responses: original.responses || {} },
        after: { submission_id: amendment.id, responses: body.responses || {} },
        reason: body.reason,
      });

      return Response.json({ submission: amendment, amended_submission_id: original.id });
    }

    // ── Retention hold ───────────────────────────────────────────────────────
    if (action === "set_legal_hold") {
      if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
      const enabled = !!body.enabled;
      const nextSettings = { ...(cycle.settings || {}), legal_hold: enabled };
      const updated = await base44.asServiceRole.entities.CustomForm.update(review_cycle_id, {
        settings: nextSettings,
      });

      await logReviewEvent(base44, {
        client_id: clientId,
        review_cycle_id,
        event_type: enabled ? "legal_hold_set" : "legal_hold_cleared",
        actor_email: email,
        actor_name: user.full_name || "",
        actor_role: "admin",
        before: { legal_hold: !!(cycle.settings || {}).legal_hold },
        after: { legal_hold: enabled },
        reason: body.reason || "",
      });

      return Response.json({ cycle: updated, legal_hold: enabled });
    }

    // ── Close a cycle ────────────────────────────────────────────────────────
    if (action === "close_cycle") {
      if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
      const updated = await base44.asServiceRole.entities.CustomForm.update(review_cycle_id, {
        status: "closed",
      });

      await logReviewEvent(base44, {
        client_id: clientId,
        review_cycle_id,
        event_type: "cycle_closed",
        actor_email: email,
        actor_name: user.full_name || "",
        actor_role: "admin",
        before: { status: cycle.status },
        after: { status: "closed" },
        reason: body.reason || "",
      });

      return Response.json({ cycle: updated });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}