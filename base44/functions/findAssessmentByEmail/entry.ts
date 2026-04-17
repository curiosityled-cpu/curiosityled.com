import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.app_role !== 'Platform Admin' && user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { email } = await req.json();
    const assessments = await base44.asServiceRole.entities.Assessment.filter({ email });
    const insights = await base44.asServiceRole.entities.AssessmentInsights.filter({ user_email: email });
    return Response.json({ assessments, insights });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});