import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import {
  canActOnClient,
  readAppRole,
  resolveTenantContext,
  tenantBlockedResponse,
} from '../../shared/tenantContext.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Who may edit an organization at all is a role question; which organization
    // they may edit is a tenant question, and the tenant answer comes from the
    // shared resolver instead of comparing partner and client fields by hand.
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator'];
    if (!user || !allowedRoles.includes(readAppRole(user))) {
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

    // A member is held to their own client, a partner administrator to their
    // declared portfolio, a platform administrator spans every client.
    const tenant = await resolveTenantContext(base44, user, clientId);
    if (tenant.blocked) return tenantBlockedResponse(tenant);
    if (!canActOnClient(tenant, clientId)) {
      return Response.json({ success: false, error: 'You can only update organizations in your portfolio' }, { status: 403 });
    }

    // Verify client exists
    const existingClients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (existingClients.length === 0) {
      return Response.json({ success: false, error: 'Client not found' }, { status: 404 });
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