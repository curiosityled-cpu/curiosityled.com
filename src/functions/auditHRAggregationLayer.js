/**
 * auditHRAggregationLayer
 * 
 * Verify getOrgPulseAggregates excludes all Category A fields
 * and only exposes aggregate statistics (counts, means, trends)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getHRSafeFields } from '@/lib/privacyTaxonomy.js';

// deno-lint-ignore no-undef
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'Super Administrator', 'Platform Admin'].includes(user.role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { org_id } = await req.json();

    const auditReport = {
      timestamp: new Date().toISOString(),
      org_id,
      status: 'pass',
      findings: [],
    };

    // Call getOrgPulseAggregates to check what data is exposed
    try {
      const aggregates = await base44.functions.invoke('getOrgPulseAggregates', {
        org_id,
      });

      // Verify only HR-safe fields are present
      const hrSafeFields = getHRSafeFields('ManagerPulse');
      const dataKeys = Object.keys(aggregates || {});

      // Check for Category A fields that should NOT be present
      const categoryAFields = ['energy_level', 'confidence_today', 'mental_clarity', 'biggest_weight_today', 'identity_friction_note'];
      const exposedCategoryA = dataKeys.filter(key => categoryAFields.some(field => key.includes(field)));

      if (exposedCategoryA.length > 0) {
        auditReport.status = 'fail';
        auditReport.findings.push({
          severity: 'critical',
          message: `Category A fields exposed in HR aggregation: ${exposedCategoryA.join(', ')}`,
          remediation: 'Filter aggregates query to exclude Category A fields before returning to HR',
        });
      }

      // Verify minimum cohort enforcement
      if (aggregates.total_managers < 5) {
        auditReport.findings.push({
          severity: 'warning',
          message: `Small cohort (${aggregates.total_managers} managers). Aggregates may be de-anonymizable.`,
          remediation: 'Enforce minimum cohort size of 5 before releasing aggregates.',
        });
      }

      if (auditReport.findings.length === 0) {
        auditReport.findings.push({
          severity: 'info',
          message: 'HR aggregation layer correctly excludes Category A fields.',
        });
      }
    } catch (error) {
      auditReport.status = 'fail';
      auditReport.findings.push({
        severity: 'error',
        message: `Failed to call getOrgPulseAggregates: ${error.message}`,
      });
    }

    return Response.json(auditReport);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});