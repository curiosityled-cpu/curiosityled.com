import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const allowedRoles = ['Platform Admin', 'Platform Administrator', 'admin', 'Super Administrator', 'Partner Business Administrator'];
    const userRole = user?.app_role || user?.role;
    if (!user || !allowedRoles.includes(userRole)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    // Support both old (client_id/updates) and new (clientId/clientData) payload shapes
    const client_id = body.client_id || body.clientId;
    const updates = body.updates || body.clientData || (() => {
      const { client_id: _a, clientId: _b, updates: _c, clientData: _d, ...rest } = body;
      return rest;
    })();

    if (!client_id) {
      return Response.json({ error: 'Missing client_id' }, { status: 400 });
    }

    const client = await base44.asServiceRole.entities.Client.update(client_id, updates);

    return Response.json({ success: true, client });

  } catch (error) {
    console.error('Error updating client:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});