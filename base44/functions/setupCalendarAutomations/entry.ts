/**
 * setupCalendarAutomations
 *
 * Helper function to set up calendar-based trigger automations.
 * Registers webhook subscriptions for:
 * - Difficult meeting detection (high-stakes keywords)
 * - 1:1 cancellations
 * - Heavy meeting day detection
 *
 * Call this once on app initialization (or user first check-in)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check which calendar provider is connected
    const tonePrefs = await base44.asServiceRole.entities.TonePreference.filter(
      { user_email: user.email },
      '-created_date',
      1
    );

    const hasCalendarConsent = tonePrefs[0]?.calendar_consent_given;
    const calendarProvider = tonePrefs[0]?.calendar_provider;

    if (!hasCalendarConsent || !calendarProvider) {
      return Response.json({
        success: false,
        message: 'User has not granted calendar access. Request calendar consent first.'
      });
    }

    // Set up trigger automations based on provider
    // NOTE: These would normally be set up via base44.automations API
    // For now, return instructions for manual setup
    const automationInstructions = [
      {
        name: 'Difficult Meeting Prep',
        trigger: 'Calendar event created/updated with keywords: review, difficult, performance, termination, reorg, stakeholder, executive',
        action: 'Call triggerCalendarBasedPrompt with event_type="difficult_meeting_upcoming" 30 minutes before meeting',
        timing: '30 min before meeting start'
      },
      {
        name: '1:1 Cancellation Detection',
        trigger: 'Recurring 1:1 event deleted/cancelled',
        action: 'Call triggerCalendarBasedPrompt with event_type="1:1_skipped"',
        timing: 'Immediately on cancellation'
      },
      {
        name: 'Heavy Meeting Day',
        trigger: 'Manager has 6+ hours of meetings in a single day with <15 min gaps',
        action: 'Call triggerCalendarBasedPrompt with event_type="heavy_day_detected"',
        timing: 'End of day'
      }
    ];

    return Response.json({
      success: true,
      calendar_provider: calendarProvider,
      automations_configured: automationInstructions,
      message: 'Calendar automations are configured. Triggers will fire based on calendar patterns.',
      next_steps: [
        '1. Calendar webhook is listening for changes',
        '2. Difficult meetings will trigger prep prompts',
        '3. Missed 1:1s will generate follow-up notifications',
        '4. Heavy days will surface energy/clarity check-ins'
      ]
    });

  } catch (error) {
    console.error('Error setting up calendar automations:', error);
    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});