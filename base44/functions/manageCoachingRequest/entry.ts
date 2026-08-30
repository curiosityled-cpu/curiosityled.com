import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  categoryToRole,
  categoryToEngagementType,
  COACHING_CATEGORIES,
} from '../../shared/coachingRequestRouting.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, request_id, payload } = body;

    if (!action || !request_id) {
      return Response.json({ error: 'action and request_id are required' }, { status: 400 });
    }

    // Fetch the request (user-scoped — RLS ensures the caller can see it)
    const requests = await base44.entities.CoachingRequest.filter({ id: request_id });
    if (requests.length === 0) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }
    const request = requests[0];

    const userEmail = user.email;
    const userRole = user.app_role || user.data?.app_role || user.role;
    const isPlatformAdmin = userRole === 'Platform Admin';

    // ─── ACCEPT: practitioner accepts the assignment → create engagement ───
    if (action === 'accept') {
      const isAssignedPractitioner = request.assigned_practitioner_email === userEmail;
      if (!isAssignedPractitioner && !isPlatformAdmin) {
        return Response.json({ error: 'Only the assigned practitioner can accept this request' }, { status: 403 });
      }
      if (request.status !== 'assigned' && request.status !== 'declined') {
        return Response.json({ error: `Request must be in 'assigned' or 'declined' state to accept (currently: ${request.status})` }, { status: 400 });
      }

      const engagementType = categoryToEngagementType(request.request_category);
      const participantEmail = request.participant_scope === 'individual' ? request.participant_email : null;
      const teamEmails = request.participant_scope !== 'individual' ? (request.participant_emails || []) : [];

      const engagement = await base44.entities.CoachingEngagement.create({
        client_id: request.client_id,
        coach_email: userEmail,
        coachee_email: participantEmail,
        team_member_emails: teamEmails,
        title: request.title,
        description: request.description,
        engagement_type: engagementType,
        status: 'pending',
        total_sessions_planned: request.sessions_planned || null,
        sponsor_email: request.sponsor_email || request.requested_by_email,
        competency_focus: request.competency_focus || [],
        request_id: request.id,
      });

      const now = new Date().toISOString();
      await base44.entities.CoachingRequest.update(request.id, {
        status: 'engagement_created',
        linked_engagement_id: engagement.id,
        decline_reason: null,
      });

      // Notify the requestor
      await base44.entities.Notification.create({
        user_email: request.requested_by_email,
        title: 'Request Accepted',
        message: `Your ${request.title} request has been accepted and an engagement has been created.`,
        type: 'coaching_request',
        related_entity_id: request.id,
        is_read: false,
      }).catch(() => {});

      return Response.json({ ok: true, engagement_id: engagement.id, status: 'engagement_created' });
    }

    // ─── DECLINE: practitioner declines → loop back to assigned ───
    if (action === 'decline') {
      const isAssignedPractitioner = request.assigned_practitioner_email === userEmail;
      if (!isAssignedPractitioner && !isPlatformAdmin) {
        return Response.json({ error: 'Only the assigned practitioner can decline this request' }, { status: 403 });
      }
      if (request.status !== 'assigned') {
        return Response.json({ error: `Request must be in 'assigned' state to decline (currently: ${request.status})` }, { status: 400 });
      }

      const reason = payload?.decline_reason || '';
      await base44.entities.CoachingRequest.update(request.id, {
        status: 'assigned',
        decline_reason: reason,
        decline_count: (request.decline_count || 0) + 1,
        assigned_practitioner_email: null,
        assigned_practitioner_role: null,
      });

      // Notify the Program Admin
      if (request.designated_program_admin_email) {
        await base44.entities.Notification.create({
          user_email: request.designated_program_admin_email,
          title: 'Assignment Declined',
          message: `The practitioner declined "${request.title}". Reason: ${reason || 'No reason given'}. Please reassign.`,
          type: 'coaching_request',
          related_entity_id: request.id,
          is_read: false,
        }).catch(() => {});
      }

      return Response.json({ ok: true, status: 'assigned', decline_count: (request.decline_count || 0) + 1 });
    }

    // ─── ASSIGN: Program Admin assigns a request to a practitioner ───
    if (action === 'assign') {
      const canAssign = userRole === 'Admin Level 1' || userRole === 'Admin Level 2' || userRole === 'Super Administrator' || isPlatformAdmin;
      if (!canAssign) {
        return Response.json({ error: 'Only Program Administrators can assign requests' }, { status: 403 });
      }
      const practitionerEmail = payload?.assigned_practitioner_email;
      if (!practitionerEmail) {
        return Response.json({ error: 'assigned_practitioner_email is required' }, { status: 400 });
      }

      const role = categoryToRole(request.request_category);
      const now = new Date().toISOString();
      const updateData = {
        status: 'assigned',
        assigned_practitioner_email: practitionerEmail,
        assigned_practitioner_role: role,
        decline_reason: null,
      };
      if (!request.first_response_at) {
        updateData.first_response_at = now;
      }

      await base44.entities.CoachingRequest.update(request.id, updateData);

      // Notify the practitioner
      await base44.entities.Notification.create({
        user_email: practitionerEmail,
        title: `New ${role} Assignment`,
        message: `You have been assigned "${request.title}". Review and accept or decline.`,
        type: 'coaching_request',
        related_entity_id: request.id,
        is_read: false,
      }).catch(() => {});

      return Response.json({ ok: true, status: 'assigned' });
    }

    // ─── APPROVE: Program Admin approves after intake (or bypass) ───
    if (action === 'approve') {
      const canApprove = userRole === 'Admin Level 1' || userRole === 'Admin Level 2' || userRole === 'Super Administrator' || isPlatformAdmin;
      if (!canApprove) {
        return Response.json({ error: 'Only Program Administrators can approve requests' }, { status: 403 });
      }
      if (request.status !== 'intake_complete' && request.status !== 'submitted') {
        return Response.json({ error: `Request must be in 'submitted' or 'intake_complete' to approve (currently: ${request.status})` }, { status: 400 });
      }

      const now = new Date().toISOString();
      const updateData = { status: 'approved' };
      if (!request.first_response_at) {
        updateData.first_response_at = now;
      }
      await base44.entities.CoachingRequest.update(request.id, updateData);

      // Notify the requestor
      await base44.entities.Notification.create({
        user_email: request.requested_by_email,
        title: 'Request Approved',
        message: `Your request "${request.title}" has been approved and is ready for assignment.`,
        type: 'coaching_request',
        related_entity_id: request.id,
        is_read: false,
      }).catch(() => {});

      return Response.json({ ok: true, status: 'approved' });
    }

    // ─── REJECT: Program Admin rejects ───
    if (action === 'reject') {
      const canReject = userRole === 'Admin Level 1' || userRole === 'Admin Level 2' || userRole === 'Super Administrator' || isPlatformAdmin;
      if (!canReject) {
        return Response.json({ error: 'Only Program Administrators can reject requests' }, { status: 403 });
      }
      const reason = payload?.rejection_reason || '';
      await base44.entities.CoachingRequest.update(request.id, {
        status: 'rejected',
        intake_notes: reason ? `${request.intake_notes || ''}\n\nRejection reason: ${reason}`.trim() : request.intake_notes,
      });

      await base44.entities.Notification.create({
        user_email: request.requested_by_email,
        title: 'Request Rejected',
        message: `Your request "${request.title}" was not approved. ${reason ? 'Reason: ' + reason : ''}`,
        type: 'coaching_request',
        related_entity_id: request.id,
        is_read: false,
      }).catch(() => {});

      return Response.json({ ok: true, status: 'rejected' });
    }

    // ─── COMPLETE_INTAKE: Program Admin marks intake conversation done ───
    if (action === 'complete_intake') {
      const canTriage = userRole === 'Admin Level 1' || userRole === 'Admin Level 2' || userRole === 'Super Administrator' || isPlatformAdmin;
      if (!canTriage) {
        return Response.json({ error: 'Only Program Administrators can complete intake' }, { status: 403 });
      }
      const notes = payload?.intake_notes || '';
      const sessionsPlanned = payload?.sessions_planned;
      const priority = payload?.priority;
      const competencyFocus = payload?.competency_focus;

      const updateData = {
        status: 'intake_complete',
        intake_notes: notes,
        intake_completed_date: new Date().toISOString(),
      };
      if (sessionsPlanned) updateData.sessions_planned = sessionsPlanned;
      if (priority) updateData.priority = priority;
      if (competencyFocus) updateData.competency_focus = competencyFocus;

      await base44.entities.CoachingRequest.update(request.id, updateData);
      return Response.json({ ok: true, status: 'intake_complete' });
    }

    // ─── SCHEDULE_INTAKE ───
    if (action === 'schedule_intake') {
      const canTriage = userRole === 'Admin Level 1' || userRole === 'Admin Level 2' || userRole === 'Super Administrator' || isPlatformAdmin;
      if (!canTriage) {
        return Response.json({ error: 'Only Program Administrators can schedule intake' }, { status: 403 });
      }
      const scheduledDate = payload?.intake_scheduled_date;
      await base44.entities.CoachingRequest.update(request.id, {
        status: 'intake_scheduled',
        intake_scheduled_date: scheduledDate || new Date().toISOString(),
      });
      return Response.json({ ok: true, status: 'intake_scheduled' });
    }

    // ─── BYPASS_INTAKE: Program Admin bypasses intake → straight to approved ───
    if (action === 'bypass_intake') {
      const canTriage = userRole === 'Admin Level 1' || userRole === 'Admin Level 2' || userRole === 'Super Administrator' || isPlatformAdmin;
      if (!canTriage) {
        return Response.json({ error: 'Only Program Administrators can bypass intake' }, { status: 403 });
      }
      const now = new Date().toISOString();
      const updateData = {
        status: 'approved',
        intake_bypassed: true,
      };
      if (!request.first_response_at) {
        updateData.first_response_at = now;
      }
      await base44.entities.CoachingRequest.update(request.id, updateData);
      return Response.json({ ok: true, status: 'approved' });
    }

    // ─── START: mark engagement in progress ───
    if (action === 'start') {
      if (request.linked_engagement_id) {
        await base44.entities.CoachingEngagement.update(request.linked_engagement_id, { status: 'active' });
      }
      await base44.entities.CoachingRequest.update(request.id, { status: 'in_progress' });
      return Response.json({ ok: true, status: 'in_progress' });
    }

    // ─── COMPLETE: mark request + engagement completed ───
    if (action === 'complete') {
      const canComplete = request.assigned_practitioner_email === userEmail || userRole === 'Admin Level 1' || userRole === 'Admin Level 2' || userRole === 'Super Administrator' || isPlatformAdmin;
      if (!canComplete) {
        return Response.json({ error: 'Not authorized to complete this request' }, { status: 403 });
      }
      const resultSummary = payload?.result_summary || '';
      const now = new Date().toISOString();

      if (request.linked_engagement_id) {
        await base44.entities.CoachingEngagement.update(request.linked_engagement_id, {
          status: 'completed',
          actual_end_date: now.split('T')[0],
        });
      }
      await base44.entities.CoachingRequest.update(request.id, {
        status: 'completed',
        completed_at: now,
        result_summary: resultSummary,
      });

      // Notify requestor
      await base44.entities.Notification.create({
        user_email: request.requested_by_email,
        title: 'Engagement Completed',
        message: `Your engagement "${request.title}" has been marked complete.`,
        type: 'coaching_request',
        related_entity_id: request.id,
        is_read: false,
      }).catch(() => {});

      return Response.json({ ok: true, status: 'completed' });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('manageCoachingRequest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}