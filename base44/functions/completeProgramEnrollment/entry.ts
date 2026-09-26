import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { program_id } = await req.json();
    // Security: Points are always awarded to the authenticated caller —
    // client-supplied user_email is ignored to prevent points farming.
    const targetUserEmail = user.email;

    if (!program_id) {
      return Response.json({ error: 'program_id is required' }, { status: 400 });
    }

    // Get the program
    const programs = await base44.asServiceRole.entities.Program.filter({ id: program_id });

    if (programs.length === 0) {
      return Response.json({ error: 'Program not found' }, { status: 404 });
    }

    const program = programs[0];

    // Security: verify the program belongs to the caller's organization before
    // awarding completion points. Prevents cross-tenant points farming by
    // enumerating program IDs. Platform Admin is exempt.
    if (user.app_role !== 'Platform Admin' && program.client_id && program.client_id !== user.client_id) {
      return Response.json({ error: 'This program is not in your organization' }, { status: 403 });
    }

    // Security: verify the caller is enrolled in this program before awarding
    // completion points. Prevents points farming by enumerating program IDs.
    // Fail-closed: if the program has no Cohort records at all, we cannot
    // verify enrollment — reject rather than treating 'no cohorts' as enrolled.
    const cohorts = await base44.asServiceRole.entities.Cohort.filter({
      program_id: program_id
    }).catch(() => []);
    if (cohorts.length === 0) {
      return Response.json({ error: 'Cannot verify enrollment — this program has no cohorts configured. Contact your administrator.' }, { status: 403 });
    }
    const isEnrolled = cohorts.some(c =>
      (c.participant_emails || []).includes(targetUserEmail)
    );
    if (!isEnrolled) {
      return Response.json({ error: 'You are not enrolled in this program' }, { status: 403 });
    }

    // Idempotency: check if points already awarded for this program (prevents double-awarding)
    const existingTx = await base44.asServiceRole.entities.PointTransaction.filter({
      user_email: targetUserEmail,
      related_entity_type: 'Program',
      related_entity_id: program_id
    });
    if (existingTx.length > 0) {
      return Response.json({ success: true, already_completed: true, program, points_awarded: 0, badge_awarded: false });
    }

    // Award gamification points
    try {
      await base44.asServiceRole.functions.invoke('awardPoints', {
        internal_secret: Deno.env.get('INTERNAL_FUNCTION_SECRET'),
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