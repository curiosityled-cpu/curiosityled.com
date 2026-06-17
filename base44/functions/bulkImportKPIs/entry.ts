import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * bulkImportKPIs — Imports operational KPI goals from a JSON payload.
 * Creates Goal entities with goal_type "kpi" or "cascaded_kpi".
 *
 * Payload shape:
 * {
 *   kpis: [
 *     {
 *       title: "SLA Adherence",
 *       description: "Overall SLA adherence across all queues",
 *       goal_type: "kpi",
 *       department: "Operations",
 *       visibility: "shared",
 *       kpi_target: 95,
 *       kpi_current: 92.4,
 *       kpi_unit: "%",
 *       kpi_direction: "higher_better",
 *       cascaded_from_goal_id: null,
 *       assigned_to_emails: ["manager@example.com"],
 *       timeframe_start: "2026-01-01",
 *       timeframe_end: "2026-12-31"
 *     }
 *   ]
 * }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only: only Platform Admin, Super Administrator, or Admin Level 2 can bulk import
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Admin Level 2'];
    const userRole = user.app_role || user.data?.app_role || user.role;
    if (!allowedRoles.includes(userRole)) {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const { kpis } = await req.json();

    if (!Array.isArray(kpis) || kpis.length === 0) {
      return Response.json({ error: 'kpis array is required and must not be empty' }, { status: 400 });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < kpis.length; i++) {
      const kpi = kpis[i];
      try {
        // Validate required fields
        if (!kpi.title) {
          results.errors.push({ index: i, error: 'title is required' });
          results.skipped++;
          continue;
        }
        if (!['kpi', 'cascaded_kpi'].includes(kpi.goal_type)) {
          results.errors.push({ index: i, title: kpi.title, error: 'goal_type must be "kpi" or "cascaded_kpi"' });
          results.skipped++;
          continue;
        }

        // Build the goal record
        const goalData = {
          title: kpi.title,
          description: kpi.description || '',
          goal_type: kpi.goal_type,
          status: 'active',
          visibility: kpi.visibility || 'shared',
          progress: kpi.progress || 0,
          department: kpi.department || null,
          kpi_target: kpi.kpi_target ?? null,
          kpi_current: kpi.kpi_current ?? null,
          kpi_unit: kpi.kpi_unit || null,
          kpi_direction: kpi.kpi_direction || 'higher_better',
          cascaded_from_goal_id: kpi.cascaded_from_goal_id || null,
          assigned_to_emails: kpi.assigned_to_emails || [],
          timeframe_start: kpi.timeframe_start || null,
          timeframe_end: kpi.timeframe_end || null,
          client_id: user.data?.client_id || user.client_id || null,
        };

        await base44.asServiceRole.entities.Goal.create(goalData);
        results.created++;
      } catch (err) {
        results.errors.push({ index: i, title: kpi.title, error: err.message });
        results.skipped++;
      }
    }

    return Response.json({
      success: results.errors.length === 0,
      message: `Imported ${results.created} KPIs${results.skipped > 0 ? `, ${results.skipped} skipped` : ''}`,
      created: results.created,
      skipped: results.skipped,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });

  } catch (error) {
    console.error('Error importing KPIs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});