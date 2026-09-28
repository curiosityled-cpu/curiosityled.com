import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { waitUntil } from 'base44:runtime';

/**
 * Scheduled function (called by workflow) that processes review cycle deadlines.
 * For each active review cycle:
 *   1. Sends reminder notifications to participants who haven't submitted and are within 3 days of deadline
 *   2. Auto-closes cycles where all submissions are complete or the deadline has passed
 *
 * No payload required — operates across all tenants.
 * Returns: { cycles_checked: number, reminders_sent: number, cycles_closed: number }
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Find all active review cycles across tenants
    const activeCycles = await base44.asServiceRole.entities.CustomForm.filter({
      form_type: "review_cycle",
      status: "active",
    }, "-created_date", 200);

    let remindersSent = 0;
    let cyclesClosed = 0;
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    for (const cycle of activeCycles) {
      const cycleId = cycle.id;
      const clientId = cycle.client_id;
      if (!clientId) continue;

      // Get roster
      const roster = await base44.asServiceRole.entities.ReviewParticipant.filter({
        review_cycle_id: cycleId,
        client_id: clientId,
      });

      // Get submissions
      const submissions = await base44.asServiceRole.entities.CustomFormSubmission.filter({
        review_cycle_id: cycleId,
      });

      // Check completion
      const allComplete = roster.length > 0 && roster.every((p: any) => {
        const hasSelf = submissions.some((s: any) =>
          s.linked_employee_email === p.employee_email && s.submitter_role === "self" && s.status === "submitted"
        );
        const hasMgr = submissions.some((s: any) =>
          s.linked_employee_email === p.employee_email && s.submitter_role === "manager" && s.status === "submitted"
        );
        return hasSelf && hasMgr;
      });

      // Check if deadline passed
      const latestDue = roster.reduce((latest: Date | null, p: any) => {
        const due = p.manager_review_due ? new Date(p.manager_review_due) : null;
        if (!due) return latest;
        if (!latest || due > latest) return due;
        return latest;
      }, null);

      const deadlinePassed = latestDue ? latestDue < now : false;

      // Auto-close if all complete or deadline passed
      if (allComplete || deadlinePassed) {
        await base44.asServiceRole.entities.CustomForm.update(cycleId, { status: "archived" });
        cyclesClosed++;
        continue;
      }

      // Send reminders for approaching deadlines
      const notifiedEmails = new Set<string>();

      for (const p of roster) {
        // Self-assessment reminder
        const hasSelf = submissions.some((s: any) =>
          s.linked_employee_email === p.employee_email && s.submitter_role === "self" && s.status === "submitted"
        );
        if (!hasSelf && p.self_assessment_due) {
          const due = new Date(p.self_assessment_due);
          if (due <= threeDaysFromNow && due > now) {
            if (!notifiedEmails.has(p.employee_email)) {
              notifiedEmails.add(p.employee_email);
              waitUntil(
                base44.asServiceRole.entities.Notification.create({
                  user_email: p.employee_email,
                  title: `Reminder: Self-Assessment Due ${due.toLocaleDateString()}`,
                  message: `Your self-assessment for "${cycle.title}" is due soon. Please complete it.`,
                  type: "review_reminder",
                  is_read: false,
                }).catch(() => {})
              );
              remindersSent++;
            }
          }
        }

        // Manager review reminder
        const hasMgr = submissions.some((s: any) =>
          s.linked_employee_email === p.employee_email && s.submitter_role === "manager" && s.status === "submitted"
        );
        if (!hasMgr && p.manager_review_due && p.manager_email) {
          const due = new Date(p.manager_review_due);
          if (due <= threeDaysFromNow && due > now) {
            const key = p.manager_email + ":mgr";
            if (!notifiedEmails.has(key)) {
              notifiedEmails.add(key);
              waitUntil(
                base44.asServiceRole.entities.Notification.create({
                  user_email: p.manager_email,
                  title: `Reminder: Manager Review Due ${due.toLocaleDateString()}`,
                  message: `Your manager review for ${p.employee_name || p.employee_email} in "${cycle.title}" is due soon.`,
                  type: "review_reminder",
                  is_read: false,
                }).catch(() => {})
              );
              remindersSent++;
            }
          }
        }
      }
    }

    return Response.json({
      cycles_checked: activeCycles.length,
      reminders_sent: remindersSent,
      cycles_closed: cyclesClosed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}