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

        // User is authenticated - process test email request
        const body = await req.json();
        const { to } = body;
        
        if (!to) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Bad Request: Email address required' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Use service role to send test email (user is authenticated)
        const result = await base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
            to: to,
            subject: 'Test Email from Curiosity Led',
            body: 'This is a test email to verify the integration is working.',
            from_name: 'Curiosity Led Test'
        });
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Test email sent successfully',
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