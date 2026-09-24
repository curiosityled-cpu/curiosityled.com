import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['Super Administrator', 'Platform Admin'].includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized - Super Administrator or Platform Admin only' }, { status: 403 });
    }

    const { client_id } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'Missing client_id' }, { status: 400 });
    }

    // Security: a Super Administrator may only delete their own organization.
    // Platform Admin retains cross-tenant access.
    if (user.app_role === 'Super Administrator' && user.client_id && client_id !== user.client_id) {
      return Response.json({ error: 'Forbidden - you can only delete your own organization' }, { status: 403 });
    }

    // Check if client has users
    const users = await base44.asServiceRole.entities.User.filter({ client_id });
    if (users.length > 0) {
      return Response.json({ 
        error: 'Cannot delete client with active users. Please reassign or remove users first.' 
      }, { status: 400 });
    }

    await base44.asServiceRole.entities.Client.delete(client_id);

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error deleting client:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});