import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only Super Administrators can create clients
    if (!user || user.app_role !== 'Super Administrator') {
      return Response.json({ error: 'Unauthorized - Super Administrator only' }, { status: 403 });
    }

    const { 
      name, 
      subdomain, 
      primary_contact_email, 
      status = 'active',
      default_app_role = 'User Level 1',
      settings_overrides = {},
      branding_id,
      license_count = 10
    } = await req.json();

    if (!name || !primary_contact_email) {
      return Response.json({ error: 'Missing required fields: name, primary_contact_email' }, { status: 400 });
    }

    // Check for duplicate subdomain
    if (subdomain) {
      const existing = await base44.asServiceRole.entities.Client.filter({ subdomain });
      if (existing.length > 0) {
        return Response.json({ error: 'Subdomain already exists' }, { status: 400 });
      }
    }

    const client = await base44.asServiceRole.entities.Client.create({
      name,
      subdomain,
      primary_contact_email,
      status,
      default_app_role,
      settings_overrides,
      branding_id,
      license_count,
      seats_used: 0
    });

    return Response.json({ success: true, client });

  } catch (error) {
    console.error('Error creating client:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});