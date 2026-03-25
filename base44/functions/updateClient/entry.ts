import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow Platform Admin, Super Administrator, and Partner Business Administrator
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator'];
    if (!user || !allowedRoles.includes(user.app_role)) {
      return Response.json({ success: false, error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const clientId = body.clientId || body.client_id;
    const clientData = body.clientData || body;

    if (!clientId) {
      return Response.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    // Remove clientId/client_id from update data
    const { clientId: _, client_id: __, clientData: ___, ...updateData } = clientData;
    const finalUpdateData = clientData.clientData ? clientData.clientData : updateData;

    // Verify client exists
    const existingClients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (existingClients.length === 0) {
      return Response.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    // Partner Business Admin can only update clients under their partner
    if (user.app_role === 'Partner Business Administrator') {
      const client = existingClients[0];
      if (client.partner_id !== user.partner_id) {
        return Response.json({ success: false, error: 'You can only update clients under your partner organization' }, { status: 403 });
      }
    }

    // Super Administrator can only update clients under their organization
    if (user.app_role === 'Super Administrator' && user.client_id) {
      if (clientId !== user.client_id) {
        return Response.json({ success: false, error: 'You can only update your own organization' }, { status: 403 });
      }
    }

    // Update client with service role
    const client = await base44.asServiceRole.entities.Client.update(clientId, finalUpdateData);

    return Response.json({ 
      success: true,
      client,
      message: 'Client updated successfully' 
    });

  } catch (error) {
    console.error('Error updating client:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to update client' 
    }, { status: 500 });
  }
});