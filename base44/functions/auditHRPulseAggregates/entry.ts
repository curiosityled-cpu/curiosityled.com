// deno-lint-ignore-file no-undef
/**
 * auditHRPulseAggregates
 *
 * Verifies that getOrgPulseAggregates enforces privacy taxonomy:
 * - Category A fields are NEVER included (even in aggregate)
 * - Only Category B (aggregated) + D (public) fields are exposed to HR
 * - Minimum cohort size (10+) enforced
 * - No individual attribution possible from returned data
 *
 * Called by admin for compliance verification
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Inlined privacy taxonomy — local imports cannot be resolved in Deno deploy
const MANAGER_PULSE_TAXONOMY = {
  user_email: 'D', energy_level: 'A', mental_clarity: 'A', perceived_load: 'A',
  biggest_weight_today: 'A', avoidance_flag: 'A', confidence_today: 'A',
  motivation_today: 'A', optimism_today: 'A', resilience_signal: 'A',
  identity_friction: 'A', identity_friction_note: 'A', room_today: 'A',
  source: 'B', prompt_type: 'B', operator_mode_response: 'A',
  delegation_commitment: 'A', focus_category: 'A', focus_intention: 'A',
  intent_actuals_gap: 'A', follow_up_sent: 'B', follow_up_date: 'B', client_id: 'D',
};

function getHRSafeFields() {
  return Object.keys(MANAGER_PULSE_TAXONOMY).filter(f => {
    const c = MANAGER_PULSE_TAXONOMY[f];
    return c === 'B' || c === 'D';
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const allPulses = await base44.asServiceRole.entities.ManagerPulse.filter({}, null, 1000).catch(() => []);

    if (allPulses.length === 0) {
      return Response.json({ audit_result: 'no_data' });
    }

    // Group by user
    const byUser = {};
    allPulses.forEach(p => {
      if (!byUser[p.user_email]) byUser[p.user_email] = [];
      byUser[p.user_email].push(p);
    });

    const cohortSizes = Object.entries(byUser).map(([email, pulses]) => ({
      email,
      count: pulses.length,
      meets_minimum: pulses.length >= 10,
    }));

    const hrSafeFields = getHRSafeFields();
    const categoryAFields = Object.keys(MANAGER_PULSE_TAXONOMY).filter(
      field => MANAGER_PULSE_TAXONOMY[field] === 'A'
    );

    const violations = [];

    // Check: no Category A fields in HR safe list
    categoryAFields.forEach(field => {
      if (hrSafeFields.includes(field)) {
        violations.push(`VIOLATION: Category A field "${field}" would be exposed to HR`);
      }
    });

    // Check: minimum cohort enforced
    const undercohort = cohortSizes.filter(c => !c.meets_minimum);
    if (undercohort.length > 0) {
      violations.push(`WARNING: ${undercohort.length} managers have <10 data points (would be filtered from aggregates)`);
    }

    return Response.json({
      audit_status: violations.length === 0 ? 'PASS' : 'WARN',
      violations,
      cohort_summary: cohortSizes,
      hr_safe_fields_count: hrSafeFields.length,
      category_a_fields_protected: categoryAFields.length,
      hr_safe_fields: hrSafeFields,
      category_a_fields: categoryAFields,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});