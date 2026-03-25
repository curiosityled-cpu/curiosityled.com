import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email } = await req.json();

    if (!user_email) {
      return Response.json({ error: 'user_email is required' }, { status: 400 });
    }

    // Calculate user's appropriate level
    const levelCalc = await base44.asServiceRole.functions.invoke('calculateUserLevel', {
      user_email
    });

    if (!levelCalc.data?.success) {
      return Response.json({ error: 'Failed to calculate level' }, { status: 500 });
    }

    const { current_level, total_points, next_level, points_to_next_level } = levelCalc.data;

    // Get user
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    if (!users.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const user = users[0];

    // Check if level changed
    const previousLevelId = user.current_level_id;
    const newLevelId = current_level?.id;
    const leveledUp = previousLevelId !== newLevelId && newLevelId;

    if (leveledUp) {
      // Update user's level
      await base44.asServiceRole.entities.User.update(user.id, {
        current_level_id: newLevelId,
        points_to_next_level
      });

      // Create notification (if Notification entity exists)
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email,
          type: 'milestone',
          title: `🎊 Level Up! You reached ${current_level.level_name}`,
          message: current_level.description || `Congratulations on reaching level ${current_level.level_order}!`,
          related_entity_type: 'GamificationLevel',
          related_entity_id: current_level.id
        });
      } catch (notifError) {
        console.log('Could not create notification:', notifError.message);
      }

      return Response.json({
        success: true,
        leveled_up: true,
        current_level,
        next_level,
        points_to_next_level
      });
    }

    // Update points to next level even if didn't level up
    if (user.points_to_next_level !== points_to_next_level) {
      await base44.asServiceRole.entities.User.update(user.id, {
        points_to_next_level
      });
    }

    return Response.json({
      success: true,
      leveled_up: false,
      current_level,
      next_level,
      points_to_next_level
    });

  } catch (error) {
    console.error('Error checking level progression:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});