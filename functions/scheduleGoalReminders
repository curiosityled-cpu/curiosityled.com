import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Scheduled function to create reminder notifications for upcoming goal deadlines
 * Runs daily to check for goals approaching their due dates
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        // Get all active goals
        const goals = await base44.entities.Goal.filter({
            status: 'active'
        });
        
        let remindersCreated = 0;
        
        for (const goal of goals) {
            if (!goal.due_date) continue;
            
            const dueDate = new Date(goal.due_date);
            
            // Check if goal is due in 7 days (and not already reminded)
            if (dueDate >= now && dueDate <= sevenDaysFromNow) {
                // Check if we already sent a 7-day reminder
                const existingReminders = await base44.entities.Notification.filter({
                    user_email: goal.user_email,
                    related_entity_id: goal.id,
                    type: 'reminder',
                    created_date: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() }
                });
                
                if (existingReminders.length === 0) {
                    await base44.functions.invoke('createNotification', {
                        user_email: goal.user_email,
                        type: 'reminder',
                        title: 'Goal Deadline Approaching',
                        message: `Your goal "${goal.title}" is due in 7 days. Current progress: ${goal.completion_percentage || 0}%`,
                        priority: 'medium',
                        related_entity_type: 'Goal',
                        related_entity_id: goal.id,
                        action_url: '/Goals',
                        scheduled_for: now.toISOString()
                    });
                    remindersCreated++;
                }
            }
            
            // Check if goal is due in 3 days (higher urgency)
            if (dueDate >= now && dueDate <= threeDaysFromNow) {
                const existingUrgentReminders = await base44.entities.Notification.filter({
                    user_email: goal.user_email,
                    related_entity_id: goal.id,
                    type: 'reminder',
                    priority: 'high',
                    created_date: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() }
                });
                
                if (existingUrgentReminders.length === 0 && goal.completion_percentage < 80) {
                    await base44.functions.invoke('createNotification', {
                        user_email: goal.user_email,
                        type: 'reminder',
                        title: 'Urgent: Goal Deadline in 3 Days',
                        message: `Your goal "${goal.title}" is due in 3 days and is ${goal.completion_percentage || 0}% complete. Please update your progress!`,
                        priority: 'high',
                        related_entity_type: 'Goal',
                        related_entity_id: goal.id,
                        action_url: '/Goals',
                        scheduled_for: now.toISOString()
                    });
                    remindersCreated++;
                }
            }
        }
        
        return Response.json({
            success: true,
            checked: goals.length,
            reminders_created: remindersCreated,
            timestamp: now.toISOString()
        });
        
    } catch (error) {
        console.error('Error scheduling goal reminders:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});