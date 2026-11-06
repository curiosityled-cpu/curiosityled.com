import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { resolveActiveClient, tenantBlockedResponse } from '../../shared/tenantContext.ts';

/**
 * The roster, tenant-labelled by the server.
 *
 * Three screens drew a list of people and read each person's tenant label from a
 * membership field in the browser. That is the last place a membership field was
 * consulted outside the server, and it is the split Phase 1 exists to remove.
 * This endpoint resolves the active client once, scopes the roster to it, and
 * answers with one normalised `client_id` per person, so a screen has nothing
 * left to derive.
 *
 * The roster is a projection: identity and organisation attributes only. No
 * credential fields, no permission arrays, no `data` blob to disagree with.
 */

const PLATFORM_ADMIN = 'Platform Admin';

const roleOf = (u) => u.app_role ?? u.data?.app_role ?? u.role ?? null;
// The one place allowed to know the field can be missing: normalises the label
// here so it never has to be normalised again.
const clientOf = (u) => u.client_id ?? u.data?.client_id ?? null;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ctx = await resolveActiveClient(base44, user, body?.client_id || null);

    // A member always has a client; oversight and platform principals may have a
    // selection. Anything else is refused rather than guessed at.
    if (!ctx.client_id && !ctx.is_platform) return tenantBlockedResponse(ctx);

    let users = await base44.asServiceRole.entities.User.list('-created_date');

    if (ctx.client_id) {
      users = users.filter((u) => clientOf(u) === ctx.client_id);
    }

    // A client roster is the client's people: platform administrators are not
    // part of it. A platform principal asking without a selection gets everyone,
    // which is the one view where they legitimately appear.
    if (!ctx.is_platform) {
      users = users.filter((u) => roleOf(u) !== PLATFORM_ADMIN);
    }

    const client = ctx.client_id
      ? await base44.asServiceRole.entities.Client.get(ctx.client_id).catch((e) =>
          e.status === 404 ? null : Promise.reject(e)
        )
      : null;

    const roster = users.map((u) => ({
      email: u.email,
      full_name: u.full_name || u.data?.display_name || u.email,
      app_role: roleOf(u),
      department: u.department ?? u.data?.department ?? null,
      manager_email: u.manager_email ?? u.data?.manager_email ?? null,
      current_role: u.current_role ?? u.data?.current_role ?? null,
      client_id: clientOf(u),
      client_name: client?.name ?? null,
    }));

    return Response.json({
      client_id: ctx.client_id || null,
      client_name: client?.name ?? null,
      count: roster.length,
      users: roster,
    });
  } catch (error) {
    console.error('getTeamRoster failed:', error?.message);
    return Response.json({ error: 'Failed to load roster', users: [] }, { status: 500 });
  }
}