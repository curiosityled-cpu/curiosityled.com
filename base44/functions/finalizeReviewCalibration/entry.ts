import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * Finalizes a review calibration session.
 * Saves adjusted ratings with reasons, marks the session as completed,
 * and updates the underlying manager review submissions with calibrated ratings.
 *
 * Payload: {
 *   calibration_id: string,
 *   adjusted_employees: [{ employee_email, calibrated_rating, adjustment_reason }]
 * }
 * Returns: { calibration: ReviewCalibration, adjusted_count: number }
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { calibration_id, adjusted_employees } = body;

    if (!calibration_id || !adjusted_employees || !Array.isArray(adjusted_employees)) {
      return Response.json({ error: "calibration_id and adjusted_employees array required" }, { status: 400 });
    }

    // Fetch the calibration session
    const calibration = await base44.asServiceRole.entities.ReviewCalibration.get(calibration_id);
    if (!calibration) return Response.json({ error: "Calibration not found" }, { status: 404 });
    if (calibration.status === "completed") return Response.json({ error: "Calibration already completed" }, { status: 400 });

    // Build a lookup of adjustments
    const adjustmentMap = new Map<string, { rating: number; reason: string }>();
    for (const adj of adjusted_employees) {
      adjustmentMap.set(adj.employee_email, {
        rating: adj.calibrated_rating,
        reason: adj.adjustment_reason || "",
      });
    }

    // Update calibrated_employees with adjustments
    const updatedEmployees = (calibration.calibrated_employees || []).map((emp: any) => {
      const adj = adjustmentMap.get(emp.employee_email);
      if (adj) {
        return {
          ...emp,
          calibrated_rating: adj.rating,
          adjustment_reason: adj.reason,
          calibrated_by_email: user.email,
          calibrated_at: new Date().toISOString(),
        };
      }
      return emp;
    });

    // Compute summary stats
    const adjusted = updatedEmployees.filter((e: any) =>
      e.calibrated_by_email === user.email && e.calibrated_rating !== e.manager_rating
    );
    const allRatings = updatedEmployees.filter((e: any) => e.calibrated_rating != null).map((e: any) => e.calibrated_rating);
    const mgrRatings = updatedEmployees.filter((e: any) => e.manager_rating != null).map((e: any) => e.manager_rating);

    const avgCalibrated = allRatings.length > 0
      ? Math.round((allRatings.reduce((a: number, b: number) => a + b, 0) / allRatings.length) * 10) / 10
      : null;
    const avgMgr = mgrRatings.length > 0
      ? Math.round((mgrRatings.reduce((a: number, b: number) => a + b, 0) / mgrRatings.length) * 10) / 10
      : null;

    // Update the calibration record
    const updated = await base44.asServiceRole.entities.ReviewCalibration.update(calibration_id, {
      calibrated_employees: updatedEmployees,
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by_email: user.email,
      summary_stats: {
        total_employees: updatedEmployees.length,
        adjusted_count: adjusted.length,
        avg_manager_rating: avgMgr,
        avg_calibrated_rating: avgCalibrated,
      },
    });

    // Update underlying manager review submissions with calibrated rating
    const submissions = await base44.asServiceRole.entities.CustomFormSubmission.filter({
      review_cycle_id: calibration.review_cycle_id,
      submitter_role: "manager",
    });

    for (const sub of submissions) {
      const adj = adjustmentMap.get(sub.linked_employee_email);
      if (adj) {
        await base44.asServiceRole.entities.CustomFormSubmission.update(sub.id, {
          responses: {
            ...sub.responses,
            overall_rating: adj.rating,
            calibration_adjustment_reason: adj.reason,
            calibrated: true,
          },
        });
      }
    }

    return Response.json({
      calibration: updated,
      adjusted_count: adjusted.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}