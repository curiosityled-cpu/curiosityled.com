import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { authorizeScheduledTask } from '../../shared/scheduledTaskAuth.ts';
import {
    loadClientsById,
    settingsForUser,
    goalReviewDue,
    goalReviewKey,
} from '../../shared/orgNotificationSettings.ts';

/**
 * Scheduled function to create reminder notifications for upcoming goal deadlines
 * Runs daily to check for goals approaching their due dates
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Security: Only internal automation or admin may invoke scheduled tasks.
        const _auth = await authorizeScheduledTask(req, base44);
        if (!_auth.authorized) return _auth.response;

        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        // Every tenant's active goals. Read as the service role: a scheduled run
        // has no signed-in user, so a user-scoped read would return nothing and
        // the reminders would silently stop.
        const goalResult = await base44.asServiceRole.entities.Goal.filter({
            status: 'active'
        }).catch(() => []);
        const goals = Array.isArray(goalResult) ? goalResult : (goalResult.items || []);

        let remindersCreated = 0;

        const createReminder = (payload) => base44.asServiceRole.entities.Notification.create({
            type: 'reminder',
            status: 'pending',
            scheduled_for: now.toISOString(),
            action_url: '/my-performance',
            ...payload,
        });

        for (const goal of goals) {
            if (!goal.due_date) continue;
            
            const dueDate = new Date(goal.due_date);
            
            // Check if goal is due in 7 days (and not already reminded)
            if (dueDate >= now && dueDate <= sevenDaysFromNow) {
                // Check if we already sent a 7-day reminder
                const existingResult = await base44.asServiceRole.entities.Notification.filter({
                    user_email: goal.user_email,
                    related_entity_id: goal.id,
                    type: 'reminder',
                    created_date: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() }
                }).catch(() => []);
                const existingReminders = Array.isArray(existingResult) ? existingResult : (existingResult.items || []);

                if (existingReminders.length === 0) {
                    await createReminder({
                        user_email: goal.user_email,
                        title: 'Goal Deadline Approaching',
                        message: `Your goal "${goal.title}" is due in 7 days. Current progress: ${goal.completion_percentage || 0}%`,
                        priority: 'medium',
                        related_entity_type: 'Goal',
                        related_entity_id: goal.id
                    });
                    remindersCreated++;
                }
            }
            
            // Check if goal is due in 3 days (higher urgency)
            if (dueDate >= now && dueDate <= threeDaysFromNow) {
                const urgentResult = await base44.asServiceRole.entities.Notification.filter({
                    user_email: goal.user_email,
                    related_entity_id: goal.id,
                    type: 'reminder',
                    priority: 'high',
                    created_date: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() }
                }).catch(() => []);
                const existingUrgentReminders = Array.isArray(urgentResult) ? urgentResult : (urgentResult.items || []);

                if (existingUrgentReminders.length === 0 && goal.completion_percentage < 80) {
                    await createReminder({
                        user_email: goal.user_email,
                        title: 'Urgent: Goal Deadline in 3 Days',
                        message: `Your goal "${goal.title}" is due in 3 days and is ${goal.completion_percentage || 0}% complete. Please update your progress!`,
                        priority: 'high',
                        related_entity_type: 'Goal',
                        related_entity_id: goal.id
                    });
                    remindersCreated++;
                }
            }
        }
        
        // ── Review-cadence reminders ──────────────────────────────────────────
        // The organization's review cadence decides how often people are asked to
        // review their goals at all, separate from the deadline reminders above.
        const clientsById = await loadClientsById(base44);
        const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 1000).catch(() => []);
        const usersByEmail = new Map(allUsers.map(u => [u.email, u]));

        let reviewsCreated = 0;
        const reviewed = new Set();

        for (const goal of goals) {
            const email = goal.user_email;
            if (!email || reviewed.has(email)) continue;
            reviewed.add(email);

            const settings = settingsForUser(usersByEmail.get(email), clientsById);
            const cadence = settings.goals.review_cadence || 'monthly';
            if (!goalReviewDue(cadence, now)) continue;

            const cycleKey = `goal_review_${cadence}_${goalReviewKey(cadence, now)}`;
            const existing = await base44.asServiceRole.entities.Notification.filter(
                { user_email: email, type: 'reminder' },
                '-created_date',
                20
            ).catch(() => []);
            if (existing.some(n => n.metadata?.cycle_key === cycleKey)) continue;

            const openGoals = goals.filter(g => g.user_email === email);

            await base44.asServiceRole.entities.Notification.create({
                user_email: email,
                type: 'reminder',
                title: `Time for your ${cadence} goal review`,
                message: `You have ${openGoals.length} active goal${openGoals.length === 1 ? '' : 's'}. Take a few minutes to review progress and adjust what needs to change.`,
                priority: 'low',
                status: 'pending',
                scheduled_for: now.toISOString(),
                action_url: '/my-performance',
                metadata: { cycle_key: cycleKey, goal_review: cadence }
            });
            reviewsCreated++;
        }

        return Response.json({
            success: true,
            checked: goals.length,
            reminders_created: remindersCreated,
            review_reminders_created: reviewsCreated,
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