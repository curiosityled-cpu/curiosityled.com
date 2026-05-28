/**
 * scheduleOverloadFollowUp — fires 24h after a manager acknowledges operator-mode overload.
 *
 * Triggered by: entity automation on ManagerPulse create/update
 * Condition: operator_mode_response IN ['very_much', 'somewhat']
 *
 * Checks if a follow-up is due (24-28h after original pulse),
 * creates a follow-up ManagerPulse marker, and logs it so the
 * in-product ManagerCheckIn surfaces the closing question.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // Support both direct call (with user_email) and entity automation payload
    const targetEmail = body.user_email || body.data?.user_email || user.email;
    const originalPulseId = body.pulse_id || body.data?.id || null;
    const now = new Date();

    if (!targetEmail) {
      return Response.json({ error: 'No target email' }, { status: 400 });
    }

    // Find the original overload pulse (within last 36h, not already followed up)
    const recentPulses = await base44.asServiceRole.entities.ManagerPulse.filter(
      { user_email: targetEmail },
      '-created_date',
      20
    );

    const overloadPulse = recentPulses.find(p => {
      if (!p.operator_mode_response || !['very_much', 'somewhat'].includes(p.operator_mode_response)) return false;
      if (p.follow_up_sent) return false;
      const pulseAge = (now - new Date(p.created_date)) / 3600000;
      return pulseAge >= 20 && pulseAge <= 36; // 20–36h window
    });

    if (!overloadPulse) {
      return Response.json({
        sent: false,
        reason: 'No eligible overload pulse found in 20–36h window'
      });
    }

    // Mark original pulse as followed up
    await base44.asServiceRole.entities.ManagerPulse.update(overloadPulse.id, {
      follow_up_sent: true,
      follow_up_date: now.toISOString().split('T')[0]
    });

    // Create a follow-up pulse marker so ManagerCheckIn surfaces the closing question
    const followUpStrength = overloadPulse.operator_mode_response === 'very_much' ? 'strong' : 'moderate';

    await base44.asServiceRole.entities.ManagerPulse.create({
      user_email: targetEmail,
      source: 'system',
      prompt_type: 'follow_up',
      biggest_weight_today: `follow_up:overload:${followUpStrength}:${overloadPulse.id}`
    });

    return Response.json({
      sent: true,
      target_email: targetEmail,
      original_pulse_id: overloadPulse.id,
      follow_up_strength: followUpStrength,
      message: followUpStrength === 'strong'
        ? "You said things were piling up on you. Did anything actually move off your plate since then?"
        : "You caught it early the other day. Did the week end up any lighter?"
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});