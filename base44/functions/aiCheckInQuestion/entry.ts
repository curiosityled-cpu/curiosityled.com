/**
 * aiCheckInQuestion — AI support for custom check-in questions.
 *
 * Actions:
 *   - "suggest"  : Admin one-shot AI Assist in the Check-In Setup dialog.
 *                  Body: { action: "suggest", topic: string, response_type?: string }
 *                  Returns: { suggestion: { title, response_type, unit_label } }
 *
 *   - "generate" : Daily generation of fresh question texts for any custom
 *                  question flagged is_ai_generated. Called by the
 *                  useCustomCheckInQuestions hook at check-in time.
 *                  Body: { action: "generate", check_in_type: "morning"|"evening",
 *                          items: [{ question_key, ai_topic, response_type, applies_to }] }
 *                  Returns: { generated: { [question_key]: text } }
 *
 * Generation is batched into a single InvokeLLM call returning a JSON object
 * keyed by question_key, so one daily call covers all AI questions for a user.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const VALID_RESPONSE_TYPES = ['number', 'text', 'scale_1_5', 'yes_no'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ── SUGGEST (admin AI Assist) ─────────────────────────────────────────────
    if (action === 'suggest') {
      const topic = (body.topic || '').trim();
      if (!topic) return Response.json({ error: 'topic is required' }, { status: 400 });

      const prompt = `An HR administrator wants to add a custom daily check-in question about this topic: "${topic}".
Suggest ONE clear, short question to ask staff or managers in a daily check-in.
Pick the best response_type from: number, text, scale_1_5, yes_no.
- number: ask for a count or amount (e.g. "How many loads did you complete today?").
- text: ask a short open question (e.g. "What was the biggest blocker today?").
- scale_1_5: a rateable statement the user scores 1-5 (e.g. "I felt safe on the floor today.").
- yes_no: a yes/no question (e.g. "Did you complete your safety check?").
The question text MUST be a direct question under 12 words.
If response_type is number, suggest a concise unit_label (e.g. "loads", "calls", "minutes"); otherwise use empty string.
Return JSON: { "title": string, "response_type": one of number|text|scale_1_5|yes_no, "unit_label": string }.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            response_type: { type: 'string', enum: VALID_RESPONSE_TYPES },
            unit_label: { type: 'string' },
          },
          required: ['title', 'response_type'],
        },
      });

      const suggestion = result || {};
      if (suggestion.response_type && !VALID_RESPONSE_TYPES.includes(suggestion.response_type)) {
        suggestion.response_type = 'text';
      }
      if (!suggestion.unit_label) suggestion.unit_label = '';

      return Response.json({ suggestion });
    }

    // ── GENERATE (daily AI question text) ─────────────────────────────────────
    if (action === 'generate') {
      const items = Array.isArray(body.items) ? body.items : [];
      const check_in_type = body.check_in_type === 'evening' ? 'evening' : 'morning';
      const valid = items.filter(
        (i) => i && i.question_key && (i.ai_topic || '').trim()
      );
      if (valid.length === 0) return Response.json({ generated: {} });

      const today = new Date().toISOString().slice(0, 10);
      const listDesc = valid
        .map(
          (i) =>
            `${i.question_key}: topic="${(i.ai_topic || '').trim()}", response_type=${
              VALID_RESPONSE_TYPES.includes(i.response_type) ? i.response_type : 'text'
            }`
        )
        .join('\n');

      const prompt = `Generate a fresh daily check-in question for each of the topics below. Today is ${today}. Check-in type: ${check_in_type}.
Vary the phrasing naturally day to day so it does not feel repetitive. Each question MUST be a direct question under 12 words, appropriate for its response_type:
- number → ask for a count or amount
- text → ask a short open question
- scale_1_5 → a first-person rateable statement (no question mark)
- yes_no → a yes/no question
Topics:
${listDesc}
Return a JSON object keyed by question_key, where each value is the generated question text string.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: Object.fromEntries(
            valid.map((i) => [i.question_key, { type: 'string' }])
          ),
          required: valid.map((i) => i.question_key),
        },
      });

      return Response.json({ generated: result || {} });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[aiCheckInQuestion] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});