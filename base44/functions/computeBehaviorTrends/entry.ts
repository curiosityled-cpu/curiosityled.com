/**
 * computeBehaviorTrends — nightly longitudinal pattern detection.
 *
 * Runs after computeManagerActivity. Scans last 7 and 28 days of
 * ManagerPulse + UserActivity per manager and writes a ManagerTrends
 * summary that Atreus and in-platform surfaces can read.
 *
 * All outputs are manager-private. HR never sees this data.
 * Uses only observational, self-report-respecting language.
 *
 * Schedule: nightly at 1:30am UTC (30 min after computeManagerActivity).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Trend detection thresholds ───────────────────────────────────────────────

const THRESHOLDS = {
  confidence_declining: { window: 14, min_low_count: 3, min_data: 4 },
  confidence_improving: { window: 14, min_high_count: 3, min_data: 4 },
  stretch_drain: { window: 14, min_count: 5, out_of: 10 },
  sustained_high_risk: { window: 7, min_consecutive: 5, risk_threshold: 50 },
  overload_acknowledgment: { window: 28, min_rate: 0.6, min_samples: 3 },
  learning_stall: { window: 28, min_inertia_days: 14 },
};

// ─── Helper: derive trend direction ──────────────────────────────────────────

function deriveTrendDirection(values, positiveSet, negativeSet) {
  if (!values || values.length < 3) return 'insufficient_data';

  const recent = values.slice(0, Math.ceil(values.length / 2));
  const older = values.slice(Math.ceil(values.length / 2));

  const recentNegScore = recent.filter(v => negativeSet.includes(v)).length / recent.length;
  const olderNegScore = older.filter(v => negativeSet.includes(v)).length / older.length;

  if (recentNegScore < olderNegScore - 0.2) return 'improving';
  if (recentNegScore > olderNegScore + 0.2) return 'declining';
  return 'stable';
}

// ─── Helper: generate trend narrative via LLM ─────────────────────────────────

async function generateTrendNarrative(base44, trendData) {
  const prompt = `You are Atreus, a private leadership companion. Generate ONE sentence summarising this manager's recent behavioral pattern.

STRICT RULES:
- Use ONLY first-person observational language: "you've told me", "you've reported", "over the last few weeks, you've said"
- NEVER say "you are", "you show", "you have a pattern of", or any diagnostic label
- NEVER use: burnout, at-risk, struggling, overwhelmed, unstable, deteriorating
- Keep it under 35 words
- Sound like a thoughtful friend who remembers what you said, not a clinician

Data:
- Stretch/drain check-ins last 14 days: ${trendData.stretch_frequency_14d} out of ${trendData.data_points_14d}
- Confidence trend: ${trendData.confidence_trend}
- Energy trend: ${trendData.energy_trend}
- Overload acknowledgment rate last 28 days: ${Math.round((trendData.overload_acknowledgment_rate || 0) * 100)}%
- Operator risk trajectory: ${trendData.operator_risk_trajectory}
- Learning stall: ${trendData.learning_stall_detected ? 'yes' : 'no'}

Write only the single sentence, nothing else.`;

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    return result?.trim() || null;
  } catch {
    return null;
  }
}

// ─── Helper: generate 7d/28d summaries ───────────────────────────────────────

function buildSummary(pulses, activityRecords, windowDays) {
  const cutoff = new Date(Date.now() - windowDays * 86400000);
  const windowPulses = pulses.filter(p => new Date(p.created_date) > cutoff && p.source !== 'system');
  const windowActivity = activityRecords.filter(a => new Date(a.date) > cutoff);

  if (windowPulses.length === 0) return null;

  const stretchCount = windowPulses.filter(p => ['stretched', 'drained'].includes(p.energy_level)).length;
  const steadyCount = windowPulses.filter(p => ['steady', 'strong'].includes(p.energy_level)).length;
  const lowConfCount = windowPulses.filter(p => ['low', 'uncertain'].includes(p.confidence_today)).length;
  const avgRisk = windowActivity.length > 0
    ? Math.round(windowActivity.reduce((s, a) => s + (a.operator_mode_risk_score || 0), 0) / windowActivity.length)
    : null;

  const parts = [];
  if (stretchCount > 0) {
    parts.push(`${stretchCount} of ${windowPulses.length} check-ins were 'stretched' or 'behind'`);
  }
  if (lowConfCount >= 2) {
    parts.push(`Confidence dipped on ${lowConfCount} occasions`);
  }
  if (avgRisk !== null) {
    parts.push(`Average load signal: ${avgRisk}/100`);
  }

  return parts.length > 0 ? parts.join('. ') + '.' : null;
}

// ─── Helper: log access ───────────────────────────────────────────────────────

async function logAccess(base44, targetEmail, recordCount) {
  await base44.asServiceRole.entities.PulseAccessLog.create({
    accessed_by: 'system:computeBehaviorTrends',
    target_email: targetEmail,
    entity_accessed: 'ManagerPulse',
    fields_accessed: ['energy_level', 'confidence_today', 'perceived_load', 'operator_mode_response'],
    reason_code: 'computeBehaviorTrends',
    function_name: 'computeBehaviorTrends',
    timestamp: new Date().toISOString(),
    record_count: recordCount,
  }).catch(() => null); // don't fail the job if logging fails
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (no user) or admin calls
    const user = await base44.auth.me().catch(() => null);
    if (user && user.app_role !== 'Platform Admin' && user.app_role !== 'Super Administrator' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = body.user_email || null;

    // Get managers to process
    let managers = [];
    if (targetEmail) {
      managers = [{ email: targetEmail }];
    } else {
      const allUsers = await base44.asServiceRole.entities.User.filter(
        { app_role: { $in: ['User Level 1', 'User Level 2'] } },
        null, 500
      );
      managers = allUsers.map(u => ({ email: u.email }));
    }

    const results = [];
    const now = new Date();
    const cutoff28d = new Date(now - 28 * 86400000);
    const cutoff14d = new Date(now - 14 * 86400000);
    const cutoff7d = new Date(now - 7 * 86400000);

    for (const manager of managers) {
      const email = manager.email;

      // Fetch last 28 days of private data — audited service-role access
      const [pulses, activityRecords] = await Promise.all([
        base44.asServiceRole.entities.ManagerPulse.filter({ user_email: email }, '-created_date', 50),
        base44.asServiceRole.entities.UserActivity.filter({ user_email: email }, '-date', 30),
      ]);

      // Log the access
      await logAccess(base44, email, pulses.length);

      // Filter to relevant windows (exclude system-sent markers, keep user responses)
      const userPulses28d = pulses.filter(p =>
        p.source !== 'system' && new Date(p.created_date) > cutoff28d
      );
      const userPulses14d = userPulses28d.filter(p => new Date(p.created_date) > cutoff14d);
      const activity7d = activityRecords.filter(a => new Date(a.date) > cutoff7d);
      const activity28d = activityRecords.filter(a => new Date(a.date) > cutoff28d);

      const dataPoints14d = userPulses14d.length;
      const dataPoints28d = userPulses28d.length;

      // Skip if insufficient data
      if (dataPoints14d < 3 && dataPoints28d < 3) {
        results.push({ email, skipped: true, reason: 'insufficient_data', data_points: dataPoints28d });
        continue;
      }

      // ── Confidence trend ───────────────────────────────────────────────────
      const confidenceValues = userPulses14d.map(p => p.confidence_today).filter(Boolean);
      const confidenceTrend = deriveTrendDirection(
        confidenceValues,
        ['high', 'steady'],
        ['low', 'uncertain']
      );

      // ── Energy trend ───────────────────────────────────────────────────────
      const energyValues = userPulses14d.map(p => p.energy_level).filter(Boolean);
      const energyTrend = deriveTrendDirection(
        energyValues,
        ['steady', 'strong'],
        ['stretched', 'drained']
      );

      // ── Stretch frequency ──────────────────────────────────────────────────
      const stretchFrequency14d = userPulses14d.filter(p =>
        ['stretched', 'drained'].includes(p.energy_level)
      ).length;

      // ── Overload acknowledgment rate ───────────────────────────────────────
      const overloadPrompts = userPulses28d.filter(p =>
        p.prompt_type === 'overload_check' && p.operator_mode_response && p.operator_mode_response !== 'skipped'
      );
      const overloadAcknowledged = overloadPrompts.filter(p =>
        ['very_much', 'somewhat'].includes(p.operator_mode_response)
      ).length;
      const overloadAcknowledgmentRate = overloadPrompts.length >= 2
        ? overloadAcknowledged / overloadPrompts.length
        : 0;

      // ── Operator risk trajectory ───────────────────────────────────────────
      let operatorRiskTrajectory = 'insufficient_data';
      if (activity7d.length >= 3) {
        const riskValues = activity7d.map(a => a.operator_mode_risk_score || 0);
        const recent = riskValues.slice(0, Math.ceil(riskValues.length / 2));
        const older = riskValues.slice(Math.ceil(riskValues.length / 2));
        const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
        const olderAvg = older.reduce((s, v) => s + v, 0) / older.length;

        if (recentAvg > olderAvg + 10) operatorRiskTrajectory = 'increasing';
        else if (recentAvg < olderAvg - 10) operatorRiskTrajectory = 'decreasing';
        else operatorRiskTrajectory = 'stable';
      }

      // ── Overload pattern strength (0-100) ─────────────────────────────────
      let overloadPatternStrength = 0;
      if (stretchFrequency14d >= 5) overloadPatternStrength += 40;
      else if (stretchFrequency14d >= 3) overloadPatternStrength += 20;
      if (overloadAcknowledgmentRate >= 0.6) overloadPatternStrength += 30;
      else if (overloadAcknowledgmentRate >= 0.3) overloadPatternStrength += 15;
      if (operatorRiskTrajectory === 'increasing') overloadPatternStrength += 20;
      if (confidenceTrend === 'declining') overloadPatternStrength += 10;
      overloadPatternStrength = Math.min(overloadPatternStrength, 100);

      // ── Learning stall ─────────────────────────────────────────────────────
      const latestActivity = activity28d[0];
      const learningStallDetected = latestActivity && (latestActivity.learning_inertia_days || 0) >= 14;

      // ── Delegation intent tracking ─────────────────────────────────────────
      const morningIntents7d = pulses.filter(p =>
        p.prompt_type === 'morning_intent' && new Date(p.created_date) > cutoff7d
      );
      const delegationIntentCount7d = morningIntents7d.filter(p => p.focus_category === 'delegation').length;

      const eveningActuals7d = pulses.filter(p =>
        p.prompt_type === 'evening_actuals' && new Date(p.created_date) > cutoff7d
      );
      const delegationGapCount7d = eveningActuals7d.filter(p =>
        p.intent_actuals_gap === 'declared_delegation_operator_mode_detected'
      ).length;

      // ── Build summaries ────────────────────────────────────────────────────
      const summary7d = buildSummary(pulses, activityRecords, 7);
      const summary28d = buildSummary(pulses, activityRecords, 28);

      // ── Build trend record ─────────────────────────────────────────────────
      const trendData = {
        user_email: email,
        confidence_trend: confidenceTrend,
        energy_trend: energyTrend,
        overload_pattern_strength: overloadPatternStrength,
        stretch_frequency_14d: stretchFrequency14d,
        operator_risk_trajectory: operatorRiskTrajectory,
        overload_acknowledgment_rate: overloadAcknowledgmentRate,
        summary_7d: summary7d,
        summary_28d: summary28d,
        last_trend_computed_at: now.toISOString(),
        data_points_14d: dataPoints14d,
        data_points_28d: dataPoints28d,
        learning_stall_detected: learningStallDetected,
        delegation_intent_count_7d: delegationIntentCount7d,
        delegation_gap_count_7d: delegationGapCount7d,
      };

      // Generate narrative if enough data
      if (dataPoints14d >= 4) {
        const narrative = await generateTrendNarrative(base44, trendData);
        if (narrative) trendData.trend_narrative = narrative;
      }

      // Upsert ManagerTrends record
      const existing = await base44.asServiceRole.entities.ManagerTrends.filter(
        { user_email: email }, '-last_trend_computed_at', 1
      );

      if (existing.length > 0) {
        await base44.asServiceRole.entities.ManagerTrends.update(existing[0].id, trendData);
      } else {
        await base44.asServiceRole.entities.ManagerTrends.create(trendData);
      }

      results.push({
        email,
        processed: true,
        confidence_trend: confidenceTrend,
        energy_trend: energyTrend,
        overload_pattern_strength: overloadPatternStrength,
        stretch_frequency_14d: stretchFrequency14d,
        data_points_14d: dataPoints14d,
        data_points_28d: dataPoints28d,
      });
    }

    return Response.json({
      processed: results.filter(r => r.processed).length,
      skipped: results.filter(r => r.skipped).length,
      computed_at: now.toISOString(),
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});