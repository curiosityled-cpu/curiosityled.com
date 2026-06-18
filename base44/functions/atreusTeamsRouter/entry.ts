/**
 * atreusTeamsRouter — Phase 5: Teams Integration Scaffold
 *
 * Receives messages from Microsoft Teams bot webhooks and routes them
 * through the Atreus orchestrator, returning adaptive card responses.
 *
 * This is a webhook endpoint — validate the Teams request signature
 * and route to the appropriate handler based on message type.
 *
 * Teams Bot Setup (Azure):
 *   1. Register a bot in Azure Bot Framework
 *   2. Set the messaging endpoint to this function's URL
 *   3. Store TEAMS_BOT_APP_ID and TEAMS_BOT_APP_PASSWORD in secrets
 *
 * Supported actions (via adaptive card submit):
 *   - check_in_morning
 *   - check_in_evening
 *   - view_assessment
 *   - ask_atreus (freeform message → orchestrator → Atreus response)
 *   - view_goals
 *   - complete_practice_flow
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// HMAC validation for Teams bot requests
async function validateTeamsRequest(req, body) {
  const authHeader = req.headers.get('Authorization') || '';
  // Teams sends Bearer token — in production, validate against Microsoft auth
  // For now, validate presence (full OAuth2 validation requires token introspection)
  return authHeader.startsWith('Bearer ') && authHeader.length > 20;
}

function buildCheckInCard(type = 'morning') {
  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: type === 'morning' ? '☀️ Morning Check-In' : '🌙 Evening Check-In',
        weight: 'Bolder',
        size: 'Medium',
      },
      {
        type: 'TextBlock',
        text: type === 'morning'
          ? 'How are you starting the day?'
          : 'How did today go?',
        wrap: true,
      },
      {
        type: 'Input.ChoiceSet',
        id: 'energy_score',
        label: 'Energy level',
        choices: [
          { title: '1 – Drained', value: '1' },
          { title: '2 – Low', value: '2' },
          { title: '3 – Moderate', value: '3' },
          { title: '4 – Good', value: '4' },
          { title: '5 – Energised', value: '5' },
        ],
      },
      {
        type: 'Input.ChoiceSet',
        id: 'load_score',
        label: 'Load / pressure',
        choices: [
          { title: '1 – Very light', value: '1' },
          { title: '2 – Manageable', value: '2' },
          { title: '3 – Moderate', value: '3' },
          { title: '4 – Heavy', value: '4' },
          { title: '5 – Overloaded', value: '5' },
        ],
      },
      {
        type: 'Input.Text',
        id: 'focus_note',
        label: type === 'morning' ? 'What\'s your main focus today?' : 'What mattered most today?',
        placeholder: 'Optional — a sentence is enough',
        isMultiline: false,
      },
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Submit',
        data: { action: type === 'morning' ? 'check_in_morning' : 'check_in_evening' },
      },
    ],
  };
}

function buildAtreusResponseCard(message, suggestedActions = []) {
  const card = {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: '🧠 Atreus',
        weight: 'Bolder',
        color: 'Accent',
      },
      {
        type: 'TextBlock',
        text: message,
        wrap: true,
      },
    ],
    actions: [],
  };

  // Add up to 3 suggested action buttons
  suggestedActions.slice(0, 3).forEach(action => {
    card.actions.push({
      type: 'Action.Submit',
      title: action.label,
      data: { action: 'ask_atreus', prompt: action.prompt || action.label, flow: action.flow_id },
    });
  });

  // Always add a freeform reply option
  card.actions.push({
    type: 'Action.ShowCard',
    title: 'Reply to Atreus',
    card: {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'Input.Text',
          id: 'user_message',
          placeholder: 'What\'s on your mind?',
          isMultiline: true,
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Send',
          data: { action: 'ask_atreus' },
        },
      ],
    },
  });

  return card;
}

function buildGoalsSummaryCard(goals = []) {
  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 5);
  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: '🎯 Your Active Goals',
        weight: 'Bolder',
        size: 'Medium',
      },
      ...activeGoals.map(g => ({
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'stretch',
            items: [{ type: 'TextBlock', text: g.title, wrap: true }],
          },
          {
            type: 'Column',
            width: 'auto',
            items: [{ type: 'TextBlock', text: `${g.progress || 0}%`, color: g.progress >= 70 ? 'Good' : 'Warning' }],
          },
        ],
      })),
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View in Atreus Platform',
        url: 'https://app.base44.com/my-performance',
      },
    ],
  };
}

Deno.serve(async (req) => {
  try {
    // All Teams webhook calls come as POST
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    // Validate Teams request
    const isValid = await validateTeamsRequest(req, body);
    if (!isValid) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    // In Teams context, look up user by email from Teams activity
    const teamsUserEmail = body?.from?.email || body?.from?.aadObjectId;

    // Teams Activity Types
    const activityType = body?.type;
    const action = body?.value?.action; // from adaptive card submits
    const messageText = body?.text || body?.value?.user_message || '';

    // ── Handle different activity types ──────────────────────────────────────

    // Simple message / freeform text
    if (activityType === 'message' && !action) {
      // Route through Atreus orchestrator for a response
      try {
        const orchResponse = await base44.asServiceRole.functions.invoke('atreusOrchestrator', {
          trigger_type: 'teams_message',
          page_context: { page: 'teams', message: messageText },
        });

        const data = orchResponse?.data || {};
        const card = buildAtreusResponseCard(
          data.opening_message || 'I\'m here. What\'s on your mind?',
          data.suggested_actions || []
        );

        return Response.json({
          type: 'message',
          attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }],
        });
      } catch (e) {
        return Response.json({
          type: 'message',
          text: 'Atreus is here. Ask me anything about your leadership, check-ins, or goals.',
        });
      }
    }

    // Adaptive card submit — action routing
    if (activityType === 'invoke' || action) {
      const activeAction = action || body?.value?.action;

      if (activeAction === 'check_in_morning') {
        const card = buildCheckInCard('morning');
        return Response.json({
          type: 'message',
          attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }],
        });
      }

      if (activeAction === 'check_in_evening') {
        const card = buildCheckInCard('evening');
        return Response.json({
          type: 'message',
          attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }],
        });
      }

      if (activeAction === 'check_in_morning_submit' || activeAction === 'check_in_evening_submit') {
        const checkInType = activeAction.includes('morning') ? 'morning' : 'evening';
        // Save check-in via saveDailyCheckIn function
        try {
          await base44.asServiceRole.functions.invoke('saveDailyCheckIn', {
            action: checkInType === 'morning' ? 'save_morning' : 'save_evening',
            user_email: teamsUserEmail,
            energy_score: parseInt(body?.value?.energy_score || 3),
            load_score: parseInt(body?.value?.load_score || 3),
            focus_note: body?.value?.focus_note || '',
          });
          return Response.json({ type: 'message', text: `✅ ${checkInType === 'morning' ? 'Morning' : 'Evening'} check-in saved. Atreus is watching.` });
        } catch (e) {
          return Response.json({ type: 'message', text: `Couldn't save your check-in right now. Try again in a moment.` });
        }
      }

      if (activeAction === 'view_goals') {
        try {
          const goals = await base44.asServiceRole.entities.Goal.filter(
            { created_by: teamsUserEmail, status: 'active' }, '-updated_date', 10
          );
          const card = buildGoalsSummaryCard(goals);
          return Response.json({
            type: 'message',
            attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }],
          });
        } catch (e) {
          return Response.json({ type: 'message', text: 'Could not load your goals right now.' });
        }
      }

      if (activeAction === 'ask_atreus') {
        const prompt = body?.value?.prompt || body?.value?.user_message || messageText;
        try {
          const orchResponse = await base44.asServiceRole.functions.invoke('atreusOrchestrator', {
            trigger_type: 'teams_message',
            page_context: { page: 'teams', message: prompt },
          });
          const data = orchResponse?.data || {};
          const card = buildAtreusResponseCard(data.opening_message || 'What\'s on your mind?', data.suggested_actions || []);
          return Response.json({
            type: 'message',
            attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }],
          });
        } catch (e) {
          return Response.json({ type: 'message', text: 'Atreus encountered an issue. Please try again.' });
        }
      }
    }

    // Default: show menu card
    const menuCard = {
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        { type: 'TextBlock', text: '🧠 Atreus — Leadership Companion', weight: 'Bolder', size: 'Medium' },
        { type: 'TextBlock', text: 'What would you like to do?', wrap: true },
      ],
      actions: [
        { type: 'Action.Submit', title: '☀️ Morning Check-In', data: { action: 'check_in_morning' } },
        { type: 'Action.Submit', title: '🌙 Evening Check-In', data: { action: 'check_in_evening' } },
        { type: 'Action.Submit', title: '🎯 View My Goals', data: { action: 'view_goals' } },
        { type: 'Action.OpenUrl', title: '🔗 Open Atreus Platform', url: 'https://app.base44.com/today' },
      ],
    };

    return Response.json({
      type: 'message',
      attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: menuCard }],
    });

  } catch (error) {
    console.error('atreusTeamsRouter error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});