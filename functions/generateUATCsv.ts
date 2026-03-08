import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all assigned test cases for this user
    const testCases = await base44.entities.UATTestCase.filter({
      assigned_tester_email: user.email
    });

    // Define CSV headers (matching spec exactly)
    const headers = [
      'Role',
      'Test Case ID',
      'Feature Area',
      'Test Case Description',
      'Expected Outcome',
      'Status',
      'Severity',
      'Last Tested By',
      'Last Test Date',
      'Issue/Bug ID',
      'Notes'
    ];

    // If no test cases, return empty CSV with headers
    if (!testCases || testCases.length === 0) {
      const csvContent = headers.map(h => `"${h}"`).join(',');
      return Response.json(csvContent);
    }

    // Generate CSV rows
    const rows = testCases.map(testCase => {
      // Get most recent test run if any
      const latestRun = Array.isArray(testCase.test_runs) && testCase.test_runs.length > 0
        ? testCase.test_runs[testCase.test_runs.length - 1]
        : null;

      // Format date safely
      let formattedDate = '';
      if (latestRun?.test_date) {
        try {
          formattedDate = new Date(latestRun.test_date).toLocaleDateString();
        } catch (e) {
          formattedDate = '';
        }
      }

      // Sanitize fields to prevent CSV injection
      const sanitize = (str) => {
        if (!str) return '';
        const cleaned = String(str).replace(/\n/g, ' ').replace(/\r/g, '');
        // Prevent CSV injection by escaping leading special characters
        if (cleaned.match(/^[=+\-@\t\r]/)) {
          return `'${cleaned}`;
        }
        return cleaned;
      };

      return [
        sanitize(testCase.role),
        sanitize(testCase.test_case_id),
        sanitize(testCase.feature_area),
        sanitize(testCase.description),
        sanitize(testCase.expected_outcome),
        '', // Status - to be filled by tester
        '', // Severity - to be filled by tester
        sanitize(latestRun?.tester_name),
        formattedDate,
        '', // Issue/Bug ID - to be filled by tester
        ''  // Notes - to be filled by tester
      ];
    });

    // Build CSV content
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Return as plain text (function invocation expects JSON response)
    return Response.json(csvContent);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});