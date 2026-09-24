import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Security: Only managers and admins can assign learning to other users.
        const mgrRoles = ['User Level 2', 'User Level 3', 'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'];
        if (!mgrRoles.includes(user.app_role)) {
            return Response.json({ error: 'Only managers and administrators can assign learning', success: false }, { status: 403 });
        }

        const { learningResourceId, userEmails, assignedBy, priority, dueDate, notes } = await req.json();

        // Security: assignedBy must be the authenticated caller — ignore client-supplied value.
        const actualAssignedBy = user.email;

        if (!learningResourceId || !Array.isArray(userEmails) || userEmails.length === 0) {
            return Response.json({ 
                error: 'Missing required fields: learningResourceId and userEmails are required',
                success: false
            }, { status: 400 });
        }

        // Get the learning resource details
        const resources = await base44.asServiceRole.entities.LearningResource.filter({
            id: learningResourceId
        });
        const resource = resources[0];

        if (!resource) {
            return Response.json({ 
                error: 'Learning resource not found',
                success: false
            }, { status: 404 });
        }

        const createdAssignments = [];

        // Create assignment for each user
        for (const userEmail of userEmails) {
            const assignment = await base44.asServiceRole.entities.AssignedLearning.create({
                user_email: userEmail,
                learning_resource_id: learningResourceId,
                assigned_by: actualAssignedBy,
                title: resource.title,
                description: notes || resource.description,
                priority: priority || 'medium',
                due_date: dueDate || null,
                status: 'assigned',
                notes: notes || null
            });

            createdAssignments.push(assignment);

            // Create notification for the user
            await base44.asServiceRole.entities.Notification.create({
                user_email: userEmail,
                type: 'learning_assigned',
                title: 'New Learning Resource Assigned',
                message: `${actualAssignedBy} assigned you: ${resource.title}`,
                status: 'pending',
                priority: priority || 'medium',
                action_url: `/LearningLibrary`,
                related_entity_type: 'AssignedLearning',
                related_entity_id: assignment.id
            });
        }

        return Response.json({
            success: true,
            message: `Successfully assigned learning to ${userEmails.length} user(s)`,
            assignments: createdAssignments
        });

    } catch (error) {
        console.error('Error creating assigned learning:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});