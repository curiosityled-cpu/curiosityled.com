import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import {
  canActOnClient,
  readAppRole,
  resolveTenantContext,
  tenantBlockedResponse,
} from '../../shared/tenantContext.ts';
import { computeTenantAllowanceUsage } from '../../shared/tenantAllowance.ts';

/**
 * One tenant's capacity position: managers used and allowed, participants used
 * and allowed, remaining headroom, and — when over — the reason, with the rule
 * that produced the numbers. The rule itself lives in shared/tenantAllowance.ts
 * so no screen or function restates it.
 */

const READER_ROLES = [
  'Platform Admin',
  'Super Administrator',
  'Partner Business Administrator',
  'Admin Level 1',
  'Admin Level 2',
];

const asRows = (value) => (Array.isArray(value) ? value : value?.items || []);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) {
      return Response.json({ success: false, error: 'Sign in to continue.' }, { status: 401 });
    }
    if (!READER_ROLES.includes(readAppRole(user))) {
      return Response.json({ success: false, error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedClientId = body.clientId || body.client_id || null;

    const tenant = await resolveTenantContext(base44, user, requestedClientId);
    if (tenant.blocked) return tenantBlockedResponse(tenant);

    const clientId = requestedClientId || tenant.client_id;
    if (!clientId || !canActOnClient(tenant, clientId)) {
      return Response.json(
        { success: false, error: 'You can only view capacity for organizations in your portfolio' },
        { status: 403 }
      );
    }

    // The client record is read fresh: capacity fields must never come from a
    // projected or cached copy.
    const clients = asRows(await base44.asServiceRole.entities.Client.filter({ id: clientId }));
    const client = clients[0];
    if (!client) {
      return Response.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    const [usersResult, rosterResult] = await Promise.allSettled([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.ICRoster.filter({ client_id: clientId }),
    ]);

    const allUsers = usersResult.status === 'fulfilled' ? asRows(usersResult.value) : [];
    const users = allUsers.filter(
      (u) => (u?.data?.client_id || u?.client_id) === clientId
    );
    const roster = rosterResult.status === 'fulfilled' ? asRows(rosterResult.value) : [];

    const usage = computeTenantAllowanceUsage(client, users, roster);

    return Response.json({ success: true, ...usage });
  } catch (error) {
    console.error('Error getting tenant allowance usage:', error);
    return Response.json(
      { success: false, error: 'Failed to get capacity usage', details: error.message },
      { status: 500 }
    );
  }
});