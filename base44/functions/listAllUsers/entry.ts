import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    console.log('Fetching users for:', user.email, user.app_role);

    // Fetch users using service role to bypass RLS
    let users = await base44.asServiceRole.entities.User.list('-created_date');

    // Apply role-based filtering
    if (user.app_role === 'Super Administrator' && user.client_id) {
      // Super Admin sees only their client's users + unassigned users
      users = users.filter(u => u.client_id === user.client_id || !u.client_id);
    } else if (user.app_role === 'Partner Business Administrator' && user.partner_id) {
      // Partner Admin sees users from all their partner's clients + unassigned users
      const allClients = await base44.asServiceRole.entities.Client.list();
      const partnerClientIds = allClients
        .filter(c => c.partner_id === user.partner_id)
        .map(c => c.id);
      users = users.filter(u => partnerClientIds.includes(u.client_id) || !u.client_id);
    } else if (user.app_role === 'Admin Level 2' && user.client_id) {
      // Admin Level 2 sees only their client's users + unassigned users
      users = users.filter(u => u.client_id === user.client_id || !u.client_id);
    }
    // Platform Admin sees all users (no filtering)

    console.log('Returning', users.length, 'users');

    return Response.json({ 
      success: true,
      users: users || [] 
    });

  } catch (error) {
    console.error('Error listing users:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to list users',
      users: []
    }, { status: 200 }); // Return 200 to prevent UI crash
  }
});