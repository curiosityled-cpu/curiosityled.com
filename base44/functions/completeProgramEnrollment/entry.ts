import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { program_id, user_email } = await req.json();
    const targetUserEmail = user_email || user.email;

    if (!program_id) {
      return Response.json({ error: 'program_id is required' }, { status: 400 });
    }

    // Get the program
    const programs = await base44.asServiceRole.entities.Program.filter({ id: program_id });

    if (programs.length === 0) {
      return Response.json({ error: 'Program not found' }, { status: 404 });
    }

    const program = programs[0];

    // Award gamification points
    try {
      await base44.asServiceRole.functions.invoke('awardPoints', {
        user_email: targetUserEmail,
        points_amount: program.points_value || 1000,
        transaction_type: 'earned_activity',
        reason: `Completed program: ${program.name}`,
        related_entity_type: 'Program',
        related_entity_id: program_id,
        client_id: program.client_id
      });
    } catch (gamificationError) {
      console.log('Gamification award failed (non-critical):', gamificationError.message);
    }

    // Award completion badge if configured
    if (program.completion_badge_id) {
      try {
        await base44.asServiceRole.functions.invoke('awardBadge', {
          user_email: targetUserEmail,
          badge_template_id: program.completion_badge_id,
          awarded_by_email: 'system'
        });
      } catch (badgeError) {
        console.log('Badge award failed (non-critical):', badgeError.message);
      }
    }

    return Response.json({
      success: true,
      program,
      points_awarded: program.points_value || 1000,
      badge_awarded: !!program.completion_badge_id
    });

  } catch (error) {
    console.error('Error completing program:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});