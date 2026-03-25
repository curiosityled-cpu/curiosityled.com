import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Debug logging
    console.log('User role check:', {
      app_role: user?.app_role,
      data_app_role: user?.data?.app_role,
      role: user?.role
    });

    const allowedRoles = ['Platform Admin', 'Platform Administrator', 'admin'];
    const hasAccess = user && (
      allowedRoles.includes(user.app_role) || 
      allowedRoles.includes(user.data?.app_role) || 
      allowedRoles.includes(user.role)
    );

    if (!hasAccess) {
      return Response.json({ 
        error: 'Unauthorized - Platform Admin only',
        debug: { app_role: user?.app_role, data_app_role: user?.data?.app_role, role: user?.role }
      }, { status: 401 });
    }

    const { clientId, client_id } = await req.json();
    const finalClientId = clientId || client_id;

    if (!finalClientId) {
      return Response.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Use service role for all operations to bypass RLS
    const clients = await base44.asServiceRole.entities.Client.filter({ id: finalClientId });
    if (clients.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ client_id: finalClientId });
    if (users.length > 0) {
      return Response.json({ 
        error: `Cannot delete client with ${users.length} active users. Please reassign or remove users first.` 
      }, { status: 400 });
    }

    await base44.asServiceRole.entities.Client.delete(finalClientId);

    return Response.json({ 
      message: 'Client deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting client:', error);
    return Response.json({ 
      error: error.message || 'Failed to delete client' 
    }, { status: 500 });
  }
});