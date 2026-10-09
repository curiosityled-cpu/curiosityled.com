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

    // ── Resolve the full reporting tree (all descendants) ───────────────────
    // Traverse manager_email downward from the current user to collect direct
    // reports AND indirect reports, so "Everyone" shows check-ins from the
    // entire team hierarchy — not just the first level.
    const teamMembers = [];
    const seenEmails = new Set([userEmail.toLowerCase()]);

    // Build a manager → direct-reports lookup from all users
    const managerToReports = new Map();
    const userByEmail = new Map();
    try {
      const allUsers = await serviceBase44.entities.User.list(null, 500);
      for (const u of allUsers || []) {
        if (!u.email) continue;
        userByEmail.set(u.email.toLowerCase(), u);
        const mgr = u?.data?.manager_email || u?.manager_email || '';
        if (mgr) {
          const key = mgr.toLowerCase();
          if (!managerToReports.has(key)) managerToReports.set(key, []);
          managerToReports.get(key).push(u);
        }
      }
    } catch (e) {
      console.warn('[getCheckInHistory] team resolve failed:', e.message);
    }

    // BFS down the reporting tree from the current user
    const queue = [userEmail.toLowerCase()];
    while (queue.length > 0) {
      const currentMgr = queue.shift();
      const reports = managerToReports.get(currentMgr) || [];
      for (const u of reports) {
        const em = u.email.toLowerCase();
        if (em === userEmail.toLowerCase()) continue;
        if (!seenEmails.has(em)) {
          seenEmails.add(em);
          teamMembers.push({
            email: u.email,
            name: u?.data?.display_name || u?.full_name || u.email,
          });
          queue.push(em);
        }
      }
    }

    // Include subordinate_emails if present on the user profile (fallback)
    const subEmails =
      user?.data?.subordinate_emails || user?.subordinate_emails || [];
    for (const se of subEmails) {
      if (se && !seenEmails.has(se.toLowerCase())) {
        seenEmails.add(se.toLowerCase());
        teamMembers.push({ email: se, name: se });
        // Also traverse down from this subordinate
        const subUser = userByEmail.get(se.toLowerCase());
        if (subUser) queue.push(se.toLowerCase());
      }
    }
    // Drain any remaining queue entries from subordinate_emails expansion
    while (queue.length > 0) {
      const currentMgr = queue.shift();
      const reports = managerToReports.get(currentMgr) || [];
      for (const u of reports) {
        const em = u.email.toLowerCase();
        if (em === userEmail.toLowerCase() || seenEmails.has(em)) continue;
        seenEmails.add(em);
        teamMembers.push({
          email: u.email,
          name: u?.data?.display_name || u?.full_name || u.email,
        });
        queue.push(em);
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