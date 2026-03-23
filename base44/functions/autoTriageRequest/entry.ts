import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id } = await req.json();

    if (!request_id) {
      return Response.json({ error: 'request_id is required' }, { status: 400 });
    }

    // Fetch the request
    const requests = await base44.asServiceRole.entities.DevelopmentRequest.filter({ id: request_id });
    
    if (requests.length === 0) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    const request = requests[0];

    // Auto-determine if approval is needed based on thresholds
    let requiresApproval = false;
    const approvalReasons = [];

    if (request.estimated_effort_hours && request.estimated_effort_hours > 8) {
      requiresApproval = true;
      approvalReasons.push('High effort (>8 hours)');
    }

    if (request.budget_amount && request.budget_amount > 5000) {
      requiresApproval = true;
      approvalReasons.push('High budget (>$5,000)');
    }

    if (request.audience_size && request.audience_size > 100) {
      requiresApproval = true;
      approvalReasons.push('Large audience (>100 users)');
    }

    const hasRisks = request.risk_flags?.some(flag => flag !== 'none');
    if (hasRisks) {
      requiresApproval = true;
      approvalReasons.push('Risk flags present');
    }

    // Fetch Program Admins with specializations matching the request type
    const allUsersResponse = await base44.asServiceRole.functions.invoke('listAllUsers');
    const allUsers = allUsersResponse.data?.success ? 
      allUsersResponse.data.users.filter(u => 
        u.app_role === 'Admin Level 1' && u.client_id === request.client_id
      ) : [];

    const specializationMap = {
      'learning_content': 'elearning',
      'program_creation': 'ilt_vilt',
      'assessment_development': 'assessment',
      'coaching_support': 'coaching',
      'reporting': 'analytics_reporting',
      'platform_support': 'platform_support'
    };

    const targetSpec = specializationMap[request.request_type];
    
    // Find best match based on specialization
    let suggestedAssignee = null;
    
    if (targetSpec) {
      const matchingAdmins = allUsers.filter(u => 
        u.specializations && u.specializations.includes(targetSpec)
      );
      
      if (matchingAdmins.length > 0) {
        // Sort by current workload (least assigned requests)
        const workloadPromises = matchingAdmins.map(async admin => {
          const assigned = await base44.asServiceRole.entities.DevelopmentRequest.filter({
            assigned_to_email: admin.email,
            status: { $in: ['assigned', 'in_progress', 'awaiting_approval'] }
          });
          return { admin, workload: assigned.length };
        });
        
        const workloads = await Promise.all(workloadPromises);
        workloads.sort((a, b) => a.workload - b.workload);
        suggestedAssignee = workloads[0].admin.email;
      }
    }

    // Build approval chain if needed
    let approvalChain = [];
    if (requiresApproval) {
      // Get HR Admin (Admin Level 2)
      const hrAdminsResponse = await base44.asServiceRole.functions.invoke('listAllUsers');
      const hrAdmins = hrAdminsResponse.data?.success ?
        hrAdminsResponse.data.users.filter(u => 
          u.app_role === 'Admin Level 2' && u.client_id === request.client_id
        ) : [];

      if (hrAdmins.length > 0) {
        approvalChain.push({
          approver_email: hrAdmins[0].email,
          sequence: 1,
          status: 'pending'
        });
      }
    }

    const updates = {
      status: 'triaging',
      requires_approval: requiresApproval,
      approval_status: requiresApproval ? 'pending' : 'not_required',
      approval_chain: approvalChain.length > 0 ? approvalChain : undefined
    };

    await base44.asServiceRole.entities.DevelopmentRequest.update(request_id, updates);

    return Response.json({
      success: true,
      requires_approval: requiresApproval,
      approval_reasons: approvalReasons,
      suggested_assignee: suggestedAssignee,
      approval_chain: approvalChain
    });
  } catch (error) {
    console.error('Auto-triage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});