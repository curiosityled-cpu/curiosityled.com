import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * POST /provisioning/metrics
 * 
 * ADMIN-ONLY: Aggregates provisioning metrics from ActivityLog for ops dashboard.
 * 
 * Request body:
 * {
 *   timeRange: { from: ISO, to: ISO },
 *   tenantId?: string,
 *   sourceSystem?: string,
 *   batchId?: string
 * }
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized', requestId }, { status: 401 });
    }

    const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden: Admin access required', requestId }, { status: 403 });
    }

    const isPlatformAdmin = user.app_role === 'Platform Admin';
    const body = await req.json();
    const { timeRange, tenantId: requestedTenantId, sourceSystem, batchId } = body;

    if (!timeRange || !timeRange.from || !timeRange.to) {
      return Response.json({ error: 'Missing timeRange', requestId }, { status: 400 });
    }

    // Derive tenant scope
    let tenantId;
    if (isPlatformAdmin && requestedTenantId) {
      tenantId = requestedTenantId;
    } else if (isPlatformAdmin && !requestedTenantId) {
      tenantId = null; // All tenants
    } else {
      tenantId = user.client_id;
    }

    console.log(`[${requestId}] Ops metrics: tenant=${tenantId || 'all'}, range=${timeRange.from} to ${timeRange.to}`);

    // Base filter for all queries
    const baseFilter = {
      timestamp: { $gte: timeRange.from, $lte: timeRange.to }
    };

    if (tenantId) {
      baseFilter.client_id = tenantId;
    }

    if (batchId) {
      baseFilter['metadata.batch_id'] = batchId;
    }

    // Fetch all relevant ActivityLog events
    const [created, applied, invited, linked, rejects, cleanups] = await Promise.all([
      base44.asServiceRole.entities.ActivityLog.filter({
        ...baseFilter,
        action_type: 'PROVISIONING_BATCH_CREATED',
        ...(sourceSystem ? { 'metadata.source_system': sourceSystem } : {})
      }, '-timestamp'),
      base44.asServiceRole.entities.ActivityLog.filter({
        ...baseFilter,
        action_type: 'PROVISIONING_BATCH_APPLIED',
        ...(sourceSystem ? { 'metadata.source_system': sourceSystem } : {})
      }, '-timestamp'),
      base44.asServiceRole.entities.ActivityLog.filter({
        ...baseFilter,
        action_type: 'PROVISIONING_INVITES_SENT',
        ...(sourceSystem ? { 'metadata.source_system': sourceSystem } : {})
      }, '-timestamp'),
      base44.asServiceRole.entities.ActivityLog.filter({
        ...baseFilter,
        action_type: 'PROVISIONING_USER_LINKED'
      }, '-timestamp'),
      base44.asServiceRole.entities.ActivityLog.filter({
        ...baseFilter,
        action_type: 'PROVISIONING_EXTERNAL_REQUEST_REJECTED'
      }, '-timestamp'),
      base44.asServiceRole.entities.ActivityLog.filter({
        ...baseFilter,
        action_type: 'PROVISIONING_NONCE_CLEANUP'
      }, '-timestamp')
    ]);

    // Compute KPIs
    const batchesCreated = created.length;
    const applySuccessCount = applied.filter(e => e.metadata?.result === 'SUCCESS').length;
    const applySuccessRate = applied.length > 0 ? (applySuccessCount / applied.length * 100).toFixed(1) : 0;
    
    const totalInvited = invited.reduce((sum, e) => sum + (e.metadata?.invited_count || 0), 0);
    const totalInviteFailed = invited.reduce((sum, e) => sum + (e.metadata?.failed_count || 0), 0);
    const inviteFailureRate = (totalInvited + totalInviteFailed) > 0 
      ? (totalInviteFailed / (totalInvited + totalInviteFailed) * 100).toFixed(1)
      : 0;

    const linksCount = linked.length;
    const activationRateApprox = totalInvited > 0 ? (linksCount / totalInvited * 100).toFixed(1) : 0;

    const circuitBreakerTrips = applied.filter(e => e.metadata?.circuit_breaker_tripped === true).length;
    const externalRejects = rejects.length;

    // Compute trends (daily buckets)
    const bucketByDay = (events, valueExtractor) => {
      const buckets = {};
      events.forEach(event => {
        const date = event.timestamp.split('T')[0];
        if (!buckets[date]) {
          buckets[date] = valueExtractor(event);
        } else {
          const existing = buckets[date];
          const newValue = valueExtractor(event);
          buckets[date] = typeof existing === 'object' 
            ? { ...existing, ...Object.keys(newValue).reduce((acc, k) => ({ ...acc, [k]: (existing[k] || 0) + newValue[k] }), {}) }
            : existing + newValue;
        }
      });
      return Object.entries(buckets).map(([date, value]) => ({ date, ...((typeof value === 'object') ? value : { count: value }) })).sort((a, b) => a.date.localeCompare(b.date));
    };

    const batchesByDay = bucketByDay(created, () => 1);
    const appliesByDay = bucketByDay(applied, (e) => ({
      success: e.metadata?.result === 'SUCCESS' ? 1 : 0,
      partial: e.metadata?.result === 'PARTIAL' ? 1 : 0,
      failed: e.metadata?.result === 'FAILED' ? 1 : 0
    }));
    const invitesByDay = bucketByDay(invited, (e) => ({
      invited: e.metadata?.invited_count || 0,
      failed: e.metadata?.failed_count || 0
    }));
    const linksByDay = bucketByDay(linked, () => 1);
    const rejectsByDay = bucketByDay(rejects, () => 1);

    // Recent batches table (limit 50)
    const recentBatches = created.slice(0, 50).map(e => ({
      timestamp: e.timestamp,
      tenant_id: e.metadata?.tenant_id,
      batch_id: e.metadata?.batch_id,
      source_system: e.metadata?.source_system,
      total_rows: e.metadata?.totals?.total_rows,
      valid_rows: e.metadata?.totals?.valid_rows,
      invalid_rows: e.metadata?.totals?.invalid_rows,
      request_id: e.metadata?.request?.request_id
    }));

    // Apply issues table
    const applyIssues = applied
      .filter(e => e.metadata?.result !== 'SUCCESS')
      .slice(0, 50)
      .map(e => ({
        timestamp: e.timestamp,
        tenant_id: e.client_id,
        batch_id: e.metadata?.batch_id,
        result: e.metadata?.result,
        failed: e.metadata?.failed,
        skipped: e.metadata?.skipped,
        circuit_breaker_tripped: e.metadata?.circuit_breaker_tripped,
        request_id: e.metadata?.request_id
      }));

    // Invite issues table
    const inviteIssues = invited
      .filter(e => e.metadata?.failed_count > 0)
      .slice(0, 50)
      .map(e => ({
        timestamp: e.timestamp,
        batch_id: e.metadata?.batch_id,
        invited_count: e.metadata?.invited_count,
        failed_count: e.metadata?.failed_count,
        result: e.metadata?.result,
        request_id: e.metadata?.request_id
      }));

    // Recent links table
    const recentLinks = linked.slice(0, 50).map(e => ({
      timestamp: e.timestamp,
      email: e.target_user_email,
      base44_user_id: e.metadata?.base44_user_id,
      source_system: e.metadata?.source_system,
      request_id: e.metadata?.request_id
    }));

    // Security rejects table
    const rejectsByReason = {};
    const rejectsByApiKey = {};
    rejects.forEach(e => {
      const reason = e.metadata?.reason || 'UNKNOWN';
      rejectsByReason[reason] = (rejectsByReason[reason] || 0) + 1;
      
      const apiKeyPrefix = e.metadata?.api_key_prefix;
      if (apiKeyPrefix) {
        rejectsByApiKey[apiKeyPrefix] = (rejectsByApiKey[apiKeyPrefix] || 0) + 1;
      }
    });

    const rejectsTable = rejects.slice(0, 50).map(e => ({
      timestamp: e.timestamp,
      reason: e.metadata?.reason,
      endpoint_key: e.metadata?.endpoint_key,
      api_key_prefix: e.metadata?.api_key_prefix,
      request_id: e.metadata?.request_id
    }));

    return Response.json({
      requestId,
      filters: {
        timeRange,
        tenantId: tenantId || 'all',
        sourceSystem: sourceSystem || 'all',
        batchId: batchId || null
      },
      kpis: {
        batchesCreated,
        applySuccessRate: parseFloat(applySuccessRate),
        invitesSent: totalInvited,
        inviteFailed: totalInviteFailed,
        inviteFailureRate: parseFloat(inviteFailureRate),
        links: linksCount,
        activationRateApprox: parseFloat(activationRateApprox),
        circuitBreakerTrips,
        externalRejects
      },
      trends: {
        batchesByDay,
        appliesByDay,
        invitesByDay,
        linksByDay,
        rejectsByDay
      },
      tables: {
        recentBatches,
        applyIssues,
        inviteIssues,
        recentLinks,
        rejects: rejectsTable
      },
      aggregates: {
        rejectsByReason,
        rejectsByApiKey
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Ops metrics error:`, error.message);
    return Response.json({ 
      error: error.message,
      requestId,
      details: user?.app_role === 'Platform Admin' ? error.stack : undefined
    }, { status: 500 });
  }
});