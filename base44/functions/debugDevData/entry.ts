import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Use service role to bypass RLS
    const [plans, experiences] = await Promise.all([
      base44.asServiceRole.entities.DevelopmentPlan.list('-created_date', 50),
      base44.asServiceRole.entities.DevelopmentExperience.list('-created_date', 50),
    ]);

    return Response.json({
      plans_count: plans.length,
      experiences_count: experiences.length,
      plans: plans.map(p => ({ id: p.id, title: p.title, user_email: p.user_email, client_id: p.client_id, created_date: p.created_date })),
      experiences: experiences.map(e => ({ id: e.id, title: e.title, user_email: e.user_email, client_id: e.client_id, created_date: e.created_date })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});