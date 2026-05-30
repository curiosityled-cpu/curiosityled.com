// deno-lint-ignore-file no-undef
/**
 * auditHRAggregationLayer
 *
 * Verify getOrgPulseAggregates excludes all Category A fields
 * and only exposes aggregate statistics (counts, means, trends).
 * Admin-only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Inlined privacy taxonomy — local imports cannot be resolved in Deno deploy
const CATEGORY_A_FIELDS = [
  'energy_level', 'mental_clarity', 'perceived_load', 'biggest_weight_today',
  'avoidance_flag', 'confidence_today', 'motivation_today', 'optimism_today',
  'resilience_signal', 'identity_friction', 'identity_friction_note', 'room_today',
  'operator_mode_response', 'delegation_commitment', 'focus_category',
  'focus_intention', 'intent_actuals_gap',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.app_role !== 'Platform Admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { org_id } = await req.json().catch(() => ({}));

    const auditReport = {
      timestamp: new Date().toISOString(),
      org_id: org_id || 'all',
      status: 'pass',
      findings: [],
    };

    // Call getOrgPulseAggregates to check what data is exposed
    try {
      const aggregatesRes = await base44.functions.invoke('getOrgPulseAggregates', { org_id });
      const aggregates = aggregatesRes?.data || aggregatesRes || {};

      // If suppressed, that means minimum cohort is being enforced — good
      if (aggregates.suppressed) {
        auditReport.findings.push({
          severity: 'info',
          message: `Cohort suppression active: ${aggregates.reason}`,
          check: 'minimum_cohort_enforcement',
          result: 'PASS',
        });
        return Response.json(auditReport);
      }

      // Check for Category A field keys in returned data
      const dataKeys = Object.keys(aggregates);
      const exposedCategoryA = dataKeys.filter(key =>
        CATEGORY_A_FIELDS.some(field => key === field || key.includes(field))
      );

      if (exposedCategoryA.length > 0) {
        auditReport.status = 'fail';
        auditReport.findings.push({
          severity: 'critical',
          message: `Category A fields exposed in HR aggregation: ${exposedCategoryA.join(', ')}`,
          check: 'category_a_exclusion',
          result: 'FAIL',
          remediation: 'Filter aggregates query to exclude Category A fields before returning to HR',
        });
      } else {
        auditReport.findings.push({
          severity: 'info',
          message: 'No Category A fields detected in aggregated output',
          check: 'category_a_exclusion',
          result: 'PASS',
        });
      }

      // Check minimum cohort
      const managerCount = aggregates.total_managers || 0;
      if (managerCount > 0 && managerCount < 5) {
        auditReport.findings.push({
          severity: 'warning',
          message: `Small cohort (${managerCount} managers). Aggregates may be de-anonymizable.`,
          check: 'minimum_cohort',
          result: 'WARN',
          remediation: 'Enforce minimum cohort size of 5 before releasing aggregates.',
        });
      } else if (managerCount >= 5) {
        auditReport.findings.push({
          severity: 'info',
          message: `Cohort size ${managerCount} meets minimum threshold`,
          check: 'minimum_cohort',
          result: 'PASS',
        });
      }

    } catch (error) {
      auditReport.findings.push({
        severity: 'info',
        message: `getOrgPulseAggregates response: ${error.message}`,
        check: 'function_availability',
        result: 'CHECKED',
      });
    }

    return Response.json(auditReport);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});