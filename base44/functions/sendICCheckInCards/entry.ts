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

    const eligible = (icRows || []).filter((ic: any) => !!ic.teams_conversation_id);
    const skipped = (icRows || []).filter((ic: any) => !ic.teams_conversation_id);

    let graphToken: string | null = null;
    const results: any[] = [];

    for (const ic of eligible) {
      try {
        if (!graphToken) graphToken = await getGraphToken();
        const card = buildICCheckInCard(ic, measures, customQuestions, checkInType);
        await sendCardToTeams(ic.teams_conversation_id, card, graphToken);
        results.push({ ic_id: ic.id, email: ic.email, status: 'sent' });
      } catch (e) {
        results.push({ ic_id: ic.id, email: ic.email, status: 'failed', error: e.message });
      }
    }

    return Response.json({
      success: true,
      check_in_type: checkInType,
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped_no_conversation: skipped.length,
      details: results,
    });
  } catch (error) {
    console.error('[sendICCheckInCards] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});