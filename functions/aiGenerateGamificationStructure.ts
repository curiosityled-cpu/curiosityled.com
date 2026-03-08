import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only check
    const adminRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin'];
    if (!adminRoles.includes(user.app_role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { organizational_goals, target_behaviors, existing_programs } = await req.json();

    if (!organizational_goals || !target_behaviors) {
      return Response.json({ error: 'organizational_goals and target_behaviors are required' }, { status: 400 });
    }

    // Use AI to generate gamification recommendations
    const prompt = `You are a gamification expert designing a comprehensive gamification system for a leadership development platform.

Organizational Goals:
${organizational_goals}

Target Behaviors to Encourage:
${target_behaviors}

Existing Programs:
${existing_programs || 'None specified'}

Based on this information, generate a complete gamification structure with:

1. Badge Hierarchy (5-7 badges):
   - Name, description, category (completion, skill, recognition, milestone, achievement)
   - Criteria type (single_event, cumulative, manual)
   - Specific earning criteria
   - Points awarded
   - Rarity level

2. Level Structure (5-7 levels):
   - Level names (creative, motivating)
   - Point thresholds
   - Descriptions
   - Any special prerequisites or rewards

3. Competition Ideas (2-3):
   - Competition names
   - Type (individual, team, cohort)
   - Criteria and duration
   - Rewards

4. Point Economy:
   - Recommended point values for key activities
   - Peer point budget
   - Manager point budget
   - Rationale for the economy

Provide the response as a valid JSON object with the structure:
{
  "badges": [...],
  "levels": [...],
  "competitions": [...],
  "point_economy": {...},
  "implementation_notes": "..."
}`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          badges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                badge_name: { type: "string" },
                description: { type: "string" },
                badge_category: { type: "string" },
                criteria_type: { type: "string" },
                criteria_config: { type: "object" },
                points_awarded: { type: "number" },
                rarity: { type: "string" }
              }
            }
          },
          levels: {
            type: "array",
            items: {
              type: "object",
              properties: {
                level_name: { type: "string" },
                level_order: { type: "number" },
                points_threshold: { type: "number" },
                description: { type: "string" }
              }
            }
          },
          competitions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                competition_name: { type: "string" },
                description: { type: "string" },
                competition_type: { type: "string" },
                criteria_config: { type: "object" }
              }
            }
          },
          point_economy: {
            type: "object",
            properties: {
              activity_points: { type: "object" },
              peer_budget_weekly: { type: "number" },
              manager_budget_weekly: { type: "number" },
              rationale: { type: "string" }
            }
          },
          implementation_notes: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      recommendation: aiResponse
    });

  } catch (error) {
    console.error('Error generating gamification structure:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});