import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Note: This function is designed to run via scheduled automation (no user context)
    // If called manually, verify admin access
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      const user = await base44.auth.me();
      if (user?.app_role !== 'Platform Admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }
    // If not authenticated, assume it's an automation and proceed with service role

    const now = new Date();
    let startedCount = 0;
    let endedCount = 0;

    // Start upcoming competitions
    const upcomingCompetitions = await base44.asServiceRole.entities.Competition.filter({
      status: 'upcoming'
    });

    for (const competition of upcomingCompetitions) {
      const startDate = new Date(competition.start_date);
      if (now >= startDate) {
        await base44.asServiceRole.entities.Competition.update(competition.id, {
          status: 'active'
        });
        
        // Notify participants
        for (const email of competition.participant_emails || []) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: email,
            type: 'milestone',
            title: `🏁 Competition Started: ${competition.competition_name}`,
            message: `The competition "${competition.competition_name}" has begun! Check your leaderboard position and compete for rewards.`,
            scheduled_for: now.toISOString(),
            priority: 'medium',
            related_entity_type: 'Competition',
            related_entity_id: competition.id
          });
        }
        
        startedCount++;
      }
    }

    // End active competitions and award winners
    const activeCompetitions = await base44.asServiceRole.entities.Competition.filter({
      status: 'active'
    });

    for (const competition of activeCompetitions) {
      const endDate = new Date(competition.end_date);
      if (now >= endDate) {
        // Generate final leaderboard
        const leaderboardResult = await base44.asServiceRole.functions.invoke('generateLeaderboardData', {
          scope: 'competition',
          competition_id: competition.id,
          metric_type: competition.criteria_config?.metric || 'total_points',
          time_period: 'custom',
          start_date: competition.start_date,
          end_date: competition.end_date
        });

        const finalStandings = leaderboardResult.data?.leaderboard || [];

        // Award rewards to top performers
        const rewards = competition.rewards || [];
        for (const reward of rewards) {
          const winnerEntry = finalStandings[reward.rank - 1];
          if (winnerEntry) {
            // Award bonus points
            if (reward.points) {
              await base44.asServiceRole.functions.invoke('awardPoints', {
                user_email: winnerEntry.user_email,
                points_amount: reward.points,
                transaction_type: 'system_award',
                reason: `${competition.competition_name} - Rank #${reward.rank} Prize`,
                client_id: competition.client_id
              });
            }

            // Award badge
            if (reward.badgeId) {
              await base44.asServiceRole.functions.invoke('awardBadge', {
                user_email: winnerEntry.user_email,
                badge_template_id: reward.badgeId,
                awarded_by_system: true
              });
            }

            // Notify winner
            await base44.asServiceRole.entities.Notification.create({
              user_email: winnerEntry.user_email,
              type: 'milestone',
              title: `🏆 Competition Winner - Rank #${reward.rank}!`,
              message: `Congratulations! You placed #${reward.rank} in "${competition.competition_name}"! ${reward.points ? `You've been awarded ${reward.points} bonus points.` : ''}`,
              scheduled_for: now.toISOString(),
              priority: 'high',
              related_entity_type: 'Competition',
              related_entity_id: competition.id
            });
          }
        }

        // Update competition status
        await base44.asServiceRole.entities.Competition.update(competition.id, {
          status: 'completed',
          leaderboard_config: {
            final_standings: finalStandings.slice(0, 10)
          }
        });

        endedCount++;
      }
    }

    return Response.json({
      success: true,
      message: `Competition management complete. Started: ${startedCount}, Ended: ${endedCount}`,
      competitions_started: startedCount,
      competitions_ended: endedCount
    });

  } catch (error) {
    console.error('Competition management error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});