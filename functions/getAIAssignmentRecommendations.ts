import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only HR Admins and Super Admins can access this
    if (!['Admin Level 2', 'Super Administrator'].includes(user.app_role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { requests, programAdmins } = await req.json();

    if (!requests || !programAdmins || requests.length === 0 || programAdmins.length === 0) {
      return Response.json({ 
        success: true, 
        recommendations: [] 
      });
    }

    // Build AI prompt for recommendations
    const prompt = `You are an intelligent workload management assistant. Analyze the following requests and Program Admins to recommend optimal assignments.

REQUESTS:
${requests.map((r, i) => `
${i + 1}. ${r.title}
   Type: ${r.request_type}
   Priority: ${r.priority}
   Budget: $${r.budget_amount || 0}
   Audience: ${r.audience_size || 0} users
   Due: ${r.due_date || 'Not set'}
   Description: ${r.description.substring(0, 200)}
`).join('\n')}

PROGRAM ADMINS:
${programAdmins.map((a, i) => `
${i + 1}. ${a.full_name} (${a.email})
   Specializations: ${a.specializations?.join(', ') || 'None'}
   Active Requests: ${a.workload?.active_requests || 0}
   Upcoming Classes: ${a.workload?.upcoming_classes || 0}
   Coaching Sessions: ${a.workload?.coaching_sessions || 0}
   Active Goals: ${a.workload?.active_goals || 0}
   Overdue Requests: ${a.workload?.overdue_requests || 0}
`).join('\n')}

For each request, recommend the best Program Admin considering:
1. Specialization match with request type
2. Current workload (requests, classes, coaching, goals)
3. Overdue requests (avoid overloaded admins)
4. Priority and deadline urgency
5. Budget and audience size complexity

Return recommendations as a JSON array.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                request_id: { type: "string" },
                request_title: { type: "string" },
                request_type: { type: "string" },
                recommended_admin_email: { type: "string" },
                recommended_admin_name: { type: "string" },
                confidence_score: { type: "number", description: "0-100" },
                rationale: { type: "string" },
                current_workload: { type: "number" }
              },
              required: ["request_id", "request_title", "recommended_admin_email", "recommended_admin_name", "confidence_score", "rationale"]
            }
          }
        },
        required: ["recommendations"]
      }
    });

    return Response.json({
      success: true,
      recommendations: response.recommendations || []
    });
  } catch (error) {
    console.error('Error in getAIAssignmentRecommendations:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});