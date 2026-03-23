import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Production-ready secure backend function to create notifications for any user
 * Implements comprehensive validation, sanitization, authorization, and multi-channel dispatch
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const currentUser = await base44.auth.me();
        if (!currentUser) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized - Authentication required' 
            }, { status: 401 });
        }

        let notificationData;
        try {
            notificationData = await req.json();
        } catch (error) {
            return Response.json({
                success: false,
                error: 'Invalid JSON in request body'
            }, { status: 400 });
        }

        // Validate required fields
        const requiredFields = ['user_email', 'type', 'title', 'message'];
        for (const field of requiredFields) {
            if (!notificationData[field] || (typeof notificationData[field] === 'string' && notificationData[field].trim() === '')) {
                return Response.json({
                    success: false,
                    error: `Missing or empty required field: ${field}`
                }, { status: 400 });
            }
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(notificationData.user_email)) {
            return Response.json({
                success: false,
                error: 'Invalid email format for user_email'
            }, { status: 400 });
        }

        // Notification type validation
        const validTypes = [
            'reminder', 'nudge', 'milestone', 'assessment_due', 
            'learning_assigned', 'goal_deadline', '1on1_scheduled', 'goal_assignment'
        ];
        if (!validTypes.includes(notificationData.type)) {
            return Response.json({
                success: false,
                error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`
            }, { status: 400 });
        }

        // Priority validation
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (notificationData.priority && !validPriorities.includes(notificationData.priority)) {
            return Response.json({
                success: false,
                error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
            }, { status: 400 });
        }

        // Status validation
        const validStatuses = ['pending', 'sent', 'failed', 'cancelled'];
        if (notificationData.status && !validStatuses.includes(notificationData.status)) {
            return Response.json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            }, { status: 400 });
        }

        // Date validation
        let scheduledFor = new Date().toISOString();
        if (notificationData.scheduled_for) {
            const date = new Date(notificationData.scheduled_for);
            if (isNaN(date.getTime())) {
                return Response.json({
                    success: false,
                    error: 'Invalid date format for scheduled_for'
                }, { status: 400 });
            }
            scheduledFor = date.toISOString();
        }

        // String length validation
        if (notificationData.title.length > 200) {
            return Response.json({
                success: false,
                error: 'Title must be 200 characters or less'
            }, { status: 400 });
        }

        if (notificationData.message.length > 2000) {
            return Response.json({
                success: false,
                error: 'Message must be 2000 characters or less'
            }, { status: 400 });
        }

        // Authorization check
        const isCreatingForSelf = notificationData.user_email.toLowerCase() === currentUser.email.toLowerCase();
        const isAdmin = currentUser.app_role?.startsWith('Admin Level');
        const isManager = ['User Level 2', 'User Level 3'].includes(currentUser.app_role);

        if (!isCreatingForSelf && !isAdmin && !isManager) {
            return Response.json({
                success: false,
                error: 'Forbidden - You can only create notifications for yourself'
            }, { status: 403 });
        }

        // Manager authorization
        if (isManager && !isAdmin && !isCreatingForSelf) {
            const targetUsers = await base44.asServiceRole.entities.User.filter({
                email: notificationData.user_email
            });

            if (targetUsers.length === 0) {
                return Response.json({
                    success: false,
                    error: 'Target user not found in the system'
                }, { status: 404 });
            }

            const targetUser = targetUsers[0];
            
            // User Level 2 can only create for direct reports
            if (currentUser.app_role === 'User Level 2' && targetUser.manager_email !== currentUser.email) {
                return Response.json({
                    success: false,
                    error: 'Forbidden - You can only create notifications for your direct reports'
                }, { status: 403 });
            }

            // User Level 3 can create for their vertical (direct reports and their direct reports)
            if (currentUser.app_role === 'User Level 3') {
                const isDirectReport = targetUser.manager_email === currentUser.email;
                let isInVertical = isDirectReport;

                if (!isDirectReport && targetUser.manager_email) {
                    const manager = await base44.asServiceRole.entities.User.filter({ 
                        email: targetUser.manager_email 
                    });
                    if (manager.length > 0 && manager[0].manager_email === currentUser.email) {
                        isInVertical = true;
                    }
                }

                if (!isInVertical) {
                    return Response.json({
                        success: false,
                        error: 'Forbidden - You can only create notifications for users in your vertical'
                    }, { status: 403 });
                }
            }
        }

        // Create notification in database
        const notification = {
            user_email: notificationData.user_email.toLowerCase().trim(),
            type: notificationData.type,
            title: notificationData.title.trim(),
            message: notificationData.message.trim(),
            status: notificationData.status || 'pending',
            priority: notificationData.priority || 'medium',
            scheduled_for: scheduledFor,
            ...(notificationData.related_entity_type && { 
                related_entity_type: notificationData.related_entity_type 
            }),
            ...(notificationData.related_entity_id && { 
                related_entity_id: notificationData.related_entity_id 
            }),
            ...(notificationData.action_url && { 
                action_url: notificationData.action_url.trim() 
            }),
            created_by: currentUser.email
        };

        const createdNotification = await base44.asServiceRole.entities.Notification.create(notification);

        // Get target user's notification preferences
        const targetUsers = await base44.asServiceRole.entities.User.filter({
            email: notificationData.user_email
        });

        if (targetUsers.length > 0) {
            const targetUser = targetUsers[0];
            const preferences = targetUser.notification_preferences || {};
            const typePrefs = preferences[notificationData.type] || {
                in_app: true,
                email: true,
                teams: false,
                slack: false
            };

            // Critical notifications always sent via email and in-app
            const isCritical = ['goal_assignment', 'assessment_due', 'goal_deadline'].includes(notificationData.type);

            // Dispatch to selected channels
            const dispatchPromises = [];

            // Email (if enabled or critical)
            if (typePrefs.email || isCritical) {
                dispatchPromises.push(
                    base44.asServiceRole.integrations.Core.SendEmail({
                        to: notificationData.user_email,
                        subject: notificationData.title,
                        body: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2>${notificationData.title}</h2>
                                <p>${notificationData.message}</p>
                                ${notificationData.action_url ? `
                                    <p style="margin-top: 20px;">
                                        <a href="${notificationData.action_url}" 
                                           style="display: inline-block; background-color: #2563eb; color: white; 
                                                  padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                                                  font-weight: bold;">
                                            View Details
                                        </a>
                                    </p>
                                ` : ''}
                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;"/>
                                <p style="color: #6b7280; font-size: 14px;">
                                    Best regards,<br/>The Curiosity Led Team
                                </p>
                            </div>
                        `,
                        from_name: 'Curiosity Led'
                    }).catch(err => {
                        console.error('Email send failed:', err);
                        return null;
                    })
                );
            }

            // Teams (if enabled and webhook configured)
            if (typePrefs.teams && targetUser.teams_webhook_url) {
                dispatchPromises.push(
                    base44.asServiceRole.functions.invoke('sendTeamsNotification', {
                        user_email: notificationData.user_email,
                        title: notificationData.title,
                        message: notificationData.message,
                        action_url: notificationData.action_url
                    }).catch(err => {
                        console.error('Teams send failed:', err);
                        return null;
                    })
                );
            }

            // Slack (if enabled and webhook configured)
            if (typePrefs.slack && targetUser.slack_webhook_url) {
                dispatchPromises.push(
                    base44.asServiceRole.functions.invoke('sendSlackNotification', {
                        user_email: notificationData.user_email,
                        title: notificationData.title,
                        message: notificationData.message,
                        action_url: notificationData.action_url
                    }).catch(err => {
                        console.error('Slack send failed:', err);
                        return null;
                    })
                );
            }

            // Wait for all dispatches to complete (with error handling)
            await Promise.allSettled(dispatchPromises);
        }

        return Response.json({
            success: true,
            notification: createdNotification,
            message: 'Notification created and dispatched successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('Error in createNotification function:', error);
        
        let errorMessage = 'Failed to create notification';
        let statusCode = 500;

        if (error.message?.includes('duplicate')) {
            errorMessage = 'A notification with these details already exists';
            statusCode = 409;
        } else if (error.message?.includes('foreign key')) {
            errorMessage = 'Referenced entity does not exist';
            statusCode = 400;
        }

        return Response.json({
            success: false,
            error: errorMessage,
            details: error.message
        }, { status: statusCode });
    }
});