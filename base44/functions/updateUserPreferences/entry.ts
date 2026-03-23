import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * User Preference Learning Engine
 * Analyzes user behavior and feedback to update Atreus personalization preferences
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's AgentAction history
    const recentActions = await base44.entities.AgentAction.filter(
      { user_email: user.email },
      '-timestamp',
      50
    );

    // Fetch user's conversation history
    const recentConversations = await base44.entities.Conversation.filter(
      { created_by: user.email, type: 'general' },
      '-last_activity',
      10
    );

    // Analyze action patterns
    const actionTypeFrequency = {};
    recentActions.forEach(action => {
      actionTypeFrequency[action.action_type] = (actionTypeFrequency[action.action_type] || 0) + 1;
    });

    const preferredActionTypes = Object.entries(actionTypeFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type);

    // Analyze interaction frequency
    const uniqueDays = new Set(
      recentActions.map(a => a.timestamp.split('T')[0])
    );
    const interactionFrequency = uniqueDays.size > 10 ? 'high' 
      : uniqueDays.size > 3 ? 'medium' 
      : 'low';

    // Build common tasks history
    const commonTasks = recentActions
      .filter(a => a.status === 'completed')
      .slice(0, 10)
      .map(a => a.action_type);

    // Analyze communication style from conversations
    let preferredCommunicationStyle = 'balanced';
    const avgMessageLength = recentConversations.reduce((sum, conv) => {
      const userMessages = (conv.messages || []).filter(m => m.role === 'user');
      const avgLength = userMessages.reduce((s, m) => s + m.content.length, 0) / (userMessages.length || 1);
      return sum + avgLength;
    }, 0) / (recentConversations.length || 1);

    if (avgMessageLength < 50) {
      preferredCommunicationStyle = 'concise';
    } else if (avgMessageLength > 150) {
      preferredCommunicationStyle = 'detailed';
    }

    // Get or create UserPreference record
    const existingPrefs = await base44.entities.UserPreference.filter({
      user_email: user.email
    });

    const newPreferences = {
      atreus_preferences: {
        communication_style: preferredCommunicationStyle,
        preferred_action_types: preferredActionTypes,
        common_tasks_history: commonTasks,
        interaction_frequency: interactionFrequency,
        last_updated: new Date().toISOString()
      }
    };

    if (existingPrefs.length > 0) {
      // Update existing
      const updated = await base44.entities.UserPreference.update(
        existingPrefs[0].id,
        newPreferences
      );
      return Response.json({
        success: true,
        preferences: updated,
        message: 'User preferences updated based on behavior analysis'
      });
    } else {
      // Create new
      const created = await base44.entities.UserPreference.create({
        user_email: user.email,
        ...newPreferences
      });
      return Response.json({
        success: true,
        preferences: created,
        message: 'User preferences created based on behavior analysis'
      });
    }

  } catch (error) {
    console.error('Error updating user preferences:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});