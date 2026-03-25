
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body for filters
    const body = await req.json().catch(() => ({}));
    const { time_range = '30d' } = body;

    console.log('[getPersonalInsights] Generating insights for user:', user.email, 'Time range:', time_range);

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (time_range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '12mo':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Fetch user's data
    const [assessments, goals, assignedLearning, journeyEnrollments, allUsers] = await Promise.all([
      base44.asServiceRole.entities.Assessment.filter({ email: user.email }),
      base44.asServiceRole.entities.Goal.filter({ user_email: user.email }),
      base44.asServiceRole.entities.AssignedLearning.filter({ user_email: user.email }),
      base44.asServiceRole.entities.JourneyEnrollment.filter({ user_email: user.email }),
      base44.asServiceRole.entities.User.list()
    ]);

    console.log('[getPersonalInsights] Data fetched:', {
      assessments: assessments.length,
      goals: goals.length,
      learning: assignedLearning.length,
      journeys: journeyEnrollments.length
    });

    // Filter data by time range
    const recentAssessments = assessments.filter(a => 
      new Date(a.submission_ts) >= startDate
    ).sort((a, b) => new Date(b.submission_ts) - new Date(a.submission_ts));

    const recentGoals = goals.filter(g => 
      new Date(g.created_date) >= startDate
    );

    const recentLearning = assignedLearning.filter(l => 
      new Date(l.created_date) >= startDate
    );

    // Get peer comparison groups
    const sameLevelPeers = allUsers.filter(u => 
      u.app_role === user.app_role && 
      u.email !== user.email &&
      u.client_id === user.client_id
    );

    const sameDeptPeers = allUsers.filter(u => 
      u.department === user.department && 
      u.email !== user.email &&
      u.client_id === user.client_id
    );

    // Calculate peer benchmarks
    const peerAssessments = await base44.asServiceRole.entities.Assessment.filter({
      client_id: user.client_id
    });

    const sameLevelAssessments = peerAssessments.filter(a => {
      const assessmentUser = allUsers.find(u => u.email === a.email);
      return assessmentUser && assessmentUser.app_role === user.app_role && a.email !== user.email;
    });

    const sameDeptAssessments = peerAssessments.filter(a => {
      const assessmentUser = allUsers.find(u => u.email === a.email);
      return assessmentUser && assessmentUser.department === user.department && a.email !== user.email;
    });

    // Calculate hierarchical ranking among User Level 1 peers
    const latestAssessment = recentAssessments[0];
    let hierarchicalComparison = null;

    if (latestAssessment && sameLevelPeers.length > 0) {
      // Get latest assessment for each same-level peer
      const peerScores = [];
      for (const peer of sameLevelPeers) {
        const peerAssessmentsForUser = await base44.asServiceRole.entities.Assessment.filter({ 
          email: peer.email 
        });
        if (peerAssessmentsForUser.length > 0) {
          const latestPeerAssessment = peerAssessmentsForUser.sort((a, b) => 
            new Date(b.submission_ts).getTime() - new Date(a.submission_ts).getTime()
          )[0];
          peerScores.push({
            email: peer.email,
            score: latestPeerAssessment.overall_pct || 0
          });
        }
      }

      if (peerScores.length > 0) {
        // Add current user's score
        const allScores = [...peerScores, { email: user.email, score: latestAssessment.overall_pct || 0 }];
        
        // Sort by score descending
        allScores.sort((a, b) => b.score - a.score);
        
        // Find user's rank
        const userRank = allScores.findIndex(s => s.email === user.email) + 1;
        const totalCount = allScores.length;
        const percentile = Math.round(((totalCount - userRank) / totalCount) * 100);
        
        // Create performance tiers
        const topPerformers = allScores.filter(s => s.score >= 80).length;
        const highPerformers = allScores.filter(s => s.score >= 60 && s.score < 80).length;
        const developingPerformers = allScores.filter(s => s.score >= 40 && s.score < 60).length;
        const needsSupport = allScores.filter(s => s.score < 40).length;
        
        // Determine user's tier
        const userScore = latestAssessment.overall_pct || 0;
        let userTier = 'Needs Support';
        if (userScore >= 80) userTier = 'Top Performer';
        else if (userScore >= 60) userTier = 'High Performer';
        else if (userScore >= 40) userTier = 'Developing';

        const sumScores = allScores.reduce((sum, s) => sum + s.score, 0);
        const averageScore = totalCount > 0 ? Math.round(sumScores / totalCount) : 0;
        const medianScore = totalCount > 0 ? allScores[Math.floor(totalCount / 2)].score : 0;
        
        hierarchicalComparison = {
          userRank,
          totalCount,
          percentile,
          userScore,
          userTier,
          distribution: {
            topPerformers,
            highPerformers,
            developingPerformers,
            needsSupport
          },
          topPerformerThreshold: 80,
          highPerformerThreshold: 60,
          averageScore,
          medianScore
        };
      }
    }

    // Calculate metrics
    const previousAssessment = recentAssessments[1];

    const activeGoals = goals.filter(g => ['active', 'at_risk', 'overdue'].includes(g.status));
    const completedGoals = goals.filter(g => g.status === 'completed');
    const overdueGoals = goals.filter(g => g.status === 'overdue');
    
    const activeLearning = assignedLearning.filter(l => ['assigned', 'started', 'in_progress'].includes(l.status));
    const completedLearning = assignedLearning.filter(l => l.status === 'completed');

    const activeJourneys = journeyEnrollments.filter(j => j.status === 'in_progress');
    const completedJourneys = journeyEnrollments.filter(j => j.status === 'completed');

    // Calculate goal completion rate
    const totalGoals = goals.length;
    const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0;

    // Calculate learning completion rate
    const totalLearning = assignedLearning.length;
    const learningCompletionRate = totalLearning > 0 ? Math.round((completedLearning.length / totalLearning) * 100) : 0;

    // Calculate average journey completion
    const avgJourneyCompletion = journeyEnrollments.length > 0
      ? Math.round(journeyEnrollments.reduce((sum, j) => sum + (j.completion_percentage || 0), 0) / journeyEnrollments.length)
      : 0;

    // Peer benchmarks
    const sameLevelAvgScore = sameLevelAssessments.length > 0
      ? Math.round(sameLevelAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / sameLevelAssessments.length)
      : 0;

    const sameDeptAvgScore = sameDeptAssessments.length > 0
      ? Math.round(sameDeptAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / sameDeptAssessments.length)
      : 0;

    // Generate AI insights
    const keyInsights = [];

    // Assessment insights
    if (latestAssessment) {
      const currentScore = latestAssessment.overall_pct || 0;
      
      if (previousAssessment) {
        const previousScore = previousAssessment.overall_pct || 0;
        const improvement = currentScore - previousScore;
        
        if (improvement > 5) {
          keyInsights.push({
            type: 'positive_trend',
            category: 'leadership_development',
            title: `Your leadership score improved by ${improvement}%`,
            description: `Great progress! You've grown from ${previousScore}% to ${currentScore}% since your last assessment.`,
            icon: 'trending_up',
            impact_score: Math.min(improvement * 2, 100),
            recommended_action: 'Keep up the momentum by focusing on your development goals.',
            priority: improvement > 15 ? 'high' : 'medium'
          });
        } else if (improvement < -5) {
          keyInsights.push({
            type: 'negative_trend',
            category: 'leadership_development',
            title: `Your leadership score decreased by ${Math.abs(improvement)}%`,
            description: `Your score dropped from ${previousScore}% to ${currentScore}%. Let's identify areas for improvement.`,
            icon: 'trending_down',
            impact_score: Math.min(Math.abs(improvement) * 2, 100),
            recommended_action: 'Schedule a coaching session to discuss development strategies.',
            priority: 'high'
          });
        }
      }

      // Peer comparison insights
      if (sameLevelAvgScore > 0) {
        const diff = currentScore - sameLevelAvgScore;
        if (diff > 10) {
          keyInsights.push({
            type: 'peer_comparison',
            category: 'leadership_development',
            title: `You're outperforming peers by ${diff}%`,
            description: `Your score of ${currentScore}% is ${diff}% higher than the ${user.app_role} average of ${sameLevelAvgScore}%.`,
            icon: 'award',
            impact_score: Math.min(diff * 2, 100),
            recommended_action: 'Consider mentoring peers who are developing these skills.',
            priority: 'low'
          });
        } else if (diff < -10) {
          keyInsights.push({
            type: 'peer_comparison',
            category: 'leadership_development',
            title: `Opportunity to catch up with peers`,
            description: `Your score is ${Math.abs(diff)}% below the ${user.app_role} average. Focus on your development areas.`,
            icon: 'target',
            impact_score: Math.min(Math.abs(diff) * 2, 100),
            recommended_action: 'Review your competency gaps and create targeted development goals.',
            priority: 'medium'
          });
        }
      }

      // Competency-specific insights
      const competencies = [
        { key: 'si_pct', name: 'Situational Intelligence' },
        { key: 'dm_pct', name: 'Decision Making' },
        { key: 'comm_pct', name: 'Communication' },
        { key: 'rm_pct', name: 'Resource Management' },
        { key: 'sm_pct', name: 'Stakeholder Management' },
        { key: 'pm_pct', name: 'Performance Management' }
      ];

      const lowestCompetency = competencies.reduce((lowest, comp) => {
        const score = latestAssessment[comp.key] || 0;
        return score < (latestAssessment[lowest.key] || 100) ? comp : lowest;
      }, competencies[0]);

      const lowestScore = latestAssessment[lowestCompetency.key] || 0;

      if (lowestScore < 60) {
        keyInsights.push({
          type: 'development_area',
          category: 'leadership_development',
          title: `${lowestCompetency.name} needs attention`,
          description: `Your ${lowestCompetency.name} score is ${lowestScore}%, which is your lowest competency area.`,
          icon: 'alert',
          impact_score: 100 - lowestScore,
          recommended_action: `Focus on learning resources that develop ${lowestCompetency.name} skills.`,
          priority: lowestScore < 40 ? 'high' : 'medium',
          competency: lowestCompetency.key
        });
      }
    } else {
      keyInsights.push({
        type: 'missing_data',
        category: 'leadership_development',
        title: 'Take your first leadership assessment',
        description: 'Get personalized insights by completing your Situational Intelligence assessment.',
        icon: 'clipboard',
        impact_score: 100,
        recommended_action: 'Take the assessment now to establish your baseline.',
        priority: 'high'
      });
    }

    // Goal insights
    if (overdueGoals.length > 0) {
      const mostOverdue = overdueGoals.reduce((oldest, goal) => {
        const goalDate = new Date(goal.due_date);
        const oldestDate = new Date(oldest.due_date);
        return goalDate < oldestDate ? goal : oldest;
      }, overdueGoals[0]);

      const daysOverdue = Math.floor((now.getTime() - new Date(mostOverdue.due_date).getTime()) / (1000 * 60 * 60 * 24));

      keyInsights.push({
        type: 'action_required',
        category: 'goal_achievement',
        title: `${overdueGoals.length} goal${overdueGoals.length > 1 ? 's' : ''} overdue`,
        description: `"${mostOverdue.title}" is ${daysOverdue} days overdue. Update your progress or adjust the deadline.`,
        icon: 'alert',
        impact_score: Math.min(overdueGoals.length * 20, 100),
        recommended_action: 'Review overdue goals and update progress or request deadline extensions.',
        priority: 'high',
        goal_id: mostOverdue.id
      });
    }

    if (activeGoals.length > 0) {
      const atRiskGoals = activeGoals.filter(g => g.status === 'at_risk');
      if (atRiskGoals.length > 0) {
        keyInsights.push({
          type: 'warning',
          category: 'goal_achievement',
          title: `${atRiskGoals.length} goal${atRiskGoals.length > 1 ? 's' : ''} at risk`,
          description: 'These goals are behind schedule. Take action to get back on track.',
          icon: 'alert',
          impact_score: Math.min(atRiskGoals.length * 15, 100),
          recommended_action: 'Update goal progress and identify blockers.',
          priority: 'medium'
        });
      }

      // Check for goals with low completion percentage
      const strugglingGoals = activeGoals.filter(g => {
        const daysElapsed = Math.floor((now.getTime() - new Date(g.created_date).getTime()) / (1000 * 60 * 60 * 24));
        const daysTotal = Math.floor((new Date(g.due_date).getTime() - new Date(g.created_date).getTime()) / (1000 * 60 * 60 * 24));
        const expectedProgress = (daysTotal > 0) ? (daysElapsed / daysTotal) * 100 : 0;
        return g.completion_percentage < expectedProgress - 20;
      });

      if (strugglingGoals.length > 0) {
        keyInsights.push({
          type: 'warning',
          category: 'goal_achievement',
          title: `${strugglingGoals.length} goal${strugglingGoals.length > 1 ? 's are' : ' is'} behind pace`,
          description: `At the current rate, you may miss ${strugglingGoals.length > 1 ? 'these deadlines' : 'this deadline'}. Consider breaking down tasks or requesting support.`,
          icon: 'clock',
          impact_score: Math.min(strugglingGoals.length * 20, 100),
          recommended_action: 'Break down goals into smaller milestones and update weekly.',
          priority: 'medium'
        });
      }
    }

    if (goalCompletionRate > 75) {
      keyInsights.push({
        type: 'positive_trend',
        category: 'goal_achievement',
        title: `Excellent goal completion rate: ${goalCompletionRate}%`,
        description: `You've completed ${completedGoals.length} of ${totalGoals} goals. Keep up the great work!`,
        icon: 'trophy',
        impact_score: goalCompletionRate,
        recommended_action: 'Set new stretch goals to continue your development.',
        priority: 'low'
      });
    }

    // Learning insights
    if (activeLearning.length > 0) {
      const overduelearning = activeLearning.filter(l => l.due_date && new Date(l.due_date) < now);
      
      if (overduelearning.length > 0) {
        keyInsights.push({
          type: 'action_required',
          category: 'learning_effectiveness',
          title: `${overduelearning.length} learning assignment${overduelearning.length > 1 ? 's' : ''} overdue`,
          description: 'Complete overdue learning to stay on track with your development plan.',
          icon: 'alert',
          impact_score: Math.min(overduelearning.length * 25, 100),
          recommended_action: 'Prioritize completing overdue learning this week.',
          priority: 'high'
        });
      }
    }

    if (learningCompletionRate > 80) {
      keyInsights.push({
        type: 'positive_trend',
        category: 'learning_effectiveness',
        title: `Strong learning completion: ${learningCompletionRate}%`,
        description: 'You consistently complete assigned learning. This dedication will accelerate your growth.',
        icon: 'book',
        impact_score: learningCompletionRate,
        recommended_action: 'Continue this momentum and explore self-directed learning.',
        priority: 'low'
      });
    }

    // Journey insights
    if (activeJourneys.length > 0) {
      const slowJourneys = activeJourneys.filter(j => j.completion_percentage < 20 && 
        Math.floor((now.getTime() - new Date(j.enrolled_date).getTime()) / (1000 * 60 * 60 * 24)) > 14
      );

      if (slowJourneys.length > 0) {
        keyInsights.push({
          type: 'warning',
          category: 'learning_effectiveness',
          title: 'Learning journey progress is slow',
          description: `You have ${slowJourneys.length} journey${slowJourneys.length > 1 ? 's' : ''} with minimal progress. Dedicate time each week to advance.`,
          icon: 'map',
          impact_score: 70,
          recommended_action: 'Schedule 30 minutes daily to progress through learning content.',
          priority: 'medium'
        });
      }
    }

    // Behavioral insights
    const daysSinceLastAssessment = latestAssessment 
      ? Math.floor((now.getTime() - new Date(latestAssessment.submission_ts).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceLastAssessment && daysSinceLastAssessment > 180) {
      keyInsights.push({
        type: 'action_required',
        category: 'leadership_development',
        title: 'Time for a reassessment',
        description: `It's been ${daysSinceLastAssessment} days since your last assessment. Retake it to measure your growth.`,
        icon: 'refresh',
        impact_score: Math.min(daysSinceLastAssessment / 2, 100),
        recommended_action: 'Schedule your next assessment to track development progress.',
        priority: 'medium'
      });
    }

    // Usage pattern insights
    if (goals.length === 0) {
      keyInsights.push({
        type: 'missing_data',
        category: 'goal_achievement',
        title: 'Set your first development goal',
        description: 'Goals provide direction and help track your leadership development progress.',
        icon: 'target',
        impact_score: 90,
        recommended_action: 'Create a SMART goal based on your assessment results.',
        priority: 'high'
      });
    }

    if (assignedLearning.length === 0) {
      keyInsights.push({
        type: 'missing_data',
        category: 'learning_effectiveness',
        title: 'Explore learning resources',
        description: 'Browse the learning library to find resources that match your development needs.',
        icon: 'book',
        impact_score: 85,
        recommended_action: 'Visit the learning library and bookmark resources.',
        priority: 'medium'
      });
    }

    // Career progression insight
    let careerReadiness = null;
    if (latestAssessment) {
      // Simple readiness calculation based on assessment score
      const score = latestAssessment.overall_pct || 0;
      const readinessPercentage = Math.min(Math.round((score / 80) * 100), 100); // 80% score = 100% ready
      
      careerReadiness = {
        percentage: readinessPercentage,
        nextRole: 'User Level 2', // This should be dynamic based on career paths
        message: readinessPercentage >= 85 
          ? `You're ${readinessPercentage}% ready for the next level!`
          : `You're ${readinessPercentage}% ready. Keep developing your skills.`,
        action: readinessPercentage >= 85
          ? 'Explore career paths and discuss promotion with your manager.'
          : 'Focus on closing competency gaps to advance.'
      };

      if (readinessPercentage >= 85) {
        keyInsights.push({
          type: 'positive_trend',
          category: 'career_progression',
          title: `You're ${readinessPercentage}% ready for promotion`,
          description: `Based on your assessment and goal completion, you're well-positioned for ${careerReadiness.nextRole}.`,
          icon: 'award',
          impact_score: readinessPercentage,
          recommended_action: careerReadiness.action,
          priority: 'medium'
        });
      }
    }

    // Generate AI-powered to-do list
    const todoList = [];

    if (!latestAssessment) {
      todoList.push({
        id: 'take_assessment',
        title: 'Complete your leadership assessment',
        description: 'Get personalized insights and recommendations',
        priority: 'high',
        category: 'assessment',
        estimated_time: '15-20 minutes',
        action: 'take_assessment',
        completed: false
      });
    }

    if (overdueGoals.length > 0) {
      todoList.push({
        id: 'update_overdue_goals',
        title: `Update ${overdueGoals.length} overdue goal${overdueGoals.length > 1 ? 's' : ''}`,
        description: 'Review and update progress on overdue goals',
        priority: 'high',
        category: 'goals',
        estimated_time: '10 minutes',
        action: 'update_goals',
        completed: false
      });
    }

    if (activeLearning.filter(l => l.due_date && new Date(l.due_date) < now).length > 0) {
      todoList.push({
        id: 'complete_overdue_learning',
        title: 'Complete overdue learning assignments',
        description: 'Finish pending learning to stay on track',
        priority: 'high',
        category: 'learning',
        estimated_time: '30 minutes',
        action: 'view_learning',
        completed: false
      });
    }

    if (activeGoals.filter(g => g.status === 'at_risk').length > 0) {
      todoList.push({
        id: 'review_at_risk_goals',
        title: 'Review at-risk goals',
        description: 'Identify blockers and update progress',
        priority: 'medium',
        category: 'goals',
        estimated_time: '15 minutes',
        action: 'update_goals',
        completed: false
      });
    }

    if (activeJourneys.length > 0) {
      const nextJourney = activeJourneys[0];
      todoList.push({
        id: 'continue_journey',
        title: 'Continue learning journey',
        description: `Resume "${nextJourney.journey_title || 'your journey'}" (${nextJourney.completion_percentage || 0}% complete)`,
        priority: 'medium',
        category: 'learning',
        estimated_time: '20 minutes',
        action: 'continue_journey',
        journey_id: nextJourney.journey_id,
        completed: false
      });
    }

    if (latestAssessment && lowestCompetency && latestAssessment[lowestCompetency.key] < 60) {
      todoList.push({
        id: 'explore_development_resources',
        title: `Find resources for ${lowestCompetency.name}`,
        description: 'Browse learning library for targeted development',
        priority: 'medium',
        category: 'learning',
        estimated_time: '10 minutes',
        action: 'view_learning',
        competency: lowestCompetency.key,
        completed: false
      });
    }

    if (goals.length === 0) {
      todoList.push({
        id: 'create_first_goal',
        title: 'Set your first development goal',
        description: 'Create a SMART goal to guide your growth',
        priority: 'high',
        category: 'goals',
        estimated_time: '10 minutes',
        action: 'create_goal',
        completed: false
      });
    }

    if (user.department && !user.current_role) {
      todoList.push({
        id: 'complete_profile',
        title: 'Complete your profile',
        description: 'Add missing information for better recommendations',
        priority: 'low',
        category: 'profile',
        estimated_time: '5 minutes',
        action: 'update_profile',
        completed: false
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    todoList.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Prepare response data
    const responseData = {
      success: true,
      data: {
        personalMetrics: {
          currentAssessmentScore: latestAssessment?.overall_pct || null,
          previousAssessmentScore: previousAssessment?.overall_pct || null,
          scoreChange: latestAssessment && previousAssessment 
            ? latestAssessment.overall_pct - previousAssessment.overall_pct 
            : null,
          goalCompletionRate,
          learningCompletionRate,
          avgJourneyCompletion,
          activeGoalsCount: activeGoals.length,
          completedGoalsCount: completedGoals.length,
          overdueGoalsCount: overdueGoals.length,
          activeLearningCount: activeLearning.length,
          completedLearningCount: completedLearning.length,
          activeJourneysCount: activeJourneys.length,
          completedJourneysCount: completedJourneys.length
        },
        peerBenchmarks: {
          sameLevelAvgScore,
          sameLevelCount: sameLevelPeers.length,
          sameDeptAvgScore,
          sameDeptCount: sameDeptPeers.length,
          yourScore: latestAssessment?.overall_pct || null,
          scoreDiffLevel: latestAssessment ? (latestAssessment.overall_pct - sameLevelAvgScore) : null,
          scoreDiffDept: latestAssessment ? (latestAssessment.overall_pct - sameDeptAvgScore) : null
        },
        hierarchicalComparison,
        competencyBreakdown: latestAssessment ? {
          si: latestAssessment.si_pct || 0,
          dm: latestAssessment.dm_pct || 0,
          comm: latestAssessment.comm_pct || 0,
          rm: latestAssessment.rm_pct || 0,
          sm: latestAssessment.sm_pct || 0,
          pm: latestAssessment.pm_pct || 0,
          lowest: {
            name: (latestAssessment[lowestCompetency.key] !== undefined) ? lowestCompetency.name : 'N/A', // Ensure lowestCompetency is defined and its key exists in latestAssessment
            key: lowestCompetency?.key || 'N/A',
            score: latestAssessment[lowestCompetency.key] || 0
          }
        } : null,
        keyInsights: keyInsights.slice(0, 8), // Limit to 8 insights
        prioritizedTodos: todoList.slice(0, 7), // Limit to 7 to-dos
        careerReadiness,
        lastAssessmentDate: latestAssessment?.submission_ts || null,
        daysSinceLastAssessment,
        nextAssessmentRecommended: daysSinceLastAssessment ? daysSinceLastAssessment > 90 : true
      }
    };

    console.log('[getPersonalInsights] Successfully generated insights');
    return Response.json(responseData);

  } catch (error) {
    console.error('[getPersonalInsights] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
