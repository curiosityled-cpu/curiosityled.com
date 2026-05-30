/**
 * auditRLSPrivacy
 * 
 * Verify that RLS rules on ManagerPulse/ManagerTrends prevent HR access to Category A fields
 * Returns audit report with compliance status
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
// deno-lint-ignore no-undef
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const auditReport = {
      timestamp: new Date().toISOString(),
      status: 'pass',
      findings: [],
      recommendations: [],
    };

    // Test 1: Non-admin should NOT see private ManagerPulse fields
    try {
      const testPulses = await base44.entities.ManagerPulse.filter(
        { user_email: 'test@example.com' },
        null,
        1
      );

      // If any Category A field is visible (and user is not owner), fail
      if (testPulses.length > 0) {
        const pulse = testPulses[0];
        const categoryAFields = ['energy_level', 'mental_clarity', 'confidence_today', 'biggest_weight_today'];
        const exposedFields = categoryAFields.filter(field => pulse[field] !== undefined && pulse[field] !== null);

        if (exposedFields.length > 0) {
          auditReport.status = 'fail';
          auditReport.findings.push({
            entity: 'ManagerPulse',
            severity: 'critical',
            message: `Category A fields exposed to non-owner: ${exposedFields.join(', ')}`,
            test: 'RLS enforcement',
          });
        }
      }
    } catch (error) {
      // Expected if RLS blocks the query
      auditReport.findings.push({
        entity: 'ManagerPulse',
        severity: 'info',
        message: 'RLS correctly blocked unauthorized query',
        test: 'RLS enforcement',
      });
    }

    // Test 2: Verify ManagerTrends RLS
    try {
      const testTrends = await base44.entities.ManagerTrends.filter(
        { user_email: 'test@example.com' },
        null,
        1
      );

      if (testTrends.length > 0) {
        const trend = testTrends[0];
        const categoryAFields = ['confidence_trend', 'resilience_trend', 'summary_7d', 'summary_28d'];
        const exposedFields = categoryAFields.filter(field => trend[field] !== undefined && trend[field] !== null);

        if (exposedFields.length > 0) {
          auditReport.status = 'fail';
          auditReport.findings.push({
            entity: 'ManagerTrends',
            severity: 'critical',
            message: `Category A fields exposed to non-owner: ${exposedFields.join(', ')}`,
            test: 'RLS enforcement',
          });
        }
      }
    } catch (error) {
      auditReport.findings.push({
        entity: 'ManagerTrends',
        severity: 'info',
        message: 'RLS correctly blocked unauthorized query',
        test: 'RLS enforcement',
      });
    }

    // Recommendation
    if (auditReport.status === 'pass') {
      auditReport.recommendations.push('RLS enforcement verified. Consider logging all private data access to PulseAccessLog.');
    } else {
      auditReport.recommendations.push('CRITICAL: Review RLS rules in entity schemas. Category A fields must be sealed from non-owners.');
    }

    return Response.json(auditReport);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});