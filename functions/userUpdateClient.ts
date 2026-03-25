import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Super Administrator') {
      return Response.json({ error: 'Unauthorized - Super Administrator only' }, { status: 403 });
    }

    const { user_id, client_id } = await req.json();

    if (!user_id) {
      return Response.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // Verify client exists
    if (client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
      if (clients.length === 0) {
        return Response.json({ error: 'Client not found' }, { status: 404 });
      }
    }

    const updatedUser = await base44.asServiceRole.entities.User.update(user_id, { client_id });

    return Response.json({ success: true, user: updatedUser });

  } catch (error) {
    console.error('Error updating user client:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});