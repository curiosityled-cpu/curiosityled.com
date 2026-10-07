/**
 * processICCheckInSubmission — persists a single IC (non-user) check-in
 * submission into DailyCheckIn.
 *
 * Called by the Teams router (internal) when an IC submits an Adaptive Card,
 * or by an admin/manual flow. Accepts the IC roster ID plus the raw card
 * answers (m_<measure> and c_<question_key> keys) and a check-in type.
 *
 * POST body: { ic_id, answers, check_in_type?, date? }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isInternalCall } from '../../shared/urlValidation.ts';
import { saveICCheckIn } from '../../shared/icCheckIn.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const internalCall = isInternalCall(req);

    if (!user && !internalCall) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const { ic_id, answers, check_in_type, date } = payload;

    if (!ic_id) {
      return Response.json({ error: 'ic_id is required' }, { status: 400 });
    }
    if (!answers || typeof answers !== 'object') {
      return Response.json({ error: 'answers object is required' }, { status: 400 });
    }

    const serviceBase44 = base44.asServiceRole;
    const icRows = await serviceBase44.entities.ICRoster.filter({ id: ic_id }, null, 1).catch(() => []);
    if (!icRows[0]) {
      return Response.json({ error: 'IC roster entry not found' }, { status: 404 });
    }
    const ic = icRows[0];

    const record = await saveICCheckIn(serviceBase44, ic, answers, check_in_type || 'morning', date);

    return Response.json({
      success: true,
      record_id: record?.id,
      check_in_date: record?.check_in_date || date,
    });
  } catch (error) {
    console.error('[processICCheckInSubmission] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});