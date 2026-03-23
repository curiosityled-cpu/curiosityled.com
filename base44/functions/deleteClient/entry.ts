import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const allowedRoles = ['Platform Admin', 'Platform Administrator', 'admin'];
    const userRole = user?.app_role || user?.role;
    if (!user || !allowedRoles.includes(userRole)) {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 401 });
    }

    const body = await req.json();
    const finalClientId = body.clientId || body.client_id;

    if (!finalClientId) {
      return Response.json({ error: 'clientId is required' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Client.delete(finalClientId);

    return Response.json({ message: 'Client deleted successfully' });

  } catch (error) {
    console.error('Error deleting client:', error);
    return Response.json({ error: error.message || 'Failed to delete client' }, { status: 500 });
  }
});