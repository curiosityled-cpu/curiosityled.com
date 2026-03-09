import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const diagnostic = {
      user: {
        email: user.email,
        full_name: user.full_name,
        app_role: user.app_role,
        role: user.role
      },
      checks: {}
    };

    // Check 1: Try to read with user credentials
    try {
      const cases = await base44.entities.UATTestCase.list();
      diagnostic.checks.userCanRead = {
        success: true,
        count: cases ? cases.length : 0,
        sample: cases && cases.length > 0 ? {
          id: cases[0].id,
          test_case_id: cases[0].test_case_id,
          role: cases[0].role
        } : null
      };
    } catch (e) {
      diagnostic.checks.userCanRead = {
        success: false,
        error: e.message
      };
    }

    // Check 2: Get entity schema
    try {
      const schema = await base44.entities.UATTestCase.schema();
      diagnostic.checks.schema = {
        success: true,
        hasRLS: !!schema.rls,
        rls: schema.rls || null
      };
    } catch (e) {
      diagnostic.checks.schema = {
        success: false,
        error: e.message
      };
    }

    return Response.json({
      success: true,
      diagnostic
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message
    }, { status: 500 });
  }
});