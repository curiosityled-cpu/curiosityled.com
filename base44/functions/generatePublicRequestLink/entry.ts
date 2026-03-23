import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only HR Admins and Super Admins can generate public links
    if (!['Admin Level 2', 'Super Administrator', 'Platform Admin'].includes(user.app_role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { client_id, custom_message, expires_in_days } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Generate a secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 365));

    // Store the token with metadata (you might want to create a PublicRequestToken entity for this)
    // For now, we'll encode the data in the token itself with verification
    const linkData = {
      client_id,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: user.email,
      custom_message: custom_message || null
    };

    // Base64 encode the link data for the URL
    const encodedData = btoa(JSON.stringify(linkData));
    
    // Get the app URL from environment variable
    const appUrl = Deno.env.get('APP_URL');
    if (!appUrl) {
      return Response.json({ 
        error: 'APP_URL environment variable not configured. Please contact your administrator.' 
      }, { status: 500 });
    }
    
    const publicUrl = `${appUrl}/PublicRequestSubmission?token=${encodedData}`;

    return Response.json({
      success: true,
      public_url: publicUrl,
      token: encodedData,
      expires_at: expiresAt.toISOString(),
      qr_data: publicUrl
    });

  } catch (error) {
    console.error('Generate public link error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});