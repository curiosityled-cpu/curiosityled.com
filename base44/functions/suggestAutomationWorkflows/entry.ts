import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_role, context } = await req.json();

    // Use AI to suggest relevant automation workflows
    const prompt = `You are an automation expert for a leadership development platform. Suggest 5 practical automation workflows for a user with the role: "${user_role || user.app_role}".

Context about the platform:
- Users can take leadership assessments
- Users have goals they work towards
- Learning resources can be assigned
- Programs and cohorts can be managed
- Onboarding plans can be created
- Notifications can be sent

${context ? `Additional context: ${context}` : ''}

For each automation suggestion, provide:
1. name: Clear, actionable name
2. description: What it does and why it's useful
3. trigger_type: What triggers it
4. example_actions: What actions it performs
5. benefit: Key benefit to the user
6. estimated_time_saved: Rough estimate of time saved (e.g., "10 min/week")
7. difficulty: easy, medium, or hard to set up

Focus on automations that are:
- Practical and immediately useful
- Role-appropriate
- Time-saving
- Easy to understand`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                trigger_type: { type: "string" },
                example_actions: { type: "array", items: { type: "string" } },
                benefit: { type: "string" },
                estimated_time_saved: { type: "string" },
                difficulty: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({ 
      success: true,
      suggestions: result.suggestions || []
    });

  } catch (error) {
    console.error('Error suggesting automation workflows:', error);
    return Response.json({ 
      error: 'Failed to suggest automation workflows',
      details: error.message 
    }, { status: 500 });
  }
});