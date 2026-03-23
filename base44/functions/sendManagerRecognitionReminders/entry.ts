import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all managers (User Level 2 and admins)
    const managers = await base44.asServiceRole.entities.User.filter({
      app_role: { $in: ['User Level 2', 'Admin Level 1', 'Admin Level 2', 'Super Administrator'] }
    });

    let remindersSent = 0;

    for (const manager of managers) {
      // Check if manager has used their point budget this week
      const weeklyPointsGiven = manager.manager_points_given_this_week || 0;
      
      // Get settings to check budget
      const settings = await base44.asServiceRole.entities.GamificationSettings.filter({
        client_id: manager.client_id
      });
      
      const budget = settings[0]?.manager_point_budget_weekly || 500;
      const utilizationPercentage = (weeklyPointsGiven / budget) * 100;

      // Remind if less than 25% of budget used
      if (utilizationPercentage < 25 && (manager.subordinate_emails?.length || 0) > 0) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: manager.email,
          type: 'reminder',
          title: '👏 Remember to Recognize Your Team',
          message: `You have ${budget - weeklyPointsGiven} points available this week to recognize your team. A little recognition goes a long way!`,
          scheduled_for: new Date().toISOString(),
          priority: 'low'
        });
        remindersSent++;
      }
    }

    return Response.json({
      success: true,
      message: `Sent ${remindersSent} manager recognition reminders`,
      reminders_sent: remindersSent
    });

  } catch (error) {
    console.error('Manager reminder error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});