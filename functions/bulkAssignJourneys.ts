import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Enhanced bulk journey assignment with role-based permissions and audit logging
 * Assigns learning journeys to multiple users
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

    const { journey_id, user_emails, due_date, notify = true } = await req.json();

    // Validate required fields
    if (!journey_id || !user_emails || !Array.isArray(user_emails) || user_emails.length === 0) {
      return Response.json({
        error: 'journey_id and user_emails array are required'
      }, { status: 400 });
    }

    // Get the learning journey
    const journeys = await base44.asServiceRole.entities.LearningJourney.filter({ id: journey_id });
    if (journeys.length === 0) {
      return Response.json({ error: 'Learning journey not found' }, { status: 404 });
    }
    const journey = journeys[0];

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
        // Check if user already enrolled in this journey
        const existingEnrollments = await base44.asServiceRole.entities.JourneyEnrollment.filter({
          journey_id: journey_id,
          user_email: userEmail,
          status: { $in: ['not_started', 'in_progress'] }
        });

        if (existingEnrollments.length > 0) {
          errors.push({
            user_email: userEmail,
            error: 'User already enrolled in this journey'
          });
          continue;
        }

        // Create enrollment
        const enrollment = await base44.asServiceRole.entities.JourneyEnrollment.create({
          journey_id: journey_id,
          user_email: userEmail,
          enrolled_date: new Date().toISOString(),
          enrolled_by: currentUser.email,
          status: 'not_started',
          completion_percentage: 0,
          content_progress: (journey.content_structure || []).map(content => ({
            learning_resource_id: content.learning_resource_id,
            status: 'not_started'
          })),
          due_date: due_date || null
        });

        results.push({
          user_email: userEmail,
          enrollment_id: enrollment.id,
          success: true
        });

        // Create notification
        const notification = await base44.asServiceRole.entities.Notification.create({
          user_email: userEmail,
          type: 'learning_assigned',
          title: 'New Learning Journey Assigned',
          message: `${currentUser.full_name} has enrolled you in the learning journey: ${journey.title}`,
          scheduled_for: new Date().toISOString(),
          status: 'pending',
          related_entity_type: 'LearningJourney',
          related_entity_id: journey_id,
          action_url: `/MyJourneys?journeyId=${journey_id}`,
          priority: 'medium'
        });

        notifications.push(notification);

        // Send email if notify is true
        if (notify) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: userEmail,
            subject: `New Learning Journey: ${journey.title}`,
            body: `
              <h2>New Learning Journey Assigned</h2>
              <p>Hi there,</p>
              <p>${currentUser.full_name} has enrolled you in a learning journey to support your development.</p>
              <h3>${journey.title}</h3>
              <p>${journey.description || ''}</p>
              <p><strong>Type:</strong> ${journey.type === 'learning_path' ? 'Learning Path (sequential)' : 'Curriculum (flexible)'}</p>
              ${journey.estimated_duration_days ? `<p><strong>Estimated Duration:</strong> ${journey.estimated_duration_days} days</p>` : ''}
              ${due_date ? `<p><strong>Target Completion:</strong> ${new Date(due_date).toLocaleDateString()}</p>` : ''}
              <p><strong>Resources:</strong> ${journey.content_structure?.length || 0} learning items</p>
              <p><a href="${Deno.env.get('APP_URL') || 'https://app.base44.com'}/MyJourneys?journeyId=${journey_id}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Start Your Journey</a></p>
            `
          });
        }

        // Create activity log
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: new Date().toISOString(),
          initiator_user_email: currentUser.email,
          action_type: 'JOURNEY_ASSIGNED',
          target_user_email: userEmail,
          new_value: journey.title,
          metadata: {
            journey_id: journey_id,
            journey_title: journey.title,
            journey_type: journey.type,
            content_count: journey.content_structure?.length || 0,
            due_date: due_date || null,
            enrollment_id: enrollment.id
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
    console.error('Error in bulkAssignJourneys:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});