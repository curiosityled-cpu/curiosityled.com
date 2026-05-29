/**
 * generateEnhancedPatternNarrative
 *
 * Generates richer "I'm noticing..." stories for Atreus using actual pulse data.
 * References general patterns WITHOUT specific dates (per user preference).
 *
 * Returns narratives like:
 * - "Your confidence has been steady lately after we started reflecting on difficult conversations."
 * - "Energy tends to recover a few days after high-load weeks — you seem to recharge well."
 * - "Delegation shows up as an intention, but you tend to revert to hands-on when calendars get packed."
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch trend data and recent pulses
    const [trends, pulses] = await Promise.all([
      base44.asServiceRole.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1),
      base44.asServiceRole.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 28),
    ]);

    const trend = trends[0];
    const recentPulses = pulses || [];

    if (!trend || recentPulses.length < 3) {
      return Response.json({
        narrative: "You're building your leadership rhythm. Once we have more check-ins, I'll start seeing patterns to share with you.",
        confidence: 'low'
      });
    }

    // Build narrative segments from actual data
    const narratives = [];

    // 1. Energy recovery pattern
    if (recentPulses.some(p => p.energy_level === 'drained' || p.energy_level === 'stretched')) {
      const recovered = recentPulses.filter(p => p.energy_level === 'steady' || p.energy_level === 'strong');
      if (recovered.length > 0 && trend.energy_trend === 'improving') {
        narratives.push("Your energy has been recovering well lately — it looks like you recharge after high-intensity periods.");
      } else if (trend.energy_trend === 'declining') {
        narratives.push("Energy has been trending lower. I'm noticing you're spending more time in stretched or drained states.");
      }
    }

    // 2. Confidence pattern
    if (trend.confidence_trend === 'improving') {
      narratives.push("Your confidence has been building — you're reporting steadier feelings about your leadership lately.");
    } else if (trend.confidence_trend === 'declining') {
      narratives.push("Confidence has been dipping. You're describing more uncertainty in your leadership decisions recently.");
    } else if (trend.confidence_trend === 'stable') {
      narratives.push("Your confidence has stayed fairly consistent — steady and grounded in how you're showing up.");
    }

    // 3. Resilience bounce-back
    if (trend.resilience_trend === 'improving') {
      narratives.push("Your bounce-back speed after setbacks has been improving — you're recovering more quickly.");
    } else if (trend.resilience_trend === 'declining') {
      narratives.push("Recovery from tough moments seems slower lately — setbacks are taking longer to bounce back from.");
    }

    // 4. Overload pattern (operator mode)
    if (trend.overload_acknowledgment_rate > 0.6) {
      narratives.push("When workload climbs, you're aware of it. The pattern I'm seeing is: high load → you switch into operator mode → less strategic thinking.");
    }

    // 5. Delegation gap
    if (trend.delegation_intent_count_7d > 0 && trend.delegation_gap_count_7d > 0) {
      const gapRate = trend.delegation_gap_count_7d / trend.delegation_intent_count_7d;
      if (gapRate > 0.5) {
        narratives.push("You intend to delegate, but when the week gets busy, you end up hands-on more often than planned. This is a real pattern worth naming.");
      }
    }

    // 6. Identity friction signal
    if (trend.identity_friction_signals > 0) {
      narratives.push("You've mentioned feeling uncertain about your role lately. That kind of identity friction is worth exploring — it affects how you lead.");
    }

    // 7. Learning stall detection
    if (trend.learning_stall_detected) {
      narratives.push("Your learning activity has been quiet — you haven't engaged with development resources in a while. Sometimes a small step forward helps.");
    }

    // 8. Data quality note
    if (trend.data_points_14d < 5) {
      narratives.push("I don't have enough recent check-ins to surface strong patterns yet — the more you share, the clearer the picture becomes.");
    }

    // Build final narrative
    let finalNarrative = narratives.slice(0, 3).join(" ");
    
    if (narratives.length === 0) {
      finalNarrative = "Your patterns are still forming — check back as we gather more data.";
    } else if (narratives.length > 3) {
      finalNarrative = narratives.slice(0, 3).join(" ") + " These are the strongest patterns I'm seeing right now.";
    }

    return Response.json({
      narrative: finalNarrative,
      confidence: 'high',
      segments: narratives.slice(0, 3),
      data_points: trend.data_points_14d,
      trends_observed: [
        trend.energy_trend,
        trend.confidence_trend,
        trend.resilience_trend
      ].filter(t => t && t !== 'insufficient_data')
    });

  } catch (error) {
    console.error('Error generating pattern narrative:', error);
    return Response.json(
      { error: error.message, narrative: "I'll share patterns as they emerge." },
      { status: 500 }
    );
  }
});