/**
 * sendTeamsAdaptiveCard — real Teams Adaptive Card delivery via Microsoft Graph API.
 *
 * Sends check-in prompts as interactive Adaptive Cards to a manager's Teams chat.
 * Response buttons use Action.Submit so responses are captured back via webhook.
 * Includes a "Why this?" toggle section inline in the card.
 *
 * Requires:
 *   - TEAMS_BOT_APP_ID, TEAMS_BOT_APP_PASSWORD secrets (for Graph auth)
 *   - TonePreference.teams_conversation_id stored per manager (set during onboarding)
 *
 * Falls back gracefully to in-app notification if Teams delivery fails.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Get Graph API access token via client credentials ────────────────────────

async function getGraphToken() {
  const tenantId = Deno.env.get('TEAMS_TENANT_ID') || 'common';
  const clientId = Deno.env.get('TEAMS_BOT_APP_ID');
  const clientSecret = Deno.env.get('TEAMS_BOT_APP_PASSWORD');

  if (!clientId || !clientSecret) {
    throw new Error('TEAMS_BOT_APP_ID and TEAMS_BOT_APP_PASSWORD secrets are required for Teams delivery');
  }

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    }
  );
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Graph token error: ${tokenData.error_description || JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

// ─── Build Adaptive Card JSON ─────────────────────────────────────────────────

function buildAdaptiveCard(prompt) {
  const actionButtons = (prompt.options || []).map(opt => ({
    type: 'Action.Submit',
    title: opt.label,
    data: {
      action: 'pulse_response',
      pulse_field: prompt.field || 'energy_level',
      value: opt.value || opt.field_value,
      prompt_type: prompt.prompt_type,
    },
  }));

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
          body: [
            // Atreus header
            {
              type: 'Container',
              style: 'accent',
              bleed: true,
              items: [
                {
                  type: 'TextBlock',
                  text: '🧭 Atreus check-in',
                  weight: 'Bolder',
                  size: 'Small',
                  color: 'Light',
                  spacing: 'None',
                },
              ],
            },
            // Title
            {
              type: 'TextBlock',
              text: prompt.title,
              weight: 'Bolder',
              size: 'Medium',
              wrap: true,
              spacing: 'Medium',
            },
            // Body
            {
              type: 'TextBlock',
              text: prompt.body,
              wrap: true,
              color: 'Default',
              spacing: 'Small',
            },
            // Optional text prompt (shown after options)
            ...(prompt.optional_text ? [{
              type: 'Input.Text',
              id: 'optional_note',
              placeholder: prompt.optional_text,
              isMultiline: false,
              spacing: 'Medium',
            }] : []),
            // Action buttons
            {
              type: 'ActionSet',
              actions: actionButtons,
              spacing: 'Medium',
            },
            // "Why this?" section — always visible, subtle
            {
              type: 'Container',
              separator: true,
              spacing: 'Medium',
              items: [
                {
                  type: 'TextBlock',
                  text: `**Why I asked this:** ${prompt.why}`,
                  wrap: true,
                  size: 'Small',
                  color: 'Accent',
                  isSubtle: true,
                  spacing: 'Small',
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

// ─── Send card to Teams conversation ─────────────────────────────────────────

async function sendCardToTeams(conversationId, card, graphToken) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${graphToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(card),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph send failed (${res.status}): ${err}`);
  }
  return await res.json();
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow service-role calls (no user session) when user_email is provided in payload
    const payload = await req.json().catch(() => ({}));
    if (!user && !payload.user_email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { prompt, user_email } = payload;

    // Accept service-role calls (no user session) when user_email is explicit
    const targetEmail = user_email || user?.email;

    if (!targetEmail) {
      return Response.json({ error: 'user_email required for service-role calls' }, { status: 400 });
    }

    if (!prompt) {
      return Response.json({ error: 'Missing required field: prompt' }, { status: 400 });
    }

    // Build the adaptive card
    const adaptiveCard = buildAdaptiveCard(prompt);

    // Look up the manager's Teams conversation ID
    const tonePrefs = await base44.asServiceRole.entities.TonePreference.filter(
      { user_email: targetEmail }, '-created_date', 1
    );
    const teamsConversationId = tonePrefs[0]?.teams_conversation_id || null;

    let teamsDelivery = { attempted: false, success: false, reason: null };

    if (teamsConversationId) {
      try {
        const graphToken = await getGraphToken();
        const result = await sendCardToTeams(teamsConversationId, adaptiveCard, graphToken);
        teamsDelivery = { attempted: true, success: true, message_id: result.id };
      } catch (teamsErr) {
        teamsDelivery = { attempted: true, success: false, reason: teamsErr.message };
        console.error('[sendTeamsAdaptiveCard] Teams delivery failed, falling back to notification:', teamsErr.message);
      }
    } else {
      teamsDelivery = { attempted: false, success: false, reason: 'No teams_conversation_id on TonePreference — manager has not connected Teams' };
    }

    // Fallback: always create an in-app notification so the prompt is never lost
    if (!teamsDelivery.success) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: targetEmail,
        type: 'atreus_checkin',
        title: prompt.title,
        message: `${prompt.body}\n\n_Why I asked this: ${prompt.why}_`,
        scheduled_for: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        status: 'sent',
        priority: 'medium',
        related_entity_type: 'atreus_prompt',
        action_url: '/my-leadership',
      });
    }

    return Response.json({
      success: true,
      card_built: true,
      teams_delivery: teamsDelivery,
      fallback_notification_created: !teamsDelivery.success,
      tone_applied: prompt.tone_mode || 'warm_candid',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});