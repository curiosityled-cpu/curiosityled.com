import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Cascade goals to multiple users based on organizational criteria
 * Input: {
 *   goalTemplate: { title, description, category, due_date, milestones },
 *   targetCriteria: { app_role?, department?, cohort_id?, specific_emails? },
 *   assignedBy: 'manager@example.com',
 *   cascadeGoalId: 'master-goal-id' // Optional: link to master template goal
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

        const { goal_id, target_emails, goalTemplate, targetCriteria, assignedBy, cascadeGoalId } = await req.json();
        
        // Support both new format (goal_id + target_emails) and legacy format
        let sourceGoal;
        let targetEmails;
        
        if (goal_id && target_emails) {
            // New format: cascade existing goal to specific emails
            sourceGoal = await base44.asServiceRole.entities.Goal.filter({ id: goal_id });
            if (!sourceGoal || sourceGoal.length === 0) {
                return Response.json({
                    success: false,
                    error: 'Goal not found'
                }, { status: 404 });
            }
            sourceGoal = sourceGoal[0];
            targetEmails = target_emails;
        } else if (goalTemplate && targetCriteria) {
            // Legacy format: use goalTemplate
            if (!goalTemplate.title) {
                return Response.json({
                    success: false,
                    error: 'Goal template with title is required'
                }, { status: 400 });
            }
            if (Object.keys(targetCriteria).length === 0) {
                return Response.json({
                    success: false,
                    error: 'Target criteria is required'
                }, { status: 400 });
            }
        } else {
            return Response.json({
                success: false,
                error: 'Either (goal_id + target_emails) or (goalTemplate + targetCriteria) required'
            }, { status: 400 });
        }
        
        // Build filter for users based on criteria
        const userFilter = {};
        
        if (targetCriteria.app_role) {
            userFilter.app_role = targetCriteria.app_role;
        }
        
        if (targetCriteria.department) {
            userFilter.department = targetCriteria.department;
        }
        
        // Get targeted users
        let targetUsers = [];
        
        if (targetEmails && targetEmails.length > 0) {
            // New format: use provided target_emails directly
            targetUsers = await base44.asServiceRole.entities.User.filter({
                email: { $in: targetEmails }
            });
        } else if (targetCriteria.specific_emails && targetCriteria.specific_emails.length > 0) {
            // Legacy: Use specific emails
            targetUsers = await base44.asServiceRole.entities.User.filter({
                email: { $in: targetCriteria.specific_emails }
            });
        } else if (targetCriteria.cohort_id) {
            // Legacy: Get users from cohort
            const cohort = await base44.asServiceRole.entities.Cohort.get(targetCriteria.cohort_id);
            if (cohort && cohort.participant_emails) {
                targetUsers = await base44.asServiceRole.entities.User.filter({
                    email: { $in: cohort.participant_emails }
                });
            }
        } else {
            // Legacy: Use role/department filters
            targetUsers = await base44.asServiceRole.entities.User.filter(userFilter);
        }
        
        if (targetUsers.length === 0) {
            return Response.json({
                success: false,
                error: 'No users found matching the criteria'
            }, { status: 400 });
        }
        
        const results = {
            successful: [],
            failed: []
        };
        
        for (const user of targetUsers) {
            try {
                // Prepare goal data from either sourceGoal or goalTemplate
                const baseGoal = sourceGoal || goalTemplate;
                
                // Create cascaded goal for this user
                const goalData = {
                    title: baseGoal.title,
                    description: baseGoal.description,
                    goal_type: baseGoal.goal_type || 'standard',
                    timeframe_start: baseGoal.timeframe_start,
                    timeframe_end: baseGoal.timeframe_end,
                    color: baseGoal.color || '#0073EA',
                    visibility: 'private',
                    status: 'active',
                    progress: 0,
                    linked_competency_ids: baseGoal.linked_competency_ids || [],
                    assigned_to_emails: [],
                    columns: baseGoal.columns || [],
                    groups: baseGoal.groups || []
                };
                
                if (goal_id) {
                    goalData.cascaded_from_goal_id = goal_id;
                } else if (cascadeGoalId) {
                    goalData.cascaded_goal_id = cascadeGoalId;
                }
                
                // Set the created_by to the target user so they own it
                const createdGoal = await base44.asServiceRole.entities.Goal.create(goalData);
                
                // Create notification
                try {
                    await base44.asServiceRole.entities.Notification.create({
                        user_email: user.email,
                        type: 'goal_assignment',
                        title: 'New Cascaded Goal',
                        message: `${assignedBy || currentUser.full_name} has cascaded a goal to you: "${baseGoal.title}"`,
                        priority: 'medium',
                        related_entity_type: 'Goal',
                        related_entity_id: createdGoal.id,
                        action_url: '/Performance',
                        scheduled_for: new Date().toISOString()
                    });
                } catch (notifError) {
                    console.error('Failed to create notification for:', user.email, notifError);
                }
                
                results.successful.push({
                    userEmail: user.email,
                    userName: user.full_name,
                    goalId: createdGoal.id
                });
                
            } catch (error) {
                console.error(`Failed to cascade goal to ${user.email}:`, error);
                results.failed.push({
                    userEmail: user.email,
                    userName: user.full_name,
                    error: error.message
                });
            }
        }
        
        // Log the cascade action
        try {
            const baseGoal = sourceGoal || goalTemplate;
            await base44.asServiceRole.entities.ActivityLog.create({
                timestamp: new Date().toISOString(),
                initiator_user_email: currentUser.email,
                action_type: 'GOAL_CASCADE',
                metadata: {
                    goalTitle: baseGoal.title,
                    goalId: goal_id,
                    targetEmails: targetEmails,
                    targetCriteria: targetCriteria,
                    successCount: results.successful.length,
                    failureCount: results.failed.length,
                    cascadeGoalId: cascadeGoalId
                }
            });
        } catch (logError) {
            console.error('Failed to log cascade action:', logError);
        }
        
        return Response.json({
            success: true,
            totalTargeted: targetUsers.length,
            successCount: results.successful.length,
            failureCount: results.failed.length,
            results: results
        });
        
    } catch (error) {
        console.error('Cascade goals error:', error);
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});