
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 401 });
    }

    const { user_id, organization_id } = await req.json();

    if (!user_id || !organization_id) {
      return Response.json({ 
        error: 'user_id and organization_id are required' 
      }, { status: 400 });
    }

    // Verify organization exists
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    if (orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Verify user exists
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    const org = orgs[0];

    // Update user's organization
    await base44.asServiceRole.entities.User.update(user_id, {
      organization_id: organization_id
    });

    // Update organization's seat count
    const orgUsers = await base44.asServiceRole.entities.User.filter({ organization_id });
    await base44.asServiceRole.entities.Organization.update(organization_id, {
      seats_used: orgUsers.length
    });

    return Response.json({ 
      message: `User ${targetUser.email} assigned to ${org.name}`,
      seats_used: orgUsers.length
    });

  } catch (error) {
    console.error('Error assigning user to organization:', error);
    return Response.json({ 
      error: error.message || 'Failed to assign user' 
    }, { status: 500 });
  }
});
