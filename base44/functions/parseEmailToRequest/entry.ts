import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function can be called by email forwarding services or scheduled jobs
    const { from_email, subject, body, attachments, client_id } = await req.json();

    if (!from_email || !subject || !body || !client_id) {
      return Response.json({ 
        error: 'from_email, subject, body, and client_id are required' 
      }, { status: 400 });
    }

    // Use AI to parse and structure the email into a request
    const parsingPrompt = `You are parsing an email to create a structured development request for an L&D/Talent Management system.

EMAIL DETAILS:
From: ${from_email}
Subject: ${subject}
Body:
${body}

Extract and structure the following information:
1. A clear, concise title for the request (max 100 chars)
2. A detailed description
3. Request type (choose one: learning_content, program_creation, assessment_development, coaching_support, reporting, platform_support, other)
4. Priority (low, medium, high, urgent) - infer from language/urgency indicators
5. Estimated budget if mentioned (number only, no currency symbols)
6. Estimated audience size if mentioned (number only)
7. Any risk flags (patient_safety, phi_exposure, critical_info_misinterpretation, regulatory, none)
8. Due date if mentioned (YYYY-MM-DD format)

Respond ONLY with valid JSON matching this schema:
{
  "title": "string",
  "description": "string",
  "request_type": "string",
  "priority": "string",
  "budget_amount": number or null,
  "audience_size": number or null,
  "risk_flags": ["string"] or [],
  "due_date": "YYYY-MM-DD" or null
}`;

    const parsed = await base44.integrations.Core.InvokeLLM({
      prompt: parsingPrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          request_type: { 
            type: "string",
            enum: ["learning_content", "program_creation", "assessment_development", 
                   "coaching_support", "reporting", "platform_support", "other"]
          },
          priority: { 
            type: "string",
            enum: ["low", "medium", "high", "urgent"]
          },
          budget_amount: { type: ["number", "null"] },
          audience_size: { type: ["number", "null"] },
          risk_flags: { 
            type: "array",
            items: { 
              type: "string",
              enum: ["patient_safety", "phi_exposure", "critical_info_misinterpretation", 
                     "regulatory", "none"]
            }
          },
          due_date: { type: ["string", "null"] }
        },
        required: ["title", "description", "request_type", "priority"]
      }
    });

    // Create the development request
    const newRequest = await base44.asServiceRole.entities.DevelopmentRequest.create({
      title: parsed.title,
      description: parsed.description,
      request_type: parsed.request_type,
      source: 'email',
      priority: parsed.priority,
      status: 'new',
      requested_by_email: from_email,
      client_id: client_id,
      budget_amount: parsed.budget_amount,
      audience_size: parsed.audience_size,
      risk_flags: parsed.risk_flags?.filter(f => f !== 'none') || [],
      due_date: parsed.due_date,
      attachments: attachments || [],
      initial_notes: `Created from email on ${new Date().toISOString()}\n\nOriginal Subject: ${subject}`
    });

    // Trigger auto-triage (asServiceRole since this is automated)
    await base44.asServiceRole.functions.invoke('autoTriageRequest', { 
      request_id: newRequest.id 
    });

    // Notify HR Admins
    const hrAdmins = await base44.asServiceRole.entities.User.filter({
      app_role: 'Admin Level 2',
      client_id: client_id
    });

    for (const admin of hrAdmins) {
      await base44.asServiceRole.functions.invoke('sendRequestNotification', {
        request_id: newRequest.id,
        notification_type: 'new_request',
        recipient_email: admin.email
      });
    }

    return Response.json({ 
      success: true,
      request_id: newRequest.id,
      parsed_data: parsed
    });

  } catch (error) {
    console.error('Email parsing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});