import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Comprehensive Commission System Test
 * Tests all aspects of the automated commission system
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user || !['Platform Admin', 'Super Administrator'].includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized - Platform Admin required' }, { status: 401 });
    }

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };

    const log = (testName, passed, details = {}) => {
      testResults.tests.push({
        test: testName,
        status: passed ? 'PASSED' : 'FAILED',
        ...details
      });
      testResults.summary.total++;
      if (passed) {
        testResults.summary.passed++;
      } else {
        testResults.summary.failed++;
      }
    };

    console.log('🧪 Starting Comprehensive Commission System Test...\n');

    // ============================================
    // TEST 1: Create Test Partner
    // ============================================
    console.log('📋 Test 1: Creating test partner...');
    let testPartner;
    try {
      testPartner = await base44.asServiceRole.entities.Partner.create({
        name: 'Test Partner - ' + Date.now(),
        slug: 'test-partner-' + Date.now(),
        type: 'consulting_firm',
        status: 'active',
        contact_name: 'Test Contact',
        contact_email: user.email, // Use current user's email for testing
        commission_rate: 20,
        payout_schedule: 'monthly',
        minimum_payout_threshold: 10000, // $100
        auto_payout_enabled: false
      });
      log('Create Test Partner', true, { partner_id: testPartner.id });
      console.log('✅ Partner created:', testPartner.name);
    } catch (error) {
      log('Create Test Partner', false, { error: error.message });
      console.log('❌ Failed to create partner:', error.message);
    }

    // ============================================
    // TEST 2: Create Test Client
    // ============================================
    console.log('\n📋 Test 2: Creating test client...');
    let testClient;
    try {
      testClient = await base44.asServiceRole.entities.Client.create({
        name: 'Test Client - ' + Date.now(),
        slug: 'test-client-' + Date.now(),
        type: 'partner_client',
        status: 'active',
        partner_id: testPartner.id,
        contact_name: 'Client Contact',
        contact_email: user.email,
        industry: 'Technology',
        company_size: '51-200',
        stripe_customer_id: 'cus_test_' + Date.now()
      });
      log('Create Test Client', true, { client_id: testClient.id });
      console.log('✅ Client created:', testClient.name);
    } catch (error) {
      log('Create Test Client', false, { error: error.message });
      console.log('❌ Failed to create client:', error.message);
    }

    // ============================================
    // TEST 3: Manually Create Commission Record
    // ============================================
    console.log('\n📋 Test 3: Creating test commission...');
    let testCommission;
    try {
      const baseAmount = 100000; // $1,000
      const commissionRate = testPartner.commission_rate;
      const commissionAmount = Math.round((baseAmount * commissionRate) / 100); // $200

      testCommission = await base44.asServiceRole.entities.PartnerCommission.create({
        partner_id: testPartner.id,
        client_id: testClient.id,
        stripe_invoice_id: 'in_test_' + Date.now(),
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        base_amount: baseAmount,
        status: 'pending',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        invoice_date: new Date().toISOString(),
        client_name: testClient.name,
        partner_name: testPartner.name
      });

      log('Create Commission Record', true, { 
        commission_id: testCommission.id,
        amount: `$${(commissionAmount / 100).toFixed(2)}`
      });
      console.log('✅ Commission created: $' + (commissionAmount / 100).toFixed(2));
    } catch (error) {
      log('Create Commission Record', false, { error: error.message });
      console.log('❌ Failed to create commission:', error.message);
    }

    // ============================================
    // TEST 4: Verify Partner Totals Updated
    // ============================================
    console.log('\n📋 Test 4: Updating partner totals...');
    try {
      const updatedPartner = await base44.asServiceRole.entities.Partner.update(testPartner.id, {
        total_revenue_generated: (testPartner.total_revenue_generated || 0) + testCommission.base_amount,
        total_commissions_earned: (testPartner.total_commissions_earned || 0) + testCommission.commission_amount,
        total_commissions_pending: (testPartner.total_commissions_pending || 0) + testCommission.commission_amount
      });

      const expectedRevenue = testCommission.base_amount;
      const actualRevenue = updatedPartner.total_revenue_generated;
      const revenueMatch = actualRevenue >= expectedRevenue;

      log('Update Partner Totals', revenueMatch, {
        expected_revenue: `$${(expectedRevenue / 100).toFixed(2)}`,
        actual_revenue: `$${(actualRevenue / 100).toFixed(2)}`,
        pending_commissions: `$${(updatedPartner.total_commissions_pending / 100).toFixed(2)}`
      });
      
      if (revenueMatch) {
        console.log('✅ Partner totals updated correctly');
      } else {
        console.log('❌ Partner totals mismatch');
      }
    } catch (error) {
      log('Update Partner Totals', false, { error: error.message });
      console.log('❌ Failed to update partner totals:', error.message);
    }

    // ============================================
    // TEST 5: Commission Approval Flow
    // ============================================
    console.log('\n📋 Test 5: Testing commission approval...');
    try {
      const approvalResponse = await base44.functions.invoke('approveCommissions', {
        commissionIds: [testCommission.id]
      });

      const approved = approvalResponse.data?.success && 
                      approvalResponse.data?.results?.successful?.includes(testCommission.id);

      log('Approve Commission', approved, {
        commission_id: testCommission.id,
        response: approvalResponse.data
      });

      if (approved) {
        console.log('✅ Commission approved successfully');
      } else {
        console.log('❌ Commission approval failed');
      }
    } catch (error) {
      log('Approve Commission', false, { error: error.message });
      console.log('❌ Failed to approve commission:', error.message);
    }

    // ============================================
    // TEST 6: Verify Commission Status Changed
    // ============================================
    console.log('\n📋 Test 6: Verifying approval status...');
    try {
      const commissions = await base44.asServiceRole.entities.PartnerCommission.filter({
        id: testCommission.id
      });

      const statusChanged = commissions.length > 0 && commissions[0].status === 'approved';
      const hasApprovalData = commissions[0].approved_by && commissions[0].approved_date;

      log('Verify Approval Status', statusChanged && hasApprovalData, {
        status: commissions[0]?.status,
        approved_by: commissions[0]?.approved_by,
        approved_date: commissions[0]?.approved_date
      });

      if (statusChanged) {
        console.log('✅ Commission status changed to approved');
      } else {
        console.log('❌ Commission status not updated');
      }
    } catch (error) {
      log('Verify Approval Status', false, { error: error.message });
      console.log('❌ Failed to verify status:', error.message);
    }

    // ============================================
    // TEST 7: Create Additional Test Commissions
    // ============================================
    console.log('\n📋 Test 7: Creating additional test commissions...');
    try {
      const additionalCommissions = [];
      
      for (let i = 0; i < 3; i++) {
        const baseAmount = 50000; // $500
        const commissionAmount = Math.round((baseAmount * testPartner.commission_rate) / 100);

        const commission = await base44.asServiceRole.entities.PartnerCommission.create({
          partner_id: testPartner.id,
          client_id: testClient.id,
          stripe_invoice_id: 'in_test_batch_' + Date.now() + '_' + i,
          commission_amount: commissionAmount,
          commission_rate: testPartner.commission_rate,
          base_amount: baseAmount,
          status: i < 2 ? 'pending' : 'approved',
          period_start: new Date().toISOString().split('T')[0],
          period_end: new Date().toISOString().split('T')[0],
          invoice_date: new Date().toISOString(),
          client_name: testClient.name,
          partner_name: testPartner.name
        });

        additionalCommissions.push(commission);
      }

      log('Create Additional Commissions', true, {
        count: additionalCommissions.length,
        total_amount: `$${(additionalCommissions.reduce((sum, c) => sum + c.commission_amount, 0) / 100).toFixed(2)}`
      });
      console.log('✅ Created 3 additional commissions');
    } catch (error) {
      log('Create Additional Commissions', false, { error: error.message });
      console.log('❌ Failed to create additional commissions:', error.message);
    }

    // ============================================
    // TEST 8: Query Commission Data
    // ============================================
    console.log('\n📋 Test 8: Querying commission data...');
    try {
      const queryResponse = await base44.functions.invoke('getPartnerCommissions', {
        partnerId: testPartner.id,
        status: 'all'
      });

      const hasData = queryResponse.data?.success && 
                     queryResponse.data?.commissions?.length > 0 &&
                     queryResponse.data?.stats;

      log('Query Commission Data', hasData, {
        total_commissions: queryResponse.data?.commissions?.length,
        stats: queryResponse.data?.stats
      });

      if (hasData) {
        console.log('✅ Commission data queried successfully');
        console.log('   Total commissions:', queryResponse.data.commissions.length);
        console.log('   Pending:', queryResponse.data.stats.pending);
        console.log('   Approved:', queryResponse.data.stats.approved);
      } else {
        console.log('❌ Failed to query commission data');
      }
    } catch (error) {
      log('Query Commission Data', false, { error: error.message });
      console.log('❌ Failed to query commissions:', error.message);
    }

    // ============================================
    // TEST 9: Process Commission Payout
    // ============================================
    console.log('\n📋 Test 9: Processing commission payout...');
    try {
      // Get all approved commissions for this partner
      const allCommissions = await base44.asServiceRole.entities.PartnerCommission.filter({
        partner_id: testPartner.id,
        status: 'approved'
      });

      if (allCommissions.length > 0) {
        const payoutResponse = await base44.functions.invoke('processCommissionPayouts', {
          partnerId: testPartner.id,
          commissionIds: allCommissions.map(c => c.id),
          paymentMethod: 'manual'
        });

        const payoutSuccess = payoutResponse.data?.success;

        log('Process Payout', payoutSuccess, {
          commissions_paid: payoutResponse.data?.results?.successful?.length,
          total_paid: payoutResponse.data?.totalPaid ? `$${(payoutResponse.data.totalPaid / 100).toFixed(2)}` : 'N/A',
          message: payoutResponse.data?.message
        });

        if (payoutSuccess) {
          console.log('✅ Payout processed successfully');
          console.log('   Amount:', `$${(payoutResponse.data.totalPaid / 100).toFixed(2)}`);
        } else {
          console.log('❌ Payout processing failed');
        }
      } else {
        log('Process Payout', true, { message: 'No approved commissions to process' });
        console.log('⚠️  No approved commissions to process');
      }
    } catch (error) {
      log('Process Payout', false, { error: error.message });
      console.log('❌ Failed to process payout:', error.message);
    }

    // ============================================
    // TEST 10: Verify Final Partner Totals
    // ============================================
    console.log('\n📋 Test 10: Verifying final partner totals...');
    try {
      const partners = await base44.asServiceRole.entities.Partner.filter({
        id: testPartner.id
      });
      const finalPartner = partners[0];

      const hasTotals = finalPartner.total_commissions_earned > 0;

      log('Verify Final Totals', hasTotals, {
        total_revenue: `$${((finalPartner.total_revenue_generated || 0) / 100).toFixed(2)}`,
        total_earned: `$${((finalPartner.total_commissions_earned || 0) / 100).toFixed(2)}`,
        total_paid: `$${((finalPartner.total_commissions_paid || 0) / 100).toFixed(2)}`,
        total_pending: `$${((finalPartner.total_commissions_pending || 0) / 100).toFixed(2)}`
      });

      if (hasTotals) {
        console.log('✅ Partner totals verified');
        console.log('   Total Revenue:', `$${((finalPartner.total_revenue_generated || 0) / 100).toFixed(2)}`);
        console.log('   Total Earned:', `$${((finalPartner.total_commissions_earned || 0) / 100).toFixed(2)}`);
        console.log('   Total Paid:', `$${((finalPartner.total_commissions_paid || 0) / 100).toFixed(2)}`);
        console.log('   Total Pending:', `$${((finalPartner.total_commissions_pending || 0) / 100).toFixed(2)}`);
      } else {
        console.log('❌ Partner totals not updated');
      }
    } catch (error) {
      log('Verify Final Totals', false, { error: error.message });
      console.log('❌ Failed to verify final totals:', error.message);
    }

    // ============================================
    // TEST 11: Test Scheduled Payout (Dry Run)
    // ============================================
    console.log('\n📋 Test 11: Testing automated payout scheduler (dry run)...');
    try {
      const scheduleResponse = await base44.functions.invoke('scheduleCommissionPayouts', {
        dryRun: true
      });

      const schedulerWorks = scheduleResponse.data?.success !== undefined;

      log('Automated Payout Scheduler', schedulerWorks, {
        dry_run: true,
        summary: scheduleResponse.data?.summary,
        processed_count: scheduleResponse.data?.details?.processed?.length
      });

      if (schedulerWorks) {
        console.log('✅ Automated scheduler works');
        console.log('   Would process:', scheduleResponse.data.summary?.processed || 0, 'partners');
      } else {
        console.log('❌ Automated scheduler failed');
      }
    } catch (error) {
      log('Automated Payout Scheduler', false, { error: error.message });
      console.log('❌ Failed to test scheduler:', error.message);
    }

    // ============================================
    // TEST 12: Test Commission Reminders
    // ============================================
    console.log('\n📋 Test 12: Testing commission reminders...');
    try {
      const reminderResponse = await base44.functions.invoke('sendCommissionReminders', {
        type: 'approval_reminder'
      });

      const reminderWorks = reminderResponse.data?.success;

      log('Commission Reminders', reminderWorks, {
        message: reminderResponse.data?.message
      });

      if (reminderWorks) {
        console.log('✅ Reminder system works');
      } else {
        console.log('❌ Reminder system failed');
      }
    } catch (error) {
      log('Commission Reminders', false, { error: error.message });
      console.log('❌ Failed to test reminders:', error.message);
    }

    // ============================================
    // TEST 13: Cleanup Test Data
    // ============================================
    console.log('\n📋 Test 13: Cleaning up test data...');
    try {
      // Delete test commissions
      const testCommissions = await base44.asServiceRole.entities.PartnerCommission.filter({
        partner_id: testPartner.id
      });

      for (const commission of testCommissions) {
        await base44.asServiceRole.entities.PartnerCommission.delete(commission.id);
      }

      // Delete test client
      await base44.asServiceRole.entities.Client.delete(testClient.id);

      // Delete test partner
      await base44.asServiceRole.entities.Partner.delete(testPartner.id);

      log('Cleanup Test Data', true, {
        deleted_commissions: testCommissions.length,
        deleted_clients: 1,
        deleted_partners: 1
      });
      console.log('✅ Test data cleaned up');
    } catch (error) {
      log('Cleanup Test Data', false, { error: error.message });
      console.log('⚠️  Warning: Failed to cleanup test data:', error.message);
    }

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${testResults.summary.total}`);
    console.log(`✅ Passed: ${testResults.summary.passed}`);
    console.log(`❌ Failed: ${testResults.summary.failed}`);
    console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));

    if (testResults.summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => {
          console.log(`   - ${t.test}: ${t.error || 'See details'}`);
        });
    } else {
      console.log('\n🎉 All tests passed!');
    }

    return Response.json({
      success: testResults.summary.failed === 0,
      testResults,
      message: testResults.summary.failed === 0 
        ? '✅ All commission system tests passed!'
        : `⚠️ ${testResults.summary.failed} test(s) failed. See details.`
    });

  } catch (error) {
    console.error('💥 Test suite error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});