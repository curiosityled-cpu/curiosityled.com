import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * Starts a calibration session for a review cycle.
 * Aggregates all manager reviews and self-assessments into a calibration record.
 * Creates or reuses an existing draft/active calibration for the cycle.
 *
 * Payload: { review_cycle_id: string, calibrator_emails?: string[] }
 * Returns: { calibration: ReviewCalibration, employees: [...] }
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { review_cycle_id, calibrator_emails } = body;

    if (!review_cycle_id) return Response.json({ error: "review_cycle_id required" }, { status: 400 });

    const clientId = user.data?.client_id;
    if (!clientId) return Response.json({ error: "No client context" }, { status: 403 });

    // Fetch all submissions for this cycle
    const submissions = await base44.asServiceRole.entities.CustomFormSubmission.filter({
      review_cycle_id,
      status: { $in: ["submitted", "acknowledged"] },
    });

    // Group by employee
    const employeeMap = new Map<string, any>();

    for (const sub of submissions) {
      const empEmail = sub.linked_employee_email;
      if (!empEmail) continue;

      if (!employeeMap.has(empEmail)) {
        employeeMap.set(empEmail, {
          employee_email: empEmail,
          employee_name: "",
          manager_email: "",
          manager_rating: null,
          self_rating: null,
          peer_ratings: [],
        });
      }
      const entry = employeeMap.get(empEmail);
      const rating = sub.responses?.overall_rating || null;

      if (sub.submitter_role === "manager") {
        entry.manager_email = sub.submitter_email;
        entry.manager_rating = rating;
      } else if (sub.submitter_role === "self") {
        entry.self_rating = rating;
      } else if (sub.submitter_role === "peer") {
        if (rating) entry.peer_ratings.push(rating);
      }
    }

    // Build calibrated_employees array
    const calibratedEmployees = [...employeeMap.values()].map(e => ({
      employee_email: e.employee_email,
      employee_name: e.employee_name,
      manager_email: e.manager_email,
      manager_rating: e.manager_rating,
      self_rating: e.self_rating,
      peer_avg_rating: e.peer_ratings.length > 0
        ? Math.round((e.peer_ratings.reduce((a: number, b: number) => a + b, 0) / e.peer_ratings.length) * 10) / 10
        : null,
      calibrated_rating: e.manager_rating, // default to manager rating
      adjustment_reason: "",
      calibrated_by_email: "",
      calibrated_at: null,
    }));

    // Check for existing calibration
    const existing = await base44.asServiceRole.entities.ReviewCalibration.filter({
      review_cycle_id,
      client_id: clientId,
      status: { $in: ["draft", "active"] },
    });

    let calibration;
    if (existing.length > 0) {
      // Update existing
      calibration = await base44.asServiceRole.entities.ReviewCalibration.update(existing[0].id, {
        calibrated_employees: calibratedEmployees,
        status: "active",
        calibrator_emails: calibrator_emails || existing[0].calibrator_emails || [],
      });
    } else {
      // Create new
      calibration = await base44.asServiceRole.entities.ReviewCalibration.create({
        client_id: clientId,
        review_cycle_id,
        status: "active",
        calibrator_emails: calibrator_emails || [],
        calibrated_employees: calibratedEmployees,
      });
    }

    // Compute summary stats
    const mgrRatings = calibratedEmployees.filter(e => e.manager_rating != null).map(e => e.manager_rating);
    const avgMgr = mgrRatings.length > 0
      ? Math.round((mgrRatings.reduce((a: number, b: number) => a + b, 0) / mgrRatings.length) * 10) / 10
      : null;

    return Response.json({
      calibration,
      employees: calibratedEmployees,
      stats: {
        total_employees: calibratedEmployees.length,
        with_manager_review: calibratedEmployees.filter(e => e.manager_rating != null).length,
        with_self_assessment: calibratedEmployees.filter(e => e.self_rating != null).length,
        avg_manager_rating: avgMgr,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}