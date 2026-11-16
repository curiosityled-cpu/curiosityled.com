import {
  computeTenantAllowanceUsage,
  MANAGER_BLOCK_SIZE,
  PARTICIPANT_BLOCK_SIZE,
} from './tenantAllowance.ts';

/**
 * Capacity enforcement for the only three ways a person enters a tenant: an
 * invitation, a manually created user, and a frontline roster import.
 *
 * Nothing else consults the allowance. Sign-in, check-ins, reviews, goals,
 * exports and reports never call this module — a tenant at its limit must be
 * able to keep working the whole manager loop.
 */

export type CapacityPool = 'manager' | 'participant';

const asRows = (value: any) => (Array.isArray(value) ? value : value?.items || []);

/**
 * Roles created at Team Leader (User Level 2) or above are charged to the
 * manager allowance, because these are the roles through which people manage
 * others. Everyone else is charged to the participant allowance. Actual usage
 * always comes from the counting rule in tenantAllowance.ts (a manager is
 * whoever has someone reporting to them); this only decides which pool an
 * *addition* is charged to before any reporting line exists.
 */
const MANAGING_ROLES = [
  'User Level 2',
  'User Level 3',
  'Executive',
  'Admin Level 1',
  'Admin Level 2',
  'Super Administrator',
];

export function poolForRole(appRole: string): CapacityPool {
  return MANAGING_ROLES.includes(appRole) ? 'manager' : 'participant';
}

/** Load one tenant's client record, its users and its frontline roster. */
export async function loadCapacityContext(base44: any, clientId: string | null) {
  if (!clientId) return null;

  const [clientRows, userRows, rosterRows] = await Promise.all([
    base44.asServiceRole.entities.Client.filter({ id: clientId }),
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.ICRoster.filter({ client_id: clientId }),
  ]);

  const client = asRows(clientRows)[0];
  if (!client) return null;

  const users = asRows(userRows).filter(
    (u: any) => (u?.data?.client_id || u?.client_id) === clientId
  );

  return { client, users, roster: asRows(rosterRows) };
}

function refusalMessage(client: any, pool: CapacityPool, position: any, count: number, over: number) {
  const poolLabel = pool === 'manager' ? 'managers' : 'participants';
  const blockSize = pool === 'manager' ? MANAGER_BLOCK_SIZE : PARTICIPANT_BLOCK_SIZE;
  const blockLabel = pool === 'manager' ? 'manager' : 'participant';
  const after = position.used + count;
  const org = client?.name || 'This organization';

  return `${org} allows ${position.allowed} ${poolLabel} and ${position.used} are in use. This add would make ${after}, ${over} over the limit. Ask your Curiosity Led account team for a ${blockLabel} block (+${blockSize} ${poolLabel}), then retry.`;
}

/**
 * Decide whether an add may proceed.
 *
 * - No allowance set (legacy or unconfirmed package): never refuse, report the
 *   position for the record.
 * - Under the allowance: allow.
 * - Over, enforcement "warn": allow, and return `warning` so the caller logs it.
 * - Over, enforcement "block": refuse with the message the screen shows.
 */
export function evaluateCapacityAdd({
  client,
  users,
  roster,
  pool,
  count = 1,
}: {
  client: any;
  users: any[];
  roster: any[];
  pool: CapacityPool;
  count?: number;
}) {
  const usage = computeTenantAllowanceUsage(client, users, roster);
  const position = pool === 'manager' ? usage.managers : usage.participants;
  const mode = client?.enforcement_mode === 'block' ? 'block' : 'warn';

  if (!position.allowance_set) {
    return { allowed: true, mode: 'unset', position, usage, message: null, warning: null };
  }

  const over = position.used + count - position.allowed;
  if (over <= 0) {
    return { allowed: true, mode, position, usage, message: null, warning: null };
  }

  const message = refusalMessage(client, pool, position, count, over);

  if (mode === 'block') {
    return { allowed: false, mode, position, usage, message, warning: null };
  }

  return { allowed: true, mode, position, usage, message, warning: message };
}

/**
 * Record an over-allowance add so warn mode can be reviewed before a tenant is
 * moved to block. A failed log must never block the add itself.
 */
export async function logCapacityOverage(
  base44: any,
  {
    clientId,
    pool,
    count,
    actorEmail,
    message,
    source,
    position,
  }: {
    clientId: string;
    pool: CapacityPool;
    count: number;
    actorEmail?: string | null;
    message: string;
    source: 'invite' | 'bulk_invite' | 'manual_create' | 'roster_import';
    position: any;
  }
) {
  try {
    await base44.asServiceRole.entities.CapacityOverageLog.create({
      client_id: clientId,
      pool,
      enforcement_mode: 'warn',
      source,
      attempted_count: count,
      used_before: position?.used ?? null,
      allowed: position?.allowed ?? null,
      over: Math.max(0, (position?.used ?? 0) + count - (position?.allowed ?? 0)),
      actor_email: actorEmail || null,
      message,
    });
  } catch (error) {
    console.error('Could not log capacity overage:', error?.message || error);
  }
}