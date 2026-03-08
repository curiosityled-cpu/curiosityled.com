import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token, request_data } = await req.json();

    if (!token || !request_data) {
      return Response.json({ error: 'token and request_data are required' }, { status: 400 });
    }

    // Decode and validate the token
    let linkData;
    try {
      const decoded = atob(token);
      linkData = JSON.parse(decoded);
    } catch (e) {
      return Response.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Check if token is expired
    if (new Date(linkData.expires_at) < new Date()) {
      return Response.json({ error: 'This submission link has expired' }, { status: 400 });
    }

    // Validate required fields
    if (!request_data.title || !request_data.description || !request_data.requester_email) {
      return Response.json({ 
        error: 'title, description, and requester_email are required' 
      }, { status: 400 });
    }

    // Create the request using service role (since user is not authenticated)
    const newRequest = await base44.asServiceRole.entities.DevelopmentRequest.create({
      title: request_data.title.trim(),
      description: request_data.description.trim(),
      request_type: request_data.request_type || 'other',
      source: 'form',
      priority: request_data.priority || 'medium',
      status: 'new',
      requested_by_email: request_data.requester_email.trim(),
      client_id: linkData.client_id,
      budget_amount: request_data.budget_amount || undefined,
      audience_size: request_data.audience_size || undefined,
      estimated_effort_hours: request_data.estimated_effort_hours || undefined,
      risk_flags: request_data.risk_flags?.filter(f => f !== 'none') || ['none'],
      is_invitation_only: request_data.is_invitation_only || false,
      due_date: request_data.due_date || undefined,
      attachments: request_data.attachments || [],
      initial_notes: `Submitted via public form on ${new Date().toISOString()}\nRequester: ${request_data.requester_name || 'Not provided'}`
    });

    // Auto-triage the request
    try {
      await base44.asServiceRole.functions.invoke('autoTriageRequest', { 
        request_id: newRequest.id 
      });
    } catch (error) {
      console.log('Auto-triage skipped:', error.message);
    }

    // Notify HR Admins
    const hrAdmins = await base44.asServiceRole.entities.User.filter({
      app_role: 'Admin Level 2',
      client_id: linkData.client_id
    });

    for (const admin of hrAdmins) {
      try {
        await base44.asServiceRole.functions.invoke('sendRequestNotification', {
          request_id: newRequest.id,
          notification_type: 'new_request',
          recipient_email: admin.email
        });
      } catch (error) {
        console.log('Notification skipped:', error.message);
      }
    }

    return Response.json({ 
      success: true,
      request_id: newRequest.id,
      message: 'Your request has been submitted successfully'
    });

  } catch (error) {
    console.error('Public request submission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});