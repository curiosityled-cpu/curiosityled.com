import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ success: false, error: 'Unauthorized - Platform Admin only' }, { status: 401 });
    }

    const { partnerId, partner_id } = await req.json();
    const finalPartnerId = partnerId || partner_id;

    if (!finalPartnerId) {
      return Response.json({ success: false, error: 'partnerId is required' }, { status: 400 });
    }

    const partners = await base44.asServiceRole.entities.Partner.filter({ id: finalPartnerId });
    if (partners.length === 0) {
      return Response.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    // Check if partner has clients
    const clients = await base44.asServiceRole.entities.Client.filter({ partner_id: finalPartnerId });
    if (clients.length > 0) {
      return Response.json({
        success: false,
        error: `Cannot delete partner with ${clients.length} associated clients. Please reassign or remove clients first.`
      }, { status: 400 });
    }

    await base44.asServiceRole.entities.Partner.delete(finalPartnerId);

    return Response.json({ success: true, message: 'Partner deleted successfully' });

  } catch (error) {
    console.error('Error deleting partner:', error);
    return Response.json({ success: false, error: error.message || 'Failed to delete partner' }, { status: 500 });
  }
});