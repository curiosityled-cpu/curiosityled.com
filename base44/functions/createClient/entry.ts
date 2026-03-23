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

    // Create client using raw service role API
    const client = await base44.asServiceRole.entities.Client.create({
      ...clientData,
      slug,
      created_by: user.email
    });

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