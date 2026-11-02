import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { authorizeScheduledTask } from '../../shared/scheduledTaskAuth.ts';

/**
 * Automated Data Retention Cleanup
 * Deletes old activity data based on user retention preferences
 * Should be run as a scheduled task (daily or weekly)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Security: Gate behind internal secret or admin credentials.
    // Anonymous callers must never be able to trigger mass deletion.
    const auth = await authorizeScheduledTask(req, base44);
    if (!auth.authorized) {
      return auth.response;
    }

    const now = new Date();
    const results = {
      users_processed: 0,
      agent_actions_deleted: 0,
      activity_logs_deleted: 0,
      conversations_deleted: 0,
      errors: []
    };

    // Get all user preferences with retention settings
    const allPreferences = await base44.asServiceRole.entities.UserPreference.list();

    // Organization retention default (Settings → Organization → Privacy). The
    // administrator sets one period for their organization; a person's own
    // preference still wins where they have set one.
    const DEFAULT_RETENTION_DAYS = 90;
    const allUsers = await base44.asServiceRole.entities.User.list();
    const clients = await base44.asServiceRole.entities.Client.list();

    const clientRetention = {};
    for (const client of clients) {
      const days = client?.settings?.privacy?.data_retention_days;
      if (typeof days === "number" && days > 0) clientRetention[client.id] = days;
    }
    const clientIdByEmail = {};
    for (const u of allUsers) {
      const clientId = u.client_id || u.data?.client_id;
      if (clientId) clientIdByEmail[u.email] = clientId;
    }
    const orgRetentionDays = (email) => {
      const clientId = clientIdByEmail[email];
      return (clientId && clientRetention[clientId]) || DEFAULT_RETENTION_DAYS;
    };

    for (const pref of allPreferences) {
      try {
        const retentionDays = pref.privacy_settings?.data_retention_days || orgRetentionDays(pref.user_email);
        const cutoffDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000));
        const cutoffISO = cutoffDate.toISOString();

        // Delete old AgentActions
        const oldActions = await base44.asServiceRole.entities.AgentAction.filter({
          user_email: pref.user_email,
          timestamp: { $lt: cutoffISO }
        });
        
        for (const action of oldActions) {
          await base44.asServiceRole.entities.AgentAction.delete(action.id);
          results.agent_actions_deleted++;
        }

        // Delete old ActivityLogs (if any exist for this user)
        const oldLogs = await base44.asServiceRole.entities.ActivityLog.filter({
          initiator_user_email: pref.user_email,
          timestamp: { $lt: cutoffISO }
        });
        
        for (const log of oldLogs) {
          await base44.asServiceRole.entities.ActivityLog.delete(log.id);
          results.activity_logs_deleted++;
        }

        // Delete old completed/paused conversations (keep active ones)
        const oldConversations = await base44.asServiceRole.entities.Conversation.filter({
          created_by: pref.user_email,
          status: { $in: ['completed', 'paused'] },
          last_activity: { $lt: cutoffISO }
        });
        
        for (const conv of oldConversations) {
          await base44.asServiceRole.entities.Conversation.delete(conv.id);
          results.conversations_deleted++;
        }

        results.users_processed++;
      } catch (userError) {
        console.error(`Error processing user ${pref.user_email}:`, userError);
        results.errors.push({
          user: pref.user_email,
          error: userError.message
        });
      }
    }

    // Also clean up for users without preferences (organization or default retention)
    const usersWithPrefs = new Set(allPreferences.map(p => p.user_email));
    const usersWithoutPrefs = allUsers.filter(u => !usersWithPrefs.has(u.email));

    for (const user of usersWithoutPrefs) {
      try {
        const retentionDays = orgRetentionDays(user.email);
        const cutoffDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000));
        const cutoffISO = cutoffDate.toISOString();

        const oldActions = await base44.asServiceRole.entities.AgentAction.filter({
          user_email: user.email,
          timestamp: { $lt: cutoffISO }
        });
        
        for (const action of oldActions) {
          await base44.asServiceRole.entities.AgentAction.delete(action.id);
          results.agent_actions_deleted++;
        }

        results.users_processed++;
      } catch (userError) {
        console.error(`Error processing user ${user.email}:`, userError);
        results.errors.push({
          user: user.email,
          error: userError.message
        });
      }
    }

    return Response.json({
      success: true,
      results: results,
      completed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in data cleanup:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});