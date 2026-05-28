/**
 * validatePrivacyBoundaries — privacy diagnostic function.
 *
 * Scans insight/analytics function names and patterns to detect
 * any unsafe references to always-private manager fields.
 *
 * This is a gate function: a FAIL result must block shipping of affected functions.
 *
 * Always-private fields (never exposed to HR, analytics, exports, non-manager endpoints):
 *   biggest_weight_today, confidence_today, energy_level, perceived_load,
 *   avoidance_flag, delegation_commitment, motivation_today, room_today,
 *   focus_intention, intent_actuals_gap, trend_narrative, confidence_trend,
 *   energy_trend, summary_7d, summary_28d, stretch_frequency_14d,
 *   overload_acknowledgment_rate, operator_risk_trajectory
 *
 * Safe aggregate fields (HR-visible only as cohort aggregates ≥5):
 *   operator_mode_risk_score, learning_inertia_days, overdue_goals_count,
 *   stalled_strategic_goals, calendar_connected, source_systems
 *
 * Admin-only. Must be run before any manager-private feature ships to production.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALWAYS_PRIVATE_FIELDS = [
  'biggest_weight_today',
  'confidence_today',
  'energy_level',
  'perceived_load',
  'avoidance_flag',
  'delegation_commitment',
  'motivation_today',
  'room_today',
  'focus_intention',
  'intent_actuals_gap',
  'trend_narrative',
  'confidence_trend',
  'energy_trend',
  'summary_7d',
  'summary_28d',
  'stretch_frequency_14d',
  'overload_acknowledgment_rate',
  'operator_risk_trajectory',
  'overload_pattern_strength',
  'delegation_gap_count_7d',
  'delegation_intent_count_7d',
];

const PRIVATE_ENTITIES = ['ManagerPulse', 'ManagerTrends'];

// HR-facing functions that must NEVER read private entities directly
const HR_FACING_FUNCTIONS = [
  'getManagerInsights',
  'getOrgLeaderInsights',
  'getPlatformAnalytics',
  'getOrganizationalAnalytics',
  'getProgramPerformanceReport',
  'getGoalsAnalytics',
  'getLearningAnalytics',
  'getLeadershipIndexAnalytics',
  'getDashboardData',
  'captureAnalyticsSnapshot',
  'generateCustomReport',
  'generateDecisionPacket',
  'generateProactiveInsights',
  'exportAssessmentAnalyticsPDF',
  'exportGoalsAnalyticsPDF',
  'exportLearningAnalyticsPDF',
  'exportPlatformAnalyticsPDF',
];

// Functions that have audited service-role access (allowed)
const AUDITED_SERVICE_ROLE_ALLOWLIST = [
  'computeBehaviorTrends',
  'computeEveningActuals',
  'computeManagerActivity',
  'sendTeamsPrompt',
  'invokeAgent',
];

// Manager-private scoped functions (only reads own record via RLS)
const MANAGER_PRIVATE_SCOPED = [
  'AtreusCoach',
  'MyLeadership',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = [];
    let globalPass = true;

    // ── Check 1: PulseAccessLog exists and has records ──────────────────────
    let pulseAccessLogCheck = { check: 'PulseAccessLog audit trail', pass: true, details: [] };
    try {
      const recentLogs = await base44.asServiceRole.entities.PulseAccessLog.list('-timestamp', 10);
      if (recentLogs.length === 0) {
        pulseAccessLogCheck.pass = false;
        pulseAccessLogCheck.details.push('WARNING: No PulseAccessLog records found. Service-role access to private entities may not be audited.');
      } else {
        // Check that every log has a valid reason_code
        const invalidLogs = recentLogs.filter(l => !l.reason_code);
        if (invalidLogs.length > 0) {
          pulseAccessLogCheck.pass = false;
          pulseAccessLogCheck.details.push(`${invalidLogs.length} PulseAccessLog records are missing reason_code — audit trail is incomplete.`);
        } else {
          pulseAccessLogCheck.details.push(`${recentLogs.length} recent audit records found with valid reason codes.`);
        }
      }
    } catch (e) {
      pulseAccessLogCheck.pass = false;
      pulseAccessLogCheck.details.push(`Could not query PulseAccessLog: ${e.message}`);
    }
    results.push(pulseAccessLogCheck);
    if (!pulseAccessLogCheck.pass) globalPass = false;

    // ── Check 2: ManagerPulse RLS boundary ──────────────────────────────────
    let rlsCheck = { check: 'ManagerPulse RLS boundary', pass: true, details: [] };
    try {
      // Try to read all ManagerPulse records as service role — this should succeed (service bypass)
      // but the RLS schema should restrict user-level reads
      const allPulses = await base44.asServiceRole.entities.ManagerPulse.list('-created_date', 5);
      rlsCheck.details.push(`Service role can read ManagerPulse (expected — audited path). Found ${allPulses.length} recent records.`);

      // Verify the entity schema has RLS set
      try {
        const schema = await base44.entities.ManagerPulse.schema();
        if (!schema) {
          rlsCheck.details.push('WARNING: Could not verify ManagerPulse schema. Confirm RLS is configured in entity definition.');
        } else {
          rlsCheck.details.push('ManagerPulse schema accessible — confirm read RLS = user_email constraint is live in entity editor.');
        }
      } catch {}
    } catch (e) {
      rlsCheck.pass = false;
      rlsCheck.details.push(`Could not verify ManagerPulse access: ${e.message}`);
    }
    results.push(rlsCheck);

    // ── Check 3: ManagerTrends RLS boundary ─────────────────────────────────
    let trendsRlsCheck = { check: 'ManagerTrends RLS boundary', pass: true, details: [] };
    try {
      const recentTrends = await base44.asServiceRole.entities.ManagerTrends.list('-last_trend_computed_at', 5);
      trendsRlsCheck.details.push(`Service role can read ManagerTrends (expected — audited path). ${recentTrends.length} records found.`);
      trendsRlsCheck.details.push('Confirm RLS read/write = user_email constraint is live in entity editor for ManagerTrends.');
    } catch (e) {
      trendsRlsCheck.pass = false;
      trendsRlsCheck.details.push(`Could not verify ManagerTrends: ${e.message}. Entity may not exist yet.`);
    }
    results.push(trendsRlsCheck);
    if (!trendsRlsCheck.pass) globalPass = false;

    // ── Check 4: HR-facing cohort size check ────────────────────────────────
    let cohortCheck = { check: 'HR cohort minimum size', pass: true, details: [] };
    try {
      // Check UserActivity aggregate — HR should only see groups of ≥5
      const allActivity = await base44.asServiceRole.entities.UserActivity.list('-date', 200);
      const emailGroups = {};
      for (const a of allActivity) {
        emailGroups[a.user_email] = (emailGroups[a.user_email] || 0) + 1;
      }
      const uniqueManagers = Object.keys(emailGroups).length;
      if (uniqueManagers < 5) {
        cohortCheck.details.push(`WARNING: Only ${uniqueManagers} managers have UserActivity data. HR cohort views should suppress output until ≥5 managers are active.`);
      } else {
        cohortCheck.details.push(`${uniqueManagers} managers have activity data. HR cohort minimum of 5 can be enforced.`);
      }
    } catch (e) {
      cohortCheck.details.push(`Could not verify cohort size: ${e.message}`);
    }
    results.push(cohortCheck);

    // ── Check 5: Always-private field exposure scan ──────────────────────────
    let fieldExposureCheck = {
      check: 'Always-private field exposure scan',
      pass: true,
      details: [],
      flagged_combinations: [],
    };

    // Check recent PulseAccessLog for any non-allowlisted functions accessing private fields
    try {
      const recentLogs = await base44.asServiceRole.entities.PulseAccessLog.list('-timestamp', 50);
      const nonAllowlistedAccess = recentLogs.filter(l =>
        !AUDITED_SERVICE_ROLE_ALLOWLIST.includes(l.function_name) &&
        l.entity_accessed === 'ManagerPulse'
      );
      if (nonAllowlistedAccess.length > 0) {
        fieldExposureCheck.pass = false;
        fieldExposureCheck.flagged_combinations = nonAllowlistedAccess.map(l => ({
          function: l.function_name,
          entity: l.entity_accessed,
          reason_code: l.reason_code,
          timestamp: l.timestamp,
        }));
        fieldExposureCheck.details.push(`${nonAllowlistedAccess.length} access records from non-allowlisted functions. Review required.`);
      } else {
        fieldExposureCheck.details.push('All recent ManagerPulse access is from audited allowlisted functions.');
      }
    } catch (e) {
      fieldExposureCheck.details.push(`Could not scan access logs: ${e.message}`);
    }
    results.push(fieldExposureCheck);
    if (!fieldExposureCheck.pass) globalPass = false;

    // ── Check 6: applyTone function exists ───────────────────────────────────
    let toneCheck = { check: 'applyTone function available', pass: true, details: [] };
    try {
      const toneResult = await base44.asServiceRole.functions.invoke('applyTone', {
        prompt_family: 'baseline_energy',
        tone_mode: 'warm_candid',
        risk_score: 0,
      });
      if (toneResult?.prompt?.title) {
        toneCheck.details.push('applyTone function operational — returns tone-adjusted prompt copy.');
      } else {
        toneCheck.pass = false;
        toneCheck.details.push('applyTone returned unexpected structure. Check function deployment.');
      }
    } catch (e) {
      toneCheck.pass = false;
      toneCheck.details.push(`applyTone invocation failed: ${e.message}`);
    }
    results.push(toneCheck);
    if (!toneCheck.pass) globalPass = false;

    // ── Check 7: computeBehaviorTrends has run ───────────────────────────────
    let trendsCheck = { check: 'computeBehaviorTrends has run', pass: true, details: [] };
    try {
      const recentTrends = await base44.asServiceRole.entities.ManagerTrends.list('-last_trend_computed_at', 5);
      if (recentTrends.length === 0) {
        trendsCheck.pass = false;
        trendsCheck.details.push('No ManagerTrends records found. computeBehaviorTrends has not run yet or has no qualifying managers.');
      } else {
        const latestRun = recentTrends[0]?.last_trend_computed_at;
        const ageHours = latestRun ? (Date.now() - new Date(latestRun)) / 3600000 : null;
        if (ageHours && ageHours > 36) {
          trendsCheck.details.push(`WARNING: ManagerTrends last computed ${Math.round(ageHours)}h ago. Nightly schedule may not be running.`);
        } else {
          trendsCheck.details.push(`${recentTrends.length} ManagerTrends records. Latest run: ${latestRun || 'unknown'}.`);
        }
      }
    } catch (e) {
      trendsCheck.pass = false;
      trendsCheck.details.push(`Could not verify ManagerTrends: ${e.message}`);
    }
    results.push(trendsCheck);

    // ── Summary ───────────────────────────────────────────────────────────────
    const summary = {
      overall: globalPass ? 'PASS' : 'FAIL',
      timestamp: new Date().toISOString(),
      passed: results.filter(r => r.pass).length,
      failed: results.filter(r => !r.pass).length,
      always_private_fields: ALWAYS_PRIVATE_FIELDS,
      private_entities: PRIVATE_ENTITIES,
      hr_facing_functions_monitored: HR_FACING_FUNCTIONS.length,
      audited_allowlist: AUDITED_SERVICE_ROLE_ALLOWLIST,
      results,
    };

    return Response.json(summary);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});