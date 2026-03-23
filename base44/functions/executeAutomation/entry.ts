import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { automation_id, trigger_data } = await req.json();

    if (!automation_id) {
      return Response.json({ error: 'Automation ID is required' }, { status: 400 });
    }

    // Fetch the automation
    const automations = await base44.asServiceRole.entities.Automation.filter({ id: automation_id });
    
    if (!automations || automations.length === 0) {
      return Response.json({ error: 'Automation not found' }, { status: 404 });
    }

    const automation = automations[0];

    if (automation.status !== 'active') {
      return Response.json({ error: 'Automation is not active' }, { status: 400 });
    }

    const results = [];
    let allSuccessful = true;

    // Execute each action
    for (const action of automation.actions || []) {
      try {
        let actionResult;

        switch (action.action_type) {
          case 'update_entity':
            if (action.action_config?.entity_name && action.action_config?.entity_id && action.action_config?.data) {
              const Entity = base44.asServiceRole.entities[action.action_config.entity_name];
              if (Entity) {
                actionResult = await Entity.update(action.action_config.entity_id, action.action_config.data);
              }
            }
            break;

          case 'create_entity':
            if (action.action_config?.entity_name && action.action_config?.data) {
              const Entity = base44.asServiceRole.entities[action.action_config.entity_name];
              if (Entity) {
                actionResult = await Entity.create(action.action_config.data);
              }
            }
            break;

          case 'send_notification':
            if (action.action_config?.user_email && action.action_config?.title && action.action_config?.message) {
              actionResult = await base44.asServiceRole.entities.Notification.create({
                user_email: action.action_config.user_email,
                type: action.action_config.type || 'reminder',
                title: action.action_config.title,
                message: action.action_config.message,
                scheduled_for: new Date().toISOString(),
                priority: action.action_config.priority || 'medium'
              });
            }
            break;

          case 'send_email':
            if (action.action_config?.to && action.action_config?.subject && action.action_config?.body) {
              actionResult = await base44.integrations.Core.SendEmail({
                to: action.action_config.to,
                subject: action.action_config.subject,
                body: action.action_config.body,
                from_name: action.action_config.from_name || 'Curiosity Led'
              });
            }
            break;

          case 'assign_learning':
            if (action.action_config?.user_email && action.action_config?.learning_resource_id) {
              actionResult = await base44.asServiceRole.entities.AssignedLearning.create({
                user_email: action.action_config.user_email,
                learning_resource_id: action.action_config.learning_resource_id,
                assigned_by: user.email,
                title: action.action_config.title || 'Learning Assignment',
                description: action.action_config.description || '',
                priority: action.action_config.priority || 'medium',
                client_id: user.client_id
              });
            }
            break;

          case 'create_goal':
            if (action.action_config?.title) {
              actionResult = await base44.asServiceRole.entities.Goal.create({
                title: action.action_config.title,
                description: action.action_config.description || '',
                status: action.action_config.status || 'active',
                client_id: user.client_id,
                ...action.action_config
              });
            }
            break;

          case 'invoke_function':
            if (action.action_config?.function_name && action.action_config?.payload) {
              actionResult = await base44.asServiceRole.functions.invoke(
                action.action_config.function_name,
                action.action_config.payload
              );
            }
            break;

          default:
            throw new Error(`Unknown action type: ${action.action_type}`);
        }

        results.push({
          action_type: action.action_type,
          status: 'success',
          result: actionResult
        });

      } catch (actionError) {
        console.error(`Action ${action.action_type} failed:`, actionError);
        allSuccessful = false;
        results.push({
          action_type: action.action_type,
          status: 'failed',
          error: actionError.message
        });
      }
    }

    // Update automation execution stats
    await base44.asServiceRole.entities.Automation.update(automation_id, {
      execution_count: (automation.execution_count || 0) + 1,
      last_execution_date: new Date().toISOString(),
      last_execution_status: allSuccessful ? 'success' : (results.some(r => r.status === 'success') ? 'partial' : 'failed'),
      last_execution_error: allSuccessful ? null : results.filter(r => r.status === 'failed').map(r => r.error).join('; ')
    });

    return Response.json({
      success: allSuccessful,
      results,
      execution_summary: {
        total_actions: automation.actions.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('Error executing automation:', error);
    return Response.json({ 
      error: 'Failed to execute automation',
      details: error.message 
    }, { status: 500 });
  }
});