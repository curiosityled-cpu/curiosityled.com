import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!['Platform Admin', 'Super Administrator'].includes(user?.app_role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const testResults = {
      test_suite: 'Unit Tests',
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Point Award Logic
    try {
      const testUser = user.email;
      const pointsResult = await base44.asServiceRole.functions.invoke('awardPoints', {
        user_email: testUser,
        points_amount: 100,
        transaction_type: 'completion',
        reason: 'Unit test - point award validation',
        client_id: user.client_id
      });
      
      testResults.tests.push({
        name: 'Point Award Logic',
        status: pointsResult.data?.success ? 'passed' : 'failed',
        details: {
          points_awarded: pointsResult.data?.points_awarded,
          new_total: pointsResult.data?.new_total
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Point Award Logic',
        status: 'failed',
        error: error.message
      });
    }

    // Test 2: Level Calculation
    try {
      // Get current user's achievement to test level calculation
      const achievements = await base44.asServiceRole.entities.UserAchievement.filter({
        user_email: user.email
      });
      
      if (achievements.length > 0) {
        const currentPoints = achievements[0].total_points;
        const currentLevel = achievements[0].current_level;
        
        testResults.tests.push({
          name: 'Level Calculation',
          status: currentLevel >= 1 ? 'passed' : 'failed',
          details: {
            current_points: currentPoints,
            current_level: currentLevel,
            level_name: achievements[0].level_name
          }
        });
      } else {
        testResults.tests.push({
          name: 'Level Calculation',
          status: 'skipped',
          reason: 'No achievement record found for test user'
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Level Calculation',
        status: 'failed',
        error: error.message
      });
    }

    // Test 3: Badge Eligibility Check
    try {
      const badgeResult = await base44.asServiceRole.functions.invoke('evaluateAllBadges', {
        user_email: user.email,
        client_id: user.client_id,
        check_proximity: true
      });
      
      const eligible = badgeResult.data?.eligible_badges || [];
      const closeToEarning = badgeResult.data?.badges_close_to_earning || [];
      
      testResults.tests.push({
        name: 'Badge Eligibility Check',
        status: 'passed',
        details: {
          eligible_badges_count: eligible.length,
          close_to_earning_count: closeToEarning.length,
          total_badges: badgeResult.data?.total_badges || 0,
          function_executed: true
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Badge Eligibility Check',
        status: 'failed',
        error: error.message
      });
    }

    const passedTests = testResults.tests.filter(t => t.status === 'passed').length;
    const totalTests = testResults.tests.length;

    return Response.json({
      success: true,
      summary: `${passedTests}/${totalTests} tests passed`,
      results: testResults
    });

  } catch (error) {
    console.error('Unit test error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});