import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { authorizeScheduledTask } from '../../shared/scheduledTaskAuth.ts';
import { escapeHtml, isValidActionUrl } from '../../shared/safeResponses.ts';
import {
    loadClientsById,
    settingsForUser,
    channelEnabled,
    digestWindowOpen,
    resolveOrgSettings,
} from '../../shared/orgNotificationSettings.ts';

/**
 * Processes notifications that are scheduled to be sent.
 *
 * Delivery follows the organization's Notification settings:
 *   - enabled_channels is a ceiling. A channel the organization switched off is
 *     never used, whatever the individual's own preference says.
 *   - default_cadence controls timing. `instant` delivers each notification as
 *     it comes due; `daily` and `weekly` hold non-critical notifications and
 *     deliver them as one digest in the morning delivery window.
 * Critical notification types (assignments and deadlines) always go immediately
 * so a person is never late because of a digest.
 *
 * This function should be called periodically (e.g., every 15 minutes via cron).
 */

const CRITICAL_TYPES = ['goal_assignment', 'assessment_due', 'goal_deadline'];

function emailBody(notification) {
    const safeTitle = escapeHtml(notification.title);
    const safeMessage = escapeHtml(notification.message);
    const safeActionUrl = isValidActionUrl(notification.action_url) ? escapeHtml(notification.action_url) : '';
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e40af;">${safeTitle}</h2>
            <p style="color: #374151; line-height: 1.6;">${safeMessage}</p>
            ${safeActionUrl ? `
                <p style="margin-top: 30px;">
                    <a href="${safeActionUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                        Take Action
                    </a>
                </p>
            ` : ''}
            <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;"/>
            <p style="color: #6b7280; font-size: 14px;">Best regards,<br/>The Curiosity Led Team</p>
        </div>
    `;
}

function digestBody(items) {
    const rows = items.map((n) => {
        const safeTitle = escapeHtml(n.title);
        const safeMessage = escapeHtml(n.message);
        const safeActionUrl = isValidActionUrl(n.action_url) ? escapeHtml(n.action_url) : '';
        return `
            <div style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px; font-weight: 600; color: #111827;">${safeTitle}</p>
                <p style="margin: 0; color: #374151; line-height: 1.6;">${safeMessage}</p>
                ${safeActionUrl ? `<p style="margin: 8px 0 0;"><a href="${safeActionUrl}" style="color: #2563eb;">Open</a></p>` : ''}
            </div>
        `;
    }).join('');

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e40af; margin-bottom: 4px;">Your ${items.length === 1 ? 'update' : `${items.length} updates`}</h2>
            <p style="color: #6b7280; font-size: 14px; margin-top: 0;">Everything waiting for you, in one place.</p>
            ${rows}
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                You receive a digest rather than a message per update. Change this in your organization's notification settings.
            </p>
        </div>
    `;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Security: Only internal automation or admin may invoke scheduled tasks.
        const _auth = await authorizeScheduledTask(req, base44);
        if (!_auth.authorized) return _auth.response;

        const now = new Date();
        const nowIso = now.toISOString();

        // Get all pending notifications that are due
        const dueResult = await base44.asServiceRole.entities.Notification.filter({
            status: 'pending',
            scheduled_for: { $lte: nowIso }
        }).catch(() => []);
        const dueNotifications = (Array.isArray(dueResult) ? dueResult : (dueResult.items || [])).slice(0, 200);

        if (dueNotifications.length === 0) {
            return Response.json({ success: true, message: 'No notifications to process', processed: 0 });
        }

        // A notification that has been queued for more than a day is no longer
        // worth delivering: it would arrive as a flood of stale reminders the
        // moment delivery resumes. Cancel it instead of sending it late.
        const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
        const fresh = [];
        let stale = 0;
        for (const notification of dueNotifications) {
            const queuedAt = notification.scheduled_for ? new Date(notification.scheduled_for).getTime() : 0;
            if (queuedAt && now.getTime() - queuedAt > STALE_AFTER_MS) {
                await base44.asServiceRole.entities.Notification.update(notification.id, {
                    status: 'cancelled',
                    metadata: { ...(notification.metadata || {}), stale: true }
                });
                stale++;
                continue;
            }
            fresh.push(notification);
        }

        if (fresh.length === 0) {
            return Response.json({ success: true, processed: dueNotifications.length, stale_cancelled: stale, successful: 0 });
        }

        const results = { successful: [], failed: [], held_for_digest: 0, stale_cancelled: stale };

        // Users and their organization's settings, fetched once.
        const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 1000).catch(() => []);
        const usersByEmail = new Map(allUsers.map(u => [u.email, u]));
        const clientsById = await loadClientsById(base44);

        const nowForUser = (email) => {
            const user = usersByEmail.get(email);
            return settingsForUser(user, clientsById);
        };

        const markSent = (notification, extra = {}) =>
            base44.asServiceRole.entities.Notification.update(notification.id, {
                status: 'sent',
                sent_at: nowIso,
                metadata: { ...(notification.metadata || {}), ...extra },
            });

        // ── Instant deliveries ────────────────────────────────────────────────
        const digests = new Map(); // email -> notifications

        for (const notification of fresh) {
            const targetUser = usersByEmail.get(notification.user_email);
            if (!targetUser) {
                await base44.asServiceRole.entities.Notification.update(notification.id, {
                    status: 'failed',
                    sent_at: nowIso
                });
                results.failed.push({ notification: notification.id, reason: 'User not found' });
                continue;
            }

            const org = nowForUser(notification.user_email);
            const cadence = org.notifications.default_cadence;
            const isCritical = CRITICAL_TYPES.includes(notification.type);

            if (cadence !== 'instant' && !isCritical) {
                if (!digestWindowOpen(cadence, now)) {
                    results.held_for_digest++;
                    continue; // stays pending until the next delivery window
                }
                const bucket = digests.get(notification.user_email) || [];
                bucket.push(notification);
                digests.set(notification.user_email, bucket);
                continue;
            }

            try {
                const preferences = targetUser.notification_preferences || {};
                const typePrefs = preferences[notification.type] || {};
                const dispatchedChannels = ['in-app'];
                const dispatchPromises = [];

                if ((typePrefs.email !== false || isCritical) && channelEnabled(org, 'email')) {
                    dispatchPromises.push(
                        base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
                            to: notification.user_email,
                            subject: notification.title,
                            body: emailBody(notification),
                            from_name: 'Curiosity Led'
                        }).then(() => { dispatchedChannels.push('email'); })
                          .catch(err => { throw new Error('Email dispatch failed: ' + err.message); })
                    );
                }

                if (typePrefs.teams && targetUser.teams_webhook_url && channelEnabled(org, 'teams')) {
                    dispatchPromises.push(
                        base44.functions.invoke('sendTeamsNotification', {
                            user_email: notification.user_email,
                            title: notification.title,
                            message: notification.message,
                            action_url: notification.action_url
                        }).then(() => { dispatchedChannels.push('teams'); })
                          .catch(err => { console.error('Teams dispatch failed:', err); })
                    );
                }

                if (typePrefs.slack && targetUser.slack_webhook_url && channelEnabled(org, 'slack')) {
                    dispatchPromises.push(
                        base44.functions.invoke('sendSlackNotification', {
                            user_email: notification.user_email,
                            title: notification.title,
                            message: notification.message,
                            action_url: notification.action_url
                        }).then(() => { dispatchedChannels.push('slack'); })
                          .catch(err => { console.error('Slack dispatch failed:', err); })
                    );
                }

                await Promise.allSettled(dispatchPromises);
                await markSent(notification);
                results.successful.push({ notification: notification.id, channels: dispatchedChannels });
            } catch (dispatchError) {
                await base44.asServiceRole.entities.Notification.update(notification.id, {
                    status: 'failed',
                    sent_at: nowIso
                });
                results.failed.push({ notification: notification.id, reason: dispatchError.message });
            }
        }

        // ── Digest deliveries — one message per person ────────────────────────
        for (const [email, items] of digests) {
            const targetUser = usersByEmail.get(email);
            const org = nowForUser(email);
            const dispatchedChannels = ['in-app'];
            const dispatchPromises = [];

            if (channelEnabled(org, 'email')) {
                dispatchPromises.push(
                    base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
                        to: email,
                        subject: items.length === 1 ? items[0].title : `${items.length} updates waiting for you`,
                        body: digestBody(items),
                        from_name: 'Curiosity Led'
                    }).then(() => { dispatchedChannels.push('email'); })
                      .catch(err => { console.error('Digest email failed:', err); })
                );
            }

            const digestText = items.map(n => `• ${n.title}: ${n.message}`).join('\n');
            const typePrefs = targetUser?.notification_preferences?.[items[0].type] || {};

            if (typePrefs.teams && targetUser?.teams_webhook_url && channelEnabled(org, 'teams')) {
                dispatchPromises.push(
                    base44.functions.invoke('sendTeamsNotification', {
                        user_email: email,
                        title: `${items.length} updates waiting for you`,
                        message: digestText,
                        action_url: items[0].action_url
                    }).then(() => { dispatchedChannels.push('teams'); })
                      .catch(err => { console.error('Digest Teams failed:', err); })
                );
            }

            if (typePrefs.slack && targetUser?.slack_webhook_url && channelEnabled(org, 'slack')) {
                dispatchPromises.push(
                    base44.functions.invoke('sendSlackNotification', {
                        user_email: email,
                        title: `${items.length} updates waiting for you`,
                        message: digestText,
                        action_url: items[0].action_url
                    }).then(() => { dispatchedChannels.push('slack'); })
                      .catch(err => { console.error('Digest Slack failed:', err); })
                );
            }

            await Promise.allSettled(dispatchPromises);

            for (const item of items) {
                await markSent(item, { digest: true, digest_size: items.length });
                results.successful.push({ notification: item.id, channels: dispatchedChannels, digest: true });
            }
        }

        return Response.json({
            success: true,
            processed: dueNotifications.length,
            successful: results.successful.length,
            failed: results.failed.length,
            held_for_digest: results.held_for_digest,
            stale_cancelled: stale,
            details: results
        });

    } catch (error) {
        console.error('Error processing scheduled notifications:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});