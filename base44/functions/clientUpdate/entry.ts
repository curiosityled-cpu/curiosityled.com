import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import {
  canActOnClient,
  readAppRole,
  resolveTenantContext,
  tenantBlockedResponse,
} from '../../shared/tenantContext.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['Super Administrator', 'Platform Admin'].includes(readAppRole(user))) {
      return Response.json({ error: 'Unauthorized - Super Administrator or Platform Admin only' }, { status: 403 });
    }

    const { client_id, updates } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'Missing client_id' }, { status: 400 });
    }

    // Which organization may be touched is decided by the shared resolver: a
    // Super Administrator is held to their own client, Platform Admin spans all.
    const tenant = await resolveTenantContext(base44, user, client_id);
    if (tenant.blocked) return tenantBlockedResponse(tenant);
    if (!canActOnClient(tenant, client_id)) {
      return Response.json({ error: 'Forbidden - you can only modify your own organization' }, { status: 403 });
    }

    // Check if subdomain is being changed and if it's unique
    if (updates.subdomain) {
      const existing = await base44.asServiceRole.entities.Client.filter({ 
        subdomain: updates.subdomain 
      });
      if (existing.length > 0 && existing[0].id !== client_id) {
        return Response.json({ error: 'Subdomain already exists' }, { status: 400 });
      }
    }

    const client = await base44.asServiceRole.entities.Client.update(client_id, updates);

    return Response.json({ success: true, client });

  } catch (error) {
    console.error('Error updating client:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});