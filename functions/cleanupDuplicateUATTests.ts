import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    // Get all test cases
    const allTestCases = await base44.asServiceRole.entities.UATTestCase.filter({});

    // Group by test_case_id
    const grouped = {};
    allTestCases.forEach(tc => {
      const id = tc.test_case_id;
      if (!grouped[id]) {
        grouped[id] = [];
      }
      grouped[id].push(tc);
    });

    let deletedCount = 0;
    const duplicatesFound = [];

    // For each test_case_id, keep only the oldest record (first created)
    for (const [testCaseId, duplicates] of Object.entries(grouped)) {
      if (duplicates.length > 1) {
        duplicatesFound.push({ testCaseId, count: duplicates.length });
        
        // Sort by created_date to find the oldest
        duplicates.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        
        // Keep the first (oldest), delete the rest
        const toDelete = duplicates.slice(1);
        
        for (const dup of toDelete) {
          await base44.asServiceRole.entities.UATTestCase.delete(dup.id);
          deletedCount++;
        }
      }
    }

    return Response.json({
      success: true,
      message: `Cleanup complete. Removed ${deletedCount} duplicate test cases.`,
      total_before: allTestCases.length,
      total_after: allTestCases.length - deletedCount,
      unique_test_cases: Object.keys(grouped).length,
      deleted: deletedCount,
      duplicates_found: duplicatesFound
    });

  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return Response.json({ 
      error: error?.message || 'Unknown error occurred',
      success: false 
    }, { status: 500 });
  }
});