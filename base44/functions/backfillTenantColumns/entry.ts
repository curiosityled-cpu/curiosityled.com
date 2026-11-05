import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  PERSON_OWNED_TENANT_TYPES,
  TENANT_ID_MIRROR_TYPES,
  membershipClientMap,
  rowTenantHints,
} from '../../shared/tenantColumns.ts';

/**
 * Stamps `client_id` on the person-owned records that predate the column.
 *
 * Phase 3 batch 1–12 closed the boundary on every type whose rows belong to a
 * client outright. The types listed in shared/tenantColumns.ts belong to a
 * person, so their access rule stays person-bound — but without a tenant column
 * the organisation could not report on its own activity. This writes that column
 * from the one source of truth (the owner's membership), and is safe to re-run:
 * a row that already carries a client is never touched.
 *
 * The client is taken from the row itself where it already records one
 * (`tenant_id`), otherwise from the person it belongs to. A row whose owner is
 * not a known member is left alone and reported, rather than guessed at.
 *
 * Platform Admin only.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Stamping cannot move a row to another tenant: the value is always the
    // owner's own membership, never a caller-supplied id. That is why an app
    // admin may run it as well — the nightly reconciliation runs as its creator.
    const isAuthorized =
      user.app_role === 'Platform Admin' ||
      user.data?.app_role === 'Platform Admin' ||
      user.role === 'admin';
    if (!isAuthorized) return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const only = Array.isArray(body?.entities) && body.entities.length ? body.entities : null;

    const users = await base44.asServiceRole.entities.User.list();
    const clientOf = membershipClientMap(Array.isArray(users) ? users : users?.items || []);

    const summary: any[] = [];
    let stamped = 0;
    let leftover = 0;

    // Person-owned types, plus the six that kept their tenant under the
    // provisioning-side name — their client column mirrors tenant_id, which
    // rowTenantHints already reads.
    const allTypes = [...PERSON_OWNED_TENANT_TYPES, ...TENANT_ID_MIRROR_TYPES];

    for (const name of allTypes) {
      if (only && !only.includes(name)) continue;
      const entity = base44.asServiceRole.entities[name];
      if (!entity) continue;

      const result: any = { entity: name, scanned: 0, stamped: 0, unattributed: 0, unattributed_ids: [] };

      let cursor: string | undefined;
      for (let page = 0; page < 40; page += 1) {
        const response = await entity.list({ limit: 500, sort: 'created_date', cursor });
        const items: any[] = Array.isArray(response) ? response : response?.items || [];
        if (!items.length) break;

        result.scanned += items.length;

        const updates: any[] = [];
        for (const row of items) {
          if (row.client_id) continue;
          const { clientId, emails } = rowTenantHints(name, row);
          const resolved =
            clientId || emails.map((email) => clientOf.get(email)).find(Boolean) || null;
          if (resolved) {
            updates.push({ id: row.id, client_id: resolved });
          } else {
            result.unattributed += 1;
            if (result.unattributed_ids.length < 10) result.unattributed_ids.push(row.id);
          }
        }

        if (updates.length && !dryRun) {
          for (let i = 0; i < updates.length; i += 500) {
            await entity.bulkUpdate(updates.slice(i, i + 500));
          }
        }
        result.stamped += updates.length;
        stamped += updates.length;

        cursor = Array.isArray(response) ? undefined : response?.next_cursor;
        if (!cursor) break;
      }

      // Counted once, after every page for this type has been scanned.
      leftover += result.unattributed;
      summary.push(result);
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      records_stamped: stamped,
      records_unattributed: leftover,
      entities: summary,
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Backfill failed' }, { status: 500 });
  }
}