import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!['Platform Admin', 'Super Administrator'].includes(user?.app_role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const testResults = {
      test_suite: 'Integration Tests',
      timestamp: new Date().toISOString(),
      tests: []
    };

    const testUserEmail = `test-integration-${Date.now()}@example.com`;

    // Test 1: Full Flow - Complete Learning → Earn Points → Level Up
    try {
      // Step 1: Award points for learning completion
      const pointsResult = await base44.asServiceRole.functions.invoke('awardPoints', {
        user_email: testUserEmail,
        points_amount: 500,
        transaction_type: 'completion',
        reason: 'Integration test - learning completion',
        client_id: user.client_id
      });

      // Step 2: Check level progression
      const levelResult = await base44.asServiceRole.functions.invoke('checkLevelProgression', {
        user_email: testUserEmail
      });

      // Step 3: Verify achievement record exists
      const achievements = await base44.asServiceRole.entities.UserAchievement.filter({
        user_email: testUserEmail
      });

      const flowSuccess = pointsResult.data?.success && 
                         achievements.length > 0 && 
                         achievements[0].total_points >= 500;

      testResults.tests.push({
        name: 'Complete Learning Flow',
        status: flowSuccess ? 'passed' : 'failed',
        details: {
          points_awarded: pointsResult.data?.points_awarded,
          level_changed: levelResult.data?.level_changed,
          current_level: achievements[0]?.current_level,
          total_points: achievements[0]?.total_points
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Complete Learning Flow',
        status: 'failed',
        error: error.message
      });
    }

    // Test 2: Peer Point Giving with Budget Limits
    try {
      const settings = await base44.asServiceRole.entities.GamificationSettings.filter({
        client_id: user.client_id
      });
      
      const budget = settings[0]?.peer_point_budget_weekly || 300;

      // Attempt to give points within budget
      const withinBudgetResult = await base44.asServiceRole.functions.invoke('givePeerPoints', {
        giver_email: user.email,
        recipient_email: testUserEmail,
        points_amount: 50,
        reason: 'Budget test - within limit',
        client_id: user.client_id
      });

      // Attempt to exceed budget (should fail or warn)
      const exceedBudgetResult = await base44.asServiceRole.functions.invoke('givePeerPoints', {
        giver_email: user.email,
        recipient_email: testUserEmail,
        points_amount: budget + 100,
        reason: 'Budget test - exceed limit',
        client_id: user.client_id
      });

      const budgetEnforced = withinBudgetResult.data?.success && 
                            !exceedBudgetResult.data?.success;

      testResults.tests.push({
        name: 'Peer Point Budget Enforcement',
        status: budgetEnforced ? 'passed' : 'warning',
        details: {
          within_budget: withinBudgetResult.data?.success,
          exceeded_budget_blocked: !exceedBudgetResult.data?.success,
          budget_limit: budget
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Peer Point Budget Enforcement',
        status: 'failed',
        error: error.message
      });
    }

    // Test 3: Badge Award Flow
    try {
      const badgeTemplates = await base44.asServiceRole.entities.BadgeTemplate.list();
      
      if (badgeTemplates.length > 0) {
        const testBadge = badgeTemplates[0];
        
        const badgeResult = await base44.asServiceRole.functions.invoke('awardBadge', {
          user_email: testUserEmail,
          badge_template_id: testBadge.id,
          awarded_by_system: true,
          client_id: user.client_id
        });

        const userBadges = await base44.asServiceRole.entities.UserBadge.filter({
          user_email: testUserEmail
        });

        testResults.tests.push({
          name: 'Badge Award Flow',
          status: userBadges.length > 0 ? 'passed' : 'failed',
          details: {
            badge_awarded: badgeResult.data?.success,
            badge_count: userBadges.length
          }
        });
      } else {
        testResults.tests.push({
          name: 'Badge Award Flow',
          status: 'skipped',
          reason: 'No badge templates available'
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Badge Award Flow',
        status: 'failed',
        error: error.message
      });
    }

    const passedTests = testResults.tests.filter(t => t.status === 'passed').length;
    const totalTests = testResults.tests.filter(t => t.status !== 'skipped').length;

    return Response.json({
      success: true,
      summary: `${passedTests}/${totalTests} tests passed`,
      results: testResults
    });

  } catch (error) {
    console.error('Integration test error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});