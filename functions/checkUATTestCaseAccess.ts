import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Attempt to list with service role
    const allCases = await base44.asServiceRole.entities.UATTestCase.list();
    const count = allCases ? allCases.length : 0;

    // Get a sample
    const sample = allCases && allCases.length > 0 ? allCases[0] : null;

    // Get breakdown by role
    const byRole = {};
    if (allCases) {
      allCases.forEach(tc => {
        byRole[tc.role] = (byRole[tc.role] || 0) + 1;
      });
    }

    return Response.json({
      success: true,
      totalCount: count,
      sampleRecord: sample ? {
        id: sample.id,
        test_case_id: sample.test_case_id,
        role: sample.role,
        status: sample.status
      } : null,
      countByRole: byRole,
      userRole: user.app_role
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});