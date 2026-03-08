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

    const { client_id, current_analytics } = await req.json();
    const targetClientId = client_id || user.client_id;

    // Get current gamification analytics if not provided
    let analytics = current_analytics;
    if (!analytics) {
      const analyticsResponse = await base44.asServiceRole.functions.invoke('getGamificationAnalytics', {
        client_id: targetClientId,
        date_range: '30d'
      });
      analytics = analyticsResponse.data;
    }

    // Use AI to analyze and suggest improvements
    const prompt = `You are a gamification optimization expert. Analyze the following gamification system performance data and provide actionable recommendations for improvement.

Current Analytics (Last 30 Days):
${JSON.stringify(analytics, null, 2)}

Based on this data, provide:

1. Key Insights:
   - What's working well?
   - What needs improvement?
   - Engagement patterns observed

2. Specific Recommendations (5-7):
   - Each with title, description, rationale, and expected impact
   - Prioritized by potential impact
   - Include specific numbers/targets where applicable

3. Point Value Adjustments:
   - Activities that should have increased points
   - Activities that should have decreased points
   - Rationale for each adjustment

4. Badge Opportunities:
   - New badges to introduce
   - Underutilized badges to promote or retire

5. Competition Suggestions:
   - Short-term competition ideas to boost engagement
   - Target participants and duration

Provide the response as a valid JSON object.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          key_insights: {
            type: "object",
            properties: {
              working_well: { type: "array", items: { type: "string" } },
              needs_improvement: { type: "array", items: { type: "string" } },
              engagement_patterns: { type: "array", items: { type: "string" } }
            }
          },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                rationale: { type: "string" },
                expected_impact: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          point_adjustments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                activity: { type: "string" },
                current_points: { type: "number" },
                suggested_points: { type: "number" },
                rationale: { type: "string" }
              }
            }
          },
          badge_opportunities: {
            type: "object",
            properties: {
              new_badges: { type: "array", items: { type: "object" } },
              underutilized_badges: { type: "array", items: { type: "string" } }
            }
          },
          competition_suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                duration_days: { type: "number" },
                target_participants: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      optimization: aiResponse,
      analytics_analyzed: analytics
    });

  } catch (error) {
    console.error('Error optimizing gamification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});