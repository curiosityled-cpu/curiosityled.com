import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id, notification_type, recipient_email, custom_message } = await req.json();

    if (!request_id || !notification_type || !recipient_email) {
      return Response.json({ 
        error: 'request_id, notification_type, and recipient_email are required' 
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

    // Build email content based on notification type
    let subject = '';
    let body = '';
    const appUrl = 'https://your-app.base44.com'; // Update with actual app URL

    switch (notification_type) {
      case 'new_request':
        subject = `New Development Request: ${request.title}`;
        body = `
          <h2>New Development Request Submitted</h2>
          <p><strong>Title:</strong> ${request.title}</p>
          <p><strong>Type:</strong> ${request.request_type.replace(/_/g, ' ')}</p>
          <p><strong>Priority:</strong> ${request.priority.toUpperCase()}</p>
          <p><strong>Requested by:</strong> ${request.requested_by_email}</p>
          <p><strong>Description:</strong></p>
          <p>${request.description}</p>
          ${request.budget_amount ? `<p><strong>Budget:</strong> $${request.budget_amount.toLocaleString()}</p>` : ''}
          ${request.due_date ? `<p><strong>Due Date:</strong> ${request.due_date}</p>` : ''}
          <p><a href="${appUrl}/RequestDashboard">View Request Dashboard</a></p>
        `;
        break;

      case 'assignment':
        subject = `You've been assigned: ${request.title}`;
        body = `
          <h2>Request Assigned to You</h2>
          <p><strong>Title:</strong> ${request.title}</p>
          <p><strong>Type:</strong> ${request.request_type.replace(/_/g, ' ')}</p>
          <p><strong>Priority:</strong> ${request.priority.toUpperCase()}</p>
          <p><strong>Requested by:</strong> ${request.requested_by_email}</p>
          <p><strong>Description:</strong></p>
          <p>${request.description}</p>
          ${request.due_date ? `<p><strong>Due Date:</strong> ${request.due_date}</p>` : ''}
          <p><a href="${appUrl}/RequestDashboard">View Request Dashboard</a></p>
        `;
        break;

      case 'status_change':
        subject = `Request Status Updated: ${request.title}`;
        body = `
          <h2>Request Status Changed</h2>
          <p><strong>Title:</strong> ${request.title}</p>
          <p><strong>New Status:</strong> ${request.status.replace(/_/g, ' ').toUpperCase()}</p>
          <p><strong>Priority:</strong> ${request.priority.toUpperCase()}</p>
          ${custom_message ? `<p><strong>Notes:</strong> ${custom_message}</p>` : ''}
          <p><a href="${appUrl}/RequestDashboard">View Request Dashboard</a></p>
        `;
        break;

      case 'approval_needed':
        subject = `Approval Required: ${request.title}`;
        body = `
          <h2>Request Requires Your Approval</h2>
          <p><strong>Title:</strong> ${request.title}</p>
          <p><strong>Type:</strong> ${request.request_type.replace(/_/g, ' ')}</p>
          <p><strong>Requested by:</strong> ${request.requested_by_email}</p>
          <p><strong>Budget:</strong> $${request.budget_amount?.toLocaleString() || 'N/A'}</p>
          <p><strong>Estimated Effort:</strong> ${request.estimated_effort_hours || 'N/A'} hours</p>
          <p><strong>Description:</strong></p>
          <p>${request.description}</p>
          <p><a href="${appUrl}/RequestDashboard">Review & Approve</a></p>
        `;
        break;

      case 'approval_decision':
        const decision = custom_message || 'decided';
        subject = `Request ${decision}: ${request.title}`;
        body = `
          <h2>Approval Decision Made</h2>
          <p><strong>Title:</strong> ${request.title}</p>
          <p><strong>Decision:</strong> ${decision.toUpperCase()}</p>
          <p><strong>Approval Status:</strong> ${request.approval_status.toUpperCase()}</p>
          <p><a href="${appUrl}/RequestDashboard">View Request Details</a></p>
        `;
        break;

      case 'completion':
        subject = `Request Completed: ${request.title}`;
        body = `
          <h2>Request Completed Successfully</h2>
          <p><strong>Title:</strong> ${request.title}</p>
          <p><strong>Completed by:</strong> ${request.assigned_to_email || 'System'}</p>
          <p>Your request has been completed. Please review the outcome and provide feedback if needed.</p>
          <p><a href="${appUrl}/RequestDashboard">View Request Details</a></p>
        `;
        break;

      case 'sla_breach':
        subject = `⚠️ SLA Breach Alert: ${request.title}`;
        body = `
          <h2>SLA Breach Detected</h2>
          <p><strong>Title:</strong> ${request.title}</p>
          <p><strong>Status:</strong> ${request.status.replace(/_/g, ' ').toUpperCase()}</p>
          <p><strong>Created:</strong> ${new Date(request.created_date).toLocaleDateString()}</p>
          <p>This request has not received a response within the 72-hour SLA window.</p>
          <p><strong>Action Required:</strong> Please review and respond immediately.</p>
          <p><a href="${appUrl}/RequestDashboard">View Request Dashboard</a></p>
        `;
        break;

      default:
        return Response.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    // Send email
    await base44.integrations.Core.SendEmail({
      from_name: 'Curiosity Led - Request Management',
      to: recipient_email,
      subject: subject,
      body: body
    });

    return Response.json({ 
      success: true, 
      message: 'Notification sent successfully' 
    });

  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});