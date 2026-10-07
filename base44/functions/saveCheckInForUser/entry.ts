/**
 * saveCheckInForUser — creates or updates a DailyCheckIn for a target user,
 * used by the Check-In history "Add" flow to backfill a missed day for oneself
 * or a direct report.
 *
 * DailyCheckIn RLS is owner-only, so a manager cannot create/update a direct
 * report's check-in through the client SDK. This function runs as the service
 * role and authorizes the caller as either:
 *   - the target themselves (target_email === caller.email), or
 *   - the target's manager (User.data.manager_email match, or the target is in
 *     the caller's subordinate_emails).
 *
 * Body: { target_email, check_in_date, check_in_type, scores, notes, custom_answers }
 *   - scores: { energy, confidence, focus, load, growth } (1–5)
 *   - notes:  { energy, confidence, focus, load, growth } (strings)
 *   - custom_answers: { [question_key]: value }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      target_email,
      check_in_date,
      check_in_type,
      scores = {},
      notes = {},
      custom_answers,
    } = body;

    if (!target_email || !check_in_date || !check_in_type) {
      return Response.json(
        { error: 'target_email, check_in_date, and check_in_type are required' },
        { status: 400 }
      );
    }
    if (!['morning', 'evening'].includes(check_in_type)) {
      return Response.json({ error: 'Invalid check_in_type' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const callerEmail = user.email;
    const targetLower = String(target_email).toLowerCase();
    const isSelf = targetLower === callerEmail.toLowerCase();

    // ── Authorize ────────────────────────────────────────────────────────────
    if (!isSelf) {
      let authorized = false;
      const subs =
        (user.data?.subordinate_emails || user.subordinate_emails || []).map(
          (s) => String(s).toLowerCase()
        );
      if (subs.includes(targetLower)) authorized = true;

      if (!authorized) {
        try {
          const allUsers = await base44.asServiceRole.entities.User.list(
            null,
            500
          );
          const target = (allUsers || []).find(
            (u) => String(u.email || '').toLowerCase() === targetLower
          );
          const mgr =
            target?.data?.manager_email || target?.manager_email || '';
          if (mgr && mgr.toLowerCase() === callerEmail.toLowerCase()) {
            authorized = true;
          }
        } catch (e) {
          console.warn('[saveCheckInForUser] manager resolve failed:', e.message);
        }
      }

      if (!authorized) {
        return Response.json(
          { error: 'Not authorized to submit a check-in for this user' },
          { status: 403 }
        );
      }
    }

    // ── Find existing record for this person + date ──────────────────────────
    const serviceBase44 = base44.asServiceRole;
    let existing = null;
    try {
      const rows = await serviceBase44.entities.DailyCheckIn.filter(
        { user_email: target_email, check_in_date },
        null,
        50
      );
      existing = (rows || [])[0];
    } catch (e) {
      console.warn('[saveCheckInForUser] existing lookup failed:', e.message);
    }

    const scorePayload = {
      energy_score: scores.energy,
      energy_note: notes.energy || '',
      confidence_score: scores.confidence,
      confidence_note: notes.confidence || '',
      focus_score: scores.focus,
      focus_note: notes.focus || '',
      load_score: scores.load,
      load_note: notes.load || '',
      growth_score: scores.growth,
      growth_note: notes.growth || '',
    };
    if (custom_answers && Object.keys(custom_answers).length > 0) {
      scorePayload.custom_answers = custom_answers;
    }
    const now = new Date().toISOString();
    if (check_in_type === 'morning') {
      scorePayload.morning_completed = true;
      scorePayload.morning_completed_at = now;
    } else {
      scorePayload.evening_completed = true;
      scorePayload.evening_completed_at = now;
    }

    let record;
    if (existing?.id) {
      record = await serviceBase44.entities.DailyCheckIn.update(
        existing.id,
        scorePayload
      );
    } else {
      record = await serviceBase44.entities.DailyCheckIn.create({
        user_email: target_email,
        check_in_date,
        check_in_type,
        ...scorePayload,
      });
    }

    return Response.json({ success: true, record });
  } catch (error) {
    console.error('[saveCheckInForUser] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});