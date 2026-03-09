import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parse } from 'npm:csv-parse/sync';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return Response.json({ error: 'Missing fileUrl in request payload' }, { status: 400 });
    }

    // Fetch the CSV content from the provided URL
    const csvResponse = await fetch(fileUrl);
    if (!csvResponse.ok) {
      return Response.json({ error: `Failed to fetch CSV: ${csvResponse.statusText}` }, { status: csvResponse.status });
    }
    const csvContent = await csvResponse.text();

    // Parse the CSV content
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const record of records) {
      const email = record.email?.trim();
      const role = record.app_role?.trim() || 'User Level 1';

      if (!email) {
        results.push({ email: 'N/A', role, status: 'failed', message: 'Email missing' });
        continue;
      }

      if (!emailRegex.test(email)) {
        results.push({ email, role, status: 'failed', message: 'Invalid email format' });
        continue;
      }

      try {
        await base44.users.inviteUser(email, role);
        results.push({ email, role, status: 'success', message: 'Invitation sent' });
      } catch (inviteError) {
        results.push({ email, role, status: 'failed', message: inviteError.message });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return Response.json({
      success: true,
      message: `Processed ${records.length} users. ${successCount} invited, ${failedCount} failed.`,
      successCount,
      failedCount,
      details: results,
    });

  } catch (error) {
    console.error('Error in bulkInviteUsers function:', error);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});