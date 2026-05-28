/**
 * sendTeamsAdaptiveCard — render prompts as Teams Adaptive Cards and send via Graph API
 * 
 * Converts sendTeamsPrompt output → adaptive card JSON → sends via Microsoft Graph
 * Handles manager response capture through interactive buttons
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function buildAdaptiveCard(prompt, toneMode) {
  const cardJson = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.6",
          body: [
            {
              type: "Container",
              style: "accent",
              body: [
                {
                  type: "ColumnSet",
                  columns: [
                    {
                      width: "stretch",
                      items: [
                        {
                          type: "TextBlock",
                          text: "🎯 Atreus Check-In",
                          weight: "bolder",
                          size: "large",
                          color: "dark"
                        }
                      ]
                    },
                    {
                      width: "auto",
                      items: [
                        {
                          type: "TextBlock",
                          text: getToneEmoji(toneMode),
                          size: "extraLarge",
                          horizontalAlignment: "right"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              type: "Container",
              body: [
                {
                  type: "TextBlock",
                  text: prompt.title,
                  weight: "bolder",
                  size: "medium",
                  wrap: true
                },
                {
                  type: "TextBlock",
                  text: prompt.body,
                  wrap: true,
                  spacing: "medium",
                  color: "dark"
                }
              ]
            },
            {
              type: "Container",
              body: [
                {
                  type: "ActionSet",
                  actions: (prompt.options || []).map(opt => ({
                    type: "Action.OpenUrl",
                    title: opt.label,
                    url: `https://atreus.curiosityled.com/respond?pulse_id=${prompt.pulse_id}&option=${opt.value}`,
                    style: "positive"
                  }))
                },
                {
                  type: "TextBlock",
                  text: prompt.optional_text || "",
                  size: "small",
                  color: "accent",
                  spacing: "medium",
                  wrap: true
                }
              ]
            },
            {
              type: "Container",
              separator: true,
              body: [
                {
                  type: "TextBlock",
                  text: `Why: ${prompt.why}`,
                  size: "small",
                  color: "medium",
                  isSubtle: true,
                  wrap: true
                }
              ]
            }
          ]
        }
      }
    ]
  };

  return cardJson;
}

function getToneEmoji(toneMode) {
  const emojis = {
    gentle_observant: "🌿",
    warm_candid: "💙",
    close_friend_candid: "🤝",
    respectfully_confronting: "💪"
  };
  return emojis[toneMode] || "💭";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { prompt, user_email, teams_channel_id } = payload;

    if (!prompt || !user_email || !teams_channel_id) {
      return Response.json({
        error: 'Missing required fields: prompt, user_email, teams_channel_id'
      }, { status: 400 });
    }

    // Build adaptive card
    const adaptiveCard = buildAdaptiveCard(prompt, prompt.tone_mode);

    // TODO: Integrate with Microsoft Graph API to send via Teams
    // Requires: teams_channel_id, Graph API token, endpoint
    // For MVP: return card structure for review

    return Response.json({
      success: true,
      card: adaptiveCard,
      message: "Adaptive card structure ready for Teams delivery",
      tone_applied: prompt.tone_mode,
      tone_emoji: getToneEmoji(prompt.tone_mode)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});