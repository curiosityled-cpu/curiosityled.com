// deno-lint-ignore-file no-undef
/**
 * captureMorningIntent
 * Scheduled Mon-Fri 8am EST. Sends morning intent prompt via Teams.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email } = await req.json();

    if (!user_email) {
      return Response.json({ error: 'user_email required' }, { status: 400 });
    }

    const tonePrefs = await base44.entities.TonePreference.filter({ user_email }, null, 1);
    const tonePref = tonePrefs[0] || { tone_mode: 'warm_candid', cadence_preference: 'every_other_day' };

    if (tonePref.cadence_preference === 'paused') {
      return Response.json({ skipped: true, reason: 'cadence paused' });
    }

    const lastPromptSent = tonePref.last_prompt_sent_at ? new Date(tonePref.last_prompt_sent_at) : null;
    const now = new Date();
    const hoursSinceLastPrompt = lastPromptSent ? (now - lastPromptSent) / (1000 * 60 * 60) : null;

    if (hoursSinceLastPrompt && hoursSinceLastPrompt < 20) {
      return Response.json({ skipped: true, reason: 'throttle' });
    }

    const toneText = {
      gentle_observant: "As you start your day, what feels most important to focus on?",
      warm_candid: "What's the one thing that needs your attention today?",
      close_friend_candid: "What's weighing on you or calling for your focus today?",
      respectfully_confronting: "What's the core priority you need to drive today?",
    };

    await base44.functions.invoke('sendTeamsPrompt', {
      user_email,
      title: 'Morning Focus',
      message: toneText[tonePref.tone_mode] || toneText.warm_candid,
      tone_mode: tonePref.tone_mode,
      prompt_type: 'morning_intent',
      explanation: 'Starting your day with intention helps prevent reactive mode.',
    });

    if (tonePref.id) {
      await base44.entities.TonePreference.update(tonePref.id, { last_prompt_sent_at: now.toISOString() });
    }

    return Response.json({ status: 'prompt_sent', user_email, prompt_type: 'morning_intent', tone_mode: tonePref.tone_mode });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});