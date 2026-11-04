import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { resolveTenantContext } from '../../shared/tenantContext.ts';

const EMPTY_STATS = {
  total_users: 0,
  total_goals: 0,
  total_assessments: 0,
  total_learning_assigned: 0,
};

/**
 * The client context every module reads: which client this person is in, that
 * client's (projected) settings, and a few summary counts.
 *
 * The tenant is resolved by base44/shared/tenantContext.ts, never inferred from
 * user.client_id here, so a disagreement between the two historical client
 * fields can no longer produce one tenant's screens over another's data.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const requested = typeof body?.client_id === 'string' ? body.client_id : null;

    const tenant = await resolveTenantContext(base44, user, requested);

    // No tenant (not assigned, client missing) — the caller gets an explicit
    // reason instead of an empty context with no explanation.
    if (!tenant.client_id) {
      return Response.json({
        success: true,
        data: { client: null, stats: EMPTY_STATS, tenant },
      });
    }

    const clientId = tenant.client_id;

    let clientUsers = [];
    try {
      clientUsers = await base44.asServiceRole.entities.User.filter({ client_id: clientId });
    } catch (error) {
      console.error('Error fetching users:', error);
    }

    const [clientAssessments, clientGoals, clientLearning] = await Promise.all([
      base44.asServiceRole.entities.Assessment.filter({ client_id: clientId }).catch(() => []),
      base44.asServiceRole.entities.Goal.filter({ client_id: clientId }).catch(() => []),
      base44.asServiceRole.entities.AssignedLearning.filter({ client_id: clientId }).catch(() => []),
    ]);

    return Response.json({
      success: true,
      data: {
        client: tenant.client,
        tenant,
        stats: {
          total_users: clientUsers.length,
          total_goals: clientGoals.length,
          total_assessments: clientAssessments.length,
          total_learning_assigned: clientLearning.length,
        },
      },
    });
  } catch (error) {
    console.error('Error in getClientContext:', error);
    return Response.json({
      success: true,
      error: 'Failed to fetch client context',
      data: { client: null, stats: EMPTY_STATS, tenant: null },
    });
  }
}