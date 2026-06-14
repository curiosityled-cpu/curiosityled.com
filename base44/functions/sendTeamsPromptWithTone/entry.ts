// deno-lint-ignore-file no-undef
/**
 * sendTeamsPromptWithTone
 * Wraps sendTeamsPrompt to vary directness/language based on manager's tone preference.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email = user.email, base_prompt, context, trigger_reason, prompt_type } = await req.json();

    const tonePrefs = await base44.entities.TonePreference.filter({ user_email }, null, 1);
    const tonePref = tonePrefs[0]?.tone_mode || 'warm_candid';

    const adaptedPrompts = {
      gentle_observant: {
        operator_mode: `I've noticed a pattern: high load combined with tighter control. How are you feeling about delegating today?`,
        learning_stall: `It's been quiet on the learning front lately. Is there something specific you'd like to explore?`,
        delegation_gap: `I saw a gap between your intent to delegate and what actually happened. What got in the way?`,
      },
      warm_candid: {
        operator_mode: `You're showing signs of overload + overcontrol. You know this pattern. What would help you step back today?`,
        learning_stall: `You've been in tactical mode for a while. Learning fell off. What's one thing you'd like to develop?`,
        delegation_gap: `You committed to delegating but didn't. Let's talk about what happened.`,
      },
      close_friend_candid: {
        operator_mode: `You're doing the thing again — taking on too much and micromanaging. What's actually going on?`,
        learning_stall: `You haven't done any learning in a week. What's blocking you?`,
        delegation_gap: `You said you'd delegate but didn't. Real talk: what stopped you?`,
      },
      respectfully_confronting: {
        operator_mode: `The data shows overload coupled with tighter control. This pattern limits your team. Let's address it directly.`,
        learning_stall: `You've deprioritized learning. This undermines your development goals. What needs to change?`,
        delegation_gap: `You set a delegation intention but didn't execute. We need to understand why and fix it.`,
      },
    };

    const tonePrompts = adaptedPrompts[tonePref] || adaptedPrompts.warm_candid;
    const adaptedText = tonePrompts[prompt_type] || base_prompt;

    const explanations = {
      operator_mode: 'Based on your calendar density and control patterns over the last 7 days',
      learning_stall: 'No learning activity detected in the last 14 days',
      delegation_gap: 'Your morning intent mentioned delegation, but your evening actuals show it did not happen',
    };
    const whyAsked = explanations[prompt_type] || trigger_reason;

    let deliveryResult = null;
    try {
      deliveryResult = await base44.functions.invoke('sendTeamsPrompt', {
        user_email,
        title: `Atreus Check-in (${tonePref})`,
        message: adaptedText,
        prompt_type,
        explanation: `Why I asked: ${whyAsked}`,
        context,
        force: true,
      });
    } catch (deliveryErr) {
      // Non-fatal — log but don't fail the response
      console.error('[sendTeamsPromptWithTone] Delivery error (non-fatal):', deliveryErr.message);
    }

    return Response.json({ status: 'sent', tone_mode: tonePref, prompt_type, adapted_message: adaptedText, delivery: deliveryResult?.data || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});