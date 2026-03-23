import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { natural_language_description, available_entities, available_actions } = await req.json();

    if (!natural_language_description) {
      return Response.json({ error: 'Natural language description is required' }, { status: 400 });
    }

    // Use AI to generate automation logic
    const prompt = `You are an automation expert. Based on the following natural language description, generate a structured automation configuration.

User's description: "${natural_language_description}"

Available entities in the system: ${available_entities?.join(', ') || 'Assessment, Goal, AssignedLearning, OnboardingPlan, User, Program, Cohort'}

Available actions: ${available_actions?.join(', ') || 'update_entity, create_entity, send_notification, send_email, assign_learning, create_goal, schedule_1on1'}

Generate a JSON response with:
1. trigger_type: Choose from [manual, scheduled, entity_created, entity_updated, entity_deleted, assessment_completed, goal_completed, journey_started]
2. trigger_config: Configuration object for the trigger
3. actions: Array of action objects with action_type and action_config
4. suggested_name: A clear name for this automation
5. explanation: Plain English explanation of what this automation does
6. potential_issues: Array of potential problems or edge cases to watch out for

Be specific and practical. Use actual entity names and field names.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          trigger_type: { type: "string" },
          trigger_config: { type: "object", additionalProperties: true },
          actions: { 
            type: "array",
            items: {
              type: "object",
              properties: {
                action_type: { type: "string" },
                action_config: { type: "object", additionalProperties: true }
              }
            }
          },
          suggested_name: { type: "string" },
          explanation: { type: "string" },
          potential_issues: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({ 
      success: true,
      automation_logic: result
    });

  } catch (error) {
    console.error('Error generating automation logic:', error);
    return Response.json({ 
      error: 'Failed to generate automation logic',
      details: error.message 
    }, { status: 500 });
  }
});