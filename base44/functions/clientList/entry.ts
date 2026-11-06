import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { resolveActiveClient } from '../../shared/tenantContext.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Tenant comes from the resolver, never from the browser's membership copy.
    const callerClientId = (await resolveActiveClient(base44, user)).client_id;

    if (!user || user.app_role !== 'Super Administrator') {
      return Response.json({ error: 'Unauthorized - Super Administrator only' }, { status: 403 });
    }

    // Security: Super Administrator is tenant-scoped to their own client only.
    if (!callerClientId) {
      return Response.json({ error: 'Tenant scope required — client_id not configured' }, { status: 403 });
    }

    let clients = await base44.asServiceRole.entities.Client.list('-created_date');
    clients = clients.filter(c => c.id === callerClientId);

    // Get user count for each client
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    const clientsWithStats = clients.map(client => ({
      ...client,
      seats_used: allUsers.filter(u => u.client_id === client.id).length
    }));

    return Response.json({ success: true, clients: clientsWithStats });

  } catch (error) {
    console.error('Error listing clients:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});