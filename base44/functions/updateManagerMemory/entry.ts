/**
 * updateManagerMemory — Synthesizes recent pulse data into persistent behavioral memory.
 * Called after practice flows, debriefs, or on a scheduled basis.
 * Extracts: recurring_triggers, what_has_helped, stuck_points, pressure_responses.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch recent pulses
    const pulses = await base44.entities.ManagerPulse.filter(
      { user_email: user.email },
      '-created_date',
      100
    );

    if (pulses.length < 5) {
      return Response.json({ message: 'Not enough data yet', updated: false });
    }

    const recurring_triggers = [];
    const what_has_helped = [];
    const stuck_points = [];
    const pressure_responses = [];

    // --- RECURRING TRIGGERS ---
    const drainedOverload = pulses.filter(p => 
      p.prompt_type === 'overload_check' && p.energy_level === 'drained'
    ).length;
    if (drainedOverload >= 3) {
      recurring_triggers.push('High meeting load consistently drains energy and triggers overload patterns');
    }

    const avoidanceCount = pulses.filter(p => 
      p.avoidance_cue || p.biggest_weight_today?.toLowerCase().includes('avoid')
    ).length;
    if (avoidanceCount >= 2) {
      recurring_triggers.push('Difficult conversations and performance topics tend to trigger avoidance');
    }

    const frictionPulses = pulses.filter(p => p.identity_friction_note);
    if (frictionPulses.length >= 2) {
      recurring_triggers.push('Stakeholder reviews and role-ambiguous situations create identity friction');
    }

    const lowConfidenceBefore = pulses.filter(p => 
      p.confidence_today === 'low' || p.confidence_today === 'uncertain'
    ).length;
    if (lowConfidenceBefore / pulses.length > 0.4) {
      recurring_triggers.push('Confidence dips frequently — often correlated with high load or unclear priorities');
    }

    // --- WHAT HAS HELPED ---
    const followThroughPulses = pulses.filter(p => 
      p.prompt_type === 'follow_up' && p.intent_actuals_gap === 'no_gap_detected'
    );
    if (followThroughPulses.length > 0) {
      what_has_helped.push('Explicit behavioral commitments (not just intentions) tend to follow through');
    }

    const prepPulses = pulses.filter(p => p.prompt_type === 'prepare_debrief_pending');
    if (prepPulses.length > 0) {
      what_has_helped.push('Preparation flows before difficult conversations reduce anxiety and improve outcomes');
    }

    const workoutPulses = pulses.filter(p => 
      p.focus_intention?.toLowerCase().includes('workout completed')
    );
    if (workoutPulses.length >= 3) {
      what_has_helped.push('Short structured exercises (Workouts) maintain momentum even under high load');
    }

    const morningIntentPulses = pulses.filter(p => p.prompt_type === 'morning_intent');
    if (morningIntentPulses.length >= 5) {
      what_has_helped.push('Setting a morning intent correlates with better follow-through throughout the day');
    }

    // --- STUCK POINTS ---
    const stalledDelegation = pulses.filter(p => 
      p.delegation_commitment && p.prompt_type !== 'follow_up'
    ).length;
    const delegationFollowThrough = pulses.filter(p => 
      p.focus_intention?.toLowerCase().includes('delegation') && p.prompt_type === 'follow_up'
    ).length;
    if (stalledDelegation > delegationFollowThrough + 1) {
      stuck_points.push('Delegation commitments are made but often not followed through under pressure');
    }

    const recentLearning = pulses.filter(p => 
      p.focus_intention?.toLowerCase().includes('workout') || 
      p.focus_intention?.toLowerCase().includes('experience completed')
    );
    if (recentLearning.length < 2 && pulses.length > 30) {
      stuck_points.push('Consistent practice routines are the first thing dropped when load increases');
    }

    // --- PRESSURE RESPONSES ---
    const operatorModePulses = pulses.filter(p => p.operator_mode_response === 'yes');
    if (operatorModePulses.length >= 3) {
      pressure_responses.push('Under pressure, tends to shift into execution mode — taking back delegated work');
    }

    const highLoadPulses = pulses.filter(p => 
      p.energy_level === 'drained' || p.energy_level === 'stretched'
    );
    if (highLoadPulses.length / pulses.length > 0.5) {
      pressure_responses.push('Sustains high load for extended periods before signaling distress');
    }

    // Upsert ManagerMemory
    const existing = await base44.entities.ManagerMemory.filter(
      { user_email: user.email }, null, 1
    );
    
    const memoryData = {
      user_email: user.email,
      recurring_triggers,
      what_has_helped,
      stuck_points,
      pressure_responses,
      synthesis_count: (existing[0]?.synthesis_count || 0) + 1,
      last_synthesized_at: new Date().toISOString(),
    };

    if (existing[0]) {
      await base44.entities.ManagerMemory.update(existing[0].id, memoryData);
    } else {
      await base44.entities.ManagerMemory.create(memoryData);
    }

    return Response.json({ 
      updated: true, 
      summary: { 
        triggers: recurring_triggers.length, 
        helped: what_has_helped.length,
        stuck: stuck_points.length,
        pressure: pressure_responses.length
      } 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});