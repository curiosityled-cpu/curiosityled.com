import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Admin Level 3') {
      return Response.json({ error: 'Unauthorized - Super Admin only' }, { status: 401 });
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!secretKey) {
      return Response.json({ 
        error: 'STRIPE_SECRET_KEY environment variable is not set',
        suggestion: 'Please set your Stripe secret key in the app settings'
      }, { status: 500 });
    }

    // Initialize Stripe
    const stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Check API Key Format
    const keyMode = secretKey.startsWith('sk_live_') ? 'live' : 
                    secretKey.startsWith('sk_test_') ? 'test' : 'invalid';
    
    testResults.tests.push({
      name: 'API Key Format',
      status: keyMode !== 'invalid' ? 'PASS' : 'FAIL',
      message: `Using ${keyMode.toUpperCase()} mode keys`,
      details: { 
        key_prefix: secretKey.substring(0, 10) + '...',
        mode: keyMode 
      }
    });

    // Test 2: Stripe API Connection
    try {
      const balance = await stripe.balance.retrieve();
      testResults.tests.push({
        name: 'Stripe API Connection',
        status: 'PASS',
        message: `Connected successfully to Stripe ${keyMode.toUpperCase()} mode`,
        details: { 
          available_balance: balance.available[0]?.amount || 0,
          currency: balance.available[0]?.currency || 'usd'
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Stripe API Connection',
        status: 'FAIL',
        message: error.message,
        details: { 
          error_type: error.type,
          error_code: error.code,
          suggestion: 'Check if your Stripe secret key is valid and has the correct permissions'
        }
      });
    }

    // Test 3: List Products
    try {
      const products = await stripe.products.list({ active: true, limit: 10 });
      testResults.tests.push({
        name: 'List Products',
        status: products.data.length > 0 ? 'PASS' : 'WARN',
        message: `Found ${products.data.length} active products in ${keyMode.toUpperCase()} mode`,
        details: products.data.slice(0, 3).map(p => ({ 
          id: p.id, 
          name: p.name 
        }))
      });
    } catch (error) {
      testResults.tests.push({
        name: 'List Products',
        status: 'FAIL',
        message: error.message,
        details: { error_type: error.type }
      });
    }

    // Test 4: List Prices
    try {
      const prices = await stripe.prices.list({ active: true, limit: 10 });
      testResults.tests.push({
        name: 'List Prices',
        status: prices.data.length > 0 ? 'PASS' : 'WARN',
        message: `Found ${prices.data.length} active prices`,
        details: prices.data.slice(0, 3).map(p => ({ 
          id: p.id, 
          amount: p.unit_amount, 
          currency: p.currency 
        }))
      });
    } catch (error) {
      testResults.tests.push({
        name: 'List Prices',
        status: 'FAIL',
        message: error.message
      });
    }

    // Summary
    const passed = testResults.tests.filter(t => t.status === 'PASS').length;
    const failed = testResults.tests.filter(t => t.status === 'FAIL').length;

    testResults.summary = {
      total: testResults.tests.length,
      passed,
      failed,
      overall_status: failed === 0 ? 'HEALTHY' : 'ISSUES_FOUND'
    };

    return Response.json(testResults);

  } catch (error) {
    console.error('Test error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});