import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['Super Administrator', 'Platform Admin'].includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized - Super Administrator or Platform Admin only' }, { status: 403 });
    }

    const { client_id, updates } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'Missing client_id' }, { status: 400 });
    }

    // Security: a Super Administrator may only modify their own organization.
    // Platform Admin retains cross-tenant access.
    if (user.app_role === 'Super Administrator' && user.client_id && client_id !== user.client_id) {
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