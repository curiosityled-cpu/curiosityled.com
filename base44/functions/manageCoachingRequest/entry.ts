import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const CATEGORY_TO_ENGAGEMENT = {
  '1on1_coaching': '1on1_coaching',
  'group_coaching': 'team_effectiveness',
  'team_coaching': 'team_effectiveness',
  'workshop': 'leadership_development',
  'consultation': 'career_coaching',
  'assessment': 'performance_improvement',
};

const CATEGORY_TO_ROLE = {
  '1on1_coaching': 'Leadership Coach',
  'group_coaching': 'Leadership Coach',
  'team_coaching': 'Leadership Coach',
  'workshop': 'Consultant',
  'consultation': 'Consultant',
  'assessment': 'Consultant',
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, request_id, ...payload } = body;

    if (!action) return Response.json({ error: 'action is required' }, { status: 400 });

    // Fetch the request (user-scoped — RLS gates access)
    let requestRecord;
    if (request_id) {
      try {
        requestRecord = await base44.entities.CoachingRequest.get(request_id);
      } catch (e) {
        return Response.json({ error: 'Request not found or access denied' }, { status: 404 });
      }
    }

    const notify = async (user_email, title, message, action_url) => {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email,
          type: 'goal_assignment',
          title,
          message,
          action_url: action_url || '',
          status: 'pending',
          is_read: false,
          priority: 'medium',
        });
      } catch (e) {
        console.warn('Notification failed:', e?.message);
      }
    };

    switch (action) {
      case 'scheduleIntake': {
        await base44.entities.CoachingRequest.update(request_id, {
          status: 'intake_scheduled',
          intake_scheduled_date: payload.intake_scheduled_date || null,
        });
        if (requestRecord?.requested_by_email) {
          await notify(
            requestRecord.requested_by_email,
            'Intake Conversation Scheduled',
            `Your ${requestRecord.title} request has an intake conversation scheduled.`,
            '/request-submit'
          );
        }
        return Response.json({ ok: true, status: 'intake_scheduled' });
      }

      case 'completeIntake': {
        await base44.entities.CoachingRequest.update(request_id, {
          status: 'intake_complete',
          intake_notes: payload.intake_notes || '',
        });
        return Response.json({ ok: true, status: 'intake_complete' });
      }

      case 'bypassIntake': {
        await base44.entities.CoachingRequest.update(request_id, {
          status: 'approved',
          intake_bypassed: true,
        });
        return Response.json({ ok: true, status: 'approved' });
      }

      case 'approve': {
        await base44.entities.CoachingRequest.update(request_id, {
          status: 'approved',
        });
        return Response.json({ ok: true, status: 'approved' });
      }

      case 'reject': {
        await base44.entities.CoachingRequest.update(request_id, {
          status: 'rejected',
          notes: payload.rejection_reason || '',
        });
        if (requestRecord?.requested_by_email) {
          await notify(
            requestRecord.requested_by_email,
            'Request Update',
            `Your "${requestRecord.title}" request was not approved at this time.`,
            '/request-submit'
          );
        }
        return Response.json({ ok: true, status: 'rejected' });
      }

      case 'assign': {
        const practitioner_email = payload.assigned_practitioner_email;
        if (!practitioner_email) return Response.json({ error: 'assigned_practitioner_email required' }, { status: 400 });
        const role = CATEGORY_TO_ROLE[requestRecord.request_category] || 'Leadership Coach';
        await base44.entities.CoachingRequest.update(request_id, {
          status: 'assigned',
          assigned_practitioner_email: practitioner_email,
          assigned_practitioner_role: role,
          decline_reason: '',
        });
        await notify(
          practitioner_email,
          'New Request Assigned to You',
          `You have a new ${requestRecord.title} request to review.`,
          role === 'Consultant' ? '/consultant-workspace' : '/coach-workspace'
        );
        return Response.json({ ok: true, status: 'assigned' });
      }

      case 'accept': {
        if (requestRecord.status !== 'assigned' && requestRecord.status !== 'declined') {
          return Response.json({ error: 'Request is not in an assignable state' }, { status: 400 });
        }
        const engagementType = CATEGORY_TO_ENGAGEMENT[requestRecord.request_category] || '1on1_coaching';
        const engagement = await base44.entities.CoachingEngagement.create({
          client_id: requestRecord.client_id,
          coach_email: user.email,
          coachee_email: requestRecord.participant_scope === 'individual' ? requestRecord.participant_identifier : '',
          team_member_emails: requestRecord.participant_scope === 'team' && requestRecord.participant_identifier
            ? [requestRecord.participant_identifier] : [],
          title: requestRecord.title,
          description: requestRecord.description || '',
          engagement_type: engagementType,
          status: 'active',
          start_date: requestRecord.requested_start_date || new Date().toISOString().split('T')[0],
          competency_focus: requestRecord.competency_focus || [],
          program_id: '',
          related_journey_id: '',
          confidentiality_level: 'confidential',
          notes: `Created from coaching request. Requestor: ${requestRecord.requested_by_email}`,
        });
        await base44.entities.CoachingRequest.update(request_id, {
          status: 'engagement_created',
          linked_engagement_id: engagement.id,
        });
        if (requestRecord.requested_by_email) {
          await notify(
            requestRecord.requested_by_email,
            'Your Request Has Been Accepted',
            `Your "${requestRecord.title}" request has been accepted and an engagement has been created.`,
            '/request-submit'
          );
        }
        return Response.json({ ok: true, status: 'engagement_created', engagement_id: engagement.id });
      }

      case 'decline': {
        if (requestRecord.status !== 'assigned') {
          return Response.json({ error: 'Only assigned requests can be declined' }, { status: 400 });
        }
        await base44.entities.CoachingRequest.update(request_id, {
          status: 'declined',
          decline_reason: payload.decline_reason || '',
        });
        // Immediately reopen for reassignment
        await base44.entities.CoachingRequest.update(request_id, {
          status: 'assigned',
          assigned_practitioner_email: '',
          assigned_practitioner_role: '',
        });
        if (requestRecord.designated_program_admin_email) {
          await notify(
            requestRecord.designated_program_admin_email,
            'Request Declined — Reassignment Needed',
            `A practitioner declined "${requestRecord.title}". Reason: ${payload.decline_reason || 'No reason given'}. Please reassign.`,
            '/request-triage'
          );
        }
        return Response.json({ ok: true, status: 'assigned' });
      }

      case 'updateProgress': {
        if (!requestRecord.linked_engagement_id) {
          return Response.json({ error: 'No linked engagement' }, { status: 400 });
        }
        const engagement = await base44.entities.CoachingEngagement.get(requestRecord.linked_engagement_id);
        let newStatus = requestRecord.status;
        if (engagement.status === 'completed' || engagement.status === 'terminated') {
          newStatus = 'completed';
        } else if (engagement.sessions_completed > 0 || engagement.status === 'active') {
          newStatus = 'in_progress';
        }
        if (newStatus !== requestRecord.status) {
          await base44.entities.CoachingRequest.update(request_id, { status: newStatus });
          if (newStatus === 'completed' && requestRecord.requested_by_email) {
            await notify(
              requestRecord.requested_by_email,
              'Your Engagement Is Complete',
              `Your "${requestRecord.title}" engagement has been marked complete.`,
              '/request-submit'
            );
          }
        }
        return Response.json({ ok: true, status: newStatus });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('manageCoachingRequest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}