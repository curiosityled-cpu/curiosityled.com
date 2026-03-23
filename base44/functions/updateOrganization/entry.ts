
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 401 });
    }

    const { organization_id, ...updateData } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Get existing organization
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    if (orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    // If slug is being changed, check it's not taken
    if (updateData.slug && updateData.slug !== orgs[0].slug) {
      const existing = await base44.asServiceRole.entities.Organization.filter({ slug: updateData.slug });
      if (existing.length > 0) {
        return Response.json({ 
          error: 'An organization with this slug already exists' 
        }, { status: 400 });
      }
    }

    // Update organization
    const organization = await base44.asServiceRole.entities.Organization.update(
      organization_id, 
      updateData
    );

    return Response.json({ 
      organization,
      message: 'Organization updated successfully' 
    });

  } catch (error) {
    console.error('Error updating organization:', error);
    return Response.json({ 
      error: error.message || 'Failed to update organization' 
    }, { status: 500 });
  }
});
