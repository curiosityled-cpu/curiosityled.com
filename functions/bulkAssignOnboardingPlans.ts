import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Bulk assigns onboarding plans to multiple users
 * Includes permission validation and audit logging
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canAssignRoles = ['User Level 2', 'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'];
    if (!canAssignRoles.includes(currentUser.app_role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { plan_id, user_emails, due_date, notify = true } = await req.json();

    // Validate required fields
    if (!plan_id || !user_emails || !Array.isArray(user_emails) || user_emails.length === 0) {
      return Response.json({
        error: 'plan_id and user_emails array are required'
      }, { status: 400 });
    }

    // Get the onboarding plan
    const plans = await base44.asServiceRole.entities.OnboardingPlan.filter({ id: plan_id });
    if (plans.length === 0) {
      return Response.json({ error: 'Onboarding plan not found' }, { status: 404 });
    }
    const plan = plans[0];

    // Verify user can assign to all target users
    const assignableResponse = await base44.functions.invoke('getAssignableUsers', {
      include_metadata: false
    });

    if (!assignableResponse.data?.success) {
      return Response.json({ error: 'Failed to verify assignable users' }, { status: 500 });
    }

    const assignableEmails = assignableResponse.data.data.assignable_users.map(u => u.email);
    const unauthorizedUsers = user_emails.filter(email => !assignableEmails.includes(email));

    if (unauthorizedUsers.length > 0) {
      return Response.json({
        error: 'You do not have permission to assign to some users',
        unauthorized_users: unauthorizedUsers
      }, { status: 403 });
    }

    // Perform bulk assignment
    const results = [];
    const errors = [];
    const notifications = [];

    for (const userEmail of user_emails) {
      try {
        // Check if user already has this plan assigned
        const existingAssignments = await base44.asServiceRole.entities.OnboardingPlan.filter({
          assigned_to_email: userEmail,
          title: plan.title,
          status: { $in: ['assigned', 'in_progress'] }
        });

        if (existingAssignments.length > 0) {
          errors.push({
            user_email: userEmail,
            error: 'User already has this onboarding plan assigned'
          });
          continue;
        }

        // Create a copy of the plan for this user
        const assignedPlan = await base44.asServiceRole.entities.OnboardingPlan.create({
          client_id: currentUser.client_id,
          title: plan.title,
          assigned_to_email: userEmail,
          assigned_by: currentUser.email,
          status: 'assigned',
          target_role: plan.target_role,
          duration_days: plan.duration_days,
          description: plan.description,
          context: plan.context,
          milestones: plan.milestones,
          ai_generated: plan.ai_generated || false
        });

        results.push({
          user_email: userEmail,
          plan_id: assignedPlan.id,
          success: true
        });

        // Create notification
        const notification = await base44.asServiceRole.entities.Notification.create({
          user_email: userEmail,
          type: 'onboarding_plan_assigned',
          title: 'New Onboarding Plan Assigned',
          message: `${currentUser.full_name} has assigned you an onboarding plan: ${plan.title}`,
          scheduled_for: new Date().toISOString(),
          status: 'pending',
          related_entity_type: 'OnboardingPlan',
          related_entity_id: assignedPlan.id,
          action_url: `/MyOnboarding?planId=${assignedPlan.id}`,
          priority: 'high'
        });

        notifications.push(notification);

        // Send email if notify is true
        if (notify) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: userEmail,
            subject: `New Onboarding Plan: ${plan.title}`,
            body: `
              <h2>New Onboarding Plan Assigned</h2>
              <p>Hi there,</p>
              <p>${currentUser.full_name} has assigned you an onboarding plan to help you succeed in your role.</p>
              <h3>${plan.title}</h3>
              <p>${plan.description || ''}</p>
              <p><strong>Duration:</strong> ${plan.duration_days} days</p>
              ${due_date ? `<p><strong>Target Completion:</strong> ${new Date(due_date).toLocaleDateString()}</p>` : ''}
              <p><a href="${Deno.env.get('APP_URL') || 'https://app.base44.com'}/MyOnboarding?planId=${assignedPlan.id}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View Your Onboarding Plan</a></p>
            `
          });
        }

        // Create activity log
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: new Date().toISOString(),
          initiator_user_email: currentUser.email,
          action_type: 'ONBOARDING_PLAN_DEPLOYED',
          target_user_email: userEmail,
          new_value: plan.title,
          metadata: {
            plan_id: assignedPlan.id,
            plan_title: plan.title,
            duration_days: plan.duration_days,
            due_date: due_date || null
          }
        });

      } catch (error) {
        console.error(`Error assigning to ${userEmail}:`, error);
        errors.push({
          user_email: userEmail,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      data: {
        total_requested: user_emails.length,
        successful_assignments: results.length,
        failed_assignments: errors.length,
        results,
        errors,
        notifications_created: notifications.length
      }
    });

  } catch (error) {
    console.error('Error in bulkAssignOnboardingPlans:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});