import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * calculateUATRisk - Computes overall_risk_score for UATTestCases
 * Risk calculation factors:
 * - Failure count: number of failed test runs
 * - Severity weight: Critical (4x), High (3x), Medium (2x), Low (1x)
 * - Age factor: days since first failure (multiplier increases with age)
 * - Final score: capped at 0-100
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin can trigger this
    if (user?.role !== 'Platform Admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all test cases
    const testCases = await base44.asServiceRole.entities.UATTestCase.list();

    if (!testCases || testCases.length === 0) {
      return Response.json({
        success: true,
        message: 'No test cases to process',
        updated: 0,
        failed: 0
      });
    }

    const severityWeights = {
      'Critical': 4,
      'High': 3,
      'Medium': 2,
      'Low': 1
    };

    const results = {
      updated: 0,
      failed: 0,
      errors: []
    };

    // Batch prepare all updates
    const updateBatch = [];
    
    for (const testCase of testCases) {
      try {
        const riskScore = calculateRiskScore(testCase, severityWeights);
        
        // Skip if risk score hasn't changed (optimization)
        if (testCase.overall_risk_score === riskScore) {
          results.updated++;
          continue;
        }
        
        updateBatch.push(
          base44.asServiceRole.entities.UATTestCase.update(
            testCase.id,
            { overall_risk_score: riskScore }
          ).then(() => {
            results.updated++;
          }).catch((error) => {
            results.failed++;
            results.errors.push({
              testCaseId: testCase.id,
              message: error.message
            });
          })
        );
      } catch (error) {
        results.failed++;
        results.errors.push({
          testCaseId: testCase.id,
          message: error.message
        });
      }
    }

    // Execute batch updates concurrently with controlled concurrency
    const batchSize = 5;
    for (let i = 0; i < updateBatch.length; i += batchSize) {
      await Promise.all(updateBatch.slice(i, i + batchSize));
    }

    return Response.json({
      success: true,
      message: `Risk scores updated: ${results.updated} succeeded, ${results.failed} failed`,
      ...results
    });
  } catch (error) {
    console.error('Risk calculation error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});

/**
 * Calculate risk score for a single test case
 * @param {Object} testCase - The test case with test_runs array
 * @param {Object} severityWeights - Mapping of severity to weight multiplier
 * @returns {number} Risk score 0-100
 */
function calculateRiskScore(testCase, severityWeights) {
  if (!testCase.test_runs || testCase.test_runs.length === 0) {
    return 0; // No test runs = no risk
  }

  let riskScore = 0;
  const now = new Date();

  // Find failed test runs
  const failedRuns = testCase.test_runs.filter(run => run.status === 'Failed');

  if (failedRuns.length === 0) {
    return 0; // No failures = no risk
  }

  // 1. Base risk from failure count (0-30 points)
  const failureCountRisk = Math.min(failedRuns.length * 5, 30);
  riskScore += failureCountRisk;

  // 2. Severity risk (0-40 points)
  let severityRisk = 0;
  failedRuns.forEach(run => {
    const severity = run.severity || 'Low';
    const weight = severityWeights[severity] || 1;
    severityRisk += weight * 2; // Base 2 points per severity unit
  });
  riskScore += Math.min(severityRisk, 40);

  // 3. Age risk (0-30 points) - accumulates over time
  if (failedRuns[0]?.test_date) {
    try {
      const firstFailureDate = new Date(failedRuns[0].test_date);
      
      // Validate date is valid
      if (!isNaN(firstFailureDate.getTime())) {
        const daysOld = Math.floor((now - firstFailureDate) / (1000 * 60 * 60 * 24));
        
        if (daysOld > 0) {
          const ageMultiplier = Math.min(1 + (daysOld / 30), 3); // Max 3x after 60 days
          const ageRisk = Math.min(daysOld * 0.5 * ageMultiplier, 30);
          riskScore += ageRisk;
        }
      }
    } catch (dateError) {
      console.warn('Invalid test_date format:', failedRuns[0].test_date);
    }
  }

  // Cap at 100
  return Math.min(Math.round(riskScore), 100);
}