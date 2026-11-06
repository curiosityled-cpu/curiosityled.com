import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';
import { csvToObjects, processPerformanceRows } from '../../shared/performanceImport.ts';
import { isInternalCall } from '../../shared/urlValidation.ts';
import { resolveActiveClient, canActOnClient } from '../../shared/tenantContext.ts';

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
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const client_id = body.client_id;
    if (!client_id) {
      return Response.json({ error: "client_id is required" }, { status: 400 });
    }

    // Authorisation: the platform sync key, a verified internal call, or a
    // signed-in administrator whose resolved tenant covers this client. Before
    // this check the endpoint wrote performance rows into any named client for
    // any caller who simply omitted the key.
    const authHeader = req.headers.get("authorization") || "";
    const apiKeyHeader = req.headers.get("x-api-key") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    // A user session also arrives as a bearer token, so a bearer only counts as
    // an API key when it matches the key; otherwise the session path decides.
    const expectedKey = secrets.get("PERFORMANCE_SYNC_API_KEY");
    const keyCandidate = apiKeyHeader || body.api_key || bearerToken || "";
    const keyValid = !!expectedKey && !!keyCandidate && keyCandidate === expectedKey;
    const explicitBadKey = !!(apiKeyHeader || body.api_key) && !keyValid;

    if (explicitBadKey) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }

    if (!keyValid && !isInternalCall(req)) {
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const tenant = await resolveActiveClient(base44, user, client_id);
      if (!canActOnClient(tenant, client_id)) {
        return Response.json({ error: "Forbidden — client is outside your scope" }, { status: 403 });
      }
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