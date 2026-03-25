import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { client_id, program_admin_email, date_from, date_to } = payload || {};

    // Fetch all requests for the client
    let allRequests;
    if (client_id) {
      allRequests = await base44.asServiceRole.entities.DevelopmentRequest.filter({ client_id });
    } else if (program_admin_email) {
      allRequests = await base44.asServiceRole.entities.DevelopmentRequest.filter({ assigned_to_email: program_admin_email });
    } else {
      // No filters, get all accessible requests
      allRequests = await base44.asServiceRole.entities.DevelopmentRequest.list();
    }

    // Filter by date range if provided
    const requests = allRequests.filter(req => {
      const createdDate = new Date(req.created_date);
      if (date_from && createdDate < new Date(date_from)) return false;
      if (date_to && createdDate > new Date(date_to)) return false;
      return true;
    });

    // Calculate metrics
    const now = new Date();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

    // Overall stats
    const totalRequests = requests.length;
    const completedRequests = requests.filter(r => r.status === 'completed').length;
    const inProgressRequests = requests.filter(r => ['assigned', 'in_progress'].includes(r.status)).length;
    const awaitingApproval = requests.filter(r => r.status === 'awaiting_approval').length;
    const newRequests = requests.filter(r => r.status === 'new').length;

    // SLA compliance
    const slaBreaches = requests.filter(r => 
      r.status === 'new' && 
      !r.first_response_at &&
      new Date(r.created_date) < threeDaysAgo
    ).length;

    const slaCompliance = totalRequests > 0 
      ? ((totalRequests - slaBreaches) / totalRequests * 100).toFixed(1)
      : 100;

    // Stale tickets (in progress > 14 days without update)
    const staleTickets = requests.filter(r =>
      ['assigned', 'in_progress'].includes(r.status) &&
      new Date(r.updated_date) < fourteenDaysAgo
    ).length;

    // Average response time (for requests with first_response_at)
    const requestsWithResponse = requests.filter(r => r.first_response_at);
    const avgResponseTime = requestsWithResponse.length > 0
      ? requestsWithResponse.reduce((sum, r) => {
          const responseTime = new Date(r.first_response_at) - new Date(r.created_date);
          return sum + responseTime;
        }, 0) / requestsWithResponse.length / (1000 * 60 * 60) // hours
      : 0;

    // Average completion time
    const avgCompletionTime = completedRequests > 0
      ? requests.filter(r => r.completed_at).reduce((sum, r) => {
          const completionTime = new Date(r.completed_at) - new Date(r.created_date);
          return sum + completionTime;
        }, 0) / completedRequests / (1000 * 60 * 60 * 24) // days
      : 0;

    // Completion rate
    const completionRate = totalRequests > 0
      ? (completedRequests / totalRequests * 100).toFixed(1)
      : 0;

    // Breakdown by request type
    const byType = {};
    requests.forEach(r => {
      byType[r.request_type] = (byType[r.request_type] || 0) + 1;
    });

    // Breakdown by priority
    const byPriority = {
      low: requests.filter(r => r.priority === 'low').length,
      medium: requests.filter(r => r.priority === 'medium').length,
      high: requests.filter(r => r.priority === 'high').length,
      urgent: requests.filter(r => r.priority === 'urgent').length
    };

    // Breakdown by status
    const byStatus = {
      new: newRequests,
      triaging: requests.filter(r => r.status === 'triaging').length,
      waiting_on_requester: requests.filter(r => r.status === 'waiting_on_requester').length,
      assigned: requests.filter(r => r.status === 'assigned').length,
      in_progress: requests.filter(r => r.status === 'in_progress').length,
      awaiting_approval: awaitingApproval,
      approved: requests.filter(r => r.status === 'approved').length,
      completed: completedRequests,
      cancelled: requests.filter(r => r.status === 'cancelled').length
    };

    // Program Admin performance (if not filtered by specific admin)
    let programAdminStats = [];
    if (!program_admin_email) {
      const adminEmails = [...new Set(requests.map(r => r.assigned_to_email).filter(Boolean))];
      
      for (const email of adminEmails) {
        const adminRequests = requests.filter(r => r.assigned_to_email === email);
        const adminCompleted = adminRequests.filter(r => r.status === 'completed').length;
        const adminInProgress = adminRequests.filter(r => ['assigned', 'in_progress'].includes(r.status)).length;
        const adminStale = adminRequests.filter(r =>
          ['assigned', 'in_progress'].includes(r.status) &&
          new Date(r.updated_date) < fourteenDaysAgo
        ).length;

        const adminWithResponse = adminRequests.filter(r => r.first_response_at);
        const adminAvgResponse = adminWithResponse.length > 0
          ? adminWithResponse.reduce((sum, r) => {
              return sum + (new Date(r.first_response_at) - new Date(r.created_date));
            }, 0) / adminWithResponse.length / (1000 * 60 * 60)
          : 0;

        const adminCompletedWithTime = adminRequests.filter(r => r.completed_at);
        const adminAvgCompletion = adminCompletedWithTime.length > 0
          ? adminCompletedWithTime.reduce((sum, r) => {
              return sum + (new Date(r.completed_at) - new Date(r.created_date));
            }, 0) / adminCompletedWithTime.length / (1000 * 60 * 60 * 24)
          : 0;

        programAdminStats.push({
          email,
          total: adminRequests.length,
          completed: adminCompleted,
          in_progress: adminInProgress,
          stale: adminStale,
          completion_rate: adminRequests.length > 0 ? (adminCompleted / adminRequests.length * 100).toFixed(1) : 0,
          avg_response_hours: adminAvgResponse.toFixed(1),
          avg_completion_days: adminAvgCompletion.toFixed(1)
        });
      }

      // Sort by total requests
      programAdminStats.sort((a, b) => b.total - a.total);
    }

    return Response.json({
      summary: {
        total_requests: totalRequests,
        completed: completedRequests,
        in_progress: inProgressRequests,
        awaiting_approval: awaitingApproval,
        new: newRequests,
        stale_tickets: staleTickets,
        sla_breaches: slaBreaches,
        sla_compliance_percentage: parseFloat(slaCompliance),
        completion_rate_percentage: parseFloat(completionRate),
        avg_response_time_hours: parseFloat(avgResponseTime.toFixed(1)),
        avg_completion_time_days: parseFloat(avgCompletionTime.toFixed(1))
      },
      breakdown: {
        by_type: byType,
        by_priority: byPriority,
        by_status: byStatus
      },
      program_admins: programAdminStats
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});