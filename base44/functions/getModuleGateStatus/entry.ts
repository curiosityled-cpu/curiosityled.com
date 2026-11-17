import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { readAppRole } from '../../shared/tenantContext.ts';
import {
  MODULE_CATALOG,
  MODULE_GATE_RULE,
  evaluateTenantModules,
  normalizePackage,
} from '../../shared/moduleGate.ts';

/**
 * The rollout view of package boundaries: for each tenant, its package, its
 * gate mode, which modules it includes, and which ones it would lose — plus how
 * many times each excluded module has actually been reached for, from
 * ModuleGateLog. Read-only: nothing here changes a tenant.
 *
 * The rule lives in shared/moduleGate.ts so no screen restates it.
 */

const READER_ROLES = [
  'Platform Admin',
  'Super Administrator',
  'Admin Level 2',
];

const asRows = (value) => (Array.isArray(value) ? value : value?.items || []);

export default async function (req) {
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
    const platformWide = readAppRole(user) === 'Platform Admin';

    const allClients = asRows(await base44.asServiceRole.entities.Client.list());
    const clients = platformWide
      ? allClients
      : allClients.filter((c) => c.id === (user?.data?.client_id || null));

    const tenants = [];
    for (const client of clients) {
      const usage = asRows(
        await base44.asServiceRole.entities.ModuleGateLog.filter({ client_id: client.id })
      );
      const reached = {};
      for (const row of usage) {
        if (!row?.module) continue;
        reached[row.module] = (reached[row.module] || 0) + 1;
      }

      const modules = evaluateTenantModules(client)
        .filter((m) => !m.included_in_package)
        .map((m) => ({
          module: m.module,
          label: m.label,
          outcome: m.outcome,
          attempts: reached[m.module] || 0,
        }));

      const permissive =
        normalizePackage(client.package) === 'unknown' || normalizePackage(client.package) === 'internal';

      // A permissive tenant loses nothing today, so the console shows what a
      // real package would take away before anyone assigns one.
      const previews = permissive
        ? ['essentials', 'growth'].map((pkg) => ({
            package: pkg,
            modules: evaluateTenantModules({ package: pkg })
              .filter((m) => !m.included_in_package)
              .map((m) => m.label),
          }))
        : [];

      tenants.push({
        client_id: client.id,
        name: client.name,
        package: normalizePackage(client.package),
        enforcement_mode: client.enforcement_mode === 'block' ? 'block' : 'warn',
        permissive,
        excluded_modules: modules,
        lost_module_count: modules.length,
        total_attempts: modules.reduce((sum, m) => sum + m.attempts, 0),
        previews,
      });
    }

    return Response.json({
      success: true,
      catalog: MODULE_CATALOG.map((m) => ({ key: m.key, label: m.label, min_package: m.min_package, claim: m.claim })),
      tenants,
      rule: MODULE_GATE_RULE,
    });
  } catch (error) {
    console.error('Error getting module gate status:', error);
    return Response.json(
      { success: false, error: 'Failed to read package boundaries', details: error.message },
      { status: 500 }
    );
  }
}