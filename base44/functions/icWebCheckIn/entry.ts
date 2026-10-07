/**
 * icWebCheckIn — token-gated web fallback for non-user frontline ICs who cannot
 * (or prefer not to) complete their daily check-in in Microsoft Teams.
 *
 * Public endpoint — no app login required. The IC's unguessable web_access_token
 * (stored on ICRoster) is the credential: it is rejected if missing/blank and
 * matched exactly. Only the fields needed to render and save the form are
 * returned.
 *
 * POST body: { action: "get_context" | "submit", token, answers?, check_in_type?, date? }
 *   - get_context → { ic_name, team, check_in_type, measures, custom_questions }
 *   - submit     → { success, record_id, check_in_date }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  getMeasuresForClient,
  getActiveCustomQuestions,
  saveICCheckIn,
} from '../../shared/icCheckIn.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const serviceBase44 = base44.asServiceRole;
    const payload = await req.json().catch(() => ({}));
    const { action, token, answers, check_in_type, date } = payload;

    if (!token || typeof token !== 'string' || token.trim() === '') {
      return Response.json({ error: 'Missing access token' }, { status: 400 });
    }

    // Look up the IC by their web access token (exact match).
    const icRows = await serviceBase44.entities.ICRoster.filter(
      { web_access_token: token.trim(), is_active: true },
      null,
      1
    ).catch(() => []);

    if (!icRows[0]) {
      return Response.json({ error: 'Invalid or expired link' }, { status: 404 });
    }
    const ic = icRows[0];

    // Resolve the client (for the active check-in preset).
    const client = ic.client_id
      ? await serviceBase44.entities.Client.get(ic.client_id).catch(() => null)
      : null;

    const type = check_in_type || 'morning';

    if (action === 'get_context') {
      const measures = getMeasuresForClient(client);
      const customQuestions = await getActiveCustomQuestions(
        serviceBase44,
        ic.client_id,
        '',
        type
      );
      return Response.json({
        ic_name: ic.name,
        team: ic.team || '',
        check_in_type: type,
        measures,
        custom_questions: customQuestions,
      });
    }

    if (action === 'submit') {
      if (!answers || typeof answers !== 'object') {
        return Response.json({ error: 'answers object is required' }, { status: 400 });
      }
      const record = await saveICCheckIn(serviceBase44, ic, answers, type, date);
      return Response.json({
        success: true,
        record_id: record?.id,
        check_in_date: record?.check_in_date || date,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[icWebCheckIn] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}