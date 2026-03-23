import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role for automated task
    const now = new Date();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

    // Get all requests that need reminders
    const allRequests = await base44.asServiceRole.entities.DevelopmentRequest.list();

    const results = {
      sla_breach_alerts: 0,
      stale_ticket_alerts: 0,
      due_date_reminders: 0
    };

    for (const request of allRequests) {
      // 1. SLA Breach - new requests > 72 hours old without response
      if (
        request.status === 'new' && 
        !request.first_response_at &&
        new Date(request.created_date) < threeDaysAgo
      ) {
        // Notify assigned admin or all admins
        const recipientEmail = request.assigned_to_email || request.requested_by_email;
        
        if (recipientEmail) {
          await base44.asServiceRole.functions.invoke('sendRequestNotification', {
            request_id: request.id,
            notification_type: 'sla_breach',
            recipient_email: recipientEmail
          });
          results.sla_breach_alerts++;
        }
      }

      // 2. Stale Ticket - in progress for > 14 days without update
      if (
        ['assigned', 'in_progress'].includes(request.status) &&
        new Date(request.updated_date) < fourteenDaysAgo
      ) {
        if (request.assigned_to_email) {
          await base44.asServiceRole.functions.invoke('sendRequestNotification', {
            request_id: request.id,
            notification_type: 'status_change',
            recipient_email: request.assigned_to_email,
            custom_message: 'This request has been inactive for over 14 days. Please provide an update.'
          });
          results.stale_ticket_alerts++;
        }
      }

      // 3. Due Date Reminders - requests due in 3 days
      if (request.due_date && request.status !== 'completed') {
        const dueDate = new Date(request.due_date);
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        if (dueDate <= threeDaysFromNow && dueDate >= now) {
          const recipients = [request.assigned_to_email, request.requested_by_email].filter(Boolean);
          
          for (const email of recipients) {
            await base44.asServiceRole.functions.invoke('sendRequestNotification', {
              request_id: request.id,
              notification_type: 'status_change',
              recipient_email: email,
              custom_message: `This request is due on ${request.due_date}. Please ensure timely completion.`
            });
          }
          results.due_date_reminders++;
        }
      }
    }

    return Response.json({ 
      success: true,
      results
    });

  } catch (error) {
    console.error('Reminder scheduling error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});