import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get payload
    const payload = await req.json();
    const fileUrl = payload.fileUrl;

    if (!fileUrl) {
      return Response.json({ error: 'No file URL provided' }, { status: 400 });
    }

    // Fetch CSV content from URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(fileUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return Response.json({ error: 'Failed to fetch CSV file from URL' }, { status: 400 });
      }
      
      const csvText = await response.text();
      
      // Validate CSV is not too large after fetching
      if (csvText.length > 10 * 1024 * 1024) { // 10MB text limit
        return Response.json({ 
          success: false,
          error: 'CSV file content too large. Maximum 10MB allowed.',
          processed: 0,
          errors: 0,
          errorDetails: []
        }, { status: 400 });
      }
    
      // Remove BOM if present
      let cleanedCsvText = csvText;
      if (cleanedCsvText.charCodeAt(0) === 0xFEFF) {
        cleanedCsvText = cleanedCsvText.slice(1);
      }
      
      const lines = cleanedCsvText.split('\n').filter(line => line.trim().length > 0);
      
      if (lines.length < 2) {
      return Response.json({ 
        success: false,
        error: 'CSV file is empty or has no data rows',
        processed: 0,
        errors: 0,
        errorDetails: []
        }, { status: 400 });
      }

      if (lines.length > 1001) {
      return Response.json({ 
        success: false,
        error: 'CSV file too large. Maximum 1000 rows allowed.',
        processed: 0,
        errors: 0,
        errorDetails: []
        }, { status: 400 });
      }

      // Parse headers (handle quoted headers)
      const headerLine = lines[0];
      const headers = [];
      let currentHeader = '';
      let insideQuotes = false;
      
      for (let char of headerLine) {
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          headers.push(currentHeader.replace(/^"|"$/g, '').trim());
          currentHeader = '';
        } else {
          currentHeader += char;
        }
      }
      headers.push(currentHeader.replace(/^"|"$/g, '').trim());
      
      // Expected headers for validation
      const requiredHeaders = ['Test Case ID', 'Status'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        return Response.json({ 
          success: false,
          error: `Missing required columns: ${missingHeaders.join(', ')}`,
          processed: 0,
          errors: 0,
          errorDetails: []
        }, { status: 400 });
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Extract calculateRiskScore to avoid redefining in loop
      const calculateRiskScore = (runs) => {
      if (!runs || runs.length === 0) return 0;
      
      const failedRuns = runs.filter(r => r.status === 'Failed');
      const criticalFailures = failedRuns.filter(r => r.severity === 'Critical').length;
      const highFailures = failedRuns.filter(r => r.severity === 'High').length;
      const mediumFailures = failedRuns.filter(r => r.severity === 'Medium').length;
      const lowFailures = failedRuns.filter(r => r.severity === 'Low').length;
      const blockedRuns = runs.filter(r => r.status === 'Blocked').length;

      return Math.min(100, 
        (criticalFailures * 40) + 
        (highFailures * 25) + 
        (mediumFailures * 15) + 
        (lowFailures * 5) + 
          (blockedRuns * 20)
        );
      };

      // Process each row
      for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Parse CSV row (handle quoted values and escaped quotes)
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"') {
            // Check if it's an escaped quote ("")
            if (insideQuotes && nextChar === '"') {
              currentValue += '"';
              i++; // Skip next quote
            } else {
              insideQuotes = !insideQuotes;
            }
          } else if (char === ',' && !insideQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim());

        // Map values to headers with trimming and length validation
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = idx < values.length ? (values[idx] || '').trim() : '';
        });

        // Skip rows without test case ID or status (don't count as error)
        if (!row['Test Case ID'] && !row['Status']) continue;
        
        if (!row['Test Case ID']) {
          errors.push(`Row ${i + 1}: Missing Test Case ID`);
          errorCount++;
          continue;
        }
        
        if (!row['Status']) {
          errors.push(`Row ${i + 1}: Missing Status`);
          errorCount++;
          continue;
        }

        // Sanitize and validate field lengths
        const sanitizeField = (field, maxLength = 5000) => {
          if (!field) return '';
          const cleaned = String(field).trim();
          return cleaned.length > maxLength ? cleaned.substring(0, maxLength) : cleaned;
        };

        const testCaseId = sanitizeField(row['Test Case ID'], 100);
        const status = sanitizeField(row['Status'], 50);
        const severity = sanitizeField(row['Severity'], 50);
        const notes = sanitizeField(row['Notes'], 5000);
        const actualOutcome = sanitizeField(row['Actual Outcome'], 5000);
        const evidenceUrl = sanitizeField(row['Evidence URL'], 500);
        const issueBugId = sanitizeField(row['Issue/Bug ID'], 200);

        // Validate status (case-insensitive)
        const validStatuses = ['Passed', 'Failed', 'Blocked'];
        const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        
        if (!validStatuses.includes(normalizedStatus)) {
          errors.push(`Row ${i + 1}: Invalid status "${status}". Must be: ${validStatuses.join(', ')}`);
          errorCount++;
          continue;
        }

        // Validate severity if provided
        let normalizedSeverity = '';
        if (severity) {
          const validSeverities = ['Critical', 'High', 'Medium', 'Low'];
          normalizedSeverity = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
          
          if (!validSeverities.includes(normalizedSeverity)) {
            errors.push(`Row ${i + 1}: Invalid severity "${severity}". Must be: ${validSeverities.join(', ')}`);
            errorCount++;
            continue;
          }
        }

        // Find the test case
        const testCaseData = await base44.entities.UATTestCase.filter({ 
          test_case_id: testCaseId,
          assigned_tester_email: user.email
        });

        if (testCaseData.length === 0) {
          errors.push(`Row ${i + 1}: Test case "${testCaseId}" not found or not assigned to you`);
          errorCount++;
          continue;
        }

        const existing = testCaseData[0];

        // Validate evidence URL if provided
        let validatedEvidenceUrl = '';
        if (evidenceUrl) {
          try {
            new URL(evidenceUrl);
            validatedEvidenceUrl = evidenceUrl;
          } catch (e) {
            // Invalid URL - skip it
            validatedEvidenceUrl = '';
          }
        }

        // Create test run object with unique timestamp
        const testRun = {
          tester_name: user.full_name,
          tester_email: user.email,
          status: normalizedStatus,
          test_date: new Date().toISOString(),
          actual_outcome: actualOutcome || notes || '',
          severity: normalizedSeverity || '',
          notes: notes || '',
          evidence_url: validatedEvidenceUrl,
          issue_bug_id: issueBugId || '',
          screenshots_evidence: sanitizeField(row['Screenshots / Evidence'], 1000),
          csv_import: true
        };

        // Check for duplicate imports (same status within last minute)
        const existingRuns = Array.isArray(existing.test_runs) ? existing.test_runs : [];
        const now = Date.now();
        const recentDuplicate = existingRuns.find(run => {
          try {
            return run.csv_import === true &&
                   run.status === normalizedStatus &&
                   run.tester_email === user.email &&
                   new Date(run.test_date).getTime() > now - 60000;
          } catch (e) {
            return false;
          }
        });

        if (recentDuplicate) {
          errors.push(`Row ${i + 1}: Duplicate test run detected (skipped to prevent duplicates)`);
          errorCount++;
          continue;
        }

        // Add test run to existing runs
        const updatedRuns = [...existingRuns, testRun];

        // Calculate new risk score
        const riskScore = calculateRiskScore(updatedRuns);

        // Determine overall status based on most recent runs
        const recentRuns = updatedRuns.slice(-5); // Look at last 5 runs
        const hasBlockedRuns = recentRuns.some(r => r.status === 'Blocked');
        const hasFailedRuns = recentRuns.some(r => r.status === 'Failed');
        const allPassed = recentRuns.every(r => r.status === 'Passed');
        
        let overallStatus = existing.status || 'Not Started';
        if (hasBlockedRuns) {
          overallStatus = 'Blocked';
        } else if (hasFailedRuns) {
          overallStatus = 'Failed';
        } else if (allPassed && recentRuns.length > 0) {
          overallStatus = 'Passed';
        } else if (recentRuns.length > 0) {
          overallStatus = 'In Progress';
        }

        // Update the test case with new run, risk score, and status
        await base44.entities.UATTestCase.update(existing.id, {
          test_runs: updatedRuns,
          overall_risk_score: riskScore,
          status: overallStatus
        });

        successCount++;

      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        errors.push(`Row ${i + 1}: ${error.message}`);
          errorCount++;
        }
      }

      // Return appropriate response based on results
      if (successCount === 0 && errorCount > 0) {
      return Response.json({
        success: false,
        processed: 0,
        errors: errorCount,
        errorDetails: errors,
          message: `Failed to process any rows. ${errorCount} error(s) found.`
        }, { status: 200 }); // Changed to 200 for consistent handling
      }

      return Response.json({
      success: errorCount === 0,
      processed: successCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : null,
      message: errorCount === 0 
          ? `Successfully processed ${successCount} test result(s)` 
          : `Processed ${successCount} test result(s) with ${errorCount} error(s)`
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return Response.json({ 
          success: false,
          error: 'Request timeout. File took too long to fetch.',
          processed: 0,
          errors: 0,
          errorDetails: []
        }, { status: 400 });
      }
      throw fetchError;
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});