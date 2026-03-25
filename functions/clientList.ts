import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Super Administrator') {
      return Response.json({ error: 'Unauthorized - Super Administrator only' }, { status: 403 });
    }

    const clients = await base44.asServiceRole.entities.Client.list('-created_date');

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