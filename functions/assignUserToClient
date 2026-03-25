import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 401 });
    }

    const { user_id, client_id } = await req.json();

    if (!user_id || !client_id) {
      return Response.json({ 
        error: 'user_id and client_id are required' 
      }, { status: 400 });
    }

    // Verify client exists
    const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
    if (clients.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Verify user exists
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    const client = clients[0];

    // Update user's client
    await base44.asServiceRole.entities.User.update(user_id, {
      client_id: client_id
    });

    // Update client's seat count
    const clientUsers = await base44.asServiceRole.entities.User.filter({ client_id });
    await base44.asServiceRole.entities.Client.update(client_id, {
      seats_used: clientUsers.length
    });

    return Response.json({ 
      message: `User ${targetUser.email} assigned to ${client.name}`,
      seats_used: clientUsers.length
    });

  } catch (error) {
    console.error('Error assigning user to client:', error);
    return Response.json({ 
      error: error.message || 'Failed to assign user' 
    }, { status: 500 });
  }
});