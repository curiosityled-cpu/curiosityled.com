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
          programs: [],
          goals: [],
          metrics: {
            total_goals: 0,
            completed_goals: 0,
            active_goals: 0,
            at_risk_goals: 0,
            overdue_goals: 0,
            completion_rate: 0,
            avg_progress: 0
          },
          by_program: [],
          by_status: []
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

    // Get all goals
    const allGoals = await base44.entities.Goal.list();
    
    // Filter goals by program ID or participant
    const programGoals = allGoals.filter(g => 
      programIds.includes(g.program_id) || 
      (participantEmails.has(g.created_by) && g.program_id)
    );

    // Apply date range filter
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - date_range_days);
    
    const filteredGoals = programGoals.filter(g => 
      new Date(g.created_date) >= cutoffDate
    );

    // Calculate metrics
    const now = new Date();
    const totalGoals = filteredGoals.length;
    const completedGoals = filteredGoals.filter(g => g.status === 'archived' || g.progress === 100).length;
    const activeGoals = filteredGoals.filter(g => g.status === 'active' && g.progress < 100).length;
    const draftGoals = filteredGoals.filter(g => g.status === 'draft').length;
    
    const overdueGoals = filteredGoals.filter(g => {
      if (!g.timeframe_end || g.status === 'archived') return false;
      return new Date(g.timeframe_end) < now;
    }).length;
    
    const atRiskGoals = filteredGoals.filter(g => {
      if (!g.timeframe_end || g.status === 'archived') return false;
      const dueDate = new Date(g.timeframe_end);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 7 && daysUntilDue > 0 && g.progress < 80;
    }).length;

    const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
    const avgProgress = totalGoals > 0 
      ? Math.round(filteredGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / totalGoals)
      : 0;

    // Metrics by program
    const byProgram = programsToAnalyze.map(program => {
      const pGoals = filteredGoals.filter(g => g.program_id === program.id);
      const pCompleted = pGoals.filter(g => g.status === 'archived' || g.progress === 100).length;
      return {
        program_id: program.id,
        program_name: program.name,
        total_goals: pGoals.length,
        completed_goals: pCompleted,
        completion_rate: pGoals.length > 0 ? Math.round((pCompleted / pGoals.length) * 100) : 0,
        participants: program.participant_emails?.length || 0
      };
    });

    // Metrics by status
    const byStatus = [
      { status: 'completed', count: completedGoals, color: '#22c55e' },
      { status: 'active', count: activeGoals, color: '#0202ff' },
      { status: 'draft', count: draftGoals, color: '#9ca3af' },
      { status: 'at_risk', count: atRiskGoals, color: '#f59e0b' },
      { status: 'overdue', count: overdueGoals, color: '#ef4444' }
    ];

    return Response.json({
      success: true,
      data: {
        programs: programsToAnalyze,
        goals: filteredGoals,
        metrics: {
          total_goals: totalGoals,
          completed_goals: completedGoals,
          active_goals: activeGoals,
          at_risk_goals: atRiskGoals,
          overdue_goals: overdueGoals,
          completion_rate: completionRate,
          avg_progress: avgProgress
        },
        by_program: byProgram,
        by_status: byStatus
      }
    });
  } catch (error) {
    console.error('Error in getProgramGoalsAnalytics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});