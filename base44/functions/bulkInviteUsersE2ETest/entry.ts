import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    console.log('\n🔬 STARTING COMPREHENSIVE END-TO-END DIAGNOSTIC');
    console.log('================================================\n');

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      errors: [],
      warnings: []
    };

    // Test 1: Create and upload test CSV
    console.log('📝 TEST 1: CSV Creation & Upload');
    try {
      const timestamp = Date.now();
      const testCsvContent = `email,app_role
e2e.test.user1.${timestamp}@bulkinvitetest.com,User Level 1
e2e.test.user2.${timestamp}@bulkinvitetest.com,User Level 2
invalid-email-${timestamp},User Level 1
e2e.test.user3.${timestamp}@bulkinvitetest.com,Admin Level 1`;

      const csvFile = new File([testCsvContent], `e2e_test_${timestamp}.csv`, { type: 'text/csv' });
      const uploadResponse = await base44.integrations.Core.UploadFile({ file: csvFile });
      const fileUrl = uploadResponse.file_url;

      testResults.tests.push({
        test: 'CSV Upload',
        status: 'PASS',
        fileUrl: fileUrl,
        timestamp: new Date().toISOString()
      });
      console.log('✅ CSV uploaded successfully');
      console.log('   URL:', fileUrl);

      // Test 2: Call bulkInviteUsers function
      console.log('\n🚀 TEST 2: Call bulkInviteUsers Function');
      try {
        const inviteResponse = await base44.functions.invoke('bulkInviteUsers', { fileUrl });
        
        testResults.tests.push({
          test: 'bulkInviteUsers Function Call',
          status: inviteResponse.data.success ? 'PASS' : 'PARTIAL',
          response: inviteResponse.data,
          timestamp: new Date().toISOString()
        });

        console.log('✅ Function executed');
        console.log('   Success:', inviteResponse.data.success);
        console.log('   Message:', inviteResponse.data.message);
        console.log('   Successes:', inviteResponse.data.successCount);
        console.log('   Failures:', inviteResponse.data.failedCount);

        if (inviteResponse.data.details) {
          console.log('\n📊 Detailed Results:');
          inviteResponse.data.details.forEach((detail, idx) => {
            console.log(`   ${idx + 1}. ${detail.email}`);
            console.log(`      Status: ${detail.status}`);
            console.log(`      Role: ${detail.role}`);
            console.log(`      Message: ${detail.message}`);
          });
        }

        // Test 3: Verify invitations were sent (check if users exist with pending status)
        console.log('\n🔍 TEST 3: Verify Invitation Results');
        const expectedSuccesses = 3; // 3 valid emails
        const expectedFailures = 1;  // 1 invalid email

        if (inviteResponse.data.successCount === expectedSuccesses) {
          testResults.tests.push({
            test: 'Success Count Verification',
            status: 'PASS',
            expected: expectedSuccesses,
            actual: inviteResponse.data.successCount
          });
          console.log('✅ Success count matches expected:', expectedSuccesses);
        } else {
          testResults.tests.push({
            test: 'Success Count Verification',
            status: 'FAIL',
            expected: expectedSuccesses,
            actual: inviteResponse.data.successCount
          });
          testResults.errors.push(`Expected ${expectedSuccesses} successes, got ${inviteResponse.data.successCount}`);
          console.log('❌ Success count mismatch');
        }

        if (inviteResponse.data.failedCount === expectedFailures) {
          testResults.tests.push({
            test: 'Failure Count Verification',
            status: 'PASS',
            expected: expectedFailures,
            actual: inviteResponse.data.failedCount
          });
          console.log('✅ Failure count matches expected:', expectedFailures);
        } else {
          testResults.tests.push({
            test: 'Failure Count Verification',
            status: 'FAIL',
            expected: expectedFailures,
            actual: inviteResponse.data.failedCount
          });
          testResults.errors.push(`Expected ${expectedFailures} failures, got ${inviteResponse.data.failedCount}`);
          console.log('❌ Failure count mismatch');
        }

        // Test 4: Check if invited users exist in system
        console.log('\n🔎 TEST 4: Verify Users Were Created');
        const successfulEmails = inviteResponse.data.details
          .filter(d => d.status === 'success')
          .map(d => d.email);

        console.log(`Checking ${successfulEmails.length} successfully invited users...`);
        
        for (const email of successfulEmails) {
          try {
            const users = await base44.entities.User.filter({ email: email });
            if (users && users.length > 0) {
              testResults.tests.push({
                test: `User Exists Check: ${email}`,
                status: 'PASS',
                userId: users[0].id
              });
              console.log(`✅ ${email} exists in system (ID: ${users[0].id})`);
            } else {
              testResults.tests.push({
                test: `User Exists Check: ${email}`,
                status: 'FAIL',
                message: 'User not found in system'
              });
              testResults.errors.push(`User ${email} was reported as invited but not found in system`);
              console.log(`❌ ${email} NOT found in system`);
            }
          } catch (userCheckError) {
            testResults.warnings.push(`Could not verify user ${email}: ${userCheckError.message}`);
            console.log(`⚠️  Could not check ${email}: ${userCheckError.message}`);
          }
        }

      } catch (functionError) {
        testResults.tests.push({
          test: 'bulkInviteUsers Function Call',
          status: 'FAIL',
          error: functionError.message,
          stack: functionError.stack
        });
        testResults.errors.push(`Function call failed: ${functionError.message}`);
        console.log('❌ Function call failed:', functionError.message);
      }

      // Test 5: Test Error Handling - Missing fileUrl
      console.log('\n🧪 TEST 5: Error Handling - Missing fileUrl');
      try {
        const errorResponse = await base44.functions.invoke('bulkInviteUsers', {});
        if (errorResponse.status === 400 || errorResponse.data.error) {
          testResults.tests.push({
            test: 'Missing fileUrl Error Handling',
            status: 'PASS',
            message: 'Function correctly rejected missing fileUrl'
          });
          console.log('✅ Function correctly handles missing fileUrl');
        } else {
          testResults.tests.push({
            test: 'Missing fileUrl Error Handling',
            status: 'FAIL',
            message: 'Function did not reject missing fileUrl as expected'
          });
          testResults.errors.push('Function should reject requests without fileUrl');
          console.log('❌ Function did not properly reject missing fileUrl');
        }
      } catch (expectedError) {
        // This is expected behavior
        testResults.tests.push({
          test: 'Missing fileUrl Error Handling',
          status: 'PASS',
          message: 'Function correctly threw error for missing fileUrl'
        });
        console.log('✅ Function correctly threw error for missing fileUrl');
      }

      // Test 6: Test Error Handling - Invalid fileUrl
      console.log('\n🧪 TEST 6: Error Handling - Invalid fileUrl');
      try {
        const invalidResponse = await base44.functions.invoke('bulkInviteUsers', { 
          fileUrl: 'https://invalid-url-does-not-exist-12345.com/test.csv' 
        });
        if (invalidResponse.status >= 400 || invalidResponse.data.error) {
          testResults.tests.push({
            test: 'Invalid fileUrl Error Handling',
            status: 'PASS',
            message: 'Function correctly rejected invalid fileUrl'
          });
          console.log('✅ Function correctly handles invalid fileUrl');
        } else {
          testResults.tests.push({
            test: 'Invalid fileUrl Error Handling',
            status: 'FAIL',
            message: 'Function did not reject invalid fileUrl'
          });
          testResults.warnings.push('Function should handle invalid URLs more gracefully');
          console.log('⚠️  Function may need better invalid URL handling');
        }
      } catch (expectedError) {
        testResults.tests.push({
          test: 'Invalid fileUrl Error Handling',
          status: 'PASS',
          message: 'Function correctly threw error for invalid fileUrl'
        });
        console.log('✅ Function correctly threw error for invalid fileUrl');
      }

    } catch (testError) {
      testResults.errors.push(`Test suite failed: ${testError.message}`);
      console.log('❌ Test suite error:', testError.message);
      console.log(testError.stack);
    }

    // Generate Summary
    console.log('\n📋 DIAGNOSTIC SUMMARY');
    console.log('================================================');
    const passedTests = testResults.tests.filter(t => t.status === 'PASS').length;
    const failedTests = testResults.tests.filter(t => t.status === 'FAIL').length;
    const totalTests = testResults.tests.length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Warnings: ${testResults.warnings.length}`);
    console.log(`Errors: ${testResults.errors.length}`);

    const allTestsPassed = failedTests === 0 && testResults.errors.length === 0;
    
    testResults.summary = {
      totalTests,
      passedTests,
      failedTests,
      warningCount: testResults.warnings.length,
      errorCount: testResults.errors.length,
      overallStatus: allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌',
      readyForProduction: allTestsPassed
    };

    if (allTestsPassed) {
      console.log('\n✅ ALL TESTS PASSED - Function is ready for production use');
    } else {
      console.log('\n❌ SOME TESTS FAILED - Review errors above');
      if (testResults.errors.length > 0) {
        console.log('\nErrors:');
        testResults.errors.forEach(err => console.log(`  - ${err}`));
      }
      if (testResults.warnings.length > 0) {
        console.log('\nWarnings:');
        testResults.warnings.forEach(warn => console.log(`  - ${warn}`));
      }
    }

    return Response.json({
      success: allTestsPassed,
      message: testResults.summary.overallStatus,
      testResults
    });

  } catch (error) {
    console.error('💥 FATAL ERROR:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});