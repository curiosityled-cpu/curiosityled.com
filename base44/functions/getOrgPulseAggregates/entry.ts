/**
 * getOrgPulseAggregates — Category B privacy-safe aggregate signals for HR/admins.
 *
 * Returns ONLY group-level, anonymized insights. Never individual data.
 * Enforces minimum group size (n≥5) before any metric is shown.
 * Respects the privacy taxonomy: Category A data is never included.
 *
 * Accessible by: Admin Level 2+, Super Administrator, Platform Admin only.
 *
 * Returns:
 *   - % of managers reporting overload ≥2x this week (no names)
 *   - % with energy trending stable/improving vs declining
 *   - top development themes across managers
 *   - engagement with Atreus (check-in completion rate)
 *   - org-level risk bands (high/medium/low) — counts only, no names
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_ROLES = ['admin', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'];
const MIN_GROUP_SIZE = 5; // never show metrics for groups smaller than this

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Load all manager trends (aggregated signals only — never raw pulses)
    const allTrends = await base44.asServiceRole.entities.ManagerTrends.list('-last_trend_computed_at', 500);
    const totalManagers = allTrends.length;

    if (totalManagers < MIN_GROUP_SIZE) {
      return Response.json({
        suppressed: true,
        reason: `Group size (${totalManagers}) is below minimum threshold of ${MIN_GROUP_SIZE} required to show aggregated data.`,
        total_managers: totalManagers,
        minimum_required: MIN_GROUP_SIZE,
      });
    }

    // ─── Energy & overload aggregates ────────────────────────────────────────
    const energyDistribution = {
      improving: allTrends.filter(t => t.energy_trend === 'improving').length,
      stable: allTrends.filter(t => t.energy_trend === 'stable').length,
      declining: allTrends.filter(t => t.energy_trend === 'declining').length,
      insufficient_data: allTrends.filter(t => t.energy_trend === 'insufficient_data').length,
    };

    const overloadRiskBands = {
      high: allTrends.filter(t => (t.overload_pattern_strength || 0) >= 70).length,
      moderate: allTrends.filter(t => (t.overload_pattern_strength || 0) >= 40 && (t.overload_pattern_strength || 0) < 70).length,
      low: allTrends.filter(t => (t.overload_pattern_strength || 0) < 40).length,
    };

    const stretchedFrequently = allTrends.filter(t => (t.stretch_frequency_14d || 0) >= 5).length;

    // ─── Confidence aggregates ────────────────────────────────────────────────
    const confidenceDistribution = {
      improving: allTrends.filter(t => t.confidence_trend === 'improving').length,
      stable: allTrends.filter(t => t.confidence_trend === 'stable').length,
      declining: allTrends.filter(t => t.confidence_trend === 'declining').length,
    };

    // ─── Resilience aggregates ────────────────────────────────────────────────
    const resilienceDistribution = {
      improving: allTrends.filter(t => t.resilience_trend === 'improving').length,
      stable: allTrends.filter(t => t.resilience_trend === 'stable').length,
      declining: allTrends.filter(t => t.resilience_trend === 'declining').length,
    };

    // ─── Identity friction aggregate ──────────────────────────────────────────
    // Only show if above MIN_GROUP_SIZE threshold — otherwise suppress
    const identityFrictionCount = allTrends.filter(t => t.identity_friction_active === true).length;
    const identityFrictionRate = identityFrictionCount >= MIN_GROUP_SIZE
      ? Math.round((identityFrictionCount / totalManagers) * 100)
      : null; // suppressed for small groups

    // ─── Learning stall aggregate ─────────────────────────────────────────────
    const learningStallCount = allTrends.filter(t => t.learning_stall_detected === true).length;
    const learningStallRate = Math.round((learningStallCount / totalManagers) * 100);

    // ─── Delegation gap aggregate ─────────────────────────────────────────────
    const delegationGapCount = allTrends.filter(t => (t.delegation_gap_count_7d || 0) >= 2).length;
    const delegationGapRate = Math.round((delegationGapCount / totalManagers) * 100);

    // ─── Engagement with Atreus ───────────────────────────────────────────────
    // Count managers with ≥3 check-ins in 14 days (active engagers)
    const activeEngagers = allTrends.filter(t => (t.data_points_14d || 0) >= 3).length;
    const checkInEngagementRate = Math.round((activeEngagers / totalManagers) * 100);

    // ─── Operator risk trajectory aggregate ──────────────────────────────────
    const riskTrajectory = {
      increasing: allTrends.filter(t => t.operator_risk_trajectory === 'increasing').length,
      stable: allTrends.filter(t => t.operator_risk_trajectory === 'stable').length,
      decreasing: allTrends.filter(t => t.operator_risk_trajectory === 'decreasing').length,
    };

    // Log aggregate access (not individual)
    await base44.asServiceRole.entities.PulseAccessLog.create({
      accessed_by: user.email,
      target_email: 'aggregate',
      entity_accessed: 'ManagerTrends',
      fields_accessed: ['energy_trend', 'confidence_trend', 'resilience_trend', 'overload_pattern_strength', 'learning_stall_detected', 'delegation_gap_count_7d'],
      reason_code: 'privacy_audit',
      function_name: 'getOrgPulseAggregates',
      timestamp: new Date().toISOString(),
      record_count: totalManagers,
    });

    return Response.json({
      meta: {
        total_managers: totalManagers,
        minimum_group_size: MIN_GROUP_SIZE,
        data_freshness: 'Based on ManagerTrends last computed nightly',
        privacy_notice: 'All metrics are aggregate only. No individual manager data is included. Metrics below minimum group size are suppressed.',
      },
      energy: {
        distribution: energyDistribution,
        stretched_frequently_pct: Math.round((stretchedFrequently / totalManagers) * 100),
        note: 'Based on self-reported energy over 14 days. No individual attribution.',
      },
      overload: {
        risk_bands: overloadRiskBands,
        risk_trajectory: riskTrajectory,
        note: 'Risk score computed from meeting load, self-report, and goal stagnation signals. No individual attribution.',
      },
      confidence: {
        distribution: confidenceDistribution,
        declining_pct: Math.round((confidenceDistribution.declining / totalManagers) * 100),
        note: 'Self-reported confidence trend. Always private at individual level.',
      },
      resilience: {
        distribution: resilienceDistribution,
        note: 'Self-reported resilience trend. Always private at individual level.',
      },
      development: {
        learning_stall_rate_pct: learningStallRate,
        delegation_gap_rate_pct: delegationGapRate,
        note: 'Percentage of managers with learning inertia > 7 days or repeated delegation intention-action gaps.',
      },
      engagement: {
        check_in_engagement_rate_pct: checkInEngagementRate,
        active_engagers: activeEngagers,
        note: 'Managers who completed ≥3 check-ins in the last 14 days.',
      },
      identity_friction: identityFrictionRate !== null
        ? { rate_pct: identityFrictionRate, note: 'Aggregate rate of identity friction signals. Suppressed if group < 5.' }
        : { suppressed: true, reason: 'Group too small to show without risk of identification.' },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});