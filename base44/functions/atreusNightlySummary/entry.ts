/**
 * atreusNightlySummary — Phase 2: Nightly memory compression + commitment follow-up
 *
 * Runs nightly (scheduled automation). For each active manager:
 * 1. Compresses last 30 days of AtreusConversationTurn into AtreusMemorySummary
 *    (200-300 words, key_commitments, key_themes)
 * 2. Checks for is_commitment: true turns from 3-7 days ago with no follow-up notification
 *    → creates a "Close the Loop" Notification for the evening check-in
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceBase44 = base44.asServiceRole;

    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

    // Fetch recent turns to find active users (last 200 records)
    const recentTurns = await serviceBase44.entities.AtreusConversationTurn.list('-created_date', 200).catch(() => []);

    // Find unique user_emails active in the last 7 days
    const activeUserEmails = [...new Set(
      recentTurns
        .filter(t => new Date(t.created_date) > sevenDaysAgo && t.user_email)
        .map(t => t.user_email)
    )].slice(0, 50); // process up to 50 users per run

    let summarizedCount = 0;
    let commitmentNudgesCreated = 0;

    for (const userEmail of activeUserEmails) {
      try {
        // Get all turns for this user in the last 30 days
        const userTurns = recentTurns
          .filter(t => t.user_email === userEmail && new Date(t.created_date) > thirtyDaysAgo)
          .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

        // ── 1. Summary compression ─────────────────────────────────────────
        if (userTurns.length >= 3) {
          const existingSummaries = await serviceBase44.entities.AtreusMemorySummary.filter(
            { user_email: userEmail }, '-updated_at', 1
          ).catch(() => []);
          const existingSummary = existingSummaries[0] || null;

          // Build condensed transcript (limit each turn to avoid token overflow)
          const transcript = userTurns
            .map(t => `${t.role === 'manager' ? 'Manager' : 'Atreus'}: ${(t.content || '').slice(0, 250)}`)
            .join('\n');

          const summaryResult = await serviceBase44.integrations.Core.InvokeLLM({
            model: 'gemini_3_flash',
            prompt: `You are compressing Atreus coaching conversations for a manager's memory layer.

CONVERSATION HISTORY (last 30 days):
${transcript}

${existingSummary?.summary_text ? `PREVIOUS SUMMARY (incorporate and update):\n${existingSummary.summary_text}` : ''}

Create a 200-300 word summary capturing:
1. Key themes and patterns the manager has discussed
2. Commitments or intentions expressed ("I'll try...", "I want to...", "I'm going to...")
3. Breakthroughs or realisations they've had
4. What they've found helpful or challenging

Also extract:
- key_commitments: up to 5 specific commitments as short phrases
- key_themes: up to 5 recurring themes as short labels (e.g. "Delegation", "Team conflict")

Return JSON: { "summary_text": string, "key_commitments": string[], "key_themes": string[] }`,
            response_json_schema: {
              type: 'object',
              properties: {
                summary_text: { type: 'string' },
                key_commitments: { type: 'array', items: { type: 'string' } },
                key_themes: { type: 'array', items: { type: 'string' } }
              }
            }
          }).catch(() => null);

          if (summaryResult?.summary_text) {
            const summaryData = {
              user_email: userEmail,
              summary_text: summaryResult.summary_text,
              key_commitments: summaryResult.key_commitments || [],
              key_themes: summaryResult.key_themes || [],
              covers_from: thirtyDaysAgo.toISOString().split('T')[0],
              covers_to: now.toISOString().split('T')[0],
              updated_at: now.toISOString(),
            };
            if (existingSummary) {
              await serviceBase44.entities.AtreusMemorySummary.update(existingSummary.id, summaryData);
            } else {
              await serviceBase44.entities.AtreusMemorySummary.create(summaryData);
            }
            summarizedCount++;
          }
        }

        // ── 2. Close the Loop — unfollowed commitment check ────────────────
        const unfollowedCommitments = userTurns.filter(t =>
          t.is_commitment === true &&
          t.role === 'manager' &&
          t.commitment_text &&
          new Date(t.created_date) < threeDaysAgo &&
          new Date(t.created_date) > sevenDaysAgo
        );

        if (unfollowedCommitments.length > 0) {
          // Cooldown: skip if follow-up nudge sent within 48 hours
          const recentFollowUps = await serviceBase44.entities.Notification.filter({
            user_email: userEmail,
            type: 'atreus_checkin',
          }, '-created_date', 1).catch(() => []);

          const hoursSinceLast = recentFollowUps[0]
            ? (now - new Date(recentFollowUps[0].created_date)) / (1000 * 60 * 60)
            : 999;

          if (hoursSinceLast > 48) {
            const commitment = unfollowedCommitments[0];
            await serviceBase44.entities.Notification.create({
              user_email: userEmail,
              type: 'atreus_checkin',
              title: 'A commitment you made with Atreus',
              message: `You told Atreus you'd "${commitment.commitment_text}". How did that go?`,
              is_read: false,
              priority: 'medium',
              metadata: {
                source: 'nightly_summary',
                commitment_text: commitment.commitment_text,
                turn_created_at: commitment.created_date,
              },
            });
            commitmentNudgesCreated++;
          }
        }

      } catch (e) {
        console.warn(`atreusNightlySummary: failed for ${userEmail}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      users_processed: activeUserEmails.length,
      summaries_updated: summarizedCount,
      commitment_nudges_created: commitmentNudgesCreated,
      run_at: now.toISOString(),
    });

  } catch (error) {
    console.error('atreusNightlySummary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});