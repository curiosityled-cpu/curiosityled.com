/**
 * sendTeamsAdaptiveCard — deliver Atreus check-in prompts as Teams Adaptive Cards.
 *
 * Uses Microsoft Graph API to post a card to a manager's personal chat (1:1 with the bot).
 * The card includes:
 *   - Title + body (tone-adjusted)
 *   - Quick-tap response buttons (Action.Submit so Teams captures responses in-channel)
 *   - Collapsible "Why I asked this" section
 *   - Optional text input for free-text note
 *
 * Requirements:
 *   - TEAMS_BOT_APP_ID  — Azure AD app registration client ID
 *   - TEAMS_BOT_APP_SECRET — Azure AD app registration client secret
 *   - TEAMS_TENANT_ID — Azure AD tenant ID
 *
 * The bot must already have a 1:1 conversation open with the user.
 * Conversation IDs are stored on TonePreference.teams_conversation_id (added when onboarding completes).
 *
 * Phase 1 (current): sends card and logs result. Response capture via webhook (WEBHOOK_SETUP).
 * Phase 2: use Action.Submit + incoming webhook to capture taps back into ManagerPulse.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Build the Adaptive Card JSON ────────────────────────────────────────────

function buildAdaptiveCard(prompt) {
  const toneEmojis = {
    gentle_observant: '🌿',
    warm_candid: '💙',
    close_friend_candid: '🤝',
    respectfully_confronting: '💪',
  };
  const toneEmoji = toneEmojis[prompt.tone_mode] || '💭';

  // Option buttons as Action.Submit so Teams can route responses back
  const actionButtons = (prompt.options || []).map(opt => ({
    type: 'Action.Submit',
    title: opt.label,
    data: {
      action: 'checkin_response',
      pulse_id: prompt.pulse_id || null,
      prompt_type: prompt.prompt_type,
      response_value: opt.value,
      user_email: prompt.user_email,
    },
    style: opt.value === 'skipped' ? 'default' : 'positive',
  }));

  const cardBody = [
    // Header row
    {
      type: 'ColumnSet',
      columns: [
        {
          type: 'Column',
          width: 'stretch',
          items: [
            {
              type: 'TextBlock',
              text: `${toneEmoji} Atreus Check-In`,
              weight: 'bolder',
              size: 'small',
              color: 'accent',
              spacing: 'none',
            },
          ],
        },
      ],
    },
    // Question
    {
      type: 'TextBlock',
      text: prompt.title,
      weight: 'bolder',
      size: 'medium',
      wrap: true,
      spacing: 'small',
    },
    {
      type: 'TextBlock',
      text: prompt.body,
      wrap: true,
      color: 'default',
      spacing: 'small',
    },
    // Response buttons
    {
      type: 'ActionSet',
      actions: actionButtons,
      spacing: 'medium',
    },
  ];

  // Optional override preamble (high-risk tone shift notice)
  if (prompt.override_preamble) {
    cardBody.splice(2, 0, {
      type: 'TextBlock',
      text: `ℹ️ ${prompt.override_preamble}`,
      wrap: true,
      color: 'warning',
      size: 'small',
      spacing: 'small',
    });
  }

  // Optional text input
  if (prompt.optional_text) {
    cardBody.push({
      type: 'Input.Text',
      id: 'optional_note',
      placeholder: prompt.optional_text,
      isMultiline: true,
      maxLength: 500,
      spacing: 'small',
    });
    actionButtons.push({
      type: 'Action.Submit',
      title: 'Add note',
      data: {
        action: 'checkin_note',
        pulse_id: prompt.pulse_id || null,
        prompt_type: prompt.prompt_type,
        user_email: prompt.user_email,
      },
      style: 'default',
    });
  }

  // "Why I asked this" — collapsible via ShowCard
  cardBody.push({
    type: 'ActionSet',
    spacing: 'small',
    actions: [
      {
        type: 'Action.ShowCard',
        title: 'Why this?',
        card: {
          type: 'AdaptiveCard',
          body: [
            {
              type: 'TextBlock',
              text: prompt.why,
              wrap: true,
              color: 'default',
              size: 'small',
              isSubtle: true,
            },
          ],
        },
      },
    ],
  });

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: cardBody,
        },
      },
    ],
  };
}

// ─── Get Graph API access token (client credentials) ─────────────────────────

async function getGraphToken() {
  const tenantId = Deno.env.get('TEAMS_TENANT_ID');
  const clientId = Deno.env.get('TEAMS_BOT_APP_ID');
  const clientSecret = Deno.env.get('TEAMS_BOT_APP_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    return null; // Secrets not configured — graceful fallback
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph token error: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

// ─── Send card to Teams conversation ─────────────────────────────────────────

async function sendToTeams(conversationId, card, token) {
  const url = `https://graph.microsoft.com/v1.0/chats/${conversationId}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(card),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Teams send error (${res.status}): ${err}`);
  }

  return await res.json();
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const { prompt, user_email } = payload;

    if (!prompt || !user_email) {
      return Response.json({ error: 'Missing required fields: prompt, user_email' }, { status: 400 });
    }

    // Attach user email to prompt data for action.submit routing
    prompt.user_email = user_email;

    // Build the card
    const card = buildAdaptiveCard(prompt);

    // Look up the manager's Teams conversation ID
    const tonePrefs = await base44.asServiceRole.entities.TonePreference.filter(
      { user_email }, '-created_date', 1
    );
    const conversationId = tonePrefs[0]?.teams_conversation_id || null;

    // Get Graph token
    let token = null;
    let teamsDelivered = false;
    let teamsError = null;
    let teamsMessageId = null;

    try {
      token = await getGraphToken();
    } catch (e) {
      teamsError = `Token error: ${e.message}`;
    }

    if (token && conversationId) {
      try {
        const result = await sendToTeams(conversationId, card, token);
        teamsDelivered = true;
        teamsMessageId = result?.id || null;
      } catch (e) {
        teamsError = e.message;
      }
    } else if (!conversationId) {
      teamsError = 'No Teams conversation ID on file for this manager — bot may not be installed yet';
    } else if (!token) {
      teamsError = teamsError || 'TEAMS_BOT_APP_ID / TEAMS_BOT_APP_SECRET / TEAMS_TENANT_ID not configured';
    }

    return Response.json({
      success: true,
      teams_delivered: teamsDelivered,
      teams_message_id: teamsMessageId,
      teams_error: teamsError,
      card_built: true,
      tone_applied: prompt.tone_mode,
      fallback_reason: teamsDelivered ? null : teamsError,
      // Return card structure so caller can use it for in-product fallback if needed
      card,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});