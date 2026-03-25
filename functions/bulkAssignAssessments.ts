import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Bulk assigns assessments to multiple users
 * Sends assessment invitations with due dates
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

    const {
      assessment_type = 'leadership_index',
      user_emails,
      due_date,
      custom_message,
      notify = true
    } = await req.json();

    // Validate required fields
    if (!user_emails || !Array.isArray(user_emails) || user_emails.length === 0) {
      return Response.json({
        error: 'user_emails array is required'
      }, { status: 400 });
    }

    if (!due_date) {
      return Response.json({
        error: 'due_date is required for assessment assignments'
      }, { status: 400 });
    }

    // Verify user can assign to all target users
    const assignableResponse = await base44.functions.invoke('getAssignableUsers', {
      include_metadata: true
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

    // Get metadata to check who has already completed assessments
    const metadata = assignableResponse.data.data.metadata || {};
    const assessmentCompletion = metadata.assessment_completion || {};

    // Filter out users who already have assessments (optional - can be configurable)
    const usersNeedingAssessment = user_emails.filter(email => !assessmentCompletion[email]);

    // Perform bulk assignment
    const results = [];
    const errors = [];
    const notifications = [];

    // Assessment URLs by type
    const assessmentUrls = {
      leadership_index: '/LeadershipAssessment',
      custom: '/Assessment'
    };

    const assessmentNames = {
      leadership_index: 'Leadership Index Assessment',
      custom: 'Custom Assessment'
    };

    for (const userEmail of user_emails) {
      try {
        // Create notification for assessment due
        const notification = await base44.asServiceRole.entities.Notification.create({
          user_email: userEmail,
          type: 'assessment_due',
          title: `${assessmentNames[assessment_type]} Assigned`,
          message: custom_message || `${currentUser.full_name} has requested that you complete the ${assessmentNames[assessment_type]}. Please complete it by ${new Date(due_date).toLocaleDateString()}.`,
          scheduled_for: new Date().toISOString(),
          status: 'pending',
          related_entity_type: 'Assessment',
          related_entity_id: null, // Will be filled once assessment is submitted
          action_url: assessmentUrls[assessment_type],
          priority: 'high',
          metadata: {
            assessment_type,
            assigned_by: currentUser.email,
            due_date
          }
        });

        notifications.push(notification);

        // Send email invitation if notify is true
        if (notify) {
          const user = assignableResponse.data.data.assignable_users.find(u => u.email === userEmail);
          
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: userEmail,
            subject: `Assessment Required: ${assessmentNames[assessment_type]}`,
            body: `
              <h2>Leadership Assessment Invitation</h2>
              <p>Hi ${user?.full_name || 'there'},</p>
              <p>${currentUser.full_name} has requested that you complete the <strong>${assessmentNames[assessment_type]}</strong>.</p>
              ${custom_message ? `<p><em>"${custom_message}"</em></p>` : ''}
              <p><strong>Due Date:</strong> ${new Date(due_date).toLocaleDateString()}</p>
              <p>This assessment will help identify your leadership strengths and areas for development. It typically takes 15-20 minutes to complete.</p>
              <p><a href="${Deno.env.get('APP_URL') || 'https://app.base44.com'}${assessmentUrls[assessment_type]}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Take Assessment Now</a></p>
              <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">If you have any questions, please contact ${currentUser.full_name} at ${currentUser.email}.</p>
            `
          });
        }

        // Create activity log
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: new Date().toISOString(),
          initiator_user_email: currentUser.email,
          action_type: 'ASSESSMENT_ASSIGNED',
          target_user_email: userEmail,
          new_value: assessmentNames[assessment_type],
          metadata: {
            assessment_type,
            due_date,
            notification_id: notification.id,
            custom_message: custom_message || null
          }
        });

        results.push({
          user_email: userEmail,
          notification_id: notification.id,
          success: true,
          already_completed: assessmentCompletion[userEmail] || false
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
        assessment_type: assessmentNames[assessment_type],
        total_requested: user_emails.length,
        successful_assignments: results.length,
        failed_assignments: errors.length,
        users_with_existing_assessment: user_emails.length - usersNeedingAssessment.length,
        results,
        errors,
        notifications_created: notifications.length
      }
    });

  } catch (error) {
    console.error('Error in bulkAssignAssessments:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});