import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { parseCSV } from '../../shared/performanceImport.ts';
import { isInternalCall } from '../../shared/urlValidation.ts';

/**
 * Brings learning completions recorded in another LMS into Curiosity Led.
 *
 * The client's infrastructure pushes a CSV export here — their cron job, Airflow, or an
 * SFTP-to-HTTP gateway that fetches the file from their SFTP server. This mirrors the
 * existing performance-data sync pattern, since the backend runtime cannot hold native
 * SSH bindings.
 *
 * Payload:
 *   { client_id: string, csv_text?: string, file_url?: string, source_system?: 'api'|'sftp'|'manual' }
 *
 * Auth: an API key (Bearer or x-api-key — the client's existing sync key), or an
 * authenticated admin acting for their own tenant.
 *
 * Expected columns (case-insensitive, common aliases accepted):
 *   learner email, learner name, course title, provider, completion date,
 *   score, duration minutes, external id, external url
 */

const COLUMN_ALIASES = {
  user_email: ['user_email', 'email', 'learner_email', 'learner', 'employee_email'],
  learner_name: ['learner_name', 'name', 'full_name', 'employee_name'],
  course_title: ['course_title', 'course', 'title', 'course_name', 'activity', 'training'],
  provider: ['provider', 'lms', 'source', 'source_lms', 'vendor'],
  external_id: ['external_id', 'id', 'completion_id', 'record_id'],
  external_url: ['external_url', 'url', 'link'],
  completed_at: ['completed_at', 'completed', 'completion_date', 'date_completed', 'date'],
  score: ['score', 'result', 'grade'],
  duration_minutes: ['duration_minutes', 'minutes', 'duration']
};

const normalizeKey = (key) => String(key || '').trim().toLowerCase().replace(/\s+/g, '_');

const pick = (row, field) => {
  for (const alias of COLUMN_ALIASES[field]) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return null;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // ── Authorise: an internal automation call, the client's sync API key, or an
    // authenticated admin acting for their own tenant. A user session also arrives as
    // a bearer token, so a bearer only counts as an API key when it matches the key. ──
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const expectedKey = secrets.get('PERFORMANCE_SYNC_API_KEY');
    const keyCandidate = req.headers.get('x-api-key') || body.api_key || bearerToken || '';
    const keyValid = !!expectedKey && !!keyCandidate && keyCandidate === expectedKey;

    let clientId = body.client_id;
    let importedBy = 'system';
    let authorized = isInternalCall(req) || keyValid;

    if (!authorized) {
      const caller = await base44.auth.me().catch(() => null);
      const adminRoles = [
        'Admin Level 1',
        'Admin Level 2',
        'Super Administrator',
        'Partner Business Administrator',
        'Platform Admin'
      ];
      if (caller && (caller.role === 'admin' || adminRoles.includes(caller.app_role))) {
        authorized = true;
        importedBy = caller.email;
        // An app admin may only import for their own tenant.
        if (caller.app_role !== 'Platform Admin') {
          clientId = caller.client_id || caller.data?.client_id;
        }
      }
    }

    if (!authorized) {
      return Response.json({ error: 'Unauthorized: a valid API key or admin session is required' }, { status: 401 });
    }
    if (!clientId) {
      return Response.json({ error: 'client_id is required' }, { status: 400 });
    }

    // ── Read the file ──
    let csvText = body.csv_text || '';
    if (!csvText && body.file_url) {
      const fileRes = await fetch(body.file_url, { signal: AbortSignal.timeout(30000) });
      if (!fileRes.ok) {
        return Response.json({ error: `Could not fetch file_url (${fileRes.status})` }, { status: 400 });
      }
      csvText = await fileRes.text();
    }
    if (!csvText) {
      return Response.json({ error: 'Either csv_text or file_url is required' }, { status: 400 });
    }

    const rawRows = parseCSV(csvText);
    if (rawRows.length < 2) {
      return Response.json({ error: 'No data rows found in the file' }, { status: 400 });
    }
    const headers = rawRows[0].map(normalizeKey);
    const rows = rawRows.slice(1).map((values) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        const value = values[index];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          row[header] = String(value).trim();
        }
      });
      return row;
    });

    const sourceSystem = ['api', 'sftp', 'manual'].includes(body.source_system)
      ? body.source_system
      : 'api';
    const importedAt = new Date().toISOString();

    // ── Map rows ──
    const candidates = [];
    const invalid = [];
    for (const row of rows) {
      const userEmail = pick(row, 'user_email');
      const courseTitle = pick(row, 'course_title');
      if (!userEmail || !courseTitle) {
        invalid.push({ row, reason: 'Missing learner email or course title' });
        continue;
      }
      const score = Number(pick(row, 'score'));
      const duration = Number(pick(row, 'duration_minutes'));
      candidates.push({
        client_id: clientId,
        user_email: userEmail.toLowerCase(),
        learner_name: pick(row, 'learner_name') || undefined,
        course_title: courseTitle,
        provider: pick(row, 'provider') || undefined,
        source_system: sourceSystem,
        external_id: pick(row, 'external_id') || undefined,
        external_url: pick(row, 'external_url') || undefined,
        completed_at: toDate(pick(row, 'completed_at')) || undefined,
        score: Number.isFinite(score) ? score : undefined,
        duration_minutes: Number.isFinite(duration) ? duration : undefined,
        status: 'recorded',
        imported_by: importedBy,
        imported_at: importedAt
      });
    }

    // ── De-duplicate against records already imported ──
    const existing = await base44.asServiceRole.entities.ExternalLearningRecord.filter(
      { client_id: clientId },
      { limit: 500 }
    );
    const existingRows = Array.isArray(existing) ? existing : existing?.items || [];
    const seen = new Set(
      existingRows.map((r) => `${r.user_email}|${r.external_id || `${r.course_title}|${r.completed_at || ''}`}`)
    );

    const toCreate = [];
    let duplicates = 0;
    for (const record of candidates) {
      const key = `${record.user_email}|${record.external_id || `${record.course_title}|${record.completed_at || ''}`}`;
      if (seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);
      toCreate.push(record);
    }

    const created = toCreate.length
      ? await base44.asServiceRole.entities.ExternalLearningRecord.bulkCreate(toCreate)
      : [];

    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        activity_type: 'external_learning_import',
        user_email: importedBy,
        description: `Imported ${toCreate.length} external learning record(s) for client ${clientId}`,
        metadata: {
          client_id: clientId,
          source_system: sourceSystem,
          summary: {
            total_rows: rows.length,
            created: toCreate.length,
            duplicates,
            invalid: invalid.length
          }
        }
      });
    } catch (_) {
      // Logging is best-effort and must never fail the import.
    }

    return Response.json({
      success: true,
      source_system: sourceSystem,
      total_rows: rows.length,
      created_count: Array.isArray(created) ? created.length : toCreate.length,
      duplicate_count: duplicates,
      invalid_count: invalid.length,
      invalid_rows: invalid.slice(0, 10).map((r) => ({ reason: r.reason, row: r.row }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}