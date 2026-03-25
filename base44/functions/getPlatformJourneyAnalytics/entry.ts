import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Recursive function to get all subordinates up to maxDepth
function getAllSubordinateEmails(managerEmail, allUsers, maxDepth = 10, currentDepth = 0, visited = new Set()) {
  if (currentDepth >= maxDepth || visited.has(managerEmail)) {
    return [];
  }
  
  visited.add(managerEmail);
  
  // Find direct reports
  const directReports = allUsers.filter(u => u.manager_email === managerEmail);
  const allSubordinates = [...directReports];
  
  // Recursively get reports of reports
  for (const report of directReports) {
    const nestedReports = getAllSubordinateEmails(report.email, allUsers, maxDepth, currentDepth + 1, visited);
    allSubordinates.push(...nestedReports);
  }
  
  return allSubordinates;
}

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

    // Allow Platform Admin, Super Admin, Analyst, Admin Level 1, Admin Level 2, User Level 2, and User Level 3
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Analyst', 'Partner Business Administrator', 'Admin Level 1', 'Admin Level 2', 'User Level 2', 'User Level 3'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized - Insufficient permissions',
        details: 'This endpoint requires admin or leadership privileges'
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

    // Fetch all necessary data including all experience types
    console.log('Starting experience analytics data fetch...');
    
    const [
      journeys,
      enrollments,
      users,
      clients,
      assessments,
      goals,
      learningResources,
      programs,
      cohorts,
      classes,
      coachingEngagements,
      coachingSessions
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
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.Program.list('-updated_date'),
        10000,
        'Programs'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.Cohort.list('-updated_date'),
        10000,
        'Cohorts'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.Class.list('-updated_date'),
        10000,
        'Classes'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.CoachingEngagement.list('-updated_date'),
        10000,
        'Coaching Engagements'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.CoachingSession.list('-session_date'),
        10000,
        'Coaching Sessions'
      )
    ]);

    console.log('Data fetched successfully');

    // Filter data based on user role
    let filteredUsers = users;
    let filteredEnrollments = enrollments;
    let filteredAssessments = assessments;
    let filteredGoals = goals;
    let filteredPrograms = programs;
    let filteredCohorts = cohorts;
    let filteredClasses = classes;
    let filteredCoachingEngagements = coachingEngagements;
    let filteredCoachingSessions = coachingSessions;
    let scopeLabel = 'Platform';

    if (user.app_role === 'User Level 2') {
      // Manager - filter to vertical (all subordinates up to 10 levels deep)
      const subordinates = getAllSubordinateEmails(user.email, users, 10);
      const subordinateEmails = new Set([user.email, ...subordinates.map(u => u.email)]);
      
      filteredUsers = users.filter(u => subordinateEmails.has(u.email));
      filteredEnrollments = enrollments.filter(e => subordinateEmails.has(e.user_email));
      filteredAssessments = assessments.filter(a => subordinateEmails.has(a.email));
      filteredGoals = goals.filter(g => subordinateEmails.has(g.created_by));
      filteredPrograms = programs.filter(p => (p.participant_emails || []).some(e => subordinateEmails.has(e)));
      filteredCohorts = cohorts.filter(c => (c.participant_emails || []).some(e => subordinateEmails.has(e)));
      filteredClasses = classes.filter(c => (c.enrolled_emails || []).some(e => subordinateEmails.has(e)));
      filteredCoachingEngagements = coachingEngagements.filter(ce => subordinateEmails.has(ce.coachee_email));
      filteredCoachingSessions = coachingSessions.filter(cs => {
        const engagement = coachingEngagements.find(ce => ce.id === cs.engagement_id);
        return engagement && subordinateEmails.has(engagement.coachee_email);
      });
      
      scopeLabel = `${user.full_name || 'Manager'}'s Team`;
    } else if (user.app_role === 'User Level 3' || user.app_role === 'Analyst') {
      // Org Leader or Analyst - filter to client
      if (user.client_id) {
        filteredUsers = users.filter(u => u.client_id === user.client_id);
        const clientUserEmails = new Set(filteredUsers.map(u => u.email));
        filteredEnrollments = enrollments.filter(e => clientUserEmails.has(e.user_email));
        filteredAssessments = assessments.filter(a => clientUserEmails.has(a.email));
        filteredGoals = goals.filter(g => clientUserEmails.has(g.created_by));
        filteredPrograms = programs.filter(p => p.client_id === user.client_id);
        filteredCohorts = cohorts.filter(c => c.client_id === user.client_id);
        filteredClasses = classes.filter(c => c.client_id === user.client_id);
        filteredCoachingEngagements = coachingEngagements.filter(ce => ce.client_id === user.client_id);
        filteredCoachingSessions = coachingSessions.filter(cs => {
          const engagement = coachingEngagements.find(ce => ce.id === cs.engagement_id);
          return engagement && engagement.client_id === user.client_id;
        });
        
        const client = clients.find(c => c.id === user.client_id);
        scopeLabel = client?.name || 'Organization';
      }
    }

    // Calculate comprehensive analytics including all experience types
    const analytics = calculateExperienceAnalytics({
      journeys: Array.isArray(journeys) ? journeys : [],
      enrollments: Array.isArray(filteredEnrollments) ? filteredEnrollments : [],
      users: Array.isArray(filteredUsers) ? filteredUsers : [],
      clients: Array.isArray(clients) ? clients : [],
      assessments: Array.isArray(filteredAssessments) ? filteredAssessments : [],
      goals: Array.isArray(filteredGoals) ? filteredGoals : [],
      learningResources: Array.isArray(learningResources) ? learningResources : [],
      programs: Array.isArray(filteredPrograms) ? filteredPrograms : [],
      cohorts: Array.isArray(filteredCohorts) ? filteredCohorts : [],
      classes: Array.isArray(filteredClasses) ? filteredClasses : [],
      coachingEngagements: Array.isArray(filteredCoachingEngagements) ? filteredCoachingEngagements : [],
      coachingSessions: Array.isArray(filteredCoachingSessions) ? filteredCoachingSessions : [],
      scopeLabel
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

function calculateExperienceAnalytics({ journeys, enrollments, users, clients, assessments, goals, learningResources, programs, cohorts, classes, coachingEngagements, coachingSessions, scopeLabel }) {
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
    const userAssessments = assessments.filter(a => a.email === enrollment.user_email);
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
  const completersGoals = goals.filter(g => journeyCompleterEmails.has(g.created_by));
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

  // === PROGRAMS ANALYTICS ===
  const totalPrograms = programs.length;
  const activePrograms = programs.filter(p => p.status === 'active').length;
  const totalProgramParticipants = new Set(programs.flatMap(p => p.participant_emails || [])).size;
  
  const programsByType = {};
  programs.forEach(p => {
    const type = p.program_type || 'custom';
    programsByType[type] = (programsByType[type] || 0) + 1;
  });

  const programCompletionRates = programs.map(p => {
    const participants = p.participant_emails?.length || 0;
    // Estimate completion based on metrics if available
    const completionRate = p.metrics?.avg_completion_rate || 0;
    return {
      id: p.id,
      name: p.name,
      type: p.program_type,
      participants,
      completionRate: Math.round(completionRate)
    };
  }).filter(p => p.participants > 0);

  // === CLASSES ANALYTICS ===
  const totalClasses = classes.length;
  const completedClasses = classes.filter(c => c.status === 'completed').length;
  const upcomingClasses = classes.filter(c => {
    const classDate = new Date(c.session_date);
    return classDate > new Date() && c.status !== 'cancelled';
  }).length;
  
  const totalClassAttendees = classes.reduce((sum, c) => sum + (c.enrolled_emails?.length || 0), 0);
  const avgClassAttendance = totalClasses > 0 ? Math.round(totalClassAttendees / totalClasses) : 0;

  const classesByType = {};
  classes.forEach(c => {
    const type = c.class_type || 'workshop';
    classesByType[type] = (classesByType[type] || 0) + 1;
  });

  // === COACHING ANALYTICS ===
  const totalCoachingEngagements = coachingEngagements.length;
  const activeCoachingEngagements = coachingEngagements.filter(ce => ce.status === 'active').length;
  const completedCoachingEngagements = coachingEngagements.filter(ce => ce.status === 'completed').length;
  
  const totalCoachingSessions = coachingSessions.length;
  const completedSessions = coachingSessions.filter(cs => cs.status === 'completed').length;
  const avgSessionsPerEngagement = totalCoachingEngagements > 0 
    ? (totalCoachingSessions / totalCoachingEngagements).toFixed(1) 
    : 0;

  const uniqueCoachees = new Set(coachingEngagements.map(ce => ce.coachee_email)).size;
  const uniqueCoaches = new Set(coachingEngagements.map(ce => ce.coach_email)).size;

  // Coaching completion rate
  const coachingCompletionRate = totalCoachingEngagements > 0
    ? Math.round((completedCoachingEngagements / totalCoachingEngagements) * 100)
    : 0;

  // === COHORTS ANALYTICS ===
  const totalCohorts = cohorts.length;
  const activeCohorts = cohorts.filter(c => c.status === 'active').length;
  const totalCohortParticipants = new Set(cohorts.flatMap(c => c.participant_emails || [])).size;

  // === COMBINED EXPERIENCE SUMMARY ===
  const totalExperiences = totalJourneys + totalPrograms + totalClasses + totalCoachingEngagements;
  const totalParticipants = new Set([
    ...enrollments.map(e => e.user_email),
    ...programs.flatMap(p => p.participant_emails || []),
    ...classes.flatMap(c => c.enrolled_emails || []),
    ...coachingEngagements.map(ce => ce.coachee_email)
  ]).size;

  // Experience type distribution
  const experienceTypeDistribution = [
    { name: 'Journeys', value: totalJourneys, color: '#0202ff' },
    { name: 'Programs', value: totalPrograms, color: '#10b981' },
    { name: 'Classes', value: totalClasses, color: '#f59e0b' },
    { name: 'Coaching', value: totalCoachingEngagements, color: '#8b5cf6' }
  ].filter(e => e.value > 0);

  // Return comprehensive analytics object
  return {
    scopeLabel,

    // Combined Experience Summary
    summary: {
      totalExperiences,
      totalParticipants,
      experienceTypeDistribution,
      totalJourneys,
      totalPrograms,
      totalClasses,
      totalCoachingEngagements
    },
    
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
    trends,

    // Programs Analytics
    programs: {
      totalPrograms,
      activePrograms,
      totalParticipants: totalProgramParticipants,
      programsByType,
      programCompletionRates: programCompletionRates.slice(0, 10)
    },

    // Classes Analytics
    classes: {
      totalClasses,
      completedClasses,
      upcomingClasses,
      avgAttendance: avgClassAttendance,
      classesByType
    },

    // Coaching Analytics
    coaching: {
      totalEngagements: totalCoachingEngagements,
      activeEngagements: activeCoachingEngagements,
      completedEngagements: completedCoachingEngagements,
      totalSessions: totalCoachingSessions,
      completedSessions,
      avgSessionsPerEngagement: parseFloat(avgSessionsPerEngagement),
      uniqueCoachees,
      uniqueCoaches,
      completionRate: coachingCompletionRate
    },

    // Cohorts Analytics
    cohorts: {
      totalCohorts,
      activeCohorts,
      totalParticipants: totalCohortParticipants
    }
  };
}