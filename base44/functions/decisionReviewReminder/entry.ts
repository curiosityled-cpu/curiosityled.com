/**
 * decisionReviewReminder — Scheduled check for overdue decision reviews
 * Sends notification if review_date has passed and decision hasn't been completed
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find committed decisions where review_date has passed
    const today = new Date().toISOString().split('T')[0];
    const overdue = await base44.entities.DecisionJournal.filter({
      user_email: user.email,
      status: 'committed',
      review_date: { $lte: today },
    });

    if (overdue.length === 0) {
      return Response.json({ sent: 0 });
    }

    // Send notification for each overdue decision
    for (const decision of overdue) {
      await base44.entities.Notification.create({
        user_email: user.email,
        type: 'decision_review_due',
        title: 'Decision Review Due',
        message: `Your decision "${decision.decision_text}" was scheduled for review today.`,
        scheduled_for: new Date().toISOString(),
        is_read: false,
      }).catch(() => {});
    }

    return Response.json({ sent: overdue.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});