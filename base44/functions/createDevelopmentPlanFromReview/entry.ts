import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * Creates a DevelopmentPlan from a completed manager review.
 * Extracts strengths, improvements, development goals, and target competencies
 * from the manager's review submission and creates a structured development plan.
 *
 * Payload: {
 *   review_cycle_id: string,
 *   employee_email: string
 * }
 * Returns: { development_plan: DevelopmentPlan, created: boolean, target_competencies: string[] }
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { review_cycle_id, employee_email } = body;

    if (!review_cycle_id || !employee_email) {
      return Response.json({ error: "review_cycle_id and employee_email required" }, { status: 400 });
    }

    // Get the cycle
    const cycle = await base44.asServiceRole.entities.CustomForm.get(review_cycle_id);
    if (!cycle) return Response.json({ error: "Review cycle not found" }, { status: 404 });

    // Get the manager review submission
    const submissions = await base44.asServiceRole.entities.CustomFormSubmission.filter({
      review_cycle_id,
      linked_employee_email: employee_email,
      submitter_role: "manager",
      status: { $in: ["submitted", "acknowledged"] },
    });

    if (submissions.length === 0) {
      return Response.json({ error: "No manager review found for this employee" }, { status: 404 });
    }

    const mgrSub = submissions[0];
    const responses = mgrSub.responses || {};

    // Check if a development plan already exists for this cycle + employee
    const planTitle = `Development Plan — ${cycle.title}`;
    const existing = await base44.asServiceRole.entities.DevelopmentPlan.filter({
      user_email: employee_email,
      client_id: cycle.client_id,
    });

    const existingPlan = existing.find((p: any) => p.title === planTitle);
    if (existingPlan) {
      return Response.json({
        development_plan: existingPlan,
        created: false,
        message: "Development plan already exists for this cycle",
      });
    }

    // Extract development data from review responses
    const strengths = responses.strengths || "";
    const improvements = responses.improvements || "";
    const developmentGoals = responses.development_goals || "";
    const competencyRatings = responses.competency_ratings || {};

    // Build description
    const descriptionParts: string[] = [];
    if (strengths) descriptionParts.push(`Key Strengths:\n${strengths}`);
    if (improvements) descriptionParts.push(`Areas for Improvement:\n${improvements}`);
    if (developmentGoals) descriptionParts.push(`Development Goals:\n${developmentGoals}`);
    const description = descriptionParts.join("\n\n") || `Development plan from ${cycle.title}`;

    // Target competencies: those rated below 4 (needs development)
    const targetCompetencies: string[] = Object.entries(competencyRatings)
      .filter(([_, rating]: [string, any]) => rating < 4)
      .map(([compId]: [string, any]) => compId);

    // Create the development plan
    const devPlan = await base44.asServiceRole.entities.DevelopmentPlan.create({
      user_email: employee_email,
      title: planTitle,
      description,
      target_competencies: targetCompetencies,
      status: "active",
      client_id: cycle.client_id,
      experiences: [],
      learning_items: [],
    });

    return Response.json({
      development_plan: devPlan,
      created: true,
      target_competencies: targetCompetencies,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}