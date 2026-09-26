/**
 * markUserAtRisk — Protected backend function for flagging users as at-risk.
 *
 * Replaces the frontend MarkAtRiskModal's direct base44.asServiceRole.entities.User.update
 * call. This function:
 *   - authenticates the actor via base44.auth.me()
 *   - derives actor identity server-side
 *   - authorizes the exact action (managers, admins, platform admin)
 *   - validates tenant and target relationship
 *   - permits only the minimum approved at-risk status fields
 *   - rejects role, permissions, tenant, client, confidentiality and membership fields
 *   - writes an audit event
 *   - returns minimum fields
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { resolveUserScope, isUserInScope } from '../../shared/userScope.ts';

const ALLOWED_FIELDS = new Set([
  'at_risk_flag',
  'at_risk_reason',
  'at_risk_notes',
  'at_risk_flagged_by',
  'at_risk_flagged_date',
]);

const REJECTED_FIELD_PATTERNS = [
  'app_role', 'role', 'permissions', 'custom_role_id', 'client_id',
  'tenant', 'organization_id', 'confidentiality', 'subordinate_emails',
  'partner_id', 'partner_client_ids', 'is_active', 'status', 'password',
  'reset_token', 'temporary_password', 'must_reset_password',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const actor = await base44.auth.me();

    if (!actor) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { target_user_id, reason, severity, notes } = body;

    if (!target_user_id) {
      return Response.json({ error: 'target_user_id is required' }, { status: 400 });
    }
    if (!reason || !String(reason).trim()) {
      return Response.json({ error: 'reason is required' }, { status: 400 });
    }

    // Reject any attempt to pass privileged fields through the body
    for (const key of Object.keys(body)) {
      if (REJECTED_FIELD_PATTERNS.some(p => key.toLowerCase().includes(p))) {
        return Response.json({ error: `Field '${key}' is not permitted` }, { status: 400 });
      }
    }

    // Authorize: only managers, tenant admins, and platform admin can mark at-risk
    const allowedRoles = [
      'Platform Admin', 'Super Administrator', 'Admin Level 1', 'Admin Level 2',
      'Partner Business Administrator', 'User Level 3',
    ];
    if (!allowedRoles.includes(actor.app_role)) {
      return Response.json({ error: 'Insufficient permissions to mark users at-risk' }, { status: 403 });
    }

    // Fetch the target user
    const targetUsers = await base44.asServiceRole.entities.User.filter({ id: target_user_id });
    if (targetUsers.length === 0) {
      return Response.json({ error: 'Target user not found' }, { status: 404 });
    }
    const targetUser = targetUsers[0];

    // Tenant scoping: non-Platform-Admin callers can only act on users in their own tenant
    if (actor.app_role !== 'Platform Admin') {
      const scope = resolveUserScope(actor);
      if (!isUserInScope(targetUser, scope)) {
        return Response.json({ error: 'Target user is outside your tenant scope' }, { status: 403 });
      }
    }

    // Build the update with ONLY approved at-risk fields
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      at_risk_flag: true,
      at_risk_reason: String(reason).trim(),
      at_risk_notes: notes ? String(notes).trim() : '',
      at_risk_flagged_by: actor.email,
      at_risk_flagged_date: now,
    };

    // Verify no privileged fields slipped in
    for (const key of Object.keys(updateData)) {
      if (!ALLOWED_FIELDS.has(key)) {
        return Response.json({ error: `Internal error: unexpected field '${key}'` }, { status: 500 });
      }
    }

    // Perform the update via service role (the frontend can no longer do this)
    await base44.asServiceRole.entities.User.update(target_user_id, updateData);

    // Write audit event
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        timestamp: now,
        initiator_user_email: actor.email,
        action_type: 'USER_MARKED_AT_RISK',
        target_user_email: targetUser.email,
        client_id: targetUser.client_id,
        metadata: {
          reason: String(reason).trim(),
          severity: severity || 'medium',
          notes: notes ? String(notes).trim() : null,
        },
      });
    } catch (auditErr) {
      console.warn('Failed to write audit event for at-risk marking:', auditErr.message);
    }

    // Return minimum fields
    return Response.json({
      success: true,
      target_user_id,
      target_user_email: targetUser.email,
      at_risk_flag: true,
      flagged_by: actor.email,
      flagged_date: now,
    });
  } catch (error) {
    console.error('Error in markUserAtRisk:', error);
    return Response.json({ error: 'Failed to mark user as at-risk' }, { status: 500 });
  }
});