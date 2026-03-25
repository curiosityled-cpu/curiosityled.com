
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 401 });
    }

    // Get all organizations
    const organizations = await base44.asServiceRole.entities.Organization.list('-created_date');

    return Response.json({ organizations });

  } catch (error) {
    console.error('Error listing organizations:', error);
    return Response.json({ 
      error: error.message || 'Failed to list organizations' 
    }, { status: 500 });
  }
});
