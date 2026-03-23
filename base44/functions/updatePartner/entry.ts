import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow Platform Admin and Super Administrator
    const allowedRoles = ['Platform Admin', 'Super Administrator'];
    if (!user || !allowedRoles.includes(user.app_role)) {
      return Response.json({ success: false, error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const partnerId = body.partnerId || body.partner_id;
    const partnerData = body.partnerData || body;

    if (!partnerId) {
      return Response.json({ success: false, error: 'partnerId is required' }, { status: 400 });
    }

    // Remove partnerId from update data
    const { partnerId: _, partner_id: __, partnerData: ___, ...updateData } = partnerData;
    const finalUpdateData = partnerData.partnerData ? partnerData.partnerData : updateData;

    // Verify partner exists
    const existingPartners = await base44.asServiceRole.entities.Partner.filter({ id: partnerId });
    if (existingPartners.length === 0) {
      return Response.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    // Update partner with service role
    const partner = await base44.asServiceRole.entities.Partner.update(partnerId, finalUpdateData);

    return Response.json({ 
      success: true,
      partner,
      message: 'Partner updated successfully' 
    });

  } catch (error) {
    console.error('Error updating partner:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to update partner' 
    }, { status: 500 });
  }
});