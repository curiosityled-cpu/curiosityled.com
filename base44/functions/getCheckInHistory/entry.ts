/**
 * getCheckInHistory — returns daily check-in history for the calling user
 * plus their direct reports.
 *
 * DailyCheckIn RLS is owner-only, so a manager cannot fetch team members'
 * check-ins through the client SDK. This function runs as the service role,
 * resolves the caller's direct reports (User.data.manager_email match +
 * subordinate_emails), fetches each person's recent DailyCheckIn records, and
 * returns them merged and sorted with owner names for display.
 *
 * No request body required — identity comes from auth.me().
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceBase44 = base44.asServiceRole;
    const userEmail = user.email;
    const myName =
      user?.data?.display_name || user?.full_name || userEmail;

    // ── Resolve direct reports ──────────────────────────────────────────────
    const teamMembers = [];
    const seenEmails = new Set([userEmail.toLowerCase()]);

    try {
      const allUsers = await serviceBase44.entities.User.list(null, 500);
      for (const u of allUsers || []) {
        const mgr =
          u?.data?.manager_email || u?.manager_email || '';
        if (
          mgr &&
          mgr.toLowerCase() === userEmail.toLowerCase() &&
          u.email &&
          u.email.toLowerCase() !== userEmail.toLowerCase()
        ) {
          if (!seenEmails.has(u.email.toLowerCase())) {
            seenEmails.add(u.email.toLowerCase());
            teamMembers.push({
              email: u.email,
              name:
                u?.data?.display_name || u?.full_name || u.email,
            });
          }
        }
      }
    } catch (e) {
      console.warn('[getCheckInHistory] team resolve failed:', e.message);
    }

    // Include subordinate_emails if present on the user profile
    const subEmails =
      user?.data?.subordinate_emails || user?.subordinate_emails || [];
    for (const se of subEmails) {
      if (se && !seenEmails.has(se.toLowerCase())) {
        seenEmails.add(se.toLowerCase());
        teamMembers.push({ email: se, name: se });
      }
    }

    // ── Fetch check-ins per email ────────────────────────────────────────────
    const nameByEmail = new Map();
    nameByEmail.set(userEmail.toLowerCase(), myName);
    for (const t of teamMembers) nameByEmail.set(t.email.toLowerCase(), t.name);

    const emails = [userEmail, ...teamMembers.map((t) => t.email)];
    const fetches = emails.map((em) =>
      serviceBase44.entities.DailyCheckIn.filter(
        { user_email: em },
        '-check_in_date',
        60
      )
        .then((rows) =>
          (rows || []).map((r) => ({
            ...r,
            owner_name: nameByEmail.get(em.toLowerCase()) || em,
            owner_email: em,
          }))
        )
        .catch(() => [])
    );
    const results = await Promise.all(fetches);
    const all = results
      .flat()
      .sort(
        (a, b) =>
          new Date(b.check_in_date || b.created_date) -
          new Date(a.check_in_date || a.created_date)
      );

    return Response.json({
      check_ins: all,
      team_members: teamMembers,
      is_manager: teamMembers.length > 0,
    });
  } catch (error) {
    console.error('[getCheckInHistory] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});