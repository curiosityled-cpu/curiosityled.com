/**
 * sendICCheckInCards — proactively sends a daily check-in Adaptive Card to each
 * active frontline IC (non-user) on the roster who has a Teams conversation ID.
 *
 * Invoked by a scheduled workflow (internal call) or an admin via the
 * Frontline ICs tab (authenticated). Sends the org's preset measures plus any
 * applicable custom KPI questions. ICs without a conversation ID are skipped
 * (they must message the bot once to establish a conversation).
 *
 * POST body: { client_id?, check_in_type? }  (client_id required for internal calls)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isInternalCall } from '../../shared/urlValidation.ts';
import {
  getMeasuresForClient,
  getActiveCustomQuestions,
  buildICCheckInCard,
  getGraphToken,
  sendCardToTeams,
} from '../../shared/icCheckIn.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const internalCall = isInternalCall(req);

    if (!user && !internalCall) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const checkInType = payload.check_in_type || 'morning';

    // Resolve the target client
    let clientId = payload.client_id;
    if (!clientId && user) {
      clientId = user?.data?.client_id || user?.client_id;
    }
    if (!clientId) {
      return Response.json({ error: 'client_id is required' }, { status: 400 });
    }

    const serviceBase44 = base44.asServiceRole;

    // Fetch the client (for preset) and the active IC roster in parallel
    const [client, icRows] = await Promise.all([
      serviceBase44.entities.Client.get(clientId).catch(() => null),
      serviceBase44.entities.ICRoster.filter({
        client_id: clientId,
        is_active: true,
        check_in_enabled: true,
      }).catch(() => []),
    ]);

    const measures = getMeasuresForClient(client);
    const customQuestions = await getActiveCustomQuestions(serviceBase44, clientId, '', checkInType);

    const APP_URL = 'https://curiosityled.ai';
    const all = icRows || [];
    const results: any[] = [];
    let graphToken: string | null = null;

    for (const ic of all) {
      const channel = ic.preferred_channel || 'both';
      const hasTeams = !!ic.teams_conversation_id;
      const wantsTeams = (channel === 'teams' || channel === 'both') && hasTeams;
      const wantsEmail = channel === 'email' || channel === 'both' || !hasTeams;
      const entry: any = { ic_id: ic.id, email: ic.email, teams: 'skipped', email: 'skipped' };

      // Teams Adaptive Card
      if (wantsTeams) {
        try {
          if (!graphToken) graphToken = await getGraphToken();
          const card = buildICCheckInCard(ic, measures, customQuestions, checkInType);
          await sendCardToTeams(ic.teams_conversation_id, card, graphToken);
          entry.teams = 'sent';
        } catch (e: any) {
          entry.teams = 'failed';
          entry.teams_error = e.message;
        }
      }

      // Email with the web fallback link (also sent when no Teams conversation yet)
      if (wantsEmail && ic.email && ic.web_access_token) {
        const link = `${APP_URL}/ic-checkin?token=${ic.web_access_token}`;
        try {
          await serviceBase44.integrations.Core.SendEmail({
            to: ic.email,
            subject: `Your ${checkInType === 'evening' ? 'evening' : 'daily'} check-in`,
            text:
              `Hi ${ic.name?.split(' ')[0] || ''},\n\n` +
              `Here is your ${checkInType} check-in. Complete it here (takes about a minute):\n${link}\n\n` +
              `— Curiosity Led`,
          });
          entry.email = 'sent';
        } catch (e: any) {
          entry.email = 'failed';
          entry.email_error = e.message;
        }
      }

      results.push(entry);
    }

    const teamsSent = results.filter((r) => r.teams === 'sent').length;
    const emailSent = results.filter((r) => r.email === 'sent').length;
    const skippedNoConversation = all.filter((ic) => !ic.teams_conversation_id).length;

    return Response.json({
      success: true,
      check_in_type: checkInType,
      sent: teamsSent,
      emailed: emailSent,
      failed: results.filter((r) => r.teams === 'failed' || r.email === 'failed').length,
      skipped_no_conversation: skippedNoConversation,
      details: results,
    });
  } catch (error) {
    console.error('[sendICCheckInCards] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});