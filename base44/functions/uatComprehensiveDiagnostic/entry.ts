import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('[DIAG] User:', user.email, 'Role:', user.app_role);
    const diagnostics = {};

    // 1. Check entity schema
    try {
      const schema = await base44.asServiceRole.entities.UATTestCase.schema();
      diagnostics.schema = { success: true, hasRLS: !!schema.rls };
      console.log('[DIAG] Schema check passed. RLS present:', !!schema.rls);
    } catch (e) {
      diagnostics.schema = { success: false, error: e.message };
      console.log('[DIAG] Schema check failed:', e.message);
    }

    // 2. Count total records using service role
    let totalCount = 0;
    try {
      const allRecords = await base44.asServiceRole.entities.UATTestCase.list(null, 1000);
      totalCount = allRecords ? allRecords.length : 0;
      diagnostics.serviceRoleCount = totalCount;
      console.log('[DIAG] Service role count:', totalCount);
    } catch (e) {
      diagnostics.serviceRoleCountError = e.message;
      console.log('[DIAG] Service role count error:', e.message);
    }

    // 3. Try to read a single record if any exist
    if (totalCount > 0) {
      try {
        const sample = await base44.asServiceRole.entities.UATTestCase.list(null, 1);
        if (sample && sample[0]) {
          diagnostics.sampleRecord = {
            id: sample[0].id,
            test_case_id: sample[0].test_case_id,
            role: sample[0].role,
            status: sample[0].status
          };
          console.log('[DIAG] Sample record:', diagnostics.sampleRecord);
        }
      } catch (e) {
        diagnostics.sampleReadError = e.message;
        console.log('[DIAG] Sample read error:', e.message);
      }
    }

    // 4. Try user-level read (using user's own role)
    try {
      const userRoleRecords = await base44.entities.UATTestCase.list(null, 1);
      diagnostics.userRoleCount = userRoleRecords ? userRoleRecords.length : 0;
      console.log('[DIAG] User role count:', diagnostics.userRoleCount);
    } catch (e) {
      diagnostics.userRoleError = e.message;
      console.log('[DIAG] User role error:', e.message);
    }

    // 5. Check if entity exists
    try {
      const exists = await base44.asServiceRole.entities.UATTestCase.list(null, 1);
      diagnostics.entityExists = exists !== undefined && exists !== null;
      console.log('[DIAG] Entity exists:', diagnostics.entityExists);
    } catch (e) {
      diagnostics.entityExistsError = e.message;
      console.log('[DIAG] Entity existence check failed:', e.message);
    }

    // 6. Get breakdown by role
    if (totalCount > 0) {
      try {
        const allCases = await base44.asServiceRole.entities.UATTestCase.list();
        const byRole = {};
        allCases.forEach(tc => {
          byRole[tc.role] = (byRole[tc.role] || 0) + 1;
        });
        diagnostics.countByRole = byRole;
        console.log('[DIAG] Count by role:', byRole);
      } catch (e) {
        console.log('[DIAG] Role breakdown error:', e.message);
      }
    }

    return Response.json({
      success: true,
      diagnostics,
      summary: {
        totalTestCases: totalCount,
        canReadWithServiceRole: diagnostics.serviceRoleCount > 0,
        hasValidSchema: diagnostics.schema?.success || false,
        userCanRead: diagnostics.userRoleCount > 0
      }
    });

  } catch (error) {
    console.error('[DIAG] Critical error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});