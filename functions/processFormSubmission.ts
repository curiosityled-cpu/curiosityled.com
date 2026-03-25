import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { submission_id } = await req.json();

    if (!submission_id) {
      return Response.json({ error: 'submission_id required' }, { status: 400 });
    }

    // Get submission
    const submissions = await base44.asServiceRole.entities.CustomFormSubmission.filter({
      id: submission_id
    });

    if (!submissions || submissions.length === 0) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = submissions[0];

    // Get form with integration config
    const forms = await base44.asServiceRole.entities.CustomForm.filter({
      id: submission.form_id
    });

    if (!forms || forms.length === 0) {
      return Response.json({ error: 'Form not found' }, { status: 404 });
    }

    const form = forms[0];

    // Check if integration is enabled
    if (!form.integration_config?.enabled) {
      await base44.asServiceRole.entities.CustomFormSubmission.update(submission_id, {
        integration_status: 'processed'
      });
      return Response.json({ message: 'No integration configured' });
    }

    const { target_entity, field_mapping, auto_create_on_submit } = form.integration_config;

    if (!auto_create_on_submit) {
      await base44.asServiceRole.entities.CustomFormSubmission.update(submission_id, {
        integration_status: 'processed'
      });
      return Response.json({ message: 'Auto-create disabled' });
    }

    // Map responses to entity fields
    const entityData = {};
    
    if (field_mapping) {
      Object.entries(field_mapping).forEach(([questionId, entityField]) => {
        if (submission.responses[questionId] !== undefined) {
          entityData[entityField] = submission.responses[questionId];
        }
      });
    }

    // Add metadata
    entityData.client_id = form.client_id;
    entityData.created_by = submission.submitter_email;

    // Create entity based on target type
    let createdEntity;
    let entityType = target_entity;

    try {
      switch (target_entity) {
        case 'DevelopmentRequest':
          // Add request-specific fields
          entityData.status = entityData.status || 'pending';
          entityData.request_type = entityData.request_type || 'general';
          createdEntity = await base44.asServiceRole.entities.DevelopmentRequest.create(entityData);
          break;

        case 'JourneyEnrollment':
          // Add enrollment-specific fields
          entityData.status = entityData.status || 'enrolled';
          entityData.enrollment_date = new Date().toISOString();
          createdEntity = await base44.asServiceRole.entities.JourneyEnrollment.create(entityData);
          break;

        default:
          throw new Error(`Unknown target entity: ${target_entity}`);
      }

      // Update submission with integration success
      await base44.asServiceRole.entities.CustomFormSubmission.update(submission_id, {
        integration_status: 'processed',
        created_entity_id: createdEntity.id,
        created_entity_type: entityType,
        integration_error: null
      });

      return Response.json({
        success: true,
        created_entity_id: createdEntity.id,
        created_entity_type: entityType
      });

    } catch (error) {
      // Update submission with integration failure
      await base44.asServiceRole.entities.CustomFormSubmission.update(submission_id, {
        integration_status: 'failed',
        integration_error: error.message
      });

      return Response.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Process form submission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});