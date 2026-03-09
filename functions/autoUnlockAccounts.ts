import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automated function to unlock accounts that have passed their lock expiry time.
 * This should be run as a scheduled automation every 5-10 minutes.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if there's an authenticated user (manual call vs automation)
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (error) {
      // No user context - this is expected for scheduled automations
      user = null;
    }

    // If there's a user (manual call), verify admin access
    if (user && user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden: Admin access required for manual execution.' }, { status: 403 });
    }

    // If user is null (automation) or is a Platform Admin, proceed.

    const now = new Date().toISOString();

    // Find locked accounts where locked_until has passed
    const allUsers = await base44.asServiceRole.entities.User.list();
    const lockedUsers = allUsers.filter(u => u.account_status === 'locked');

    const usersToUnlock = lockedUsers.filter(user => {
      if (!user.locked_until) return true; // Unlock if no expiry set
      return new Date(user.locked_until) <= new Date(); // Unlock if expiry passed
    });

    let unlockedCount = 0;

    for (const user of usersToUnlock) {
      try {
        await base44.asServiceRole.entities.User.update(user.id, {
          account_status: 'active',
          locked_until: null,
          locked_reason: null,
          failed_login_attempts: 0
        });

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: now,
          initiator_user_email: 'system',
          action_type: 'USER_ACCOUNT_UNLOCKED',
          target_user_email: user.email,
          client_id: user.client_id,
          metadata: {
            reason: 'Automatic unlock - lock period expired'
          }
        });

        // Send notification
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: 'Your Account Has Been Unlocked',
          body: `Hello ${user.full_name || user.email},\n\nYour account has been automatically unlocked after the security lock period expired.\n\nYou can now log in to the platform.\n\nBest regards,\nCuriosity Led Team`
        });

        unlockedCount++;
      } catch (error) {
        console.error(`Error unlocking user ${user.email}:`, error);
      }
    }

    return Response.json({
      success: true,
      message: `Auto-unlocked ${unlockedCount} account(s)`,
      unlocked_count: unlockedCount
    });
  } catch (error) {
    console.error('Error in auto-unlock:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});