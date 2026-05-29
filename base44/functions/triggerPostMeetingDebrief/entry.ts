/**
 * triggerPostMeetingDebrief
 *
 * Called after difficult conversations (manual trigger or calendar-based).
 * Creates a ManagerPulse "debrief" record to capture:
 * - How the conversation went emotionally
 * - What was surprising or challenging
 * - What the manager would do differently
 * - Follow-up actions needed
 *
 * Feeds back into pattern detection and coaching loop.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { 
      conversation_type = 'difficult', // 'performance_review', '1on1', '1:1', 'difficult', 'delegation'
      trigger_source = 'manual' // 'manual', 'calendar'
    } = payload;

    // Create a debrief prompt pulse
    // This is a special pulse type that captures post-conversation reflection
    const debrief = await base44.asServiceRole.entities.ManagerPulse.create({
      user_email: user.email,
      prompt_type: 'contextual',
      source: trigger_source === 'calendar' ? 'system' : 'web',
      biggest_weight_today: null, // Will be filled by user in follow-up
      avoidance_flag: null,
      confidence_today: null,
      motivation_today: null,
      optimism_today: null,
      resilience_signal: null,
      energy_level: null,
      mental_clarity: null,
      perceived_load: null,
      room_today: null,
      // Special debrief metadata
      identity_friction: false,
      identity_friction_note: null,
    });

    // Schedule a follow-up prompt that surfaces the debrief
    // The prompt will ask: "That conversation just happened. How did it go?"
    const followUpPrompt = `How did that ${conversation_type} conversation go? What surprised you, what was hard, and what would you do differently next time?`;

    return Response.json({
      success: true,
      debrief_id: debrief.id,
      follow_up_prompt: followUpPrompt,
      conversation_type,
      message: `I'm ready to help you reflect on that ${conversation_type} conversation. What happened?`
    });

  } catch (error) {
    console.error('Error triggering post-meeting debrief:', error);
    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});