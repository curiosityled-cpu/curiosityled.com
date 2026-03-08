import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { test_type = 'leaderboard', user_count = 100 } = await req.json();

    const testResults = {
      test_suite: 'Load Tests',
      test_type,
      timestamp: new Date().toISOString(),
      user_count,
      tests: []
    };

    if (test_type === 'leaderboard') {
      // Test: Leaderboard Generation Performance
      const startTime = Date.now();
      
      try {
        const leaderboardResult = await base44.asServiceRole.functions.invoke('generateLeaderboardData', {
          scope: 'global',
          metric_type: 'total_points',
          time_period: 'all_time',
          limit: user_count
        });

        const duration = Date.now() - startTime;
        const performanceThreshold = 5000; // 5 seconds

        testResults.tests.push({
          name: `Leaderboard Generation (${user_count} users)`,
          status: duration < performanceThreshold ? 'passed' : 'warning',
          duration_ms: duration,
          threshold_ms: performanceThreshold,
          entries_generated: leaderboardResult.data?.leaderboard?.length || 0
        });
      } catch (error) {
        testResults.tests.push({
          name: `Leaderboard Generation (${user_count} users)`,
          status: 'failed',
          error: error.message
        });
      }
    }

    if (test_type === 'concurrent_awards') {
      // Test: Concurrent Point Awards
      const startTime = Date.now();
      
      try {
        const concurrentCount = Math.min(50, user_count);
        const promises = [];

        for (let i = 0; i < concurrentCount; i++) {
          promises.push(
            base44.asServiceRole.functions.invoke('awardPoints', {
              user_email: `load-test-${i}@example.com`,
              points_amount: 100,
              transaction_type: 'completion',
              reason: `Load test ${i}`,
              client_id: user.client_id
            })
          );
        }

        const results = await Promise.allSettled(promises);
        const duration = Date.now() - startTime;
        
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const throughput = (successCount / duration) * 1000; // ops per second

        testResults.tests.push({
          name: `Concurrent Point Awards (${concurrentCount} operations)`,
          status: successCount >= concurrentCount * 0.95 ? 'passed' : 'warning',
          duration_ms: duration,
          successful_ops: successCount,
          failed_ops: concurrentCount - successCount,
          throughput_ops_per_sec: throughput.toFixed(2)
        });
      } catch (error) {
        testResults.tests.push({
          name: 'Concurrent Point Awards',
          status: 'failed',
          error: error.message
        });
      }
    }

    if (test_type === 'badge_check_performance') {
      // Test: Badge Eligibility Check Performance
      const startTime = Date.now();
      
      try {
        const checkCount = Math.min(20, user_count);
        const promises = [];

        for (let i = 0; i < checkCount; i++) {
          promises.push(
            base44.asServiceRole.functions.invoke('checkBadgeEligibility', {
              user_email: `load-test-${i}@example.com`,
              check_proximity: true
            })
          );
        }

        const results = await Promise.allSettled(promises);
        const duration = Date.now() - startTime;
        
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const avgDuration = duration / checkCount;

        testResults.tests.push({
          name: `Badge Eligibility Checks (${checkCount} users)`,
          status: avgDuration < 1000 ? 'passed' : 'warning',
          total_duration_ms: duration,
          avg_duration_ms: avgDuration.toFixed(2),
          successful_checks: successCount
        });
      } catch (error) {
        testResults.tests.push({
          name: 'Badge Eligibility Check Performance',
          status: 'failed',
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results: testResults
    });

  } catch (error) {
    console.error('Load test error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});