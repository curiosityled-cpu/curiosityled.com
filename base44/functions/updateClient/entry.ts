import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const allowedRoles = ['Platform Admin', 'Platform Administrator', 'admin', 'Super Administrator', 'Partner Business Administrator'];
    const userRole = user?.app_role || user?.role;
    if (!user || !allowedRoles.includes(userRole)) {
      return Response.json({ success: false, error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const clientId = body.clientId || body.client_id;
    const clientData = body.clientData || body;

    if (!clientId) {
      return Response.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    // Strip out meta fields, keep only actual update data
    const { clientId: _a, client_id: _b, clientData: _c, ...rest } = body;
    const finalUpdateData = body.clientData ? body.clientData : rest;

    // Use service role to bypass RLS for Platform Admin
    const client = await base44.asServiceRole.entities.Client.update(clientId, finalUpdateData);

    return Response.json({ success: true, client, message: 'Client updated successfully' });

  } catch (error) {
    console.error('Error updating client:', error);
    return Response.json({ success: false, error: error.message || 'Failed to update client' }, { status: 500 });
  }
});