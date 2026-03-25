import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return Response.json({
      email: user.email,
      full_name: user.full_name,
      app_role: user.app_role,
      role_type: typeof user.app_role,
      custom_role_id: user.custom_role_id || null,
      all_user_fields: Object.keys(user)
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});