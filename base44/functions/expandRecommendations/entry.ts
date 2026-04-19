import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { recommendations, assessment } = await req.json();

  if (!recommendations || recommendations.length === 0) {
    return Response.json({ goals: [] });
  }

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are a leadership development coach. Given the following list of development recommendations for a leader, expand each into a structured development goal.

Leader's assessment context:
- Overall score: ${assessment?.overall_pct ?? 'N/A'}%
- Archetype: ${assessment?.archetype_label ?? 'N/A'}

Recommendations to expand:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

For each recommendation, produce a structured development goal. Use realistic due dates within 3-12 months from today (${new Date().toISOString().slice(0,10)}).`,
    response_json_schema: {
      type: "object",
      properties: {
        goals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Concise, actionable goal title (max 80 chars)" },
              description: { type: "string", description: "Full recommendation text expanded into clear goal description" },
              type: { type: "string", enum: ["Strategic", "Operational", "Development"] },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              competency: { type: "string", description: "Primary leadership competency this addresses" },
              business_impact: { type: "string", description: "Expected business impact of achieving this goal" },
              due_date: { type: "string", description: "Target date in YYYY-MM-DD format" }
            },
            required: ["title", "description", "type", "priority", "competency", "business_impact", "due_date"]
          }
        }
      },
      required: ["goals"]
    }
  });

  return Response.json({ goals: result.goals || [] });
});