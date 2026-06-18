/**
 * synthesizeConversationMemory — Nightly job.
 *
 * 1. Fetches recent AtreusConversationTurn records for the user (last 30 days)
 * 2. Generates a compressed 200-300 word summary via gemini_3_flash
 * 3. Extracts key_commitments and key_themes
 * 4. Upserts AtreusMemorySummary
 * 5. Flags open commitments (3-7 days old, not followed up) for Close the Loop
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MODEL = 'gemini_3_flash';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch last 30 days of turns
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const turns = await base44.asServiceRole.entities.AtreusConversationTurn.filter(
      { user_email: user.email },
      '-created_date',
      150
    );

    const recentTurns = turns.filter(t => t.created_date > thirtyDaysAgo);

    if (recentTurns.length < 3) {
      return Response.json({ updated: false, reason: 'insufficient_turns' });
    }

    // Build transcript for synthesis
    const transcript = recentTurns
      .slice(-80) // cap at 80 turns for the synthesis prompt
      .reverse()
      .map(t => `${t.role === 'manager' ? 'Manager' : 'Atreus'}: ${t.content}`)
      .join('\n');

    // Synthesize summary
    const synthesisResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: MODEL,
      prompt: `
You are summarizing a series of coaching conversations between a manager and Atreus (their AI leadership companion).

CONVERSATION TRANSCRIPT (chronological):
${transcript}

Generate a JSON object with:
1. "summary_text": A 200-300 word narrative summary written in second person ("You've been exploring...", "A recurring theme..."). 
   Capture: main topics discussed, patterns noticed, emotional themes, progress on commitments. 
   Written to be injected into Atreus's next session as memory context. 
   Do NOT use clinical language. Write as a thoughtful coach would recall a colleague.

2. "key_commitments": Array of strings — active commitments the manager made that haven't been mentioned as completed. 
   Each starts with "I will..." Format: up to 5 items.

3. "key_themes": Array of 2-5 short phrases capturing recurring themes (e.g., "delegation under pressure", "confidence before stakeholder reviews").

Return ONLY valid JSON. No markdown.
      `.trim(),
      response_json_schema: {
        type: 'object',
        properties: {
          summary_text: { type: 'string' },
          key_commitments: { type: 'array', items: { type: 'string' } },
          key_themes: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    const { summary_text, key_commitments = [], key_themes = [] } = synthesisResult;

    // Upsert AtreusMemorySummary
    const existing = await base44.asServiceRole.entities.AtreusMemorySummary.filter(
      { user_email: user.email }, '-updated_at', 1
    );

    const covers_from = recentTurns[recentTurns.length - 1]?.created_date?.split('T')[0] || '';
    const covers_to = new Date().toISOString().split('T')[0];
    const summaryData = {
      user_email: user.email,
      summary_text,
      covers_from,
      covers_to,
      key_commitments,
      key_themes,
      turn_count: recentTurns.length,
      updated_at: new Date().toISOString()
    };

    if (existing[0]) {
      await base44.asServiceRole.entities.AtreusMemorySummary.update(existing[0].id, summaryData);
    } else {
      await base44.asServiceRole.entities.AtreusMemorySummary.create(summaryData);
    }

    // Close the Loop: find open commitments from 3-7 days ago not yet followed up
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const openCommitments = turns.filter(t =>
      t.is_commitment &&
      !t.commitment_followed_up &&
      t.created_date < threeDaysAgo &&
      t.created_date > sevenDaysAgo &&
      t.role === 'manager'
    );

    for (const turn of openCommitments.slice(0, 2)) {
      // Create a Close the Loop notification
      await base44.asServiceRole.entities.Notification.create({
        user_email: user.email,
        type: 'atreus_checkin',
        title: 'Atreus check-in',
        message: `You told Atreus you'd ${turn.commitment_text || 'follow through on something'}. How did that go?`,
        status: 'pending',
        priority: 'medium',
        metadata: {
          commitment_turn_id: turn.id,
          close_the_loop: true,
          starter_message: `You told Atreus you'd ${turn.commitment_text}. I wanted to check in — how did that go?`
        }
      });

      // Mark as followed up
      await base44.asServiceRole.entities.AtreusConversationTurn.update(turn.id, {
        commitment_followed_up: true
      });
    }

    return Response.json({
      updated: true,
      turns_processed: recentTurns.length,
      commitments_flagged: openCommitments.slice(0, 2).length,
      key_themes
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});