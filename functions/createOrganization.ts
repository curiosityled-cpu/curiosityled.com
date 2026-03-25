
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 401 });
    }

    const orgData = await req.json();

    // Validate required fields
    if (!orgData.name || !orgData.slug || !orgData.contact_email) {
      return Response.json({ 
        error: 'Missing required fields: name, slug, contact_email' 
      }, { status: 400 });
    }

    // Check if slug already exists
    const existing = await base44.asServiceRole.entities.Organization.filter({ slug: orgData.slug });
    if (existing.length > 0) {
      return Response.json({ 
        error: 'An organization with this slug already exists' 
      }, { status: 400 });
    }

    // Create organization
    const organization = await base44.asServiceRole.entities.Organization.create(orgData);

    return Response.json({ 
      organization,
      message: 'Organization created successfully' 
    });

  } catch (error) {
    console.error('Error creating organization:', error);
    return Response.json({ 
      error: error.message || 'Failed to create organization' 
    }, { status: 500 });
  }
});
