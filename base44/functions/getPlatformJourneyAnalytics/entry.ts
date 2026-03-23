
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate and authorize
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized - Authentication required' 
      }, { status: 401 });
    }

    // Allow Platform Admin, Super Admin, Admin Level 1, Admin Level 2, and User Level 3
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Admin Level 1', 'Admin Level 2', 'User Level 3'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized - Insufficient permissions',
        details: 'This endpoint requires admin or organizational leadership privileges'
      }, { status: 403 });
    }

    console.log('Fetching platform journey analytics for:', user.email, 'Role:', user.app_role);

    // Helper function to safely fetch with timeout
    const fetchWithTimeout = async (promise, timeoutMs = 10000, entityName = 'data') => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout fetching ${entityName}`)), timeoutMs)
      );
      
      try {
        return await Promise.race([promise, timeoutPromise]);
      } catch (error) {
        console.error(`Error fetching ${entityName}:`, error.message);
        return [];
      }
    };

    // Fetch all necessary data
    console.log('Starting journey analytics data fetch...');
    
    const [
      journeys,
      enrollments,
      users,
      clients,
      assessments,
      goals,
      learningResources
    ] = await Promise.all([
      fetchWithTimeout(
        base44.asServiceRole.entities.LearningJourney.list('-updated_date'),
        10000,
        'Journeys'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.JourneyEnrollment.list('-enrolled_date'),
        10000,
        'Enrollments'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.User.list(),
        10000,
        'Users'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.Client.list(),
        10000,
        'Clients'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.Assessment.list(),
        10000,
        'Assessments'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.Goal.list(),
        10000,
        'Goals'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.LearningResource.list(),
        10000,
        'Learning Resources'
      )
    ]);

    console.log('Data fetched successfully:', {
      journeys: journeys?.length || 0,
      enrollments: enrollments?.length || 0,
      users: users?.length || 0,
      clients: clients?.length || 0,
      assessments: assessments?.length || 0,
      goals: goals?.length || 0,
      learningResources: learningResources?.length || 0
    });

    // Calculate comprehensive analytics
    const analytics = calculateJourneyAnalytics({
      journeys: Array.isArray(journeys) ? journeys : [],
      enrollments: Array.isArray(enrollments) ? enrollments : [],
      users: Array.isArray(users) ? users : [],
      clients: Array.isArray(clients) ? clients : [],
      assessments: Array.isArray(assessments) ? assessments : [],
      goals: Array.isArray(goals) ? goals : [],
      learningResources: Array.isArray(learningResources) ? learningResources : []
    });

    return Response.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error in getPlatformJourneyAnalytics:', error);
    
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to fetch platform journey analytics',
      details: error.stack || 'Unknown error'
    }, { status: 500 });
  }
});

function calculateJourneyAnalytics({ journeys, enrollments, users, clients, assessments, goals, learningResources }) {
  // 1. Journey Creation & Content Health
  const totalJourneys = journeys.length;
  const publishedJourneys = journeys.filter(j => j.status === 'published').length;
  const draftJourneys = journeys.filter(j => j.status === 'draft').length;
  
  // Calculate journeys created in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newJourneysLast30Days = journeys.filter(j => {
    const created = new Date(j.created_date);
    return created >= thirtyDaysAgo;
  }).length;

  // Journey creation by author role
  const journeysByRole = {};
  journeys.forEach(j => {
    const author = users.find(u => u.email === j.author_email);
    const role = author?.app_role || 'Unknown';
    journeysByRole[role] = (journeysByRole[role] || 0) + 1;
  });

  // Average resources per journey
  const totalResources = journeys.reduce((sum, j) => sum + (j.content_structure?.length || 0), 0);
  const avgResourcesPerJourney = totalJourneys > 0 ? Math.round(totalResources / totalJourneys) : 0;

  // Top 5 most utilized learning resources
  const resourceUsage = {};
  journeys.forEach(j => {
    (j.content_structure || []).forEach(item => {
      const resourceId = item.learning_resource_id;
      resourceUsage[resourceId] = (resourceUsage[resourceId] || 0) + 1;
    });
  });
  
  const topResources = Object.entries(resourceUsage)
    .map(([id, count]) => {
      const resource = learningResources.find(r => r.id === id);
      return {
        id,
        title: resource?.title || 'Unknown Resource',
        type: resource?.type || 'unknown',
        usageCount: count
      };
    })
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5);

  // Resource diversity
  const resourceTypeCount = {};
  journeys.forEach(j => {
    (j.content_structure || []).forEach(item => {
      const type = item.type || 'unknown';
      resourceTypeCount[type] = (resourceTypeCount[type] || 0) + 1;
    });
  });

  // 2. Assignment & Coverage
  const totalEnrollments = enrollments.length;
  const uniqueLearnersEnrolled = new Set(enrollments.map(e => e.user_email)).size;
  const avgJourneysPerUser = uniqueLearnersEnrolled > 0 
    ? (totalEnrollments / uniqueLearnersEnrolled).toFixed(1) 
    : 0;

  // Enrollment by client
  const enrollmentsByClient = {};
  enrollments.forEach(e => {
    const user = users.find(u => u.email === e.user_email);
    const clientId = user?.client_id || 'Unknown';
    const client = clients.find(c => c.id === clientId);
    const clientName = client?.name || 'Unknown Client';
    
    if (!enrollmentsByClient[clientName]) {
      enrollmentsByClient[clientName] = {
        clientName,
        enrollments: 0,
        uniqueUsers: new Set()
      };
    }
    enrollmentsByClient[clientName].enrollments++;
    enrollmentsByClient[clientName].uniqueUsers.add(e.user_email);
  });

  const enrollmentsByClientArray = Object.values(enrollmentsByClient).map(c => ({
    clientName: c.clientName,
    enrollments: c.enrollments,
    uniqueUsers: c.uniqueUsers.size
  })).sort((a, b) => b.enrollments - a.enrollments);

  // 3. Engagement & Progress
  const totalProgress = enrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0);
  const avgProgressPerJourney = totalEnrollments > 0 
    ? Math.round(totalProgress / totalEnrollments) 
    : 0;

  // Active journey learners (with progress > 0 and < 100)
  const activeJourneyLearners = enrollments.filter(e => 
    (e.completion_percentage || 0) > 0 && (e.completion_percentage || 0) < 100
  ).length;

  // Drop-off rate calculation
  const startedJourneys = enrollments.filter(e => (e.completion_percentage || 0) > 0).length;
  const droppedOffJourneys = enrollments.filter(e => 
    (e.completion_percentage || 0) > 0 && 
    (e.completion_percentage || 0) < 100 &&
    e.status === 'dropped'
  ).length;
  const dropOffRate = startedJourneys > 0 
    ? Math.round((droppedOffJourneys / startedJourneys) * 100) 
    : 0;

  // Time to first interaction
  const timeToFirstInteraction = [];
  enrollments.forEach(e => {
    if (e.started_date && e.enrolled_date) {
      const enrolled = new Date(e.enrolled_date);
      const started = new Date(e.started_date);
      const daysDiff = Math.floor((started - enrolled) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0) {
        timeToFirstInteraction.push(daysDiff);
      }
    }
  });
  const avgTimeToFirstInteraction = timeToFirstInteraction.length > 0
    ? Math.round(timeToFirstInteraction.reduce((sum, t) => sum + t, 0) / timeToFirstInteraction.length)
    : 0;

  // 4. Completion & Effectiveness
  const completedEnrollments = enrollments.filter(e => e.status === 'completed').length;
  const overallCompletionRate = totalEnrollments > 0 
    ? Math.round((completedEnrollments / totalEnrollments) * 100) 
    : 0;

  // Completion rate by journey type
  const curriculumEnrollments = enrollments.filter(e => {
    const journey = journeys.find(j => j.id === e.journey_id);
    return journey?.type === 'curriculum';
  });
  const learningPathEnrollments = enrollments.filter(e => {
    const journey = journeys.find(j => j.id === e.journey_id);
    return journey?.type === 'learning_path';
  });
  
  const curriculumCompletionRate = curriculumEnrollments.length > 0
    ? Math.round((curriculumEnrollments.filter(e => e.status === 'completed').length / curriculumEnrollments.length) * 100)
    : 0;
  const learningPathCompletionRate = learningPathEnrollments.length > 0
    ? Math.round((learningPathEnrollments.filter(e => e.status === 'completed').length / learningPathEnrollments.length) * 100)
    : 0;

  // Average time to completion
  const completionTimes = [];
  enrollments.forEach(e => {
    if (e.completed_date && e.enrolled_date && e.status === 'completed') {
      const enrolled = new Date(e.enrolled_date);
      const completed = new Date(e.completed_date);
      const daysDiff = Math.floor((completed - enrolled) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0) {
        completionTimes.push(daysDiff);
      }
    }
  });
  const avgTimeToCompletion = completionTimes.length > 0
    ? Math.round(completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length)
    : 0;

  // Journeys with highest/lowest completion rates
  const journeyCompletionRates = journeys.map(j => {
    const journeyEnrollments = enrollments.filter(e => e.journey_id === j.id);
    const completed = journeyEnrollments.filter(e => e.status === 'completed').length;
    const rate = journeyEnrollments.length > 0 
      ? Math.round((completed / journeyEnrollments.length) * 100)
      : 0;
    
    return {
      id: j.id,
      title: j.title,
      type: j.type,
      enrollments: journeyEnrollments.length,
      completionRate: rate
    };
  }).filter(j => j.enrollments > 0);

  const highestCompletionJourneys = [...journeyCompletionRates]
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 5);
  
  const lowestCompletionJourneys = [...journeyCompletionRates]
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 5);

  // Completion rate by user role
  const completionByRole = {};
  enrollments.forEach(e => {
    const user = users.find(u => u.email === e.user_email);
    const role = user?.app_role || 'Unknown';
    
    if (!completionByRole[role]) {
      completionByRole[role] = { total: 0, completed: 0 };
    }
    
    completionByRole[role].total++;
    if (e.status === 'completed') {
      completionByRole[role].completed++;
    }
  });

  const completionByRoleArray = Object.entries(completionByRole).map(([role, data]) => ({
    role,
    completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    totalEnrollments: data.total
  })).sort((a, b) => b.completionRate - a.completionRate);

  // 5. Intervention & Proactive Management
  const atRiskEnrollmentsCount = enrollments.filter(e => { // Renamed to avoid clash with the new detailed array
    const progress = e.completion_percentage || 0;
    const daysSinceEnrolled = e.enrolled_date 
      ? Math.floor((new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24))
      : 0;
    
    // At risk if: enrolled for more than 14 days but less than 50% complete, or status is dropped
    return (daysSinceEnrolled > 14 && progress < 50) || e.status === 'dropped';
  }).length;

  // Overdue resources (estimate based on enrollment date + expected duration)
  const overdueEnrollments = enrollments.filter(e => {
    const journey = journeys.find(j => j.id === e.journey_id);
    const expectedDuration = journey?.estimated_duration_days || 30;
    const daysSinceEnrolled = e.enrolled_date 
      ? Math.floor((new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24))
      : 0;
    
    return daysSinceEnrolled > expectedDuration && e.status !== 'completed';
  }).length;

  // Most engaged journeys (highest average progress among active enrollments)
  const mostEngagedJourneys = journeys.map(j => {
    const journeyEnrollments = enrollments.filter(e => e.journey_id === j.id && e.status !== 'completed');
    const avgProgress = journeyEnrollments.length > 0
      ? journeyEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / journeyEnrollments.length
      : 0;
    
    return {
      id: j.id,
      title: j.title,
      activeEnrollments: journeyEnrollments.length,
      avgProgress: Math.round(avgProgress)
    };
  })
  .filter(j => j.activeEnrollments > 0)
  .sort((a, b) => b.avgProgress - a.avgProgress)
  .slice(0, 5);

  // 6. Impact & Correlation Analysis
  // Calculate average assessment improvement for journey completers
  const journeyCompleters = enrollments.filter(e => e.status === 'completed');
  const completersWithAssessments = [];
  
  journeyCompleters.forEach(enrollment => {
    const userAssessments = assessments.filter(a => a.user_email === enrollment.user_email); // Changed a.email to a.user_email as per typical SDK user object
    if (userAssessments.length >= 2) {
      // Sort by date to get before/after
      const sortedAssessments = userAssessments.sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
      const beforeScore = sortedAssessments[0].overall_pct || 0;
      const afterScore = sortedAssessments[sortedAssessments.length - 1].overall_pct || 0;
      const improvement = afterScore - beforeScore;
      
      if (improvement !== 0) {
        completersWithAssessments.push(improvement);
      }
    }
  });

  const avgAssessmentImprovement = completersWithAssessments.length > 0
    ? Math.round(completersWithAssessments.reduce((sum, imp) => sum + imp, 0) / completersWithAssessments.length)
    : 0;

  // Calculate goal completion correlation
  const journeyCompleterEmails = new Set(journeyCompleters.map(e => e.user_email));
  
  // Goal completion rate for journey completers
  const completersGoals = goals.filter(g => journeyCompleterEmails.has(g.user_email));
  const completersCompletedGoals = completersGoals.filter(g => g.status === 'completed').length;
  const goalCompletionRateForJourneyCompleters = completersGoals.length > 0
    ? Math.round((completersCompletedGoals / completersGoals.length) * 100)
    : 0;

  // Overall goal completion rate
  const totalGoals = goals.length;
  const totalCompletedGoals = goals.filter(g => g.status === 'completed').length;
  const overallGoalCompletionRate = totalGoals > 0
    ? Math.round((totalCompletedGoals / totalGoals) * 100)
    : 0;

  // Calculate improvement delta
  const improvementDelta = goalCompletionRateForJourneyCompleters - overallGoalCompletionRate;

  // 7. Trend Analysis (Last 12 Months)
  const trends = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthStr = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    const journeysCreated = journeys.filter(j => {
      const created = new Date(j.created_date);
      return created >= month && created <= monthEnd;
    }).length;
    
    const enrollmentsInMonth = enrollments.filter(e => {
      const enrolled = new Date(e.enrolled_date);
      return enrolled >= month && enrolled <= monthEnd;
    }).length;
    
    const completionsInMonth = enrollments.filter(e => {
      if (!e.completed_date) return false;
      const completed = new Date(e.completed_date);
      return completed >= month && completed <= monthEnd;
    }).length;
    
    trends.push({
      month: monthStr,
      journeysCreated,
      enrollments: enrollmentsInMonth,
      completions: completionsInMonth
    });
  }

  // Return comprehensive analytics object
  return {
    // Journey Creation & Content Health
    contentHealth: {
      totalJourneys,
      publishedJourneys,
      draftJourneys,
      newJourneysLast30Days,
      journeysByRole,
      avgResourcesPerJourney,
      topResources,
      resourceTypeDistribution: resourceTypeCount
    },
    
    // Assignment & Coverage
    coverage: {
      totalEnrollments,
      uniqueLearnersEnrolled,
      avgJourneysPerUser: parseFloat(avgJourneysPerUser),
      enrollmentsByClient: enrollmentsByClientArray
    },
    
    // Engagement & Progress
    engagement: {
      avgProgressPerJourney,
      activeLearners: activeJourneyLearners,
      dropOffRate,
      avgTimeToFirstInteraction,
      mostEngagedJourneys
    },
    
    // Completion & Effectiveness
    completion: {
      completionRate: overallCompletionRate,
      completedEnrollments,
      curriculumCompletionRate,
      pathCompletionRate: learningPathCompletionRate,
      avgDaysToCompletion: avgTimeToCompletion,
      topPerformingJourneys: highestCompletionJourneys,
      underperformingJourneys: lowestCompletionJourneys,
      completionByRole: completionByRoleArray
    },
    
    // Intervention Needs
    intervention: {
      atRiskLearners: atRiskEnrollmentsCount, // Renamed from atRiskEnrollments
      overdueEnrollments,
      atRiskEnrollments: enrollments.filter(e => { // This is the new detailed array
        const progress = e.completion_percentage || 0;
        const daysSinceEnrolled = e.enrolled_date 
          ? Math.floor((new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24))
          : 0;
        return (daysSinceEnrolled > 14 && progress < 25);
      }).map(e => {
        const journey = journeys.find(j => j.id === e.journey_id);
        return {
          id: e.id,
          userEmail: e.user_email,
          journeyTitle: journey?.title || 'Unknown Journey',
          progress: e.completion_percentage || 0,
          enrolledDate: e.enrolled_date
        };
      })
    },
    
    // Impact & Correlation
    impact: {
      avgAssessmentImprovement,
      goalCompletionRateForJourneyCompleters,
      overallGoalCompletionRate,
      improvementDelta
    },
    
    // Trends
    trends
  };
}
