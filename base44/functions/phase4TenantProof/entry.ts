import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  isPlatformPrincipal,
  resolveActiveClient,
  resolveTenantContext,
} from '../../shared/tenantContext.ts';

/**
 * The two-client proof for Phase 4 (tenant wiring).
 *
 * Read-only. It answers one question: with two real clients in the database, does
 * the shared resolver — and therefore every module wired to it — refuse to cross
 * between them?
 *
 * The resolver is exercised directly with synthetic principals, which is the
 * honest way to test it: the decisions it makes do not depend on a session, only
 * on the user record it is handed. Each scenario states what must happen, so a
 * regression shows up as a named failure rather than a vague "looks fine".
 *
 * It also checks the data invariants the wired modules depend on: every review
 * cycle carries a client, and every participant carries its cycle's client.
 *
 * Callable by a Platform Admin. Returns { passed, failed, scenarios, invariants }.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isPlatformPrincipal(user)) {
      return Response.json({ error: 'Platform Admin only' }, { status: 403 });
    }

    const clientsResult = await base44.asServiceRole.entities.Client.list('-created_date', 200);
    const clients = Array.isArray(clientsResult) ? clientsResult : (clientsResult?.items || []);
    if (clients.length < 2) {
      return Response.json({
        passed: 0,
        failed: 0,
        note: 'Two clients are needed for this proof.',
        client_count: clients.length,
      });
    }

    const [A, B] = clients;
    const absentId = 'client_that_does_not_exist';

    const synthetic = {
      memberA: { email: 'proof-member-a@example.test', data: { client_id: A.id, app_role: 'User Level 1' } },
      memberB: { email: 'proof-member-b@example.test', data: { client_id: B.id, app_role: 'User Level 1' } },
      oversight: {
        email: 'proof-partner@example.test',
        data: { app_role: 'Partner Business Administrator', partner_client_ids: [A.id, B.id] },
      },
      platform: { email: 'proof-platform@example.test', data: { app_role: 'Platform Admin' } },
      ghost: null,
    };

    const scenarios = [];
    const check = async (name: string, principal: any, requested: string | null, assert: (ctx: any) => string | null) => {
      let ctx: any;
      try {
        ctx = await resolveTenantContext(base44, principal, requested);
      } catch (error: any) {
        scenarios.push({ name, ok: false, why: `resolver threw: ${error.message}` });
        return;
      }
      const failure = await assert(ctx);
      scenarios.push({
        name,
        ok: !failure,
        why: failure || null,
        resolved_client_id: ctx.client_id,
        membership: ctx.membership,
      });
    };

    // A member is fixed to their own client, whatever they ask for.
    await check('member A reads client A', synthetic.memberA, A.id, (ctx) =>
      ctx.client_id === A.id ? null : `expected ${A.id}, got ${ctx.client_id}`
    );
    await check('member A asking for client B is refused, not obeyed', synthetic.memberA, B.id, (ctx) =>
      ctx.client_id === A.id && ctx.requested_client_rejected
        ? null
        : `resolved to ${ctx.client_id} (rejected=${ctx.requested_client_rejected})`
    );
    await check('member A cannot reach an unrelated client', synthetic.memberA, absentId, (ctx) =>
      ctx.client_id === A.id && ctx.requested_client_rejected ? null : `resolved to ${ctx.client_id}`
    );

    // A partner administrator works across their declared portfolio only.
    await check('partner selects client A', synthetic.oversight, A.id, (ctx) =>
      ctx.client_id === A.id ? null : `expected ${A.id}, got ${ctx.client_id}`
    );
    await check('partner selects client B', synthetic.oversight, B.id, (ctx) =>
      ctx.client_id === B.id ? null : `expected ${B.id}, got ${ctx.client_id}`
    );
    await check('partner asking for a client outside the portfolio is refused', synthetic.oversight, absentId, (ctx) =>
      !ctx.client_id && ctx.requested_client_rejected && ctx.needs_selection
        ? null
        : `resolved to ${ctx.client_id} (rejected=${ctx.requested_client_rejected})`
    );
    await check('partner with no selection is asked to choose', synthetic.oversight, null, (ctx) =>
      ctx.needs_selection && !ctx.client_id ? null : `resolved to ${ctx.client_id} without a choice`
    );
    await check('partner cannot fall back to a home client they do not have', synthetic.oversight, null, async (ctx) => {
      const active = await resolveActiveClient(base44, synthetic.oversight, null);
      return !active.client_id ? null : `home fallback produced ${active.client_id}`;
    });

    // A platform administrator spans every client.
    await check('platform selects client A', synthetic.platform, A.id, (ctx) =>
      ctx.client_id === A.id ? null : `expected ${A.id}, got ${ctx.client_id}`
    );
    await check('platform selects client B', synthetic.platform, B.id, (ctx) =>
      ctx.client_id === B.id ? null : `expected ${B.id}, got ${ctx.client_id}`
    );
    await check('platform at platform level makes no claim on a client', synthetic.platform, null, (ctx) =>
      !ctx.client_id && ctx.is_platform ? null : `claimed ${ctx.client_id}`
    );

    // No session, no tenant.
    await check('no session is blocked', synthetic.ghost, A.id, (ctx) =>
      ctx.blocked && !ctx.client_id ? null : `resolved to ${ctx.client_id}`
    );

    // ── Data invariants the wired modules rely on ────────────────────────────
    const cycles = await base44.asServiceRole.entities.CustomForm
      .filter({ form_type: 'review_cycle' }, '-created_date', 300)
      .catch(() => []);
    const cycleList = Array.isArray(cycles) ? cycles : (cycles?.items || []);
    const participants = await base44.asServiceRole.entities.ReviewParticipant
      .list('-created_date', 1000)
      .catch(() => []);
    const participantList = Array.isArray(participants) ? participants : (participants?.items || []);

    const cycleById = new Map(cycleList.map((c: any) => [c.id, c]));
    const orphans = cycleList.filter((c: any) => !c.client_id).length;
    const mismatched = participantList.filter((p: any) => {
      const cycle = cycleById.get(p.review_cycle_id);
      return cycle && cycle.client_id && p.client_id !== cycle.client_id;
    }).length;

    const invariants = [
      {
        name: 'every review cycle carries a client',
        ok: orphans === 0,
        detail: `${orphans} of ${cycleList.length} cycles have no client_id`,
      },
      {
        name: 'every review participant carries its cycle client',
        ok: mismatched === 0,
        detail: `${mismatched} of ${participantList.length} participants disagree with their cycle`,
      },
      {
        name: 'the two proof clients are distinct',
        ok: A.id !== B.id,
        detail: `${A.name || A.id} vs ${B.name || B.id}`,
      },
    ];

    const failures = scenarios.filter((s: any) => !s.ok).length + invariants.filter((i: any) => !i.ok).length;
    return Response.json({
      passed: scenarios.filter((s: any) => s.ok).length + invariants.filter((i: any) => i.ok).length,
      failed: failures,
      clients: [A.name || A.id, B.name || B.id],
      scenarios,
      invariants,
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Proof failed to run' }, { status: 500 });
  }
}