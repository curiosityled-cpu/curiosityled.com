/**
 * sendAutomatedICCheckIns — scheduled function that sends daily check-in
 * cards to frontline ICs for every client that has IC check-in automation
 * enabled in Client.settings.check_in_config.ic_automation_enabled.
 *
 * Called by the "IC Daily Check-In Automation" workflow (Mon–Fri, 9am ET).
 * Uses the INTERNAL_FUNCTION_SECRET for auth (automation-to-automation).
 *
 * For each enabled client, reuses the same delivery logic as sendICCheckInCards:
 * Teams Adaptive Card + email with web fallback link.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { authorizeScheduledTask } from '../../shared/scheduledTaskAuth.ts';
import {
  getMeasuresForClient,
  getActiveCustomQuestions,
  buildICCheckInCard,
  getGraphToken,
  sendCardToTeams,
} from '../../shared/icCheckIn.ts';

const APP_URL = 'https://curiosityled.ai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Security: require internal secret or admin credentials
    const auth = await authorizeScheduledTask(req, base44);
    if (!auth.authorized) return auth.response;

    const serviceBase44 = base44.asServiceRole;

    // Fetch all clients
    const allClients = await serviceBase44.entities.Client.list('-created_date', 500).catch(() => []);

    // Filter to clients with IC automation enabled
    const enabledClients = (allClients || []).filter((c: any) =>
      c?.settings?.check_in_config?.ic_automation_enabled === true
    );

    const summary: any[] = [];
    let totalSent = 0;
    let totalEmailed = 0;
    let totalFailed = 0;

    for (const client of enabledClients) {
      const clientId = client.id;
      const checkInType = client?.settings?.check_in_config?.ic_automation_type || 'morning';

      try {
        const icRows = await serviceBase44.entities.ICRoster.filter({
          client_id: clientId,
          is_active: true,
          check_in_enabled: true,
        }).catch(() => []);

        const measures = getMeasuresForClient(client);
        // "both" sends a morning card and an evening card to each IC.
        const types = checkInType === 'both' ? ['morning', 'evening'] : [checkInType];

        let graphToken: string | null = null;
        let teamsSent = 0;
        let emailSent = 0;
        let failed = 0;

        for (const type of types) {
          const customQuestions = await getActiveCustomQuestions(serviceBase44, clientId, '', type);

          for (const ic of icRows || []) {
            const channel = ic.preferred_channel || 'both';
            const hasTeams = !!ic.teams_conversation_id;
            const wantsTeams = (channel === 'teams' || channel === 'both') && hasTeams;
            const wantsEmail = channel === 'email' || channel === 'both' || !hasTeams;

            if (wantsTeams) {
              try {
                if (!graphToken) graphToken = await getGraphToken();
                const card = buildICCheckInCard(ic, measures, customQuestions, type);
                await sendCardToTeams(ic.teams_conversation_id, card, graphToken);
                teamsSent++;
              } catch {
                failed++;
              }
            }

            if (wantsEmail && ic.email && ic.web_access_token) {
              const link = `${APP_URL}/ic-checkin?token=${ic.web_access_token}`;
              try {
                await serviceBase44.integrations.Core.SendEmail({
                  to: ic.email,
                  subject: `Your ${type === 'evening' ? 'evening' : 'morning'} check-in`,
                  text:
                    `Hi ${ic.name?.split(' ')[0] || ''},\n\n` +
                    `Here is your ${type} check-in. Complete it here (takes about a minute):\n${link}\n\n` +
                    `— Curiosity Led`,
                });
                emailSent++;
              } catch {
                failed++;
              }
            }
          }
        }

        totalSent += teamsSent;
        totalEmailed += emailSent;
        totalFailed += failed;
        summary.push({ client_id: clientId, client_name: client.name, teams_sent: teamsSent, emailed: emailSent, failed });
      } catch (e: any) {
        summary.push({ client_id: clientId, client_name: client.name, error: e.message });
      }
    }

    return Response.json({
      success: true,
      clients_processed: enabledClients.length,
      teams_sent: totalSent,
      emailed: totalEmailed,
      failed: totalFailed,
      details: summary,
    });
  } catch (error) {
    console.error('[sendAutomatedICCheckIns] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});