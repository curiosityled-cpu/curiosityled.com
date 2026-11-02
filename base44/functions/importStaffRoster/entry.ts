import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { roleTier } from '../../shared/userScope.ts';

/**
 * importStaffRoster — writes frontline staff (ICRoster rows) on behalf of an
 * administrator. Staff rows are created with the service role so a browser
 * import is not blocked by row-level security, while the caller's own role and
 * tenant are still enforced here.
 */

const CHUNK = 100;

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'admin' || roleTier(user.app_role || '') >= roleTier('Admin Level 1');
    if (!isAdmin) {
      return Response.json({ success: false, error: 'Only administrators can import staff' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.records) ? body.records : [];
    if (incoming.length === 0) {
      return Response.json({ success: false, error: 'No staff rows to import' }, { status: 400 });
    }

    const isPlatformAdmin = user.app_role === 'Platform Admin';
    const callerClientId = cleanText(user.client_id, 100);

    const records = [];
    const skipped = [];

    for (const row of incoming) {
      if (!row || typeof row !== 'object') continue;

      const email = cleanText(row.email, 200).toLowerCase();
      const name = cleanText(row.name || row.full_name, 200);
      if (!email || !name) {
        skipped.push(email || name || 'row');
        continue;
      }

      const clientId = isPlatformAdmin ? (cleanText(row.client_id, 100) || callerClientId) : callerClientId;
      if (!clientId) {
        return Response.json({ success: false, error: 'No client is associated with your account' }, { status: 400 });
      }

      records.push({
        name,
        email,
        client_id: clientId,
        team: cleanText(row.team, 200),
        manager_email: cleanText(row.manager_email, 200).toLowerCase(),
        hris_employee_id: cleanText(row.hris_employee_id, 100),
        preferred_channel: ['teams', 'email', 'both'].includes(row.preferred_channel) ? row.preferred_channel : 'both',
        source_system: 'csv',
        created_by_email: user.email,
        is_active: row.is_active !== false,
        check_in_enabled: row.check_in_enabled !== false,
        web_access_token: crypto.randomUUID(),
      });
    }

    if (records.length === 0) {
      return Response.json({ success: false, error: 'No valid staff rows to import', skipped }, { status: 400 });
    }

    let created = 0;
    const failures = [];
    for (let i = 0; i < records.length; i += CHUNK) {
      const batch = records.slice(i, i + CHUNK);
      try {
        const result = await base44.asServiceRole.entities.ICRoster.bulkCreate(batch);
        created += Array.isArray(result) ? result.length : batch.length;
      } catch (batchError: any) {
        failures.push(batchError?.message || 'Batch failed');
        if (batch.length === 1) {
          const single = await base44.asServiceRole.entities.ICRoster.create(batch[0]);
          if (single?.id) {
            created += 1;
            failures.pop();
          }
        }
      }
    }

    if (created === 0) {
      return Response.json({ success: false, error: failures[0] || 'The staff rows could not be imported' }, { status: 500 });
    }

    return Response.json({ success: true, count: created, skipped, failures });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || 'Staff import failed' }, { status: 500 });
  }
}