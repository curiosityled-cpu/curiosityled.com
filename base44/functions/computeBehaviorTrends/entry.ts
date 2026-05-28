/**
 * computeBehaviorTrends — nightly longitudinal pattern engine.
 *
 * Runs after computeManagerActivity. Upserts ManagerTrends for every
 * manager with sufficient recent check-in data (≥ 3 pulses in 14 days).
 *
 * Detects: confidence drift, repeated stretch/drain, sustained high
 * operator risk, overload acknowledgment rate, learning stall,
 * delegation intent vs actuals gap.
 *
 * Generates a constrained LLM trend_narrative using only observational
 * self-report-respecting language — never diagnostic labels.
 *
 * Admin-only. Invoked by scheduled automation nightly.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENERGY_ORDER = { drained: 0, stretched: 1, steady: 2, strong: 3 };
const CONFIDENCE_ORDER = { low: 0, uncertain: 1, steady: 2, high: 3 };
const RESILIENCE_ORDER = { depleted: 0, fragile: 1, holding: 2, bouncing_back: 3 };

function trendDirection(values) {
  if (values.length < 3) return 'insufficient_data';
  const first = values.slice(0, Math.ceil(values.length / 2));
  const second = values.slice(Math.floor(values.length / 2));
  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
  const delta = avgSecond - avgFirst;
  if (delta > 0.4) return 'improving';
  if (delta < -0.4) return 'declining';
  return 'stable';
}

function buildSummary7d(pulses, activity) {
  const energyCounts = { drained: 0, stretched: 0, steady: 0, strong: 0 };
  pulses.forEach(p => { if (p.energy_level) energyCounts[p.energy_level]++; });

  const stretchDrainCount = energyCounts.drained + energyCounts.stretched;
  const totalPulses = pulses.length;
  const avgLoad = activity.length > 0
    ? Math.round(activity.reduce((a, b) => a + (b.meeting_minutes_day || 0), 0) / activity.length)
    : null;

  const parts = [];
  if (stretchDrainCount >= 3) {
    parts.push(`Most days this week you've reported feeling stretched or drained (${stretchDrainCount} of ${totalPulses} check-ins).`);
  } else if (energyCounts.steady + energyCounts.strong >= 3) {
    parts.push(`This week has felt relatively steady — you've reported feeling steady or strong in most check-ins.`);
  }
  if (avgLoad && avgLoad > 250) {
    parts.push(`Your meeting load has been heavy, averaging around ${avgLoad} minutes per day.`);
  }
  return parts.join(' ') || 'Not enough signal for a 7-day summary yet.';
}

function buildSummary28d(pulses14d, pulses28d) {
  const recentStretch = pulses14d.filter(p => ['drained', 'stretched'].includes(p.energy_level)).length;
  const olderPulses = pulses28d.slice(pulses14d.length);
  const olderStretch = olderPulses.filter(p => ['drained', 'stretched'].includes(p.energy_level)).length;

  if (pulses28d.length < 5) return 'Not enough check-ins yet for a monthly pattern.';

  if (recentStretch > olderStretch + 1) {
    return `Over the last month, your recent weeks have felt more stretched than earlier in the period — a pattern worth noticing.`;
  }
  if (olderStretch > recentStretch + 1) {
    return `The last month shows some improvement — your more recent check-ins have felt steadier than earlier weeks.`;
  }
  return `Over the last month, your reported energy and load have been relatively consistent.`;
}

async function generateNarrative(base44, pulses14d, activity7d, trends) {
  const energyValues = pulses14d
    .filter(p => p.energy_level)
    .map(p => ENERGY_ORDER[p.energy_level] ?? 1);
  const confValues = pulses14d
    .filter(p => p.confidence_today)
    .map(p => CONFIDENCE_ORDER[p.confidence_today] ?? 1);

  const avgEnergy = energyValues.length > 0
    ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length
    : null;
  const avgConf = confValues.length > 0
    ? confValues.reduce((a, b) => a + b, 0) / confValues.length
    : null;
  const avgMeetingMins = activity7d.length > 0
    ? activity7d.reduce((a, b) => a + (b.meeting_minutes_day || 0), 0) / activity7d.length
    : null;

  const prompt = `You are Atreus, a private leadership companion. Generate a single SHORT sentence (max 25 words) summarizing the manager's recent leadership rhythm based on these signals.

RULES — you MUST follow every one:
- Use ONLY "you've reported", "you've told me", "over the last few weeks", "lately" — never "you are" or trait labels
- NO diagnostic language (burnout, struggling, stressed, anxious, overwhelmed, declining)
- NO speculation beyond the data
- NO identity framing ("you are the type of person who...")
- NO exclamation marks or cheerleading
- The tone should be calm, observational, and respectful — like a trusted colleague noticing something

Signals:
- Average energy level: ${avgEnergy !== null ? avgEnergy.toFixed(1) + '/3' : 'not enough data'}
- Energy trend (14d): ${trends.energy_trend}
- Confidence trend (14d): ${trends.confidence_trend}
- Resilience trend (14d): ${trends.resilience_trend || 'insufficient_data'}
- Average meeting load: ${avgMeetingMins !== null ? Math.round(avgMeetingMins) + ' mins/day' : 'unknown'}
- Overload pattern strength: ${trends.overload_pattern_strength}/100
- Stretch/drain days in 14d: ${trends.stretch_frequency_14d}
- Delegation intent vs actuals gap this week: ${trends.delegation_gap_count_7d || 0} times
- Identity friction signals this week: ${trends.identity_friction_signals || 0}

Output ONLY the sentence. No quotes. No explanation.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
  return typeof result === 'string' ? result.trim() : (result?.response || '').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const date14dAgo = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];
    const date28dAgo = new Date(now.getTime() - 28 * 86400000).toISOString().split('T')[0];
    const date7dAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];

    // Get all managers with at least some TonePreference record (proxy for active managers)
    const tonePrefs = await base44.asServiceRole.entities.TonePreference.list('-created_date', 200);
    const managerEmails = [...new Set(tonePrefs.map(t => t.user_email).filter(Boolean))];

    if (managerEmails.length === 0) {
      return Response.json({ processed: 0, reason: 'No active managers found' });
    }

    const results = [];

    for (const email of managerEmails) {
      try {
        // Fetch pulses — manager-private, accessed via service role with audit reason
        const allPulses = await base44.asServiceRole.entities.ManagerPulse.filter(
          { user_email: email }, '-created_date', 100
        );

        const cutoff14d = new Date(date14dAgo);
        const cutoff28d = new Date(date28dAgo);
        const cutoff7d = new Date(date7dAgo);

        const pulses14d = allPulses.filter(p => p.created_date && new Date(p.created_date) >= cutoff14d);
        const pulses28d = allPulses.filter(p => p.created_date && new Date(p.created_date) >= cutoff28d);
        const pulses7d = allPulses.filter(p => p.created_date && new Date(p.created_date) >= cutoff7d);

        // Minimum data gate
        if (pulses14d.length < 3) {
          results.push({ email, status: 'skipped', reason: `Only ${pulses14d.length} pulses in 14d` });
          continue;
        }

        // Activity signals
        const activity7d = await base44.asServiceRole.entities.UserActivity.filter(
          { user_email: email }, '-date', 7
        );

        // ─── Compute individual trends ───────────────────────────────────────

        // Energy trend
        const energyValues = pulses14d
          .filter(p => p.energy_level)
          .map(p => ENERGY_ORDER[p.energy_level] ?? 1);
        const energy_trend = trendDirection(energyValues);

        // Confidence trend
        const confValues = pulses14d
          .filter(p => p.confidence_today)
          .map(p => CONFIDENCE_ORDER[p.confidence_today] ?? 1);
        const confidence_trend = trendDirection(confValues);

        // Stretch frequency
        const stretch_frequency_14d = pulses14d.filter(p =>
          ['drained', 'stretched'].includes(p.energy_level)
        ).length;

        // Overload acknowledgment rate (28d)
        const overloadPulses = pulses28d.filter(p => p.prompt_type === 'overload_check' && p.operator_mode_response);
        const overload_acknowledgment_rate = overloadPulses.length > 0
          ? overloadPulses.filter(p => ['very_much', 'somewhat'].includes(p.operator_mode_response)).length / overloadPulses.length
          : 0;

        // Operator risk trajectory (7d activity)
        const riskScores = activity7d.map(a => a.operator_mode_risk_score).filter(s => s != null);
        const operator_risk_trajectory = trendDirection(riskScores.map(s => s / 100));

        // Overload pattern strength (28d composite)
        const overload_pattern_strength = Math.min(100, Math.round(
          (stretch_frequency_14d / Math.max(1, pulses14d.length)) * 40 +
          overload_acknowledgment_rate * 30 +
          (riskScores.length > 0 ? (riskScores.reduce((a, b) => a + b, 0) / riskScores.length) / 100 * 30 : 0)
        ));

        // Learning stall
        const latestActivity = activity7d[0];
        const learning_stall_detected = latestActivity
          ? (latestActivity.learning_inertia_days || 0) > 7
          : false;

        // Delegation loop signals (7d)
        const intentPulses7d = pulses7d.filter(p => p.prompt_type === 'morning_intent');
        const delegation_intent_count_7d = intentPulses7d.filter(p => p.focus_category === 'delegation').length;

        const actualsPulses7d = pulses7d.filter(p => p.prompt_type === 'evening_actuals');
        const delegation_gap_count_7d = actualsPulses7d.filter(p =>
          p.intent_actuals_gap === 'declared_delegation_operator_mode_detected'
        ).length;

        // ─── Resilience trend ───────────────────────────────────────────────
        const resilienceValues = pulses14d
          .filter(p => p.resilience_signal)
          .map(p => RESILIENCE_ORDER[p.resilience_signal] ?? 1);
        const resilience_trend = trendDirection(resilienceValues);

        // ─── Identity friction detection (7d) ──────────────────────────────
        const identity_friction_signals = pulses7d.filter(p => p.identity_friction === true).length;
        const identity_friction_active = identity_friction_signals >= 2;

        // Summaries
        const summary_7d = buildSummary7d(pulses7d.filter(p => p.source !== 'system'), activity7d);
        const summary_28d = buildSummary28d(pulses14d, pulses28d);

        // Build trends object for narrative generation
        const trendData = {
          energy_trend,
          confidence_trend,
          resilience_trend,
          overload_pattern_strength,
          stretch_frequency_14d,
          operator_risk_trajectory,
          overload_acknowledgment_rate,
          delegation_gap_count_7d,
          identity_friction_signals,
          identity_friction_active,
        };

        // Generate LLM narrative (only if enough data)
        let trend_narrative = null;
        if (pulses14d.length >= 5) {
          trend_narrative = await generateNarrative(base44, pulses14d, activity7d, trendData);
        }

        // Log the access
        await base44.asServiceRole.entities.PulseAccessLog.create({
          accessed_by: 'system:computeBehaviorTrends',
          target_email: email,
          entity_accessed: 'ManagerPulse',
          fields_accessed: ['energy_level', 'confidence_today', 'operator_mode_response', 'focus_category', 'intent_actuals_gap'],
          reason_code: 'computeBehaviorTrends',
          function_name: 'computeBehaviorTrends',
          timestamp: now.toISOString(),
          record_count: allPulses.length,
        });

        // Upsert ManagerTrends
        const existingTrends = await base44.asServiceRole.entities.ManagerTrends.filter(
          { user_email: email }, '-last_trend_computed_at', 1
        );

        const trendsPayload = {
          user_email: email,
          confidence_trend,
          energy_trend,
          resilience_trend,
          overload_pattern_strength,
          stretch_frequency_14d,
          operator_risk_trajectory,
          overload_acknowledgment_rate,
          summary_7d,
          summary_28d,
          trend_narrative,
          last_trend_computed_at: now.toISOString(),
          data_points_14d: pulses14d.length,
          data_points_28d: pulses28d.length,
          learning_stall_detected,
          delegation_intent_count_7d,
          delegation_gap_count_7d,
          identity_friction_signals,
          identity_friction_active,
        };

        if (existingTrends.length > 0) {
          await base44.asServiceRole.entities.ManagerTrends.update(existingTrends[0].id, trendsPayload);
        } else {
          await base44.asServiceRole.entities.ManagerTrends.create(trendsPayload);
        }

        results.push({ email, status: 'ok', energy_trend, confidence_trend, data_points_14d: pulses14d.length });

      } catch (err) {
        results.push({ email, status: 'error', error: err.message });
      }
    }

    return Response.json({
      processed: results.filter(r => r.status === 'ok').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});