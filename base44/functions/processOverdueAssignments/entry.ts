import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Scheduled function to process overdue assigned learning
 * Updates status to 'overdue' and sends notifications
 * Should be run daily
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Get all non-completed assignments
        const allAssignments = await base44.asServiceRole.entities.AssignedLearning.filter({
            status: { $in: ['assigned', 'started', 'in_progress'] }
        });

        let overdueUpdated = 0;
        let remindersCreated = 0;

        for (const assignment of allAssignments) {
            if (!assignment.due_date) continue;

            const dueDate = new Date(assignment.due_date);

            // Check if overdue
            if (dueDate < now) {
                // Update status to overdue if not already
                if (assignment.status !== 'overdue') {
                    await base44.asServiceRole.entities.AssignedLearning.update(assignment.id, {
                        status: 'overdue'
                    });
                    overdueUpdated++;

                    // Notify user
                    try {
                        await base44.functions.invoke('createNotification', {
                            user_email: assignment.user_email,
                            type: 'learning_assigned',
                            title: 'Learning Assignment Overdue',
                            message: `Your assigned learning "${assignment.title}" was due on ${dueDate.toLocaleDateString()}`,
                            priority: 'high',
                            related_entity_type: 'AssignedLearning',
                            related_entity_id: assignment.id,
                            action_url: '/Dashboard#learning',
                            scheduled_for: now.toISOString()
                        });
                    } catch (notifError) {
                        console.error('Error creating notification:', notifError);
                    }

                    // Notify assigner
                    if (assignment.assigned_by) {
                        try {
                            await base44.functions.invoke('createNotification', {
                                user_email: assignment.assigned_by,
                                type: 'learning_assigned',
                                title: 'Assigned Learning Overdue',
                                message: `${assignment.user_email}'s learning "${assignment.title}" is now overdue`,
                                priority: 'medium',
                                related_entity_type: 'AssignedLearning',
                                related_entity_id: assignment.id,
                                action_url: '/CommandCenter',
                                scheduled_for: now.toISOString()
                            });
                        } catch (notifError) {
                            console.error('Error creating notification:', notifError);
                        }
                    }
                }
            }
            // Check if due in 7 days (send reminder)
            else if (dueDate >= now && dueDate <= sevenDaysFromNow) {
                // Check if we already sent a reminder recently
                const recentNotifications = await base44.asServiceRole.entities.Notification.filter({
                    user_email: assignment.user_email,
                    related_entity_id: assignment.id,
                    type: 'learning_assigned',
                    created_date: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() }
                });

                if (recentNotifications.length === 0) {
                    try {
                        await base44.functions.invoke('createNotification', {
                            user_email: assignment.user_email,
                            type: 'learning_assigned',
                            title: 'Learning Due Soon',
                            message: `Your assigned learning "${assignment.title}" is due in ${Math.ceil((dueDate - now) / (24 * 60 * 60 * 1000))} days`,
                            priority: 'medium',
                            related_entity_type: 'AssignedLearning',
                            related_entity_id: assignment.id,
                            action_url: '/Dashboard#learning',
                            scheduled_for: now.toISOString()
                        });
                        remindersCreated++;
                    } catch (notifError) {
                        console.error('Error creating notification:', notifError);
                    }
                }
            }
        }

        return Response.json({
            success: true,
            message: 'Overdue assignments processed',
            stats: {
                overdueUpdated,
                remindersCreated,
                totalProcessed: allAssignments.length
            }
        });

    } catch (error) {
        console.error('Error processing overdue assignments:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});