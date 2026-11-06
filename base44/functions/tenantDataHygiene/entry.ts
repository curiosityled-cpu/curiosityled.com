/**
 * tenantDataHygiene — the auditable cleanup engine behind the tenant rollout.
 *
 * Two modes, one plan:
 *
 *   inventory  reads only. Returns, per entity, how many records sit outside
 *              the test tenant, how many are orphaned automated-test artifacts,
 *              and how many are tenant-less seed content that would become
 *              test-tenant-only. Nothing is written.
 *
 *   execute    performs exactly that plan, then re-reads the same counts so the
 *              before/after can be compared and recorded.
 *
 * Scope rules, applied identically in both modes:
 *   - The test tenant is HealthCo, matched by name/slug, never by hardcoded id.
 *   - Customer tenants are every other Client record. A purge never runs when
 *     there are none, so an unexpected data shape cannot widen it.
 *   - Purges target that explicit customer-tenant id list, never a "not equal"
 *     match, so a record missing client_id can never be swept up by accident.
 *   - Rehoming only stamps records whose client_id is explicitly null: authored
 *     content is never deleted, only made test-tenant-only.
 *   - Configuration is preserved untouched.
 *
 * Body: { mode: "inventory" | "execute", confirm?: boolean }
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  HYGIENE_TARGETS,
  TEST_HARNESS_DOMAIN,
  isTestTenant,
} from "../../shared/tenantHygienePlan.ts";

const PAGE = 200;
const DELETE_CHUNK = 200;

const harnessRegex = `${TEST_HARNESS_DOMAIN.replace(/\./g, "\\.")}$`;

async function countOrNull(model: any, query: Record<string, any>): Promise<number | null> {
  try {
    return await model.count(query);
  } catch {
    return null;
  }
}

/** Walk every page of a query and return the record ids, bounded by `cap`. */
async function collectIds(model: any, query: Record<string, any>, cap = 5000): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;
  for (let round = 0; round < 80; round++) {
    const page: any = await model.filter(query, { limit: PAGE, cursor });
    const items: any[] = Array.isArray(page) ? page : page?.items || [];
    for (const item of items) if (item?.id) ids.push(item.id);
    if (ids.length >= cap) break;
    if (Array.isArray(page) || !page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return ids;
}

/** Delete ids in bounded batches — one oversized $in is rejected by the API. */
async function deleteIds(model: any, ids: string[]): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    const chunk = ids.slice(i, i + DELETE_CHUNK);
    try {
      await model.deleteMany({ id: { $in: chunk } });
      deleted += chunk.length;
    } catch {
      for (const id of chunk) {
        try {
          await model.delete(id);
          deleted++;
        } catch {
          /* a record that vanished mid-run is already clean */
        }
      }
    }
  }
  return deleted;
}

async function measure(svc: any, target: any, customerIds: string[]) {
  const model = svc.entities[target.entity];
  if (!model) return { entity: target.entity, available: false };

  const result: Record<string, any> = {
    entity: target.entity,
    area: target.area,
    action: target.action,
    note: target.note,
    available: true,
    total: await countOrNull(model, {}),
    customerScoped: 0,
    harness: 0,
    unscoped: 0,
  };

  if (target.action === "preserve") return result;

  if (target.action === "purge") {
    if (customerIds.length) {
      result.customerScoped = (await countOrNull(model, { client_id: { $in: customerIds } })) ?? 0;
    }
    if (target.userField) {
      result.harness =
        (await countOrNull(model, { [target.userField]: { $regex: harnessRegex } })) ?? 0;
    }
  }

  if (target.action === "rehome") {
    // Seed content with no tenant: visible to every client today, so it is what
    // makes HealthCo's catalog appear for everybody else.
    result.unscoped = (await countOrNull(model, { client_id: null })) ?? 0;
  }

  return result;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) =>
      e?.status === 401 ? null : Promise.reject(e)
    );
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const appRole = user.data?.app_role || user.app_role || user.role;
    if (appRole !== "Platform Admin" || user.role !== "admin") {
      return Response.json(
        { error: "Only a Platform Admin can run tenant cleanup." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "execute" ? "execute" : "inventory";
    const svc = base44.asServiceRole;

    // ── Resolve the tenant boundary once ────────────────────────────────────
    const clientPage: any = await svc.entities.Client.list({ limit: 500 });
    const clients: any[] = Array.isArray(clientPage) ? clientPage : clientPage?.items || [];
    const testTenant = clients.find((c) => isTestTenant(c)) || null;
    if (!testTenant) {
      return Response.json(
        { error: "No HealthCo test tenant found — nothing was changed." },
        { status: 409 }
      );
    }
    const customerClients = clients.filter((c) => c.id !== testTenant.id);
    const customerIds = customerClients.map((c) => c.id);

    const before = [];
    for (const target of HYGIENE_TARGETS) {
      before.push(await measure(svc, target, customerIds));
    }

    const manifest = {
      mode,
      testTenant: { id: testTenant.id, name: testTenant.name },
      customerTenants: customerClients.map((c) => ({ id: c.id, name: c.name })),
      targets: before,
      totals: {
        purgeCustomer: before.reduce((n, t) => n + (t.customerScoped || 0), 0),
        purgeHarness: before.reduce((n, t) => n + (t.harness || 0), 0),
        rehome: before.reduce((n, t) => n + (t.unscoped || 0), 0),
      },
    };

    if (mode === "inventory") {
      return Response.json({ ...manifest, executed: false });
    }

    if (body.confirm !== true) {
      return Response.json(
        { error: "Execution needs confirm: true." },
        { status: 400 }
      );
    }

    // ── Execute: purge, then rehome ─────────────────────────────────────────
    const results = [];
    for (const target of HYGIENE_TARGETS) {
      if (target.action === "preserve") {
        results.push({ entity: target.entity, action: "preserve", changed: 0 });
        continue;
      }
      const model = svc.entities[target.entity];
      if (!model) {
        results.push({ entity: target.entity, action: target.action, changed: 0, skipped: "unavailable" });
        continue;
      }

      if (target.action === "purge") {
        const idSet = new Set<string>();
        if (customerIds.length) {
          const scoped = await collectIds(model, { client_id: { $in: customerIds } });
          scoped.forEach((id) => idSet.add(id));
        }
        if (target.userField) {
          const orphaned = await collectIds(model, {
            [target.userField]: { $regex: harnessRegex },
          });
          orphaned.forEach((id) => idSet.add(id));
        }
        const changed = idSet.size ? await deleteIds(model, Array.from(idSet)) : 0;
        results.push({ entity: target.entity, action: "purge", changed });
        continue;
      }

      // rehome
      try {
        const updated = await model.updateMany(
          { client_id: null },
          { $set: { client_id: testTenant.id } }
        );
        const changed =
          typeof updated === "number" ? updated : updated?.updated ?? updated?.count ?? 0;
        results.push({ entity: target.entity, action: "rehome", changed });
      } catch (error: any) {
        results.push({ entity: target.entity, action: "rehome", changed: 0, error: error?.message });
      }
    }

    // ── Re-read so the run is verifiable ────────────────────────────────────
    const after = [];
    for (const target of HYGIENE_TARGETS) {
      after.push(await measure(svc, target, customerIds));
    }

    return Response.json({
      ...manifest,
      executed: true,
      results,
      after,
      afterTotals: {
        purgeCustomer: after.reduce((n, t) => n + (t.customerScoped || 0), 0),
        purgeHarness: after.reduce((n, t) => n + (t.harness || 0), 0),
        rehome: after.reduce((n, t) => n + (t.unscoped || 0), 0),
      },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Cleanup failed" }, { status: 500 });
  }
}