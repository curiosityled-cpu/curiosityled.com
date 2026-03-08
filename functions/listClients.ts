import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized', clients: [] }, { status: 401 });
    }

    // Allowed roles for listing clients
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ success: false, error: 'Unauthorized - Admin access required', clients: [] }, { status: 403 });
    }

    console.log('Fetching clients for:', user.email, user.app_role);

    // Use service role to fetch clients
    let clients = await base44.asServiceRole.entities.Client.list('-created_date');

    // Apply role-based filtering
    if (user.app_role === 'Partner Business Administrator' && user.partner_id) {
      // Partner Admin sees only their partner's clients
      clients = clients.filter(c => c.partner_id === user.partner_id);
    } else if (user.app_role === 'Super Administrator' && user.client_id) {
      // Super Admin sees only their own client
      clients = clients.filter(c => c.id === user.client_id);
    }
    // Platform Admin sees all clients (no filtering)

    console.log('Successfully fetched', clients.length, 'clients');

    return Response.json({ success: true, clients: clients || [] });

  } catch (error) {
    console.error('Error listing clients:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to list clients',
      clients: []
    }, { status: 200 });
  }
});