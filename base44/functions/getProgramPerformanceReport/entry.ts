import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { program_id, date_range_days = 30 } = await req.json().catch(() => ({}));

    // Get all programs managed by this user
    const allPrograms = await base44.entities.Program.list();
    const managedPrograms = allPrograms.filter(p => 
      p.manager_emails?.includes(user.email) || 
      p.primary_manager_email === user.email ||
      p.program_manager_email === user.email
    );

    if (managedPrograms.length === 0) {
      return Response.json({
        success: true,
        data: {
          summary: {
            total_programs: 0,
            total_participants: 0,
            total_goals: 0,
            goal_completion_rate: 0,
            total_assessments: 0,
            avg_assessment_score: 0,
            total_learning_assignments: 0,
            learning_completion_rate: 0,
            total_coaching_sessions: 0
          },
          programs: [],
          trends: []
        }
      });
    }

    // Filter by specific program if provided
    const programsToAnalyze = program_id 
      ? managedPrograms.filter(p => p.id === program_id)
      : managedPrograms;

    const programIds = programsToAnalyze.map(p => p.id);

    // Get cohorts for these programs
    const allCohorts = await base44.entities.Cohort.list();
    const programCohorts = allCohorts.filter(c => programIds.includes(c.program_id));

    // Collect participant emails
    const participantEmails = new Set();
    programsToAnalyze.forEach(p => {
      p.participant_emails?.forEach(e => participantEmails.add(e));
    });
    programCohorts.forEach(c => {
      c.participant_emails?.forEach(e => participantEmails.add(e));
    });

    const participantEmailArray = Array.from(participantEmails);

    // Date filter
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - date_range_days);

    // Fetch all relevant data
    const [allGoals, allAssessments, allLearning, allCoaching] = await Promise.all([
      base44.entities.Goal.list(),
      base44.entities.Assessment.list(),
      base44.entities.AssignedLearning.list(),
      base44.entities.CoachingSession.list()
    ]);

    // Filter by participants and date
    const programGoals = allGoals.filter(g => 
      (programIds.includes(g.program_id) || participantEmails.has(g.created_by)) &&
      new Date(g.created_date) >= cutoffDate
    );

    const programAssessments = allAssessments.filter(a => 
      participantEmails.has(a.email) &&
      new Date(a.submission_ts || a.created_date) >= cutoffDate
    );

    const programLearning = allLearning.filter(l => 
      participantEmails.has(l.user_email) &&
      new Date(l.created_date) >= cutoffDate
    );

    const programCoaching = allCoaching.filter(s => 
      (s.coach_email === user.email || participantEmails.has(s.participant_email)) &&
      new Date(s.session_date || s.created_date) >= cutoffDate
    );

    // Calculate summary metrics
    const totalGoals = programGoals.length;
    const completedGoals = programGoals.filter(g => g.status === 'archived' || g.progress === 100).length;
    const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    const totalAssessments = programAssessments.length;
    const avgAssessmentScore = totalAssessments > 0 
      ? Math.round(programAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / totalAssessments)
      : 0;

    const totalLearning = programLearning.length;
    const completedLearning = programLearning.filter(l => l.status === 'completed').length;
    const learningCompletionRate = totalLearning > 0 ? Math.round((completedLearning / totalLearning) * 100) : 0;

    const totalCoachingSessions = programCoaching.length;
    const completedCoachingSessions = programCoaching.filter(s => s.status === 'completed').length;

    // Per-program breakdown
    const programBreakdown = programsToAnalyze.map(program => {
      const pParticipants = new Set(program.participant_emails || []);
      const pGoals = programGoals.filter(g => g.program_id === program.id);
      const pAssessments = programAssessments.filter(a => pParticipants.has(a.email));
      const pLearning = programLearning.filter(l => pParticipants.has(l.user_email));
      const pCoaching = programCoaching.filter(s => pParticipants.has(s.participant_email));

      const pCompletedGoals = pGoals.filter(g => g.status === 'archived' || g.progress === 100).length;
      const pCompletedLearning = pLearning.filter(l => l.status === 'completed').length;

      return {
        program_id: program.id,
        program_name: program.name,
        program_type: program.program_type,
        status: program.status,
        participants: pParticipants.size,
        goals: {
          total: pGoals.length,
          completed: pCompletedGoals,
          completion_rate: pGoals.length > 0 ? Math.round((pCompletedGoals / pGoals.length) * 100) : 0
        },
        assessments: {
          total: pAssessments.length,
          avg_score: pAssessments.length > 0 
            ? Math.round(pAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / pAssessments.length)
            : 0
        },
        learning: {
          total: pLearning.length,
          completed: pCompletedLearning,
          completion_rate: pLearning.length > 0 ? Math.round((pCompletedLearning / pLearning.length) * 100) : 0
        },
        coaching: {
          total: pCoaching.length,
          completed: pCoaching.filter(s => s.status === 'completed').length
        }
      };
    });

    // Generate trends (weekly data for the date range)
    const weeks = Math.ceil(date_range_days / 7);
    const trends = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7) - 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));

      const weekGoals = programGoals.filter(g => {
        const created = new Date(g.created_date);
        return created >= weekStart && created < weekEnd;
      });
      
      const weekCompleted = weekGoals.filter(g => g.status === 'archived' || g.progress === 100).length;

      trends.push({
        week: `Week ${weeks - i}`,
        week_start: weekStart.toISOString().split('T')[0],
        goals_created: weekGoals.length,
        goals_completed: weekCompleted,
        completion_rate: weekGoals.length > 0 ? Math.round((weekCompleted / weekGoals.length) * 100) : 0
      });
    }

    return Response.json({
      success: true,
      data: {
        summary: {
          total_programs: programsToAnalyze.length,
          total_participants: participantEmailArray.length,
          total_goals: totalGoals,
          completed_goals: completedGoals,
          goal_completion_rate: goalCompletionRate,
          total_assessments: totalAssessments,
          avg_assessment_score: avgAssessmentScore,
          total_learning_assignments: totalLearning,
          completed_learning: completedLearning,
          learning_completion_rate: learningCompletionRate,
          total_coaching_sessions: totalCoachingSessions,
          completed_coaching_sessions: completedCoachingSessions
        },
        programs: programBreakdown,
        trends,
        date_range_days,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in getProgramPerformanceReport:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});