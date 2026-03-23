import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // AUTHENTICATION: Verify user is logged in
        const user = await base44.auth.me();
        
        // Reject unauthenticated requests
        if (!user) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Unauthorized: Authentication required'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify user has valid email
        if (!user.email) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Unauthorized: Invalid user session'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // User is authenticated - process request
        const body = await req.json();
        const { to, subject, html, from } = body;
        
        // Validate required fields
        if (!to || !subject || !html) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Bad Request: Missing required fields'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Bad Request: Invalid email format'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Process email content
        const emailBody = html.length > 10000 ? 
            `Your Leadership Index Assessment report has been generated. Please contact team@curiosityled.com for the full report.` : 
            html;
        
        // Use service role to send email (user is authenticated)
        const result = await base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
            to: to,
            subject: subject,
            body: emailBody,
            from_name: from || 'Curiosity Led'
        });
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Email sent successfully',
            authenticated_user: user.email
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Internal server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});