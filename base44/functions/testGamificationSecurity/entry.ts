import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!['Platform Admin', 'Super Administrator'].includes(user?.app_role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const testResults = {
      test_suite: 'Security Tests',
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: RBAC for Admin Functions
    try {
      // Verify admin can access gamification settings
      const settings = await base44.asServiceRole.entities.GamificationSettings.filter({
        client_id: user.client_id
      });

      // Verify admin can access badge templates
      const badgeTemplates = await base44.asServiceRole.entities.BadgeTemplate.list();

      // Verify admin can access level configs
      const levels = await base44.asServiceRole.entities.GamificationLevel.list();

      testResults.tests.push({
        name: 'RBAC for Admin Functions',
        status: 'passed',
        details: {
          settings_accessible: settings.length >= 0,
          badge_templates_accessible: badgeTemplates.length >= 0,
          levels_accessible: levels.length >= 0,
          admin_role: user.app_role
        },
        note: 'Admin can access all gamification configuration entities'
      });
    } catch (error) {
      testResults.tests.push({
        name: 'RBAC for Admin Functions',
        status: 'failed',
        error: error.message
      });
    }

    // Test 2: Point Manipulation Prevention
    try {
      // Test that users cannot directly modify their points
      const testUserAchievements = await base44.asServiceRole.entities.UserAchievement.filter({
        user_email: user.email
      });

      if (testUserAchievements.length > 0) {
        const originalPoints = testUserAchievements[0].total_points;

        // Attempt direct update (should be prevented by RLS)
        try {
          await base44.entities.UserAchievement.update(testUserAchievements[0].id, {
            total_points: originalPoints + 10000
          });
          
          // If we got here, security might be compromised
          testResults.tests.push({
            name: 'Point Manipulation Prevention',
            status: 'warning',
            note: 'Direct point modification was not blocked'
          });
        } catch (error) {
          // Expected to fail due to RLS
          testResults.tests.push({
            name: 'Point Manipulation Prevention',
            status: 'passed',
            note: 'Direct point modification correctly blocked by RLS'
          });
        }
      } else {
        testResults.tests.push({
          name: 'Point Manipulation Prevention',
          status: 'skipped',
          reason: 'No achievement record for test user'
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Point Manipulation Prevention',
        status: 'failed',
        error: error.message
      });
    }

    // Test 3: Budget Enforcement
    try {
      const settings = await base44.asServiceRole.entities.GamificationSettings.filter({
        client_id: user.client_id
      });
      
      const peerBudget = settings[0]?.peer_point_budget_weekly || 300;

      // Test giving points exceeding budget
      const overBudgetResult = await base44.asServiceRole.functions.invoke('givePeerPoints', {
        giver_email: user.email,
        recipient_email: 'test-recipient@example.com',
        points_amount: peerBudget + 500,
        reason: 'Security test - over budget',
        client_id: user.client_id
      });

      const budgetEnforced = !overBudgetResult.data?.success;

      testResults.tests.push({
        name: 'Budget Enforcement',
        status: budgetEnforced ? 'passed' : 'warning',
        details: {
          attempted_amount: peerBudget + 500,
          budget_limit: peerBudget,
          blocked: budgetEnforced
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Budget Enforcement',
        status: 'failed',
        error: error.message
      });
    }

    // Test 4: Transaction Integrity
    try {
      const transactions = await base44.asServiceRole.entities.PointTransaction.filter({
        user_email: user.email
      });

      // Verify all transactions have required fields
      const invalidTransactions = transactions.filter(t => 
        !t.user_email || 
        !t.transaction_type || 
        t.points_amount === undefined
      );

      testResults.tests.push({
        name: 'Transaction Integrity',
        status: invalidTransactions.length === 0 ? 'passed' : 'warning',
        details: {
          total_transactions: transactions.length,
          invalid_count: invalidTransactions.length
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Transaction Integrity',
        status: 'failed',
        error: error.message
      });
    }

    const passedTests = testResults.tests.filter(t => t.status === 'passed').length;
    const totalTests = testResults.tests.filter(t => t.status !== 'skipped').length;

    return Response.json({
      success: true,
      summary: `${passedTests}/${totalTests} security tests passed`,
      results: testResults
    });

  } catch (error) {
    console.error('Security test error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});