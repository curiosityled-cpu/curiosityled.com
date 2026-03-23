import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * POST /provisioning/link
 * 
 * Links a Base44 user ID to a pre-provisioned UserProfile after first login.
 * Called by FirstLoginLinker component on user's first authenticated session.
 * 
 * Request body:
 * {
 *   base44UserId: string,
 *   email: string
 * }
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.error(`[${requestId}] No authenticated user`);
      return Response.json({ error: 'Unauthorized', requestId }, { status: 401 });
    }

    const body = await req.json();
    const { base44UserId, email } = body;

    if (!base44UserId || !email) {
      console.error(`[${requestId}] Missing required fields`);
      return Response.json({ error: 'Missing base44UserId or email', requestId }, { status: 400 });
    }

    // Security: verify the authenticated user matches the request
    if (user.id !== base44UserId || user.email.toLowerCase() !== email.toLowerCase()) {
      console.error(`[${requestId}] User mismatch: auth=${user.email}, request=${email}`);
      return Response.json({ error: 'Forbidden: User mismatch', requestId }, { status: 403 });
    }

    console.log(`[${requestId}] Link request: user=${email}, base44UserId=${base44UserId}`);

    const normalizedEmail = email.toLowerCase().trim();

    // Derive tenantId from user or UserProfile
    let tenantId = user.client_id;
    if (!tenantId) {
      // Fallback: look up UserProfile by email to get tenant
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({
        email: normalizedEmail
      });
      
      if (profiles.length === 0) {
        console.error(`[${requestId}] No UserProfile found for ${normalizedEmail}`);
        return Response.json({ 
          error: 'No provisioned profile found for this email',
          requestId
        }, { status: 404 });
      }
      
      if (profiles.length > 1) {
        console.error(`[${requestId}] Ambiguous: multiple profiles for ${normalizedEmail}`);
        return Response.json({ 
          error: 'Multiple profiles found - contact administrator',
          requestId
        }, { status: 409 });
      }
      
      tenantId = profiles[0].tenant_id;
    }

    // Get UserProfile for this tenant + email
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({
      tenant_id: tenantId,
      email: normalizedEmail
    });

    if (profiles.length === 0) {
      console.error(`[${requestId}] No UserProfile found: tenant=${tenantId}, email=${normalizedEmail}`);
      return Response.json({ 
        error: 'No provisioned profile found',
        requestId
      }, { status: 404 });
    }

    if (profiles.length > 1) {
      console.error(`[${requestId}] Multiple profiles: tenant=${tenantId}, email=${normalizedEmail}`);
      return Response.json({ 
        error: 'Multiple profiles found - contact administrator',
        requestId
      }, { status: 409 });
    }

    const profile = profiles[0];

    // Link if not already linked
    if (profile.base44_user_id !== base44UserId) {
      await base44.asServiceRole.entities.UserProfile.update(profile.id, {
        base44_user_id: base44UserId,
        status: 'ACTIVE',
        first_login_at: new Date().toISOString()
      });
      
      console.log(`[${requestId}] Linked: profile=${profile.id}, base44UserId=${base44UserId}`);
    } else {
      console.log(`[${requestId}] Already linked: profile=${profile.id}`);
    }

    // Update UserRoleAssignments with base44_user_id
    const roleAssignments = await base44.asServiceRole.entities.UserRoleAssignment.filter({
      tenant_id: tenantId,
      email: normalizedEmail
    });

    for (const assignment of roleAssignments) {
      if (!assignment.base44_user_id) {
        await base44.asServiceRole.entities.UserRoleAssignment.update(assignment.id, {
          base44_user_id: base44UserId
        });
      }
    }

    // Update ProvisioningUser records (most recent eligible)
    const provUsers = await base44.asServiceRole.entities.ProvisioningUser.filter({
      tenant_id: tenantId,
      email: normalizedEmail,
      apply_status: 'AWAITING_LOGIN'
    });

    if (provUsers.length > 0) {
      // Update most recent
      const sorted = provUsers.sort((a, b) => 
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      );
      
      await base44.asServiceRole.entities.ProvisioningUser.update(sorted[0].id, {
        apply_status: 'LINKED',
        base44_user_id: base44UserId,
        first_login_at: new Date().toISOString()
      });
    }

    // Log to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: normalizedEmail,
      action_type: 'PROVISIONING_USER_LINKED',
      client_id: tenantId,
      target_user_email: normalizedEmail,
      metadata: {
        base44_user_id: base44UserId,
        profile_id: profile.id,
        role_assignments_updated: roleAssignments.length,
        request_id: requestId
      }
    });

    console.log(`[${requestId}] Link complete: user=${normalizedEmail}`);

    return Response.json({
      linked: true,
      profileId: profile.id,
      tenantId,
      requestId
    });

  } catch (error) {
    console.error(`[${requestId}] Link error:`, error.message);
    console.error(`[${requestId}] Stack:`, error.stack);
    
    const errorResponse = {
      error: error.message,
      requestId,
      timestamp: new Date().toISOString()
    };
    
    // Include stack for platform admins
    if (user?.app_role === 'Platform Admin') {
      errorResponse.details = error.stack;
    }
    
    return Response.json(errorResponse, { status: 500 });
  }
});