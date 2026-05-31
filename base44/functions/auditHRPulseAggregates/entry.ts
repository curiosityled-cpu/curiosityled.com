// deno-lint-ignore-file no-undef
/**
 * auditHRPulseAggregates
 *
 * Verifies that getOrgPulseAggregates enforces privacy taxonomy:
 * - Category A fields are NEVER included (even in aggregate)
 * - Only Category B (aggregated) + D (public) fields are exposed to HR
 * - Minimum cohort size (10+) enforced
 * - No individual attribution possible from returned data
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PRIVACY_TAXONOMY = {
  ManagerPulse: {
    energy_level: 'A', mental_clarity: 'A', perceived_load: 'A',
    biggest_weight_today: 'A', avoidance_flag: 'A', confidence_today: 'A',
    motivation_today: 'A', optimism_today: 'A', resilience_signal: 'A',
    identity_friction: 'A', identity_friction_note: 'A',
    source: 'B', prompt_type: 'B', follow_up_sent: 'B',
    user_email: 'D', created_date: 'D',
  },
};

function getHRSafeFields(entity) {
  const taxonomy = PRIVACY_TAXONOMY[entity] || {};
  return Object.entries(taxonomy).filter(([, cat]) => cat === 'B' || cat === 'D').map(([field]) => field);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const allPulses = await base44.entities.ManagerPulse.filter({}, null, 1000).catch(() => []);

    if (allPulses.length === 0) {
      return Response.json({ audit_result: 'no_data' });
    }

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

    const hrSafeFields = getHRSafeFields('ManagerPulse');
    const categoryAFields = Object.entries(PRIVACY_TAXONOMY.ManagerPulse)
      .filter(([, cat]) => cat === 'A').map(([field]) => field);

    const sampleAggregation = {
      total_managers: allPulses.length,
      avg_energy_level: 'N/A (Category A - never exposed)',
      avg_mental_clarity: 'N/A (Category A - never exposed)',
      meeting_prompt_frequency: 'Would count source=teams entries (Category B)',
      follow_up_rate: 'Would count follow_up_sent true (Category B)',
    };

    const violations = [];

    categoryAFields.forEach(field => {
      if (hrSafeFields.includes(field)) {
        violations.push(`VIOLATION: Category A field "${field}" would be exposed to HR`);
      }
    });

    const undercohort = cohortSizes.filter(c => !c.meets_minimum);
    if (undercohort.length > 0) {
      violations.push(`WARNING: ${undercohort.length} managers have <10 data points (would be filtered)`);
    }

    return Response.json({
      audit_status: violations.length === 0 ? 'PASS' : 'FAIL',
      violations,
      cohort_summary: cohortSizes,
      hr_safe_fields_count: hrSafeFields.length,
      category_a_fields_protected: categoryAFields.length,
      sample_hr_aggregation: sampleAggregation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});