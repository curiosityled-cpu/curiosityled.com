/**
 * atreusCommitmentExtract — Phase 2: Per-turn commitment extraction
 *
 * Called from AtreusCoach (fire-and-forget) after each manager message.
 * 1. Creates the AtreusConversationTurn record for the manager's message
 * 2. Runs a lightweight LLM extraction to detect commitments/intentions
 * 3. Updates the turn record if commitment detected
 * 4. Creates an action_item Goal so the commitment appears in the manager's goals
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { message_text, thread_id, page_context, pattern_context } = body;

    if (!message_text) return Response.json({ is_commitment: false });

    // Create the manager turn record
    const turn = await base44.entities.AtreusConversationTurn.create({
      user_email: user.email,
      thread_id: thread_id || null,
      role: 'manager',
      content: message_text.slice(0, 2000),
      page_context: page_context || null,
      pattern_context: pattern_context || null,
      is_commitment: false,
    });

    // Lightweight commitment extraction using gemini_3_flash (cheap + fast)
    const extraction = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `Manager said: "${message_text.slice(0, 500)}"

Did they make a commitment, set an intention, or state they will do something?
Look for phrases like "I'll", "I will", "I'm going to", "I want to try", "I plan to", "I should probably", "I need to", "I'm going to start".

Rules:
- Only flag genuine behavioral intentions, not hypothetical statements or questions.
- If yes, extract as a single clear sentence starting with "I will..."
- If no clear commitment, return null.

Return JSON: { "is_commitment": boolean, "commitment_text": string | null }`,
      response_json_schema: {
        type: 'object',
        properties: {
          is_commitment: { type: 'boolean' },
          commitment_text: { type: 'string' }
        }
      }
    }).catch(() => ({ is_commitment: false, commitment_text: null }));

    const isCommitment = extraction?.is_commitment === true;
    const commitmentText = extraction?.commitment_text || null;

    if (isCommitment && commitmentText) {
      // Update the turn record with commitment data
      await base44.entities.AtreusConversationTurn.update(turn.id, {
        is_commitment: true,
        commitment_text: commitmentText,
      }).catch(() => {});

      // Create an action_item Goal so the commitment surfaces in the manager's goals view
      await base44.entities.Goal.create({
        title: commitmentText,
        description: `Behavioral commitment made in Atreus conversation${page_context ? ` on ${page_context}` : ''} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        goal_type: 'action_item',
        status: 'active',
        visibility: 'private',
        created_by: user.email,
      }).catch(() => {});
    }

    return Response.json({ is_commitment: isCommitment, commitment_text: commitmentText });

  } catch (error) {
    console.error('atreusCommitmentExtract error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});