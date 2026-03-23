import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposed_automation, existing_automations } = await req.json();

    if (!proposed_automation) {
      return Response.json({ error: 'Proposed automation is required' }, { status: 400 });
    }

    // Fetch existing automations if not provided
    let automationsToCheck = existing_automations;
    if (!automationsToCheck) {
      automationsToCheck = await base44.entities.Automation.filter({ status: 'active' });
    }

    // Use AI to detect potential conflicts
    const prompt = `You are an automation expert. Analyze this proposed automation for potential conflicts with existing automations.

Proposed Automation:
${JSON.stringify(proposed_automation, null, 2)}

Existing Active Automations:
${JSON.stringify(automationsToCheck, null, 2)}

Identify:
1. Direct conflicts (automations that might contradict each other)
2. Duplicate triggers (multiple automations triggered by the same event)
3. Resource conflicts (automations updating the same entity field)
4. Performance concerns (too many automations on frequently-triggered events)
5. Logic issues (circular dependencies, infinite loops)

Provide:
- conflict_level: none, low, medium, high, critical
- conflicts: Array of specific conflict descriptions
- recommendations: How to resolve conflicts
- safe_to_proceed: boolean indicating if it's safe to activate this automation`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          conflict_level: { 
            type: "string",
            enum: ["none", "low", "medium", "high", "critical"]
          },
          conflicts: { 
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                description: { type: "string" },
                affected_automation_id: { type: "string" }
              }
            }
          },
          recommendations: { type: "array", items: { type: "string" } },
          safe_to_proceed: { type: "boolean" }
        }
      }
    });

    return Response.json({ 
      success: true,
      conflict_analysis: result
    });

  } catch (error) {
    console.error('Error detecting automation conflicts:', error);
    return Response.json({ 
      error: 'Failed to detect automation conflicts',
      details: error.message 
    }, { status: 500 });
  }
});