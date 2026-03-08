
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 401 });
    }

    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Check if organization exists
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    if (orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if organization has users
    const users = await base44.asServiceRole.entities.User.filter({ organization_id });
    if (users.length > 0) {
      return Response.json({ 
        error: `Cannot delete organization with ${users.length} active users. Please reassign or remove users first.` 
      }, { status: 400 });
    }

    // Delete organization
    await base44.asServiceRole.entities.Organization.delete(organization_id);

    return Response.json({ 
      message: 'Organization deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting organization:', error);
    return Response.json({ 
      error: error.message || 'Failed to delete organization' 
    }, { status: 500 });
  }
});
