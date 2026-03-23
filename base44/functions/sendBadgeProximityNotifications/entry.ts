import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allUsers = await base44.asServiceRole.entities.User.list();
    let notificationsSent = 0;

    for (const targetUser of allUsers) {
      // Call checkBadgeEligibility directly using the base44 SDK
      let proximityResult;
      try {
        proximityResult = await base44.functions.invoke('checkBadgeEligibility', {
          user_email: targetUser.email,
          check_proximity: true
        });
      } catch (error) {
        console.warn(`Failed to check badges for ${targetUser.email}:`, error.message);
        continue;
      }

      const closeToEarning = proximityResult.data?.badges_close_to_earning || [];

      // Notify if user is close to earning badges (80%+ progress)
      for (const badge of closeToEarning) {
        if (badge.progress_percentage >= 80) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: targetUser.email,
            type: 'milestone',
            title: `🎖️ Almost there! ${badge.badge_name}`,
            message: `You're ${badge.progress_percentage}% of the way to earning the "${badge.badge_name}" badge! ${badge.steps_remaining || 'Keep going!'}`,
            scheduled_for: new Date().toISOString(),
            priority: 'low',
            related_entity_type: 'BadgeTemplate',
            related_entity_id: badge.badge_id
          });
          notificationsSent++;
        }
      }
    }

    return Response.json({
      success: true,
      message: `Sent ${notificationsSent} badge proximity notifications`,
      notifications_sent: notificationsSent
    });

  } catch (error) {
    console.error('Badge notification error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});