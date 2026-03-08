import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const allowedRoles = ['Platform Admin', 'Platform Administrator', 'admin'];
    const userRole = user?.app_role || user?.role;
    if (!user || !allowedRoles.includes(userRole)) {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const client_id = body.client_id || body.clientId;

    if (!client_id) {
      return Response.json({ error: 'Missing client_id' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Client.delete(client_id);

    return Response.json({ success: true, message: 'Client deleted successfully' });

  } catch (error) {
    console.error('Error deleting client:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});