import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { asList, clientIdOf, isReviewAdmin, logReviewEvent, normEmail } from "../../shared/reviewCycleCore.ts";

/**
 * Finalizes a calibration session.
 *
 * The calibrated outcome is stored on the calibration record only — the manager's
 * submitted review keeps its original rating, so the change and its rationale
 * remain auditable side by side. Every adjustment requires a written reason.
 *
 * Payload: {
 *   calibration_id: string,
 *   adjusted_employees: [{ employee_email, calibrated_rating, adjustment_reason }]
 * }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = clientIdOf(user);
    if (!clientId) return Response.json({ error: "No client context" }, { status: 403 });

    const { calibration_id, adjusted_employees } = await req.json().catch(() => ({}));
    if (!calibration_id || !Array.isArray(adjusted_employees)) {
      return Response.json(
        { error: "calibration_id and adjusted_employees array required" },
        { status: 400 }
      );
    }

    const calibration = await base44.asServiceRole.entities.ReviewCalibration
      .get(calibration_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!calibration) return Response.json({ error: "Calibration not found" }, { status: 404 });
    if (calibration.client_id !== clientId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (calibration.status === "completed") {
      return Response.json({ error: "Calibration already completed" }, { status: 400 });
    }

    const isCalibrator = (calibration.calibrator_emails || [])
      .map(normEmail)
      .includes(normEmail(user.email));
    if (!isReviewAdmin(user) && !isCalibrator) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const adjustmentMap = new Map<string, { rating: number; reason: string }>();
    for (const adj of adjusted_employees) {
      adjustmentMap.set(normEmail(adj.employee_email), {
        rating: adj.calibrated_rating,
        reason: String(adj.adjustment_reason || "").trim(),
      });
    }

    // A changed rating must carry a written rationale.
    const missingReasons = (calibration.calibrated_employees || [])
      .filter((emp: any) => {
        const adj = adjustmentMap.get(normEmail(emp.employee_email));
        if (!adj || adj.rating == null) return false;
        return adj.rating !== emp.manager_rating && !adj.reason;
      })
      .map((emp: any) => emp.employee_email);
    if (missingReasons.length > 0) {
      return Response.json(
        {
          error: "A reason is required for every adjusted rating",
          missing_reason_for: missingReasons,
        },
        { status: 400 }
      );
    }

    const changed: any[] = [];
    const updatedEmployees = (calibration.calibrated_employees || []).map((emp: any) => {
      const adj = adjustmentMap.get(normEmail(emp.employee_email));
      if (!adj || adj.rating == null) return emp;
      const isChange = adj.rating !== emp.manager_rating;
      if (isChange) {
        changed.push({
          employee_email: emp.employee_email,
          manager_rating: emp.manager_rating,
          calibrated_rating: adj.rating,
          adjustment_reason: adj.reason,
        });
      }
      return {
        ...emp,
        calibrated_rating: adj.rating,
        adjustment_reason: adj.reason,
        calibrated_by_email: normEmail(user.email),
        calibrated_at: new Date().toISOString(),
      };
    });

    const allRatings = updatedEmployees
      .filter((e: any) => e.calibrated_rating != null)
      .map((e: any) => e.calibrated_rating);
    const mgrRatings = updatedEmployees
      .filter((e: any) => e.manager_rating != null)
      .map((e: any) => e.manager_rating);

    const updated = await base44.asServiceRole.entities.ReviewCalibration.update(calibration_id, {
      calibrated_employees: updatedEmployees,
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by_email: normEmail(user.email),
      summary_stats: {
        total_employees: updatedEmployees.length,
        adjusted_count: changed.length,
        avg_manager_rating:
          mgrRatings.length > 0
            ? Math.round(
                (mgrRatings.reduce((a: number, b: number) => a + b, 0) / mgrRatings.length) * 10
              ) / 10
            : null,
        avg_calibrated_rating:
          allRatings.length > 0
            ? Math.round(
                (allRatings.reduce((a: number, b: number) => a + b, 0) / allRatings.length) * 10
              ) / 10
            : null,
      },
    });

    // One event per adjustment, so the history explains each decision.
    for (const change of changed) {
      await logReviewEvent(base44, {
        client_id: clientId,
        review_cycle_id: calibration.review_cycle_id,
        event_type: "calibration_adjusted",
        actor_email: user.email,
        actor_name: user.full_name || "",
        actor_role: "calibrator",
        subject_email: change.employee_email,
        source_entity: "ReviewCalibration",
        source_id: calibration_id,
        before: { manager_rating: change.manager_rating },
        after: { calibrated_rating: change.calibrated_rating },
        reason: change.adjustment_reason,
      });
    }

    await logReviewEvent(base44, {
      client_id: clientId,
      review_cycle_id: calibration.review_cycle_id,
      event_type: "calibration_finalized",
      actor_email: user.email,
      actor_name: user.full_name || "",
      actor_role: "calibrator",
      source_entity: "ReviewCalibration",
      source_id: calibration_id,
      after: {
        status: "completed",
        total_employees: updatedEmployees.length,
        adjusted_count: changed.length,
      },
    });

    // Roster rows whose conversation is already done can now be released.
    const roster = asList(
      await base44.asServiceRole.entities.ReviewParticipant.filter({
        review_cycle_id: calibration.review_cycle_id,
        client_id: clientId,
      })
    );
    for (const row of roster) {
      if (row.status === "manager_submitted" || row.status === "self_submitted") {
        const hasManager = updatedEmployees.some(
          (e: any) =>
            normEmail(e.employee_email) === normEmail(row.employee_email) &&
            e.manager_rating != null
        );
        if (hasManager) {
          await base44.asServiceRole.entities.ReviewParticipant.update(row.id, {
            status: "conversation_done",
          });
        }
      }
    }

    return Response.json({
      calibration: updated,
      adjusted_count: changed.length,
      adjustments: changed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}