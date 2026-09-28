import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { csvToObjects, processPerformanceRows, generateCSVTemplate } from '../../shared/performanceImport.ts';

/**
 * CSV import for performance data. Supports dry-run preview before applying.
 *
 * Payload:
 *   { mode: "template" }                           → returns CSV template text
 *   { mode: "preview", csv_text: string }          → dry-run preview, no writes
 *   { mode: "apply", csv_text: string }            → apply the import
 *   { mode: "preview", file_url: string }          → dry-run from uploaded file URL
 *   { mode: "apply", file_url: string }            → apply from uploaded file URL
 *
 * client_id is always derived from the authenticated user — never from the payload.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const client_id = user.data?.client_id;
    if (!client_id) return Response.json({ error: "No client_id on user profile" }, { status: 400 });

    const body = await req.json();
    const mode = body.mode || "preview";

    // Template download
    if (mode === "template") {
      return new Response(generateCSVTemplate(), {
        status: 200,
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=performance_import_template.csv" },
      });
    }

    // Get CSV text — either from payload or from uploaded file URL
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

    const dryRun = mode === "preview";
    const result = await processPerformanceRows(base44, rows, client_id, "hris_import", dryRun);

    return Response.json({
      mode,
      dry_run: dryRun,
      ...result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}