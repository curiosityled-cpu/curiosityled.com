import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Bulk assign goals to multiple users based on criteria or direct selection
 * Input: {
 *   goalTemplate: { title, description, category, due_date, milestones },
 *   targetUsers: ['email1', 'email2', ...],
 *   assignedBy: 'manager@example.com'
 * }
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const currentUser = await base44.auth.me();
        if (!currentUser) {
            return Response.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        // Role check: only managers or admins may bulk-assign goals.
        const ADMIN_ROLES = ['Platform Admin', 'Super Administrator', 'Admin Level 1', 'Admin Level 2'];
        const appRole = currentUser.app_role;
        if (appRole !== 'User Level 2' && !ADMIN_ROLES.includes(appRole)) {
            return Response.json({
                success: false,
                error: 'Forbidden - manager or admin role required to assign goals'
            }, { status: 403 });
        }

        const { goalTemplate, targetUsers, assignedBy } = await req.json();
        
        if (!goalTemplate || !goalTemplate.title) {
            return Response.json({
                success: false,
                error: 'Goal template with title is required'
            }, { status: 400 });
        }
        
        if (!targetUsers || !Array.isArray(targetUsers) || targetUsers.length === 0) {
            return Response.json({
                success: false,
                error: 'Target users array is required'
            }, { status: 400 });
        }

        // Non-admin managers may only assign goals to their direct subordinates.
        if (!ADMIN_ROLES.includes(appRole)) {
            const subordinates = currentUser.subordinate_emails || [];
            const unauthorized = targetUsers.filter(e => !subordinates.includes(e));
            if (unauthorized.length > 0) {
                return Response.json({
                    success: false,
                    error: `Forbidden - you can only assign goals to your direct subordinates. Not allowed: ${unauthorized.join(', ')}`
                }, { status: 403 });
            }
        }
        
        const results = {
            successful: [],
            failed: []
        };
        
        for (const userEmail of targetUsers) {
            try {
                // Create goal for this user
                const goalData = {
                    ...goalTemplate,
                    user_email: userEmail,
                    assigned_by: assignedBy || currentUser.email,
                    status: 'pending_acceptance',
                    completion_percentage: 0
                };
                
                const createdGoal = await base44.asServiceRole.entities.Goal.create(goalData);
                
                // Create notification
                try {
                    await base44.functions.invoke('createNotification', {
                        user_email: userEmail,
                        type: 'goal_assignment',
                        title: 'New Goal Assigned',
                        message: `${assignedBy || currentUser.full_name} has assigned you a new goal: "${goalTemplate.title}"`,
                        priority: 'medium',
                        related_entity_type: 'Goal',
                        related_entity_id: createdGoal.id,
                        action_url: '/Goals',
                        scheduled_for: new Date().toISOString()
                    });
                } catch (notifError) {
                    console.error('Failed to create notification for:', userEmail, notifError);
                }
                
                results.successful.push({
                    userEmail: userEmail,
                    goalId: createdGoal.id
                });
                
            } catch (error) {
                console.error(`Failed to assign goal to ${userEmail}:`, error);
                results.failed.push({
                    userEmail: userEmail,
                    error: error.message
                });
            }
        }
        
        return Response.json({
            success: true,
            totalTargeted: targetUsers.length,
            successCount: results.successful.length,
            failureCount: results.failed.length,
            results: results
        });
        
    } catch (error) {
        console.error('Bulk assign goals error:', error);
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});