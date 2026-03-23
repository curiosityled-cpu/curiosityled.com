import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized', partners: [] }, { status: 401 });
    }

    // Allowed roles for listing partners
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ success: false, error: 'Unauthorized - Admin access required', partners: [] }, { status: 403 });
    }

    console.log('Fetching partners for:', user.email, user.app_role);

    // Use service role to fetch partners
    let partners = await base44.asServiceRole.entities.Partner.list('-created_date');

    // Apply role-based filtering
    if (user.app_role === 'Partner Business Administrator' && user.partner_id) {
      // Partner Admin sees only their own partner
      partners = partners.filter(p => p.id === user.partner_id);
    }
    // Platform Admin and Super Admin see all partners (no filtering)

    console.log('Successfully fetched', partners.length, 'partners');

    return Response.json({ success: true, partners: partners || [] });

  } catch (error) {
    console.error('Error listing partners:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to list partners',
      partners: []
    }, { status: 200 });
  }
});