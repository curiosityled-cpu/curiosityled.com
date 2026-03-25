import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id, meeting_date, meeting_duration_minutes = 30 } = await req.json();

    if (!request_id || !meeting_date) {
      return Response.json({ 
        error: 'request_id and meeting_date are required' 
      }, { status: 400 });
    }

    // Fetch the request
    const requests = await base44.asServiceRole.entities.DevelopmentRequest.filter({ 
      id: request_id 
    });
    
    if (requests.length === 0) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    const request = requests[0];

    // Calculate end time
    const startTime = new Date(meeting_date);
    const endTime = new Date(startTime.getTime() + meeting_duration_minutes * 60000);

    // Create calendar event data
    const eventSummary = `Discovery Call: ${request.title}`;
    const eventDescription = `
Request Type: ${request.request_type.replace(/_/g, ' ')}
Requested by: ${request.requested_by_email}
Assigned to: ${request.assigned_to_email || 'Unassigned'}

Description:
${request.description}

Budget: $${request.budget_amount?.toLocaleString() || 'N/A'}
Audience: ${request.audience_size || 'N/A'} users
    `.trim();

    // Attendees
    const attendees = [
      request.requested_by_email,
      request.assigned_to_email,
      user.email
    ].filter(Boolean);

    // For now, return meeting link instructions
    // In future, integrate with Google Calendar API or similar
    const meetingInstructions = {
      summary: eventSummary,
      description: eventDescription,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      attendees: attendees,
      // Generate a meeting link placeholder
      meeting_link: `https://meet.google.com/new`, // Replace with actual calendar integration
    };

    // Update request with meeting link
    await base44.asServiceRole.entities.DevelopmentRequest.update(request_id, {
      meeting_link: meetingInstructions.meeting_link
    });

    // Send notifications to attendees
    for (const attendeeEmail of attendees) {
      await base44.asServiceRole.functions.invoke('sendRequestNotification', {
        request_id: request_id,
        notification_type: 'status_change',
        recipient_email: attendeeEmail,
        custom_message: `Discovery call scheduled for ${startTime.toLocaleString()}. Meeting link: ${meetingInstructions.meeting_link}`
      });
    }

    return Response.json({ 
      success: true,
      meeting: meetingInstructions
    });

  } catch (error) {
    console.error('Calendar event error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});