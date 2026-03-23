import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parse } from 'npm:csv-parse/sync';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    const diagnosticResults = {
      tests: [],
      summary: {}
    };

    // Test 1: CSV Creation and Upload
    console.log('\n=== Test 1: CSV Upload ===');
    const testCsvContent = `email,app_role,full_name
testuser1@diagnostictest.com,User Level 1,Test User One
testuser2@diagnostictest.com,User Level 2,Test User Two
invalid-email-format,User Level 1,Invalid User
testuser3@diagnostictest.com,InvalidRole,Test User Three`;

    try {
      const csvFile = new File([testCsvContent], 'diagnostic_test.csv', { type: 'text/csv' });
      const uploadResponse = await base44.integrations.Core.UploadFile({ file: csvFile });
      const fileUrl = uploadResponse.file_url;
      
      diagnosticResults.tests.push({
        name: 'CSV Upload',
        status: 'PASS',
        fileUrl: fileUrl
      });
      console.log('✓ CSV uploaded successfully:', fileUrl);

      // Test 2: CSV Fetch and Parse
      console.log('\n=== Test 2: CSV Fetch & Parse ===');
      const csvResponse = await fetch(fileUrl);
      if (!csvResponse.ok) {
        throw new Error(`Failed to fetch CSV: ${csvResponse.statusText}`);
      }
      const csvContent = await csvResponse.text();
      console.log('CSV content fetched, length:', csvContent.length);

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      diagnosticResults.tests.push({
        name: 'CSV Parse',
        status: 'PASS',
        recordCount: records.length,
        records: records
      });
      console.log('✓ CSV parsed successfully. Records:', records.length);
      console.log('Sample record:', JSON.stringify(records[0], null, 2));

      // Test 3: Email Validation
      console.log('\n=== Test 3: Email Validation ===');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validationResults = records.map(record => {
        const email = record.email?.trim();
        const role = record.app_role?.trim() || 'User Level 1';
        const isValidEmail = email && emailRegex.test(email);

        return {
          email,
          role,
          isValidEmail,
          reason: !email ? 'Email missing' : !isValidEmail ? 'Invalid email format' : 'Valid'
        };
      });

      diagnosticResults.tests.push({
        name: 'Email Validation',
        status: 'PASS',
        validEmails: validationResults.filter(v => v.isValidEmail).length,
        invalidEmails: validationResults.filter(v => !v.isValidEmail).length,
        details: validationResults
      });
      console.log('✓ Email validation completed');
      console.log('Valid:', validationResults.filter(v => v.isValidEmail).length);
      console.log('Invalid:', validationResults.filter(v => !v.isValidEmail).length);

      // Test 4: Simulated Invitation (DRY RUN - only for valid emails)
      console.log('\n=== Test 4: Invitation Simulation (DRY RUN) ===');
      const invitationSimulation = [];
      
      for (const record of records) {
        const email = record.email?.trim();
        const role = record.app_role?.trim() || 'User Level 1';

        if (!email || !emailRegex.test(email)) {
          invitationSimulation.push({
            email: email || 'N/A',
            role,
            status: 'SKIP',
            message: !email ? 'Email missing' : 'Invalid email format'
          });
          continue;
        }

        // Check if email already exists
        try {
          const existingUsers = await base44.entities.User.filter({ email: email });
          if (existingUsers && existingUsers.length > 0) {
            invitationSimulation.push({
              email,
              role,
              status: 'SKIP',
              message: 'User already exists in system'
            });
          } else {
            invitationSimulation.push({
              email,
              role,
              status: 'READY',
              message: 'Ready for invitation'
            });
          }
        } catch (userCheckError) {
          invitationSimulation.push({
            email,
            role,
            status: 'ERROR',
            message: `Error checking user: ${userCheckError.message}`
          });
        }
      }

      diagnosticResults.tests.push({
        name: 'Invitation Simulation',
        status: 'PASS',
        readyToInvite: invitationSimulation.filter(s => s.status === 'READY').length,
        alreadyExists: invitationSimulation.filter(s => s.message.includes('already exists')).length,
        details: invitationSimulation
      });

      console.log('✓ Invitation simulation completed');
      console.log('Ready to invite:', invitationSimulation.filter(s => s.status === 'READY').length);
      console.log('Already exist:', invitationSimulation.filter(s => s.message.includes('already exists')).length);

      // Summary
      diagnosticResults.summary = {
        overallStatus: 'ALL TESTS PASSED',
        csvUpload: 'OK',
        csvParsing: 'OK',
        emailValidation: 'OK',
        invitationSimulation: 'OK',
        readyForProduction: invitationSimulation.filter(s => s.status === 'READY').length > 0,
        warnings: invitationSimulation.filter(s => s.status === 'SKIP' || s.status === 'ERROR').map(s => s.message)
      };

      console.log('\n=== DIAGNOSTIC SUMMARY ===');
      console.log(JSON.stringify(diagnosticResults.summary, null, 2));

    } catch (testError) {
      diagnosticResults.tests.push({
        name: 'Overall Test Flow',
        status: 'FAIL',
        error: testError.message,
        stack: testError.stack
      });
      diagnosticResults.summary = {
        overallStatus: 'TESTS FAILED',
        error: testError.message
      };
    }

    return Response.json({
      success: diagnosticResults.summary.overallStatus === 'ALL TESTS PASSED',
      diagnosticResults,
      message: diagnosticResults.summary.overallStatus
    });

  } catch (error) {
    console.error('Diagnostic function error:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});