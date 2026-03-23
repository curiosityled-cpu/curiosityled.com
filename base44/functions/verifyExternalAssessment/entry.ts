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
    const { assessmentId, new_status, rejection_reason } = payload;

    // Validate inputs
    if (!assessmentId || !new_status) {
      return Response.json({ 
        error: 'Missing required fields: assessmentId, new_status' 
      }, { status: 400 });
    }

    if (!['verified', 'needs_manual_input', 'pending_human_review'].includes(new_status)) {
      return Response.json({ 
        error: 'Invalid status. Must be "verified", "needs_manual_input", or "pending_human_review"' 
      }, { status: 400 });
    }

    // Build update object with verification metadata
    const updateData = { status: new_status };
    
    if (new_status === 'verified') {
      updateData.verified_by = user.email;
      updateData.verified_at = new Date().toISOString();
    } else if (rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }

    // Update the assessment status
    const updatedAssessment = await base44.asServiceRole.entities.ExternalAssessmentResult.update(
      assessmentId,
      updateData
    );

    // Create a notification for the user
    let message = '';
    
    if (new_status === 'verified') {
      message = `Your ${updatedAssessment.assessment_type} assessment has been verified.`;
    } else if (new_status === 'needs_manual_input') {
      message = `Your ${updatedAssessment.assessment_type} assessment needs additional information. Please update it.`;
    } else {
      message = `Your ${updatedAssessment.assessment_type} assessment is pending review.`;
    }

    await base44.asServiceRole.entities.Notification.create({
      user_email: updatedAssessment.user_email,
      type: 'assessment_status',
      title: 'Assessment Status Updated',
      message,
      priority: 'medium',
      related_entity_type: 'ExternalAssessmentResult',
      related_entity_id: assessmentId
    });

    return Response.json({
      success: true,
      assessment: updatedAssessment
    });

  } catch (error) {
    console.error('verifyExternalAssessment error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});