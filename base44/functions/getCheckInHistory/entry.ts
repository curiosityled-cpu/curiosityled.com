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
import { resolveActiveClient } from '../../shared/tenantContext.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceBase44 = base44.asServiceRole;
    const userEmail = user.email;

    // The caller's organisation is resolved on the server (selected client,
    // else home client), never read from a membership field.
    const tenant = await resolveActiveClient(base44, user);
    const activeClientId = tenant.client_id || null;
    const isPlatformCaller = tenant.is_platform === true;
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
        // The tree is built with the service role, so it must stay inside the
        // caller's resolved organisation: a manager_email that points at another
        // tenant would otherwise pull that tenant's check-ins into this response.
        // With no resolved organisation, only platform administrators may walk
        // the whole tree.
        const memberClient = u.client_id ?? u?.data?.client_id ?? null;
        if (activeClientId ? memberClient !== activeClientId : !isPlatformCaller) continue;
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

    // Frontline Staff are ICRoster records, not users, so their manager link only
    // exists there. Registering them here is what makes their check-ins appear
    // in the check-in page of the manager they report to.
    if (activeClientId) {
      try {
        const rosterRaw: any = await serviceBase44.entities.ICRoster
          .filter({ client_id: activeClientId }, null, 2000)
          .catch(() => []);
        const roster = Array.isArray(rosterRaw) ? rosterRaw : rosterRaw?.items || [];
        for (const r of roster) {
          const staffEmail = String(r?.email || '').toLowerCase();
          const staffManager = String(r?.manager_email || '').toLowerCase();
          if (!staffEmail || !staffManager) continue;
          if (!managerToReports.has(staffManager)) managerToReports.set(staffManager, []);
          managerToReports.get(staffManager).push({
            email: r.email,
            full_name: r.name || r.email,
            data: { manager_email: r.manager_email },
          });
        }
      } catch (e) {
        console.warn('[getCheckInHistory] roster resolve failed:', e.message);
      }
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
        // A subordinate must be a person inside the caller's own organisation
        // tree; otherwise a stale email list pulls another tenant's check-ins in.
        const subUser = userByEmail.get(se.toLowerCase());
        if (!subUser) continue;
        seenEmails.add(se.toLowerCase());
        teamMembers.push({ email: se, name: se });
        // Also traverse down from this subordinate
        queue.push(se.toLowerCase());
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