import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { resolveTenantContext } from '../../shared/tenantContext.ts';

/**
 * Returns the tenant this request is entitled to.
 *
 * The browser may send `client_id` as a *preference* (a partner administrator
 * picking one of their portfolio companies). It is only honoured when it is in
 * the caller's authorized list — see base44/shared/tenantContext.ts.
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

    return Response.json({
      success: true,
      tenant,
      // Convenience for the caller; the flags above are the authority.
      blocked: tenant.blocked,
      needs_selection: tenant.needs_selection,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}