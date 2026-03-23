import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * POST /provisioning/invites/mark-sent
 * 
 * ADMIN-ONLY: Marks users as invited after sending Base44 invitation emails.
 * Updates ProvisioningUser and UserProfile statuses.
 * 
 * Request body:
 * {
 *   batchId: string,
 *   emails: string[]
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

    // Admin-only
    const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(user.app_role)) {
      console.error(`[${requestId}] Forbidden: role=${user.app_role}`);
      return Response.json({ error: 'Forbidden: Admin access required', requestId }, { status: 403 });
    }

    const isPlatformAdmin = user.app_role === 'Platform Admin';

    const body = await req.json();
    const { batchId, emails } = body;

    if (!batchId || !emails || !Array.isArray(emails)) {
      console.error(`[${requestId}] Missing required fields`);
      return Response.json({ error: 'Missing batchId or emails array', requestId }, { status: 400 });
    }

    console.log(`[${requestId}] Mark invites sent: batchId=${batchId}, emails=${emails.length}`);

    // Get batch
    const batches = await base44.asServiceRole.entities.ProvisioningBatch.filter({ id: batchId });
    if (batches.length === 0) {
      console.error(`[${requestId}] Batch not found: ${batchId}`);
      return Response.json({ error: 'Batch not found', requestId }, { status: 404 });
    }
    const batch = batches[0];

    // Verify tenant boundary
    const userTenantId = user.client_id;
    if (!isPlatformAdmin && batch.tenant_id !== userTenantId) {
      console.error(`[${requestId}] Tenant mismatch: batch=${batch.tenant_id}, user=${userTenantId}`);
      return Response.json({ error: 'Forbidden: Cannot access batch from different tenant', requestId }, { status: 403 });
    }

    const normalizedEmails = emails.map(e => e.toLowerCase().trim());

    // Update ProvisioningUser records
    let updatedProvUsers = 0;
    let failedProvUsers = 0;
    
    for (const email of normalizedEmails) {
      try {
        const provUsers = await base44.asServiceRole.entities.ProvisioningUser.filter({
          batch_id: batchId,
          email: email,
          apply_status: 'READY_TO_INVITE'
        });

        for (const provUser of provUsers) {
          await base44.asServiceRole.entities.ProvisioningUser.update(provUser.id, {
            apply_status: 'INVITE_SENT',
            invite_sent_at: new Date().toISOString()
          });
          updatedProvUsers++;
        }
      } catch (error) {
        console.error(`[${requestId}] Failed to update ProvisioningUser for ${email}:`, error.message);
        failedProvUsers++;
      }
    }

    // Update UserProfile records
    let updatedProfiles = 0;
    let failedProfiles = 0;
    
    for (const email of normalizedEmails) {
      try {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({
          tenant_id: batch.tenant_id,
          email: email,
          status: 'PROVISIONED'
        });

        for (const profile of profiles) {
          await base44.asServiceRole.entities.UserProfile.update(profile.id, {
            status: 'INVITED',
            invite_sent_at: new Date().toISOString()
          });
          updatedProfiles++;
        }
      } catch (error) {
        console.error(`[${requestId}] Failed to update UserProfile for ${email}:`, error.message);
        failedProfiles++;
      }
    }

    // Log to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: user.email,
      action_type: 'PROVISIONING_INVITES_SENT',
      client_id: batch.tenant_id,
      metadata: {
        batch_id: batchId,
        emails_count: emails.length,
        prov_users_updated: updatedProvUsers,
        prov_users_failed: failedProvUsers,
        profiles_updated: updatedProfiles,
        profiles_failed: failedProfiles,
        request_id: requestId
      }
    });

    console.log(`[${requestId}] Invites marked: provUsers=${updatedProvUsers}, profiles=${updatedProfiles}`);

    return Response.json({
      updated: {
        provisioningUsers: updatedProvUsers,
        userProfiles: updatedProfiles
      },
      failed: {
        provisioningUsers: failedProvUsers,
        userProfiles: failedProfiles
      },
      requestId
    });

  } catch (error) {
    console.error(`[${requestId}] Mark invites error:`, error.message);
    console.error(`[${requestId}] Stack:`, error.stack);
    
    const errorResponse = {
      error: error.message,
      requestId,
      timestamp: new Date().toISOString()
    };
    
    if (isPlatformAdmin) {
      errorResponse.details = error.stack;
    }
    
    return Response.json(errorResponse, { status: 500 });
  }
});