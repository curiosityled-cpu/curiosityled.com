import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { validateExternalUrl } from '../../shared/urlValidation.ts';

/**
 * Sends a notification to Slack via webhook
 * Includes retry logic for reliability
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const currentUser = await base44.auth.me();
        if (!currentUser) {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const { user_email, title, message, action_url } = await req.json();

        if (!user_email || !title || !message) {
            return Response.json({
                success: false,
                error: 'Missing required fields: user_email, title, message'
            }, { status: 400 });
        }

        // Security: Require the caller to be the target user, their manager, or an admin.
        const isSelf = user_email.toLowerCase() === currentUser.email.toLowerCase();
        const adminRoles = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin'];
        const isAdmin = adminRoles.includes(currentUser.app_role);
        const isManager = ['User Level 2', 'User Level 3'].includes(currentUser.app_role);
        if (!isSelf && !isAdmin && !isManager) {
            return Response.json({ success: false, error: 'Forbidden — can only send to yourself or your direct reports' }, { status: 403 });
        }

        // Get target user's Slack webhook URL
        const targetUsers = await base44.asServiceRole.entities.User.filter({ email: user_email });
        
        if (targetUsers.length === 0) {
            return Response.json({
                success: false,
                error: 'User not found'
            }, { status: 404 });
        }

        const targetUser = targetUsers[0];

        // Security: For managers (not self, not admin), verify the target is
        // actually their direct report. Without this, any User Level 2/3 can
        // post messages to any user's Slack webhook (impersonation/phishing).
        if (!isSelf && !isAdmin) {
            // Derive manager relationship server-side from the target user's
            // manager_email — never trust the self-editable subordinate_emails.
            if (targetUser.manager_email !== currentUser.email) {
                return Response.json({ success: false, error: 'Forbidden — target is not your direct report' }, { status: 403 });
            }
        }

        if (!targetUser.slack_webhook_url) {
            return Response.json({
                success: false,
                error: 'Slack webhook URL not configured for this user'
            }, { status: 400 });
        }

        // Security: validate the webhook URL to prevent SSRF.
        const urlCheck = validateExternalUrl(targetUser.slack_webhook_url);
        if (!urlCheck.valid) {
            return Response.json({
                success: false,
                error: 'Slack webhook URL is not allowed: ' + urlCheck.error
            }, { status: 400 });
        }

        // Construct Slack Block Kit message
        const slackMessage = {
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: title,
                        emoji: true
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: message
                    }
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: "_From Curiosity Led Platform_"
                        }
                    ]
                }
            ]
        };

        // Add action button if action_url provided
        if (action_url) {
            slackMessage.blocks.push({
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "View in Platform",
                            emoji: true
                        },
                        url: action_url,
                        style: "primary"
                    }
                ]
            });
        }

        // Retry logic - 3 attempts with exponential backoff
        let lastError = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await fetch(targetUser.slack_webhook_url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(slackMessage)
                });

                if (response.ok) {
                    return Response.json({
                        success: true,
                        message: 'Slack notification sent successfully',
                        attempt: attempt
                    });
                }

                lastError = await response.text();
                
                // If not the last attempt, wait before retrying
                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }

            } catch (fetchError) {
                lastError = fetchError.message;
                
                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        // All retries failed
        return Response.json({
            success: false,
            error: 'Failed to send Slack notification after 3 attempts'
        }, { status: 500 });

    } catch (error) {
        console.error('Slack notification error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});