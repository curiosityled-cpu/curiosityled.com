import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { waitUntil } from 'base44:runtime';

/**
 * Activates a review cycle and sends launch notifications to all assigned participants.
 * Sets the cycle (CustomForm form_type='review_cycle') status to 'active'.
 * Sends in-app notifications + email to each employee, manager, and peer reviewer.
 *
 * Payload: { review_cycle_id: string }
 * Returns: { launched: boolean, cycle_title: string, participants_notified: number }
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { review_cycle_id } = body;

    if (!review_cycle_id) return Response.json({ error: "review_cycle_id required" }, { status: 400 });

    const clientId = user.data?.client_id;

    // Fetch the cycle
    const cycle = await base44.asServiceRole.entities.CustomForm.get(review_cycle_id);
    if (!cycle || cycle.form_type !== "review_cycle") {
      return Response.json({ error: "Review cycle not found" }, { status: 404 });
    }

    // Set cycle to active
    await base44.asServiceRole.entities.CustomForm.update(review_cycle_id, { status: "active" });

    // Get roster
    const roster = await base44.asServiceRole.entities.ReviewParticipant.filter({
      review_cycle_id,
      client_id: clientId,
    });

    const cycleTitle = cycle.title || "Review Cycle";

    // Send notifications (post-response, non-blocking)
    waitUntil((async () => {
      const notifiedEmails = new Set<string>();

      for (const p of roster) {
        // Employee self-assessment notification
        if (p.employee_email && !notifiedEmails.has(p.employee_email)) {
          notifiedEmails.add(p.employee_email);
          try {
            await base44.asServiceRole.entities.Notification.create({
              user_email: p.employee_email,
              title: `Review Cycle Launched: ${cycleTitle}`,
              message: "You have been assigned to a review cycle. Please complete your self-assessment.",
              type: "review_assigned",
              is_read: false,
            });
            await base44.integrations.Core.SendEmail({
              to: p.employee_email,
              subject: `Review Cycle Launched: ${cycleTitle}`,
              body: `Hello,\n\nYou have been assigned to the "${cycleTitle}" review cycle. Please log in to Curiosity Led to complete your self-assessment.\n\nThank you.`,
            });
          } catch (e) { /* continue on individual failure */ }
        }

        // Manager review notification
        if (p.manager_email && !notifiedEmails.has(p.manager_email + ":mgr")) {
          notifiedEmails.add(p.manager_email + ":mgr");
          try {
            await base44.asServiceRole.entities.Notification.create({
              user_email: p.manager_email,
              title: `Manager Review Assigned: ${cycleTitle}`,
              message: `You have been assigned to complete a manager review for ${p.employee_name || p.employee_email}.`,
              type: "review_assigned",
              is_read: false,
            });
            await base44.integrations.Core.SendEmail({
              to: p.manager_email,
              subject: `Manager Review Assigned: ${cycleTitle}`,
              body: `Hello,\n\nYou have been assigned to complete a manager review for ${p.employee_name || p.employee_email} in the "${cycleTitle}" review cycle. Please log in to Curiosity Led to complete the review.\n\nThank you.`,
            });
          } catch (e) { /* continue */ }
        }

        // Peer reviewer notifications
        if (p.peer_emails && Array.isArray(p.peer_emails)) {
          for (const peerEmail of p.peer_emails) {
            if (!notifiedEmails.has(peerEmail + ":peer")) {
              notifiedEmails.add(peerEmail + ":peer");
              try {
                await base44.asServiceRole.entities.Notification.create({
                  user_email: peerEmail,
                  title: `Peer Feedback Request: ${cycleTitle}`,
                  message: `You have been asked to provide peer feedback for ${p.employee_name || p.employee_email}.`,
                  type: "review_assigned",
                  is_read: false,
                });
                await base44.integrations.Core.SendEmail({
                  to: peerEmail,
                  subject: `Peer Feedback Request: ${cycleTitle}`,
                  body: `Hello,\n\nYou have been asked to provide peer feedback for ${p.employee_name || p.employee_email} in the "${cycleTitle}" review cycle. Please log in to Curiosity Led to complete the feedback.\n\nThank you.`,
                });
              } catch (e) { /* continue */ }
            }
          }
        }
      }
    })());

    return Response.json({
      launched: true,
      cycle_title: cycleTitle,
      participants_notified: roster.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}