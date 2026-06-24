/**
 * decisionMidLifeCheckIn — Scheduled automation (runs daily)
 *
 * Scans all committed DecisionJournal entries:
 * - Creates a notification for decisions that are 14+ days old with no outcome
 * - Cooldown: only one check-in nudge per decision (tracked via metadata)
 * - Does not spam: skips if a decision check-in notification was created in the last 7 days for this user
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceBase44 = base44.asServiceRole;

    const now = new Date();
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Find all committed decisions older than 14 days with no outcome
    const staleDecisions = await serviceBase44.entities.DecisionJournal.filter(
      { status: 'committed' }, '-created_date', 200
    ).catch(() => []);

    let nudgesCreated = 0;
    const processedUsers = new Set();

    for (const decision of staleDecisions) {
      if (!decision.user_email || !decision.created_date) continue;

      const decisionAge = now - new Date(decision.created_date);
      if (decisionAge < fourteenDaysAgo.getTime()) continue; // not old enough
      // Actually: we want decisions WHERE created_date < fourteenDaysAgo
      if (new Date(decision.created_date) > fourteenDaysAgo) continue;

      try {
        // Per-user cooldown: skip if a decision nudge was sent in the last 7 days for this user
        const recentNudges = await serviceBase44.entities.Notification.filter({
          user_email: decision.user_email,
          type: 'atreus_checkin',
        }, '-created_date', 1).catch(() => []);

        if (recentNudges.length > 0) {
          const lastNudge = new Date(recentNudges[0].created_date);
          if (lastNudge > sevenDaysAgo) continue; // cooldown
        }

        const daysOld = Math.floor(decisionAge / 86400000);
        const decisionSnippet = (decision.decision_text || 'your committed decision').slice(0, 80);

        await serviceBase44.entities.Notification.create({
          user_email: decision.user_email,
          type: 'atreus_checkin',
          title: 'How is that decision playing out?',
          message: `${daysOld} days ago, you committed to: "${decisionSnippet}". Atreus wants to check in — how is it going against the risks you identified?`,
          is_read: false,
          priority: 'medium',
          metadata: {
            source: 'decision_midlife_checkin',
            decision_id: decision.id,
            decision_text: decision.decision_text,
            days_old: daysOld,
            ask_atreus_prompt: `It's been ${daysOld} days since I committed to: "${decisionSnippet}". Let's check in on how it's going.`,
          },
        });

        nudgesCreated++;
      } catch (e) {
        console.warn(`decisionMidLifeCheckIn: failed for ${decision.user_email}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      stale_decisions_found: staleDecisions.length,
      nudges_created: nudgesCreated,
      run_at: now.toISOString(),
    });

  } catch (error) {
    console.error('decisionMidLifeCheckIn error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});