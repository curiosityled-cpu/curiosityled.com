import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Test helper function to create a test CSV and test bulkInviteUsers
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    const { testMode } = await req.json();

    // Create test CSV content
    const testCsvContent = `email,app_role
test1@example.com,User Level 1
test2@example.com,User Level 2
invalid-email,User Level 1
test3@example.com,Admin Level 1`;

    // Upload the test CSV
    const csvFile = new File([testCsvContent], 'test_users.csv', { type: 'text/csv' });
    const uploadResponse = await base44.integrations.Core.UploadFile({ file: csvFile });
    const fileUrl = uploadResponse.file_url;

    console.log('Test CSV uploaded to:', fileUrl);

    // Test 1: Missing fileUrl
    console.log('\n=== Test 1: Missing fileUrl ===');
    try {
      const test1Response = await base44.functions.invoke('bulkInviteUsers', {});
      console.log('Test 1 Response:', JSON.stringify(test1Response.data, null, 2));
    } catch (error) {
      console.log('Test 1 Error (expected):', error.message);
    }

    // Test 2: Valid fileUrl with test data
    console.log('\n=== Test 2: Valid fileUrl with mixed data ===');
    const test2Response = await base44.functions.invoke('bulkInviteUsers', { fileUrl });
    console.log('Test 2 Response:', JSON.stringify(test2Response.data, null, 2));

    // Test 3: Invalid fileUrl
    console.log('\n=== Test 3: Invalid fileUrl ===');
    try {
      const test3Response = await base44.functions.invoke('bulkInviteUsers', { 
        fileUrl: 'https://invalid-url-that-does-not-exist.com/test.csv' 
      });
      console.log('Test 3 Response:', JSON.stringify(test3Response.data, null, 2));
    } catch (error) {
      console.log('Test 3 Error (expected):', error.message);
    }

    return Response.json({
      success: true,
      message: 'Diagnostic tests completed. Check logs for detailed results.',
      test_csv_url: fileUrl
    });

  } catch (error) {
    console.error('Test function error:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});