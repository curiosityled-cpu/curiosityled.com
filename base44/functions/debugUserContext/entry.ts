import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Try creating a DevelopmentPlan using the user's own client
    // This mirrors exactly what the frontend does
    const testData = {
      user_email: user.email,
      title: "DEBUG TEST - Delete Me",
      target_competencies: ["Communication"],
      status: "active",
    };

    let createResult = null;
    let createError = null;
    try {
      createResult = await base44.entities.DevelopmentPlan.create(testData);
    } catch (e) {
      createError = e.message;
    }

    // Also try listing as this user
    let listResult = null;
    let listError = null;
    try {
      listResult = await base44.entities.DevelopmentPlan.filter({ user_email: user.email });
    } catch (e) {
      listError = e.message;
    }

    return Response.json({
      user: {
        email: user.email,
        role: user.role,
        app_role: user.app_role,
        client_id: user.client_id,
        data_app_role: user.data?.app_role,
        data_client_id: user.data?.client_id,
      },
      create: { result: createResult, error: createError },
      list: { result: listResult, error: listError },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});