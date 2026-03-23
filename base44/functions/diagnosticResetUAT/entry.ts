import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    // 1. Try to list all test cases (with service role to bypass RLS)
    console.log('[DIAGNOSTIC] Attempting to list all UATTestCase records...');
    const allCases = await base44.asServiceRole.entities.UATTestCase.list();
    console.log(`[DIAGNOSTIC] Found ${allCases.length} existing test cases`);

    // 2. If any exist, delete them
    if (allCases.length > 0) {
      console.log('[DIAGNOSTIC] Deleting all existing test cases...');
      for (const testCase of allCases) {
        await base44.asServiceRole.entities.UATTestCase.delete(testCase.id);
      }
      console.log('[DIAGNOSTIC] All test cases deleted');
    }

    // 3. Verify deletion
    const afterDelete = await base44.asServiceRole.entities.UATTestCase.list();
    console.log(`[DIAGNOSTIC] Verification: ${afterDelete.length} test cases remain`);

    // 4. Create a single test case to verify write capability
    console.log('[DIAGNOSTIC] Creating test case to verify write capability...');
    const testCase = await base44.asServiceRole.entities.UATTestCase.create({
      test_case_id: 'TEST-1.0',
      role: 'Platform Administrator',
      feature_area: 'Diagnostic',
      description: 'Test write capability',
      expected_outcome: 'Test case created successfully',
      priority: 'P2',
      status: 'Not Tested'
    });
    console.log(`[DIAGNOSTIC] Test case created with ID: ${testCase.id}`);

    // 5. Verify the test case can be read back
    console.log('[DIAGNOSTIC] Attempting to read back the test case...');
    const readBack = await base44.asServiceRole.entities.UATTestCase.list();
    console.log(`[DIAGNOSTIC] Read back: ${readBack.length} test cases`);

    return Response.json({
      success: true,
      diagnostic: {
        initial_count: allCases.length,
        deleted: allCases.length,
        after_delete: afterDelete.length,
        test_case_created: !!testCase.id,
        final_count: readBack.length
      },
      message: 'Diagnostic complete. Database is working correctly.'
    });

  } catch (error) {
    console.error('[DIAGNOSTIC] Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      success: false 
    }, { status: 500 });
  }
});