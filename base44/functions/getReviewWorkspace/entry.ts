import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  asList,
  clientIdOf,
  cycleConfig,
  deriveProgress,
  isReviewAdmin,
  isSubmitted,
  latestSubmission,
  logReviewEvent,
  normEmail,
  peerSubmissions,
  roleOnParticipant,
  userRoles,
} from "../../shared/reviewCycleCore.ts";

/**
 * Role-scoped read of the review workspace.
 *
 * Payload: { review_cycle_id?: string }
 *
 * Returns only what the caller is allowed to see:
 *  - everyone: the cycles they participate in, with their own assigned tasks
 *  - employees: their own released summary only (peer identity redacted per policy)
 *  - managers: progress rows for their own reports
 *  - admins: full cycle progress and (for a focused cycle) the audit trail
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = clientIdOf(user);
    if (!clientId) return Response.json({ error: "No client context" }, { status: 403 });

    const email = normEmail(user.email);
    const admin = isReviewAdmin(user);
    const body = await req.json().catch(() => ({}));
    const focusCycleId = body.review_cycle_id || null;

    const cycles = asList(
      await base44.asServiceRole.entities.CustomForm.filter(
        { form_type: "review_cycle", client_id: clientId },
        { sort: "-created_date", limit: 50 }
      )
    );
    const cycleIds = cycles.map((c: any) => c.id);

    const roster = cycleIds.length
      ? asList(
          await base44.asServiceRole.entities.ReviewParticipant.filter(
            { review_cycle_id: { $in: cycleIds } },
            { limit: 2000 }
          )
        )
      : [];

    const submissions = cycleIds.length
      ? asList(
          await base44.asServiceRole.entities.CustomFormSubmission.filter(
            { review_cycle_id: { $in: cycleIds }, submitter_role: { $exists: true } },
            { limit: 2000 }
          )
        )
      : [];

    const calibrations = cycleIds.length
      ? asList(
          await base44.asServiceRole.entities.ReviewCalibration.filter(
            { review_cycle_id: { $in: cycleIds } },
            { limit: 200 }
          )
        )
      : [];

    const reviewForms = asList(
      await base44.asServiceRole.entities.CustomForm.filter(
        { form_type: "review_form", client_id: clientId },
        { limit: 1 }
      )
    );

    const today = new Date().toISOString().slice(0, 10);

    const payload = cycles.map((cycle: any) => {
      const cfg = cycleConfig(cycle);
      const cycleRoster = roster.filter((r: any) => r.review_cycle_id === cycle.id);
      const cycleSubs = submissions.filter((s: any) => s.review_cycle_id === cycle.id);
      const calibration = calibrations.find((c: any) => c.review_cycle_id === cycle.id) || null;

      const myRows = cycleRoster.filter((r: any) => roleOnParticipant(r, email));
      const isManager = cycleRoster.some((r: any) => normEmail(r.manager_email) === email);
      const canManage = admin || isManager;
      const canCalibrate = admin;

      // Tasks assigned to the viewer, derived from the roster — never chosen by the caller.
      const myTasks = [];
      for (const row of myRows) {
        const rowSubs = cycleSubs.filter(
          (s: any) => normEmail(s.linked_employee_email) === normEmail(row.employee_email)
        );
        const role = roleOnParticipant(row, email);
        if (role === "self") {
          myTasks.push({
            task_id: `${row.id}:self`,
            participant_id: row.id,
            role: "self",
            employee_email: normEmail(row.employee_email),
            employee_name: row.employee_name || row.employee_email,
            due_date: row.self_assessment_due || cfg.self_assessment_due || null,
            submitted: !!latestSubmission(rowSubs, "self", row.employee_email),
            anonymous: false,
          });
        }
        if (role === "manager") {
          // Peer text reaches the manager only when the cycle explicitly allows it.
          const peerList = peerSubmissions(rowSubs, row.employee_email);
          const peerShared = cfg.peer_feedback_visibility === "manager_included";
          myTasks.push({
            task_id: `${row.id}:manager`,
            participant_id: row.id,
            role: "manager",
            employee_email: normEmail(row.employee_email),
            employee_name: row.employee_name || row.employee_email,
            due_date: row.manager_review_due || cfg.manager_review_due || null,
            submitted: !!latestSubmission(rowSubs, "manager", row.employee_email),
            anonymous: false,
            peer_feedback: peerShared
              ? peerList.map((p: any) => ({
                  submitter_email:
                    cfg.peer_attribution === "named" ? normEmail(p.submitter_email) : null,
                  overall_rating: p.responses?.overall_rating ?? null,
                  strengths: p.responses?.strengths || "",
                  improvements: p.responses?.improvements || "",
                }))
              : [],
            peer_feedback_withheld: !peerShared && peerList.length > 0,
          });
        }
        if (role === "peer") {
          const mine = rowSubs.find(
            (s: any) =>
              s.submitter_role === "peer" &&
              normEmail(s.submitter_email) === email &&
              isSubmitted(s)
          );
          myTasks.push({
            task_id: `${row.id}:peer`,
            participant_id: row.id,
            role: "peer",
            employee_email: normEmail(row.employee_email),
            employee_name: row.employee_name || row.employee_email,
            due_date: cfg.self_assessment_due || null,
            submitted: !!mine,
            anonymous: cfg.peer_attribution !== "named",
          });
        }
      }

      // Attach any in-progress draft so a reviewer can resume where they left off.
      for (const task of myTasks) {
        const rowSubs = cycleSubs.filter(
          (s: any) => normEmail(s.linked_employee_email) === normEmail(task.employee_email)
        );
        const draft = rowSubs.find(
          (s: any) =>
            s.submitter_role === task.role &&
            normEmail(s.submitter_email) === email &&
            s.status === "in_progress"
        );
        const submitted = rowSubs.find(
          (s: any) =>
            s.submitter_role === task.role &&
            normEmail(s.submitter_email) === email &&
            isSubmitted(s) &&
            !s.metadata?.superseded
        );
        task.draft_responses = draft?.responses || null;
        task.draft_saved_at = draft?.updated_date || null;
        task.submitted_responses = submitted?.responses || null;
        task.submitted_at = submitted?.submitted_at || null;
      }

      // The viewer's own released outcome (employees only).
      const myRow = cycleRoster.find((r: any) => normEmail(r.employee_email) === email);
      let mySummary = null;
      if (myRow) {
        const mySubs = cycleSubs.filter(
          (s: any) => normEmail(s.linked_employee_email) === email
        );
        const progress = deriveProgress(myRow, mySubs, calibration, cfg);
        const released = (myRow.release_status || "pending") !== "pending";
        const managerReview = latestSubmission(mySubs, "manager", email);
        const peerList = peerSubmissions(mySubs, email);
        mySummary = {
          participant_id: myRow.id,
          released,
          release_status: myRow.release_status || "pending",
          final_rating: myRow.final_rating ?? null,
          final_rating_source: myRow.final_rating_source || null,
          final_released_at: myRow.final_released_at || null,
          progress,
          conversation_completed: !!myRow.conversation_completed_at,
          acknowledged_at: myRow.acknowledged_at || null,
          disagreement: !!myRow.acknowledgment_disagreement,
          employee_response: myRow.employee_response || "",
          manager_review: released && managerReview
            ? {
                overall_rating: managerReview.responses?.overall_rating ?? null,
                strengths: managerReview.responses?.strengths || "",
                improvements: managerReview.responses?.improvements || "",
                development_goals: managerReview.responses?.development_goals || "",
                calibration_comments: managerReview.responses?.calibration_comments || "",
                submitted_at: managerReview.submitted_at || null,
              }
            : null,
          calibration_note:
            released && myRow.final_rating_source === "calibrated"
              ? (progress.adjustment_reason || "")
              : "",
          peer_feedback: released
            ? peerList.map((p: any) => ({
                // Identity is only exposed when the cycle's attribution policy allows it.
                submitter_email:
                  cfg.peer_attribution === "named" ? normEmail(p.submitter_email) : null,
                overall_rating: p.responses?.overall_rating ?? null,
                strengths: p.responses?.strengths || "",
                improvements: p.responses?.improvements || "",
                comments: p.responses?.calibration_comments || "",
              }))
            : [],
          peer_attribution: cfg.peer_attribution,
        };
      }

      // Progress rows: admins see the whole cycle, managers only their own reports.
      let progressRows: any[] = [];
      if (canManage) {
        const scoped = admin
          ? cycleRoster
          : cycleRoster.filter((r: any) => normEmail(r.manager_email) === email);
        progressRows = scoped.map((row: any) => {
          const rowSubs = cycleSubs.filter(
            (s: any) => normEmail(s.linked_employee_email) === normEmail(row.employee_email)
          );
          const progress = deriveProgress(row, rowSubs, calibration, cfg);
          const withheld = !admin && cfg.peer_feedback_visibility !== "manager_included";
          return {
            participant_id: row.id,
            // Managers still see that peer feedback exists (a count) but not
            // what it rated or said, unless the cycle shares it with them.
            ...progress,
            peer_avg_rating: withheld ? null : progress.peer_avg_rating,
            peer_feedback_withheld: withheld && progress.peer_submitted > 0,
          };
        });
      }

      const counts = {
        participants: progressRows.length || cycleRoster.length,
        self_done: progressRows.filter((r) => r.self_submitted).length,
        manager_done: progressRows.filter((r) => r.manager_submitted).length,
        conversation_done: progressRows.filter((r) => r.conversation_completed).length,
        released: progressRows.filter((r) => r.release_status !== "pending").length,
        overdue: progressRows.filter(
          (r) =>
            !r.self_submitted &&
            r.self_submitted_at === null &&
            cycleRoster.find((x: any) => x.id === r.participant_id)?.self_assessment_due &&
            (cycleRoster.find((x: any) => x.id === r.participant_id)?.self_assessment_due || "") < today
        ).length,
      };

      return {
        id: cycle.id,
        title: cycle.title,
        description: cycle.description || "",
        status: cycle.status || "draft",
        config: cfg,
        can_manage: canManage,
        can_calibrate: canCalibrate,
        my_tasks: myTasks,
        my_summary: mySummary,
        counts,
        calibration: calibration
          ? {
              id: calibration.id,
              status: calibration.status,
              completed_at: calibration.completed_at || null,
              total_employees: (calibration.calibrated_employees || []).length,
              adjusted_count: (calibration.summary_stats || {}).adjusted_count ?? null,
              avg_manager_rating: (calibration.summary_stats || {}).avg_manager_rating ?? null,
              avg_calibrated_rating: (calibration.summary_stats || {}).avg_calibrated_rating ?? null,
            }
          : null,
        progress_rows: progressRows,
        is_focus: focusCycleId === cycle.id,
      };
    });

    // Audit trail is admin-only and only fetched for the focused cycle.
    let audit: any[] = [];
    if (focusCycleId && admin) {
      audit = asList(
        await base44.asServiceRole.entities.ReviewCycleEvent.filter(
          { review_cycle_id: focusCycleId, client_id: clientId },
          { sort: "-occurred_at", limit: 200 }
        )
      );
    }

    // Record that review material was opened. Deduped per viewer per hour so the
    // history reads as "who looked at what, when" rather than a page-view log.
    if (focusCycleId) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const alreadyLogged = asList(
        await base44.asServiceRole.entities.ReviewCycleEvent
          .filter(
            {
              review_cycle_id: focusCycleId,
              client_id: clientId,
              event_type: "review_viewed",
              actor_email: email,
              occurred_at: { $gte: hourAgo },
            },
            { limit: 1 }
          )
          .catch(() => [])
      );
      if (alreadyLogged.length === 0) {
        await logReviewEvent(base44, {
          client_id: clientId,
          review_cycle_id: focusCycleId,
          event_type: "review_viewed",
          actor_email: email,
          actor_name: user.full_name || "",
          actor_role: admin ? "admin" : "reviewer",
          after: { scope: admin ? "cycle_wide" : "own_material" },
        });
      }
    }

    return Response.json({
      viewer: {
        email,
        name: user.full_name || user.email,
        is_admin: admin,
        roles: userRoles(user),
      },
      review_form_config: reviewForms[0]?.config || null,
      cycles: payload,
      audit,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}