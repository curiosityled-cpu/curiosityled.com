import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Scheduled function to automatically update goal statuses based on:
 * - Due dates (mark as overdue)
 * - Progress vs time remaining (mark as at_risk)
 * - Completion percentage (mark as completed)
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Get all active and at_risk goals
        const goals = await base44.asServiceRole.entities.Goal.filter({
            status: { $in: ['active', 'at_risk'] }
        });
        
        let updated = 0;
        const updates = [];
        
        for (const goal of goals) {
            let newStatus = goal.status;
            let shouldUpdate = false;
            
            // Check if completed
            if (goal.completion_percentage >= 100) {
                newStatus = 'completed';
                shouldUpdate = true;
            }
            // Check if overdue
            else if (goal.due_date && goal.due_date < today) {
                newStatus = 'overdue';
                shouldUpdate = true;
            }
            // Check if at risk (due date approaching and low progress)
            else if (goal.due_date) {
                const dueDate = new Date(goal.due_date);
                const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                
                if (daysUntilDue > 0 && daysUntilDue <= 14) {
                    // Calculate expected progress
                    const totalDays = Math.ceil((dueDate - new Date(goal.created_date)) / (1000 * 60 * 60 * 24));
                    const elapsedDays = totalDays - daysUntilDue;
                    const expectedProgress = (elapsedDays / totalDays) * 100;
                    
                    // If actual progress is significantly behind expected (20% threshold)
                    if ((goal.completion_percentage || 0) < expectedProgress - 20) {
                        newStatus = 'at_risk';
                        shouldUpdate = true;
                    } else if (goal.status === 'at_risk' && (goal.completion_percentage || 0) >= expectedProgress - 10) {
                        // Back on track
                        newStatus = 'active';
                        shouldUpdate = true;
                    }
                }
            }
            
            if (shouldUpdate && newStatus !== goal.status) {
                updates.push({
                    goalId: goal.id,
                    oldStatus: goal.status,
                    newStatus: newStatus,
                    userEmail: goal.user_email
                });
                
                await base44.asServiceRole.entities.Goal.update(goal.id, {
                    status: newStatus
                });
                
                updated++;
                
                // Create notification for status changes (except active -> at_risk as that's covered by reminders)
                if (newStatus === 'overdue') {
                    try {
                        await base44.functions.invoke('createNotification', {
                            user_email: goal.user_email,
                            type: 'goal_deadline',
                            title: 'Goal Overdue',
                            message: `Your goal "${goal.title}" is now overdue. Please update your progress or adjust the timeline.`,
                            priority: 'high',
                            related_entity_type: 'Goal',
                            related_entity_id: goal.id,
                            action_url: '/Goals',
                            scheduled_for: now.toISOString()
                        });
                    } catch (notifError) {
                        console.error('Failed to create notification:', notifError);
                    }
                }
            }
        }
        
        return Response.json({
            success: true,
            updated: updated,
            total_checked: goals.length,
            updates: updates,
            timestamp: now.toISOString()
        });
        
    } catch (error) {
        console.error('Error updating goal statuses:', error);
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});