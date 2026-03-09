import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { 
      file_uri, 
      designation_text, 
      assessment_type, 
      date_completed, 
      is_private = false 
    } = payload;

    // Validate required fields
    if (!assessment_type) {
      return Response.json({ 
        error: 'Missing required field: assessment_type' 
      }, { status: 400 });
    }

    // Create the ExternalAssessmentResult entity with pending status
    const assessmentData = {
      user_email: user.email,
      client_id: user.client_id || 'default_client',
      assessment_type,
      date_completed: date_completed || new Date().toISOString().split('T')[0],
      is_private,
      status: 'pending_ai_processing'
    };

    if (file_uri) {
      assessmentData.document_uri = file_uri;
    }

    if (designation_text) {
      assessmentData.designation_or_score = designation_text;
    }

    const assessment = await base44.asServiceRole.entities.ExternalAssessmentResult.create(assessmentData);

    // Invoke the AI agent to process the assessment
    try {
      await base44.asServiceRole.agents.invoke('AssessmentProcessor', {
        assessmentId: assessment.id
      });
    } catch (agentError) {
      console.error('Agent invocation error:', agentError);
      // Update status to needs_manual_input if agent fails
      await base44.asServiceRole.entities.ExternalAssessmentResult.update(assessment.id, {
        status: 'needs_manual_input'
      });
    }

    return Response.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('processExternalAssessment error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});