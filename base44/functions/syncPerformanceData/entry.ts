import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';
import { processPerformanceRows, ParsedRow } from '../../shared/performanceImport.ts';

/**
 * API endpoint for external HRIS systems to push performance data.
 * Authenticated via PERFORMANCE_SYNC_API_KEY secret (passed as Bearer token or x-api-key header).
 *
 * Payload:
 *   {
 *     client_id: string,         // the tenant to write into
 *     employees: [{ employee_email, employee_name, manager_email, department, job_title, goal_title, goal_target, goal_actual, kpi_name, kpi_value, review_cycle, rating, review_date }]
 *   }
 *
 * Returns: { success: boolean, summary: ImportResult }
 */
export default async function(req: Request): Promise<Response> {
  try {
    // Validate API key
    const authHeader = req.headers.get("authorization") || "";
    const apiKeyHeader = req.headers.get("x-api-key") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const providedKey = bearerToken || apiKeyHeader;

    const expectedKey = secrets.get("PERFORMANCE_SYNC_API_KEY");
    if (!expectedKey) {
      return Response.json({ error: "Server not configured: PERFORMANCE_SYNC_API_KEY not set" }, { status: 500 });
    }
    if (providedKey !== expectedKey) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await req.json();
    const client_id = body.client_id;
    if (!client_id) {
      return Response.json({ error: "client_id is required" }, { status: 400 });
    }

    const employees: ParsedRow[] = body.employees || body.rows || [];
    if (employees.length === 0) {
      return Response.json({ error: "No employee data provided" }, { status: 400 });
    }

    // Use service role since this is an API-authenticated call (no user session)
    const base44 = createClientFromRequest(req);
    const result = await processPerformanceRows(base44, employees, client_id, "api_sync", false);

    return Response.json({
      success: result.errors.length === 0,
      summary: result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}