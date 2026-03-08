/**
 * Cross-Session Context Cache
 * Caches cross-session data to reduce API calls
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

export const getCrossSessionContext = async (base44, userEmail) => {
  const cacheKey = `cross_session_${userEmail}`;
  const cached = cache.get(cacheKey);
  
  // Return cached if fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Fetch fresh data
  try {
    const [convs, completedGoals, completedJourneys, actions, prefs] = await Promise.all([
      base44.entities.Conversation.filter(
        { created_by: userEmail, type: 'general', status: { $in: ['completed', 'paused'] } },
        '-last_activity',
        3
      ),
      base44.entities.Goal.filter(
        { created_by: userEmail, status: 'archived', progress: 100 },
        '-updated_date',
        5
      ),
      base44.entities.JourneyEnrollment.filter(
        { user_email: userEmail, status: 'completed' },
        '-updated_date',
        5
      ),
      base44.entities.AgentAction.filter({ user_email: userEmail }, '-timestamp', 50),
      base44.entities.UserPreference.filter({ user_email: userEmail })
    ]);

    const recentConversations = convs.map(c => ({
      title: c.title,
      message_count: c.messages?.length || 0,
      last_activity: c.last_activity
    }));

    const recentMilestones = [
      ...completedGoals.map(g => ({ type: 'goal', title: g.title, date: g.updated_date })),
      ...completedJourneys.map(j => ({ type: 'journey', id: j.journey_id, date: j.updated_date }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    const actionStats = {
      total: actions.length,
      successful: actions.filter(a => a.status === 'completed').length,
      failed: actions.filter(a => a.status === 'failed').length
    };

    const userPreferences = prefs.length > 0 ? prefs[0].atreus_preferences : null;

    const data = {
      recent_conversations: recentConversations,
      recent_milestones: recentMilestones,
      action_success_rate: actionStats.total > 0 
        ? `${Math.round((actionStats.successful / actionStats.total) * 100)}%`
        : 'N/A',
      total_actions: actionStats.total,
      preferences: userPreferences
    };

    // Cache the result
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  } catch (error) {
    console.error('Error fetching cross-session context:', error);
    return {
      recent_conversations: [],
      recent_milestones: [],
      action_success_rate: 'N/A',
      total_actions: 0,
      preferences: null
    };
  }
};

export const invalidateCrossSessionCache = (userEmail) => {
  const cacheKey = `cross_session_${userEmail}`;
  cache.delete(cacheKey);
};