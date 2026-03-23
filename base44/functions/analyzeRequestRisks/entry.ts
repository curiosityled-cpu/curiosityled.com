import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, request_type, budget_amount, estimated_effort_hours, audience_size } = await req.json();

    if (!description) {
      return Response.json({ error: 'Description is required' }, { status: 400 });
    }

    const prompt = `You are a risk analysis expert. Analyze this request for potential risks and categorize them.

Request Title: ${title || 'Not provided'}
Description: ${description}
Type: ${request_type || 'Not specified'}
Budget: ${budget_amount ? `$${budget_amount}` : 'Not specified'}
Estimated Effort: ${estimated_effort_hours ? `${estimated_effort_hours} hours` : 'Not specified'}
Audience Size: ${audience_size || 'Not specified'}

Identify potential risks in these categories:
- compliance: Regulatory, policy, or compliance concerns
- security: Data security, privacy, or access control issues
- budget: Financial or cost-related risks
- timeline: Schedule, deadline, or resource availability concerns
- reputation: Brand, stakeholder, or public perception risks
- legal: Legal, contractual, or liability issues
- technical: Technical complexity, integration, or scalability concerns

Provide:
1. detected_categories: Array of applicable risk category names (from the list above)
2. risk_level: Overall risk level (low, medium, high, critical)
3. explanations: Object mapping each detected category to a brief explanation
4. recommendations: Array of mitigation recommendations

Be conservative - flag risks even if uncertain.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          detected_categories: { 
            type: "array",
            items: { type: "string" }
          },
          risk_level: { 
            type: "string",
            enum: ["low", "medium", "high", "critical"]
          },
          explanations: {
            type: "object",
            additionalProperties: { type: "string" }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({ 
      success: true,
      risk_analysis: result
    });

  } catch (error) {
    console.error('Error analyzing request risks:', error);
    return Response.json({ 
      error: 'Failed to analyze risks',
      details: error.message 
    }, { status: 500 });
  }
});