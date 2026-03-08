import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update current user to be a UAT tester
    await base44.asServiceRole.entities.User.update(user.id, {
      is_uat_tester: true,
      uat_cycle: 'Q1-2026'
    });

    return Response.json({ 
      success: true, 
      message: 'UAT testing enabled successfully',
      uat_cycle: 'Q1-2026'
    });
  } catch (error) {
    console.error('Error enabling UAT testing:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});