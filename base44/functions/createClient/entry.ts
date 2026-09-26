import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow Platform Admin, Super Administrator, and Partner Business Administrator
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator'];
    if (!user || !allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const clientData = body.clientData || body;

    // Validate required fields
    if (!clientData.name || !clientData.contact_email) {
      return Response.json({ 
        success: false,
        error: 'Missing required fields: name, contact_email' 
      }, { status: 400 });
    }

    // Generate slug from name if not provided
    const slug = clientData.slug || clientData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existing = await base44.asServiceRole.entities.Client.filter({ slug });
    if (existing.length > 0) {
      return Response.json({ 
        success: false,
        error: 'A client with this name already exists' 
      }, { status: 400 });
    }

    // Security: Partner Business Administrators may only set a restricted
    // subset of Client fields. partner_id is derived server-side from the
    // caller's own partner. license_count is omitted to prevent entitlement
    // manipulation. Super Administrators and Platform Admins are unrestricted.
    let createPayload;
    if (user.app_role === 'Partner Business Administrator') {
      const partnerId = user.partner_id || null;
      if (!partnerId) {
        return Response.json({ success: false, error: 'Partner Business Administrators must belong to a partner to create clients' }, { status: 403 });
      }
      createPayload = {
        name: clientData.name,
        contact_email: clientData.contact_email,
        contact_name: clientData.contact_name || null,
        contact_phone: clientData.contact_phone || null,
        industry: clientData.industry || null,
        size: clientData.size || null,
        description: clientData.description || null,
        slug,
        partner_id: partnerId,
        created_by: user.email,
      };
    } else {
      createPayload = { ...clientData, slug, created_by: user.email };
    }

    const client = await base44.asServiceRole.entities.Client.create(createPayload);

    return Response.json({ 
      success: true,
      client,
      message: 'Client created successfully' 
    });

  } catch (error) {
    console.error('Error creating client:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to create client' 
    }, { status: 500 });
  }
});