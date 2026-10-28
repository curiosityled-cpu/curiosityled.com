import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { asList, clientIdOf, isReviewAdmin, logReviewEvent, normEmail } from "../../shared/reviewCycleCore.ts";

/**
 * Starts (or refreshes) a calibration session for a review cycle.
 * Aggregates manager reviews, self assessments, and peer averages per employee.
 * Original ratings are copied into the session and never overwritten in place.
 *
 * Payload: { review_cycle_id: string, calibrator_emails?: string[] }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = clientIdOf(user);
    if (!clientId) return Response.json({ error: "No client context" }, { status: 403 });

    const { review_cycle_id, calibrator_emails } = await req.json().catch(() => ({}));
    if (!review_cycle_id) return Response.json({ error: "review_cycle_id required" }, { status: 400 });

    const cycle = await base44.asServiceRole.entities.CustomForm
      .get(review_cycle_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!cycle || cycle.form_type !== "review_cycle") {
      return Response.json({ error: "Review cycle not found" }, { status: 404 });
    }
    if (cycle.client_id !== clientId) return Response.json({ error: "Forbidden" }, { status: 403 });

    if (!isReviewAdmin(user)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const roster = asList(
      await base44.asServiceRole.entities.ReviewParticipant.filter({
        review_cycle_id,
        client_id: clientId,
      })
    );

    const submissions = asList(
      await base44.asServiceRole.entities.CustomFormSubmission.filter({
        review_cycle_id,
        status: { $in: ["submitted", "acknowledged"] },
      })
    );

    const employeeMap = new Map<string, any>();
    for (const row of roster) {
      const key = normEmail(row.employee_email);
      employeeMap.set(key, {
        employee_email: key,
        employee_name: row.employee_name || "",
        manager_email: normEmail(row.manager_email),
        manager_rating: null,
        self_rating: null,
        peer_ratings: [] as number[],
        manager_submission_id: null,
      });
    }

    for (const sub of submissions) {
      const key = normEmail(sub.linked_employee_email);
      if (!key) continue;
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          employee_email: key,
          employee_name: "",
          manager_email: "",
          manager_rating: null,
          self_rating: null,
          peer_ratings: [] as number[],
          manager_submission_id: null,
        });
      }
      const entry = employeeMap.get(key);
      const rating = sub.responses?.overall_rating ?? null;
      if (sub.submitter_role === "manager") {
        entry.manager_email = normEmail(sub.submitter_email) || entry.manager_email;
        entry.manager_rating = rating;
        entry.manager_submission_id = sub.id;
      } else if (sub.submitter_role === "self") {
        entry.self_rating = rating;
      } else if (sub.submitter_role === "peer" && rating != null) {
        entry.peer_ratings.push(rating);
      }
    }

    const calibratedEmployees = [...employeeMap.values()].map((e) => ({
      employee_email: e.employee_email,
      employee_name: e.employee_name,
      manager_email: e.manager_email,
      manager_rating: e.manager_rating,
      manager_submission_id: e.manager_submission_id,
      self_rating: e.self_rating,
      peer_avg_rating:
        e.peer_ratings.length > 0
          ? Math.round(
              (e.peer_ratings.reduce((a: number, b: number) => a + b, 0) / e.peer_ratings.length) *
                10
            ) / 10
          : null,
      calibrated_rating: e.manager_rating,
      adjustment_reason: "",
      calibrated_by_email: "",
      calibrated_at: null,
    }));

    const existing = asList(
      await base44.asServiceRole.entities.ReviewCalibration.filter({
        review_cycle_id,
        client_id: clientId,
        status: { $in: ["draft", "active"] },
      })
    );

    let calibration;
    if (existing.length > 0) {
      // Preserve any adjustments already recorded by the calibrator.
      const priorAdjustments = new Map<string, any>();
      for (const emp of existing[0].calibrated_employees || []) {
        if (emp.calibrated_by_email) priorAdjustments.set(normEmail(emp.employee_email), emp);
      }
      const merged = calibratedEmployees.map((emp) => {
        const prior = priorAdjustments.get(emp.employee_email);
        if (!prior) return emp;
        const stillDiffers =
          prior.calibrated_rating != null && prior.calibrated_rating !== emp.manager_rating;
        return stillDiffers
          ? {
              ...emp,
              calibrated_rating: prior.calibrated_rating,
              adjustment_reason: prior.adjustment_reason || "",
              calibrated_by_email: prior.calibrated_by_email,
              calibrated_at: prior.calibrated_at,
            }
          : emp;
      });
      calibration = await base44.asServiceRole.entities.ReviewCalibration.update(existing[0].id, {
        calibrated_employees: merged,
        status: "active",
        calibrator_emails: calibrator_emails || existing[0].calibrator_emails || [],
      });
    } else {
      calibration = await base44.asServiceRole.entities.ReviewCalibration.create({
        client_id: clientId,
        review_cycle_id,
        status: "active",
        calibrator_emails: calibrator_emails || [normEmail(user.email)],
        calibrated_employees: calibratedEmployees,
      });
    }

    await logReviewEvent(base44, {
      client_id: clientId,
      review_cycle_id,
      event_type: "calibration_started",
      actor_email: user.email,
      actor_name: user.full_name || "",
      actor_role: "calibrator",
      source_entity: "ReviewCalibration",
      source_id: calibration.id,
      after: { employees: calibratedEmployees.length, status: "active" },
    });

    const mgrRatings = calibratedEmployees
      .filter((e) => e.manager_rating != null)
      .map((e) => e.manager_rating);

    return Response.json({
      calibration,
      employees: calibration.calibrated_employees || calibratedEmployees,
      stats: {
        total_employees: calibratedEmployees.length,
        with_manager_review: calibratedEmployees.filter((e) => e.manager_rating != null).length,
        with_self_assessment: calibratedEmployees.filter((e) => e.self_rating != null).length,
        avg_manager_rating:
          mgrRatings.length > 0
            ? Math.round(
                (mgrRatings.reduce((a: number, b: number) => a + b, 0) / mgrRatings.length) * 10
              ) / 10
            : null,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}