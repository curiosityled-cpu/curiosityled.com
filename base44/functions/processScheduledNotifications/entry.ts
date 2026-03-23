import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Processes notifications that are scheduled to be sent
 * Respects user notification preferences for delivery channels
 * This function should be called periodically (e.g., every 15 minutes via cron)
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // This is a system function, uses service role
        const now = new Date().toISOString();
        
        // Get all pending notifications that are due
        const dueNotifications = await base44.asServiceRole.entities.Notification.filter({
            status: 'pending',
            scheduled_for: { $lte: now }
        });

        if (dueNotifications.length === 0) {
            return Response.json({
                success: true,
                message: 'No notifications to process',
                processed: 0
            });
        }

        const results = {
            successful: [],
            failed: []
        };

        // Get all users to batch fetch preferences
        const allUsers = await base44.asServiceRole.entities.User.list();
        const usersByEmail = new Map(allUsers.map(u => [u.email, u]));

        for (const notification of dueNotifications) {
            try {
                const targetUser = usersByEmail.get(notification.user_email);
                
                if (!targetUser) {
                    await base44.asServiceRole.entities.Notification.update(notification.id, {
                        status: 'failed',
                        sent_at: new Date().toISOString()
                    });
                    results.failed.push({ 
                        notification: notification.id, 
                        reason: 'User not found' 
                    });
                    continue;
                }

                // Get user preferences for this notification type
                const preferences = targetUser.notification_preferences || {};
                const typePrefs = preferences[notification.type] || {
                    in_app: true,
                    email: true,
                    teams: false,
                    slack: false,
                    frequency: 'instant'
                };

                // Check frequency settings (for non-instant notifications like nudges)
                if (typePrefs.frequency && typePrefs.frequency !== 'instant') {
                    // For now, skip frequency-based notifications (they need separate processing)
                    // This would require a more sophisticated scheduling system
                    continue;
                }

                // Critical notifications always delivered via in-app and email
                const isCritical = ['goal_assignment', 'assessment_due', 'goal_deadline'].includes(notification.type);

                const dispatchPromises = [];
                let dispatchedChannels = [];

                // In-app is always enabled (notification already exists in DB)
                dispatchedChannels.push('in-app');

                // Email dispatch
                if (typePrefs.email || isCritical) {
                    dispatchPromises.push(
                        base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
                            to: notification.user_email,
                            subject: notification.title,
                            body: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <h2 style="color: #1e40af;">${notification.title}</h2>
                                    <p style="color: #374151; line-height: 1.6;">${notification.message}</p>
                                    ${notification.action_url ? `
                                        <p style="margin-top: 30px;">
                                            <a href="${notification.action_url}" 
                                               style="display: inline-block; background-color: #2563eb; color: white; 
                                                      padding: 14px 28px; text-decoration: none; border-radius: 6px; 
                                                      font-weight: bold; font-size: 16px;">
                                                Take Action
                                            </a>
                                        </p>
                                    ` : ''}
                                    <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;"/>
                                    <p style="color: #6b7280; font-size: 14px;">
                                        Best regards,<br/>
                                        The Curiosity Led Team
                                    </p>
                                    <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                                        You can manage your notification preferences in your 
                                        <a href="${req.headers.get('origin') || ''}/Settings" style="color: #2563eb;">Settings</a>.
                                    </p>
                                </div>
                            `,
                            from_name: 'Curiosity Led'
                        }).then(() => {
                            dispatchedChannels.push('email');
                        }).catch(err => {
                            console.error('Email dispatch failed:', err);
                            throw new Error('Email dispatch failed: ' + err.message);
                        })
                    );
                }

                // Teams dispatch
                if (typePrefs.teams && targetUser.teams_webhook_url) {
                    dispatchPromises.push(
                        base44.functions.invoke('sendTeamsNotification', {
                            user_email: notification.user_email,
                            title: notification.title,
                            message: notification.message,
                            action_url: notification.action_url
                        }).then(() => {
                            dispatchedChannels.push('teams');
                        }).catch(err => {
                            console.error('Teams dispatch failed:', err);
                            // Don't fail the whole notification if Teams fails
                        })
                    );
                }

                // Slack dispatch
                if (typePrefs.slack && targetUser.slack_webhook_url) {
                    dispatchPromises.push(
                        base44.functions.invoke('sendSlackNotification', {
                            user_email: notification.user_email,
                            title: notification.title,
                            message: notification.message,
                            action_url: notification.action_url
                        }).then(() => {
                            dispatchedChannels.push('slack');
                        }).catch(err => {
                            console.error('Slack dispatch failed:', err);
                            // Don't fail the whole notification if Slack fails
                        })
                    );
                }

                // Wait for all dispatches
                await Promise.allSettled(dispatchPromises);

                // Update notification status
                await base44.asServiceRole.entities.Notification.update(notification.id, {
                    status: 'sent',
                    sent_at: new Date().toISOString()
                });

                results.successful.push({
                    notification: notification.id,
                    channels: dispatchedChannels
                });

            } catch (dispatchError) {
                // Mark as failed
                await base44.asServiceRole.entities.Notification.update(notification.id, {
                    status: 'failed',
                    sent_at: new Date().toISOString()
                });

                results.failed.push({
                    notification: notification.id,
                    reason: dispatchError.message
                });
            }
        }

        return Response.json({
            success: true,
            processed: dueNotifications.length,
            successful: results.successful.length,
            failed: results.failed.length,
            details: results
        });

    } catch (error) {
        console.error('Error processing scheduled notifications:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});