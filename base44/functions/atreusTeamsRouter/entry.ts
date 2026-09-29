/**
 * atreusTeamsRouter — Conversational State Machine for Microsoft Teams
 *
 * Receives messages from Microsoft Teams bot webhooks and routes them through
 * a turn-by-turn conversational state machine. Supports multi-step flows
 * (morning/evening check-in, Big 3, weekly reflection, and future Groups 2–6)
 * with persistent state between turns.
 *
 * Teams Bot Setup (Azure):
 *   1. Register a bot in Azure Bot Framework
 *   2. Set the messaging endpoint to this function's URL
 *   3. Store TEAMS_BOT_APP_ID in secrets (TEAMS_BOT_APP_PASSWORD in Azure)
 *
 * Interaction model:
 *   - Freeform message → state machine tries to match a flow trigger or
 *     parse as active-flow step input; falls back to orchestrator if no match
 *   - Adaptive card submit with action: 'flow_start' → starts a flow
 *   - Adaptive card submit with action: 'flow_step' → advances the current step
 *   - Adaptive card submit with action: 'flow_cancel' → abandons active flow
 *   - Adaptive card submit with action: 'menu' → shows the flow menu
 *   - Adaptive card submit with action: 'view_goals' → shows goals summary
 *   - Legacy actions (check_in_morning, check_in_evening) → mapped to flow_start
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { processTurn, renderMenuCard, getAllFlows } from '../../shared/conversationStateMachine.ts';

// ── Inline lightweight orchestrator (freeform fallback) ───────────────────
// atreusOrchestrator requires auth.me() which doesn't work in service-role
// cross-function calls. This helper fetches trends + memory directly.

async function _buildTeamsOrchestratorResponse(serviceBase44, userEmail, messageText = '') {
  if (!userEmail) {
    return { opening_message: "I'm here. What's on your mind?", suggested_actions: [] };
  }
  try {
    const [trends, memory, tonePrefs] = await Promise.all([
      serviceBase44.entities.ManagerTrends.filter({ user_email: userEmail }, '-last_trend_computed_at', 1).catch(() => []),
      serviceBase44.entities.ManagerMemory.filter({ user_email: userEmail }, '-last_synthesized_at', 1).catch(() => []),
      serviceBase44.entities.TonePreference.filter({ user_email: userEmail }, null, 1).catch(() => []),
    ]);
    const trend = trends[0] || null;
    const tone = tonePrefs[0]?.tone_mode || 'warm_candid';

    let opening_message = "I'm here. What's on your mind?";
    const suggested_actions = [];

    if (trend?.energy_trend === 'declining') {
      opening_message = tone === 'gentle_observant'
        ? "I've noticed energy has been trending lower lately. How are you doing?"
        : 'Energy has been declining over the past couple of weeks. What\'s been driving that?';
      suggested_actions.push({ label: 'Explore energy pattern', prompt: 'Help me understand why my energy has been declining.' });
    } else if (trend?.overload_pattern_strength >= 60) {
      opening_message = 'An overload pattern is building. Want to look at it together?';
      suggested_actions.push({ label: 'Explore overload pattern', prompt: "Let's explore the overload pattern I've been experiencing." });
    } else if (messageText) {
      opening_message = `You said: "${messageText.slice(0, 100)}". Let me think about that with you.`;
    }

    // Suggest flows from the state machine
    for (const flow of getAllFlows().slice(0, 2)) {
      suggested_actions.push({ label: `${flow.trigger_icon} ${flow.trigger_label}`, prompt: flow.trigger_keywords[0] });
    }

    return { opening_message, suggested_actions };
  } catch {
    return { opening_message: "I'm here. What's on your mind?", suggested_actions: [] };
  }
}

function buildAtreusResponseCard(message, suggestedActions = []) {
  const card = {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      { type: 'TextBlock', text: '🧠 Atreus', weight: 'Bolder', color: 'Accent' },
      { type: 'TextBlock', text: message, wrap: true },
    ],
    actions: [],
  };

  suggestedActions.slice(0, 3).forEach(action => {
    card.actions.push({
      type: 'Action.Submit',
      title: action.label,
      data: { action: 'ask_atreus', prompt: action.prompt || action.label },
    });
  });

  card.actions.push({
    type: 'Action.ShowCard',
    title: 'Reply to Atreus',
    card: {
      type: 'AdaptiveCard',
      body: [
        { type: 'Input.Text', id: 'user_message', placeholder: "What's on your mind?", isMultiline: true },
      ],
      actions: [
        { type: 'Action.Submit', title: 'Send', data: { action: 'ask_atreus' } },
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
      { type: 'TextBlock', text: '🎯 Your Active Goals', weight: 'Bolder', size: 'Medium' },
      ...activeGoals.map(g => ({
        type: 'ColumnSet',
        columns: [
          { type: 'Column', width: 'stretch', items: [{ type: 'TextBlock', text: g.title, wrap: true }] },
          { type: 'Column', width: 'auto', items: [{ type: 'TextBlock', text: `${g.progress || 0}%`, color: g.progress >= 70 ? 'Good' : 'Warning' }] },
        ],
      })),
    ],
    actions: [
      { type: 'Action.Submit', title: 'Back to Menu', data: { action: 'menu' } },
    ],
  };
}

// ── Teams JWT Validation ───────────────────────────────────────────────────
// Verifies the Bot Framework JWT in the Authorization header against the
// published JWKS. Fails closed if TEAMS_BOT_APP_ID is not configured.

const BOT_OPENID_CONFIG_URL = 'https://login.botframework.com/v1/.well-known/openidconfiguration';

let _openIdConfig = null;
let _openIdConfigExpiry = 0;
let _jwks = null;
let _jwksExpiry = 0;

async function _fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.json();
}

function _base64UrlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function _decodeJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(_base64UrlDecode(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(_base64UrlDecode(parts[1])));
    return { header, payload, signature: _base64UrlDecode(parts[2]), signingInput: parts[0] + '.' + parts[1] };
  } catch {
    return null;
  }
}

async function validateTeamsRequest(req) {
  const appId = Deno.env.get('TEAMS_BOT_APP_ID');
  if (!appId) {
    console.error('atreusTeamsRouter: TEAMS_BOT_APP_ID not configured — rejecting request');
    return false;
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  if (!token) return false;

  const decoded = _decodeJwt(token);
  if (!decoded) return false;
  const { header, payload, signature, signingInput } = decoded;

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && nowSec >= payload.exp) return false;
  if (payload.nbf && nowSec < payload.nbf) return false;
  if (payload.aud !== appId) return false;

  try {
    const now = Date.now();
    if (!_openIdConfig || now >= _openIdConfigExpiry) {
      _openIdConfig = await _fetchJson(BOT_OPENID_CONFIG_URL);
      _openIdConfigExpiry = now + 24 * 60 * 60 * 1000;
    }
    if (payload.iss !== _openIdConfig.issuer) return false;

    if (!_jwks || now >= _jwksExpiry) {
      _jwks = await _fetchJson(_openIdConfig.jwks_uri);
      _jwksExpiry = now + 24 * 60 * 60 * 1000;
    }

    const key = _jwks.keys.find(k => k.kid === header.kid);
    if (!key) return false;

    const cryptoKey = await crypto.subtle.importKey(
      'jwk', key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['verify']
    );
    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', cryptoKey, signature,
      new TextEncoder().encode(signingInput)
    );
  } catch (e) {
    console.error('atreusTeamsRouter: JWT validation error:', e.message);
    return false;
  }
}

// ── Legacy action mapping (old adaptive cards) ────────────────────────────

const LEGACY_ACTION_MAP: Record<string, string> = {
  check_in_morning: 'morning_checkin',
  check_in_evening: 'evening_checkin',
};

// ── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    const isValid = await validateTeamsRequest(req, body);
    if (!isValid) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const serviceBase44 = base44.asServiceRole;

    // Resolve user identity from Teams activity
    const teamsUserEmail = body?.from?.email || body?.from?.aadObjectId;
    const conversationId = body?.conversation?.id || '';

    if (!teamsUserEmail) {
      return Response.json({
        type: 'message',
        text: 'Unable to verify your identity. No Teams identity provided.'
      });
    }

    const matchedUsers = await serviceBase44.entities.User.filter({
      email: String(teamsUserEmail).toLowerCase()
    }).catch(() => []);
    if (matchedUsers.length === 0) {
      return Response.json({
        type: 'message',
        text: 'Unable to verify your identity. Please ensure your Teams account email matches your registered app email.'
      });
    }

    const userEmail = String(teamsUserEmail).toLowerCase();
    const activityType = body?.type;
    const action = body?.value?.action;
    const messageText = body?.text || body?.value?.user_message || '';

    // Helper to wrap a card in a Teams message response
    const cardResponse = (card: any) => Response.json({
      type: 'message',
      attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }],
    });

    const textResponse = (text: string) => Response.json({ type: 'message', text });

    // ── Freeform message (no action) ───────────────────────────────────────
    if (activityType === 'message' && !action) {
      const turnResponse = await processTurn(
        serviceBase44, userEmail, 'teams', conversationId,
        { type: 'freeform_text', text: messageText }
      );

      if (turnResponse) {
        return cardResponse(turnResponse.card);
      }

      // No flow matched — fall back to orchestrator
      try {
        const orchResponse = await _buildTeamsOrchestratorResponse(serviceBase44, userEmail, messageText);
        const card = buildAtreusResponseCard(
          orchResponse.opening_message || "I'm here. What's on your mind?",
          orchResponse.suggested_actions || []
        );
        return cardResponse(card);
      } catch {
        return textResponse("Atreus is here. Ask me anything about your leadership, check-ins, or goals.");
      }
    }

    // ── Adaptive card submit ───────────────────────────────────────────────
    if (activityType === 'invoke' || action) {
      const activeAction = action || body?.value?.action;

      // View goals (non-flow action)
      if (activeAction === 'view_goals') {
        try {
          const goals = await serviceBase44.entities.Goal.filter(
            { created_by: userEmail, status: 'active' }, '-updated_date', 10
          );
          return cardResponse(buildGoalsSummaryCard(goals));
        } catch {
          return textResponse('Could not load your goals right now.');
        }
      }

      // Ask Atreus (freeform orchestrator)
      if (activeAction === 'ask_atreus') {
        const prompt = body?.value?.prompt || body?.value?.user_message || messageText;
        try {
          const orchResponse = await _buildTeamsOrchestratorResponse(serviceBase44, userEmail, prompt);
          const card = buildAtreusResponseCard(
            orchResponse.opening_message || "What's on your mind?",
            orchResponse.suggested_actions || []
          );
          return cardResponse(card);
        } catch {
          return textResponse('Atreus encountered an issue. Please try again.');
        }
      }

      // Map legacy actions to flow_start
      let flowId = body?.value?.flow_id;
      let inputType = activeAction;
      if (!flowId && LEGACY_ACTION_MAP[activeAction]) {
        flowId = LEGACY_ACTION_MAP[activeAction];
        inputType = 'flow_start';
      }

      // Flow start
      if (inputType === 'flow_start' || activeAction === 'flow_start') {
        const targetFlowId = flowId || body?.value?.flow_id;
        if (!targetFlowId) {
          return cardResponse(renderMenuCard(getAllFlows(), [
            { type: 'Action.Submit', title: '🎯 View My Goals', data: { action: 'view_goals' } },
            { type: 'Action.OpenUrl', title: '🔗 Open Atreus Platform', url: 'https://app.base44.com/today' },
          ]));
        }
        const turnResponse = await processTurn(
          serviceBase44, userEmail, 'teams', conversationId,
          { type: 'flow_start', flow_id: targetFlowId }
        );
        if (turnResponse) return cardResponse(turnResponse.card);
        return textResponse('Could not start that flow.');
      }

      // Flow step submit
      if (activeAction === 'flow_step') {
        const turnResponse = await processTurn(
          serviceBase44, userEmail, 'teams', conversationId,
          { type: 'step_submit', step_id: body?.value?.step_id, value: body?.value?.step_value }
        );
        if (turnResponse) return cardResponse(turnResponse.card);
        return textResponse('Something went wrong with that step.');
      }

      // Flow cancel
      if (activeAction === 'flow_cancel') {
        const turnResponse = await processTurn(
          serviceBase44, userEmail, 'teams', conversationId,
          { type: 'flow_cancel' }
        );
        if (turnResponse) return cardResponse(turnResponse.card);
        return textResponse('Flow cancelled.');
      }

      // Menu
      if (activeAction === 'menu') {
        const turnResponse = await processTurn(
          serviceBase44, userEmail, 'teams', conversationId,
          { type: 'menu' }
        );
        if (turnResponse) return cardResponse(turnResponse.card);
      }
    }

    // ── Default: show menu ────────────────────────────────────────────────
    return cardResponse(renderMenuCard(getAllFlows(), [
      { type: 'Action.Submit', title: '🎯 View My Goals', data: { action: 'view_goals' } },
      { type: 'Action.OpenUrl', title: '🔗 Open Atreus Platform', url: 'https://app.base44.com/today' },
    ]));

  } catch (error) {
    console.error('atreusTeamsRouter error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});