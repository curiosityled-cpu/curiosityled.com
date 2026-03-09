import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Access control: Admin Level 1 or higher
    const allowedRoles = [
      'Admin Level 1',
      'Admin Level 2',
      'Super Administrator',
      'Partner Business Administrator',
      'Platform Admin'
    ];

    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    const payload = await req.json();
    const { certificationId, status, rejection_reason } = payload;

    // Validate inputs
    if (!certificationId || !status) {
      return Response.json({ 
        error: 'Missing required fields: certificationId, status' 
      }, { status: 400 });
    }

    if (!['verified', 'rejected', 'revoked'].includes(status)) {
      return Response.json({ 
        error: 'Invalid status. Must be "verified", "rejected", or "revoked"' 
      }, { status: 400 });
    }

    // Build update object with metadata
    const updateData = { status };
    
    if (status === 'verified') {
      updateData.verified_by = user.email;
      updateData.verified_at = new Date().toISOString();
    } else if (status === 'rejected') {
      updateData.rejected_by = user.email;
      updateData.rejected_at = new Date().toISOString();
      if (rejection_reason) {
        updateData.rejection_reason = rejection_reason;
      }
    } else if (status === 'revoked') {
      updateData.revoked_by = user.email;
      updateData.revoked_at = new Date().toISOString();
      if (rejection_reason) {
        updateData.revocation_reason = rejection_reason;
      }
    }

    // Update the certification status
    const updatedCertification = await base44.asServiceRole.entities.Certification.update(
      certificationId,
      updateData
    );

    // Get certification details for notification
    const cert = updatedCertification;
    
    await base44.asServiceRole.entities.Notification.create({
      user_email: cert.user_email,
      type: 'certification_status',
      title: `Certification ${status === 'verified' ? 'Verified' : status === 'revoked' ? 'Revoked' : 'Rejected'}`,
      message: `Your ${cert.name} certification has been ${status}.`,
      priority: 'medium',
      related_entity_type: 'Certification',
      related_entity_id: certificationId
    });

    return Response.json({
      success: true,
      certification: updatedCertification
    });

  } catch (error) {
    console.error('verifyCertification error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});