import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Get Partner Commissions
 * Fetch commission data with proper permissions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { partnerId, status, clientId, dateFrom, dateTo } = await req.json();

    // Check if user has permission
    const isAdmin = ['Platform Admin', 'Super Administrator'].includes(user.app_role);
    const isPartner = user.partner_id;

    // Build query
    let query = {};

    if (partnerId) {
      query.partner_id = partnerId;
    } else if (isPartner && !isAdmin) {
      // Partners can only see their own commissions
      query.partner_id = user.partner_id;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (clientId) {
      query.client_id = clientId;
    }

    // Get commissions with elevated permissions
    let commissions = await base44.asServiceRole.entities.PartnerCommission.filter(query);

    // Filter by date if provided
    if (dateFrom || dateTo) {
      commissions = commissions.filter(c => {
        const date = new Date(c.invoice_date || c.created_date);
        if (dateFrom && date < new Date(dateFrom)) return false;
        if (dateTo && date > new Date(dateTo)) return false;
        return true;
      });
    }

    // Calculate stats
    const stats = {
      total: commissions.length,
      pending: commissions.filter(c => c.status === 'pending').length,
      approved: commissions.filter(c => c.status === 'approved').length,
      paid: commissions.filter(c => c.status === 'paid').length,
      total_amount: commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0),
      pending_amount: commissions.filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (c.commission_amount || 0), 0),
      approved_amount: commissions.filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + (c.commission_amount || 0), 0),
      paid_amount: commissions.filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.commission_amount || 0), 0)
    };

    return Response.json({
      success: true,
      commissions,
      stats
    });

  } catch (error) {
    console.error('Error getting commissions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});