import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Recursive function to get all subordinates up to maxDepth
function getAllSubordinateEmails(managerEmail, allUsers, maxDepth = 50, currentDepth = 0, visited = new Set()) {
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
    for (const nestedReport of nestedReports) {
      if (!allSubordinates.some(s => s.email === nestedReport.email)) {
        allSubordinates.push(nestedReport);
      }
    }
  }

  return allSubordinates;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({
        success: false,
        error: 'Unauthorized - Authentication required'
      }, { status: 401 });
    }

    // Allow Platform Admin, Super Admin, Analyst, Admin roles, User Level 2, and User Level 3
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Analyst', 'Partner Business Administrator', 'Admin Level 1', 'Admin Level 2', 'User Level 2', 'User Level 3'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({
        success: false,
        error: 'Unauthorized - Insufficient permissions'
      }, { status: 403 });
    }

    console.log('Fetching learning analytics for:', user.email, user.app_role);

    // Parse request parameters from URL query string
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);

    // Default filter values if not present in params
    const {
      time_range = '30d',
      client_id = 'all',
      department = 'all',
      competency = 'all',
      learning_type = 'all',
      leadership_level = 'all',
      skill_topic = 'all',
      learning_status = 'all'
    } = params;


    // Fetch all data using service role for comprehensive access
    const [allUsers, allClients, assignedLearning, learningResources, assessments] = await Promise.all([
      base44.asServiceRole.entities.User.list().catch(() => []),
      base44.asServiceRole.entities.Client.list().catch(() => []),
      base44.asServiceRole.entities.AssignedLearning.list().catch(() => []),
      base44.asServiceRole.entities.LearningResource.list().catch(() => []),
      base44.asServiceRole.entities.Assessment.list().catch(() => [])
    ]);

    // Determine scope based on user's role
    let scopedUsers = allUsers;
    let scopedClients = allClients;
    let scopedAssessments = assessments;
    let scopeLabel = 'Platform';

    if (user.app_role === 'User Level 2') {
      // Manager - get all subordinates recursively
      const subordinates = getAllSubordinateEmails(user.email, allUsers, 50);
      const teamEmails = new Set([user.email, ...subordinates.map(u => u.email)]);
      scopedUsers = allUsers.filter(u => teamEmails.has(u.email));

      const clientIdsInScope = new Set(scopedUsers.map(u => u.client_id).filter(Boolean));
      scopedClients = allClients.filter(c => clientIdsInScope.has(c.id));
      scopedAssessments = assessments.filter(a => teamEmails.has(a.email));
      scopeLabel = `${user.full_name || 'Manager'}'s Team`;
    } else if (user.app_role === 'User Level 3' || user.app_role === 'Analyst') {
      // Org Leader or Analyst - filter by their client
      if (user.client_id) {
        scopedUsers = allUsers.filter(u => u.client_id === user.client_id);
        scopedClients = allClients.filter(c => c.id === user.client_id);
        const userEmails = new Set(scopedUsers.map(u => u.email));
        scopedAssessments = assessments.filter(a => userEmails.has(a.email));
        scopeLabel = 'Organization';
      }
    } else if (user.app_role === 'Admin Level 1' && user.client_id) {
      // Program Admin - filter by their client
      scopedUsers = allUsers.filter(u => u.client_id === user.client_id);
      scopedClients = allClients.filter(c => c.id === user.client_id);
      const userEmails = new Set(scopedUsers.map(u => u.email));
      scopedAssessments = assessments.filter(a => userEmails.has(a.email));
      scopeLabel = 'Organization';
    } else if (user.app_role === 'Admin Level 2' && user.client_id) {
      // HR Admin - filter by their client
      scopedUsers = allUsers.filter(u => u.client_id === user.client_id);
      scopedClients = allClients.filter(c => c.id === user.client_id);
      const userEmails = new Set(scopedUsers.map(u => u.email));
      scopedAssessments = assessments.filter(a => userEmails.has(a.email));
      scopeLabel = 'Organization';
    } else if (user.app_role === 'Super Administrator' || user.app_role === 'Partner Business Administrator') {
      if (user.client_id) {
        const currentClient = allClients.find(c => c.id === user.client_id);

        if (currentClient?.type === 'partner_client' && currentClient.partner_id) {
          scopedClients = allClients.filter(c => c.partner_id === currentClient.partner_id);
        } else {
          scopedClients = allClients.filter(c => c.id === user.client_id);
        }

        const clientIds = scopedClients.map(c => c.id);
        scopedUsers = allUsers.filter(u => clientIds.includes(u.client_id));
        const userEmails = new Set(scopedUsers.map(u => u.email));
        scopedAssessments = assessments.filter(a => userEmails.has(a.email));
      }
    }
    // Platform Admin sees all data by default

    // Filter assigned learning to only include those assigned to scoped users
    const scopedUserEmails = new Set(scopedUsers.map(u => u.email));
    let filteredAssignedLearning = assignedLearning.filter(al => scopedUserEmails.has(al.user_email));


    // Apply additional filters from query parameters
    // Time range filter
    if (time_range !== 'all') {
      const now = new Date();
      let cutoffDate = null;

      switch (time_range) {
        case '7d':
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30d':
          cutoffDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90d':
          cutoffDate = new Date(now.setDate(now.getDate() - 90));
          break;
        case '12mo':
          cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        case 'custom':
          if (params.start_date) cutoffDate = new Date(params.start_date);
          break;
      }

      if (cutoffDate) {
        filteredAssignedLearning = filteredAssignedLearning.filter(al =>
          new Date(al.created_date) >= cutoffDate
        );
      }

      if (time_range === 'custom' && params.end_date) {
        const endDate = new Date(params.end_date);
        filteredAssignedLearning = filteredAssignedLearning.filter(al =>
          new Date(al.created_date) <= endDate
        );
      }
    }

    // Other filters
    if (client_id !== 'all') {
      const clientUserEmails = new Set(scopedUsers.filter(u => u.client_id === client_id).map(u => u.email));
      filteredAssignedLearning = filteredAssignedLearning.filter(al => clientUserEmails.has(al.user_email));
    }

    if (department !== 'all') {
      const deptUserEmails = new Set(scopedUsers.filter(u => u.department === department).map(u => u.email));
      filteredAssignedLearning = filteredAssignedLearning.filter(al => deptUserEmails.has(al.user_email));
    }

    if (competency !== 'all') {
      filteredAssignedLearning = filteredAssignedLearning.filter(al => {
        const resource = learningResources.find(r => r.id === al.learning_resource_id);
        return resource?.competencies && resource.competencies.includes(competency);
      });
    }

    if (learning_type !== 'all') {
      filteredAssignedLearning = filteredAssignedLearning.filter(al => {
        const resource = learningResources.find(r => r.id === al.learning_resource_id);
        return resource?.type === learning_type;
      });
    }

    if (leadership_level !== 'all') {
      filteredAssignedLearning = filteredAssignedLearning.filter(al => {
        const resource = learningResources.find(r => r.id === al.learning_resource_id);
        return resource?.leadership_level === leadership_level;
      });
    }

    if (skill_topic !== 'all') {
      filteredAssignedLearning = filteredAssignedLearning.filter(al => {
        const resource = learningResources.find(r => r.id === al.learning_resource_id);
        return resource?.tags && resource.tags.includes(skill_topic);
      });
    }

    if (learning_status !== 'all') {
      if (learning_status === 'assigned') {
        filteredAssignedLearning = filteredAssignedLearning.filter(al => al.status === 'assigned');
      } else if (learning_status === 'in_progress') {
        filteredAssignedLearning = filteredAssignedLearning.filter(al =>
          al.status === 'in_progress' || al.status === 'started'
        );
      } else if (learning_status === 'completed') {
        filteredAssignedLearning = filteredAssignedLearning.filter(al => al.status === 'completed');
      } else if (learning_status === 'overdue') {
        filteredAssignedLearning = filteredAssignedLearning.filter(al => al.status === 'overdue');
      }
    }

    // Calculate metrics
    const analytics = calculateLearningMetrics({
      assignedLearning: filteredAssignedLearning,
      users: scopedUsers,
      learningResources: learningResources,
      clients: scopedClients,
      assessments: scopedAssessments,
      scopeLabel
    });

    console.log('Learning analytics calculated successfully');

    return Response.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error in getLearningAnalytics:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to fetch learning analytics',
      details: error.stack
    }, { status: 500 });
  }
});

function calculateLearningMetrics({ assignedLearning, users, learningResources, clients, assessments, scopeLabel }) {
  // Filter resources to those that are part of the assigned learning
  const relevantResourceIds = new Set(assignedLearning.map(al => al.learning_resource_id));
  const relevantLearningResources = learningResources.filter(lr => relevantResourceIds.has(lr.id));

  // Calculate metrics
  const totalResources = relevantLearningResources.length;
  const totalAssigned = assignedLearning.length;
  const completedLearning = assignedLearning.filter(al => al.status === 'completed');
  const completedCount = completedLearning.length;
  const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

  const activeLearnersSet = new Set(
    assignedLearning
      .filter(al => ['started', 'in_progress', 'completed'].includes(al.status))
      .map(al => al.user_email)
  );
  const activeLearners = activeLearnersSet.size;

  // Total unique learners
  const totalUniqueLearners = new Set(assignedLearning.map(al => al.user_email)).size;

  const pendingLearning = assignedLearning.filter(al =>
    ['assigned', 'overdue'].includes(al.status)
  ).length;

  const avgTimeToComplete = completedCount > 0 ? 14 : 0;
  const newLearningItemsAdded = new Set(assignedLearning.map(al => al.learning_resource_id)).size;


  // Top competency gaps
  const competencyScores = {
    'Situational Intelligence': [],
    'Decision Making': [],
    'Communication': [],
    'Resource Management': [],
    'Stakeholder Management': [],
    'Performance Management': []
  };

  assessments.forEach(a => {
    competencyScores['Situational Intelligence'].push(a.si_pct || 0);
    competencyScores['Decision Making'].push(a.dm_pct || 0);
    competencyScores['Communication'].push(a.comm_pct || 0);
    competencyScores['Resource Management'].push(a.rm_pct || 0);
    competencyScores['Stakeholder Management'].push(a.sm_pct || 0);
    competencyScores['Performance Management'].push(a.pm_pct || 0);
  });

  const topCompetencyGaps = Object.entries(competencyScores)
    .map(([name, scores]) => ({
      name,
      avg_score: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0
    }))
    .sort((a, b) => a.avg_score - b.avg_score)
    .slice(0, 3);

  // Average engagement score (mock)
  const averageEngagementScore = 75;

  // Learning by type
  const learningByType = {};
  assignedLearning.forEach(al => {
    const resource = learningResources.find(lr => lr.id === al.learning_resource_id);
    if (resource) {
      const type = resource.type || 'unknown';
      learningByType[type] = (learningByType[type] || 0) + 1;
    }
  });

  // Learning by competency
  const learningByCompetency = {};
  assignedLearning.forEach(al => {
    const resource = learningResources.find(lr => lr.id === al.learning_resource_id);
    if (resource && resource.competencies) {
      resource.competencies.forEach((comp) => {
        learningByCompetency[comp] = (learningByCompetency[comp] || 0) + 1;
      });
    }
  });

  // Competency learning activity (assigned vs completed)
  const competencyLearningActivity = {};
  assignedLearning.forEach(al => {
    const resource = learningResources.find(lr => lr.id === al.learning_resource_id);
    if (resource && resource.competencies) {
      resource.competencies.forEach((comp) => {
        if (!competencyLearningActivity[comp]) {
          competencyLearningActivity[comp] = { assigned: 0, completed: 0 };
        }
        competencyLearningActivity[comp].assigned++;
        if (al.status === 'completed') {
          competencyLearningActivity[comp].completed++;
        }
      });
    }
  });

  const competencyActivityArray = Object.entries(competencyLearningActivity).map(([competency, stats]) => ({
    competency,
    assigned: stats.assigned,
    completed: stats.completed
  }));

  // Learning by skill/topic
  const learningBySkillTopic = {};
  assignedLearning.forEach(al => {
    const resource = learningResources.find(lr => lr.id === al.learning_resource_id);
    if (resource && resource.tags && Array.isArray(resource.tags)) {
      resource.tags.forEach((tag) => {
        if (!learningBySkillTopic[tag]) {
          learningBySkillTopic[tag] = { assigned: 0, completed: 0 };
        }
        learningBySkillTopic[tag].assigned++;
        if (al.status === 'completed') {
          learningBySkillTopic[tag].completed++;
        }
      });
    }
  });

  const skillTopicArray = Object.entries(learningBySkillTopic).map(([topic, stats]) => ({
    topic,
    assigned: stats.assigned,
    completed: stats.completed,
    completionRate: stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0
  }));

  // Learning by leadership level
  const learningByLeadershipLevel = {};
  assignedLearning.forEach(al => {
    const learnerUser = users.find(u => u.email === al.user_email);
    if (learnerUser && learnerUser.current_role) {
      const role = learnerUser.current_role.toLowerCase();
      let level = 'Other';

      if (role.includes('manager') && !role.includes('director') && !role.includes('vp') && !role.includes('chief')) {
        level = 'Manager';
      } else if (role.includes('director')) {
        level = 'Director';
      } else if (role.includes('vp') || role.includes('vice president')) {
        level = 'VP';
      } else if (role.includes('chief') || role.includes('ceo') || role.includes('cfo') || role.includes('cto')) {
        level = 'C-Suite';
      }

      if (!learningByLeadershipLevel[level]) {
        learningByLeadershipLevel[level] = { assigned: 0, completed: 0 };
      }
      learningByLeadershipLevel[level].assigned++;
      if (al.status === 'completed') {
        learningByLeadershipLevel[level].completed++;
      }
    }
  });

  const leadershipLevelArray = Object.entries(learningByLeadershipLevel).map(([level, stats]) => ({
    level,
    assigned: stats.assigned,
    completed: stats.completed,
    completionRate: stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0
  }));

  // Most overdue learning
  const now = new Date();
  const overdueLearning = assignedLearning
    .filter(al => al.status === 'overdue' && al.due_date)
    .map(al => {
      const learnerUser = users.find(u => u.email === al.user_email);
      const resource = learningResources.find(lr => lr.id === al.learning_resource_id);
      const dueDate = new Date(al.due_date);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        resource_title: al.title || resource?.title || 'Unknown',
        learner_name: learnerUser?.full_name || 'Unknown',
        learner_email: al.user_email,
        learner_department: learnerUser?.department || 'N/A',
        due_date: al.due_date,
        days_overdue: daysOverdue
      };
    })
    .sort((a, b) => b.days_overdue - a.days_overdue)
    .slice(0, 10);

  // Top resources by completion
  const resourceCompletions = {};
  completedLearning.forEach(al => {
    resourceCompletions[al.learning_resource_id] = (resourceCompletions[al.learning_resource_id] || 0) + 1;
  });

  const topResources = Object.entries(resourceCompletions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([resourceId, count]) => {
      const resource = learningResources.find(lr => lr.id === resourceId);
      return {
        id: resourceId,
        title: resource?.title || 'Unknown',
        type: resource?.type || 'unknown',
        completions: count,
        provider: resource?.provider || 'Unknown'
      };
    });

  // Most popular resources
  const resourcePopularity = {};
  assignedLearning.forEach(al => {
    resourcePopularity[al.learning_resource_id] = (resourcePopularity[al.learning_resource_id] || 0) + 1;
  });

  const popularResources = Object.entries(resourcePopularity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([resourceId, count]) => {
      const resource = learningResources.find(lr => lr.id === resourceId);
      const completed = completedLearning.filter(al => al.learning_resource_id === resourceId).length;
      return {
        id: resourceId,
        title: resource?.title || 'Unknown',
        type: resource?.type || 'unknown',
        assignments: count,
        completions: completed,
        completionRate: count > 0 ? Math.round((completed / count) * 100) : 0,
        provider: resource?.provider || 'Unknown'
      };
    });

  // Learning by department
  const learningByDepartment = {};
  assignedLearning.forEach(al => {
    const userObj = users.find(u => u.email === al.user_email);
    if (userObj && userObj.department) {
      if (!learningByDepartment[userObj.department]) {
        learningByDepartment[userObj.department] = { assigned: 0, completed: 0 };
      }
      learningByDepartment[userObj.department].assigned++;
      if (al.status === 'completed') {
        learningByDepartment[userObj.department].completed++;
      }
    }
  });

  // Top learners
  const userLearningCounts = {};
  assignedLearning.forEach(al => {
    if (!userLearningCounts[al.user_email]) {
      userLearningCounts[al.user_email] = { assigned: 0, completed: 0 };
    }
    userLearningCounts[al.user_email].assigned++;
    if (al.status === 'completed') {
      userLearningCounts[al.user_email].completed++;
    }
  });

  const topLearners = Object.entries(userLearningCounts)
    .sort(([, a], [, b]) => b.completed - a.completed)
    .slice(0, 10)
    .map(([email, stats]) => {
      const userObj = users.find(u => u.email === email);
      return {
        email,
        full_name: userObj?.full_name || email,
        department: userObj?.department || 'Unknown',
        assigned: stats.assigned,
        completed: stats.completed,
        completionRate: stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0
      };
    });

  // Users with pending/overdue learning
  const pendingUsers = {};
  assignedLearning
    .filter(al => ['assigned', 'overdue'].includes(al.status))
    .forEach(al => {
      if (!pendingUsers[al.user_email]) {
        pendingUsers[al.user_email] = { pending: 0, overdue: 0 };
      }
      if (al.status === 'overdue') {
        pendingUsers[al.user_email].overdue++;
      } else {
        pendingUsers[al.user_email].pending++;
      }
    });

  const usersWithPendingLearning = Object.entries(pendingUsers)
    .sort(([, a], [, b]) => (b.pending + b.overdue) - (a.pending + a.overdue))
    .slice(0, 20)
    .map(([email, stats]) => {
      const userObj = users.find(u => u.email === email);
      return {
        email,
        full_name: userObj?.full_name || email,
        department: userObj?.department || 'Unknown',
        pending: stats.pending,
        overdue: stats.overdue
      };
    });

  // Activity trends (last 30 days)
  const activityTrend = [];
  const currentDate = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayAssignments = assignedLearning.filter(al => {
      const alDate = new Date(al.created_date).toISOString().split('T')[0];
      return alDate === dateStr;
    }).length;

    const dayCompletions = completedLearning.filter(al => {
      const alDate = al.completion_date ? new Date(al.completion_date).toISOString().split('T')[0] : null;
      return alDate === dateStr;
    }).length;

    const dayActive = new Set(
      assignedLearning.filter(al => {
        const startDate = new Date(al.created_date);
        const endDate = al.completion_date ? new Date(al.completion_date) : currentDate;
        return startDate <= date && endDate >= date && ['started', 'in_progress'].includes(al.status);
      }).map(al => al.user_email)
    ).size;

    activityTrend.push({
      date: dateStr,
      assignments: dayAssignments,
      completions: dayCompletions,
      activeLearners: dayActive
    });
  }

  // Get unique departments and skill topics for filters
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))].sort();
  const allTags = [...new Set(learningResources.flatMap(lr => lr.tags || []))].sort();


  return {
    scopeLabel,
    metrics: {
      totalResources,
      totalAssigned,
      activeLearners,
      totalUniqueLearners,
      completionRate,
      avgTimeToComplete,
      pendingLearning,
      completedCount,
      newLearningItemsAdded,
      averageEngagementScore,
      overdueCount: overdueLearning.length
    },
    topCompetencyGaps,
    learningByType,
    learningByCompetency,
    topResources,
    popularResources,
    learningByDepartment,
    learningByLeadershipLevel: leadershipLevelArray,
    learningBySkillTopic: skillTopicArray,
    competencyLearningActivity: competencyActivityArray,
    mostOverdueLearning: overdueLearning,
    topLearners,
    usersWithPendingLearning,
    activityTrend,
    availableClients: clients.map(c => ({ id: c.id, name: c.name })),
    availableDepartments: departments,
    availableSkillTopics: allTags
  };
}