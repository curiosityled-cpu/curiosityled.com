import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Sends a notification to Microsoft Teams via webhook
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

        // Get target user's Teams webhook URL
        const targetUsers = await base44.asServiceRole.entities.User.filter({ email: user_email });
        
        if (targetUsers.length === 0) {
            return Response.json({
                success: false,
                error: 'User not found'
            }, { status: 404 });
        }

        const targetUser = targetUsers[0];

        if (!targetUser.teams_webhook_url) {
            return Response.json({
                success: false,
                error: 'Teams webhook URL not configured for this user'
            }, { status: 400 });
        }

        // Construct Teams Adaptive Card message
        const teamsMessage = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": title,
            "themeColor": "2563eb",
            "title": title,
            "sections": [{
                "text": message,
                "facts": [
                    {
                        "name": "Priority",
                        "value": "Medium"
                    },
                    {
                        "name": "Source",
                        "value": "Curiosity Led Platform"
                    }
                ]
            }],
            "potentialAction": action_url ? [{
                "@type": "OpenUri",
                "name": "View in Platform",
                "targets": [{
                    "os": "default",
                    "uri": action_url
                }]
            }] : []
        };

        // Retry logic - 3 attempts with exponential backoff
        let lastError = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await fetch(targetUser.teams_webhook_url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(teamsMessage)
                });

                if (response.ok) {
                    return Response.json({
                        success: true,
                        message: 'Teams notification sent successfully',
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
            error: 'Failed to send Teams notification after 3 attempts',
            details: lastError
        }, { status: 500 });

    } catch (error) {
        console.error('Teams notification error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});