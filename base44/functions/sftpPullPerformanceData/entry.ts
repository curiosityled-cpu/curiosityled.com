import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';
import { csvToObjects, processPerformanceRows } from '../../shared/performanceImport.ts';

/**
 * Processes performance CSV data from an SFTP source.
 *
 * Since the backend runtime cannot use native SSH bindings (ssh2-sftp-client requires
 * C++ addons), the SFTP file retrieval is handled by the customer's infrastructure
 * (cron job, Airflow, etc.) which downloads the CSV from their SFTP server and pushes
 * it to this endpoint. This is the standard cloud SaaS pattern — the customer pushes
 * to our API rather than us pulling from their server.
 *
 * Alternatively, this function can be called by a scheduled workflow with the CSV text
 * already retrieved via an SFTP-to-HTTP gateway.
 *
 * Payload:
 *   { client_id: string, csv_text: string }
 *   OR
 *   { client_id: string, file_url: string }  — fetches CSV from a URL (e.g., SFTP-to-HTTP gateway)
 *
 * Authentication: PERFORMANCE_SYNC_API_KEY (Bearer token or x-api-key header)
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

    // Get CSV text — either from payload or from a URL (SFTP-to-HTTP gateway)
    let csvText = "";
    if (body.csv_text) {
      csvText = body.csv_text;
    } else if (body.file_url) {
      const fileRes = await fetch(body.file_url);
      csvText = await fileRes.text();
    } else {
      return Response.json({ error: "Either csv_text or file_url is required" }, { status: 400 });
    }

    const rows = csvToObjects(csvText);
    if (rows.length === 0) {
      return Response.json({ error: "No data rows found in CSV" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const result = await processPerformanceRows(base44, rows, client_id, "sftp_sync", false);

    // Log to ActivityLog
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        activity_type: "sftp_performance_sync",
        user_email: "system",
        description: `SFTP sync processed ${rows.length} row(s) for client ${client_id}`,
        metadata: { client_id, summary: { total: result.total_rows, errors: result.errors.length } },
      });
    } catch {}

    return Response.json({
      success: result.errors.length === 0,
      source: "sftp_sync",
      ...result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}