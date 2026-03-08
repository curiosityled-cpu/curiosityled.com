import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ONLY Platform Admin can access Stripe diagnostics
    if (user.app_role !== 'Platform Admin') {
      return Response.json({ 
        error: 'Access denied. This feature is only available to Platform Administrators.' 
      }, { status: 403 });
    }

    // Run comprehensive diagnostics
    const diagnostics = {
      timestamp: new Date().toISOString(),
      apiKeyStatus: 'unknown',
      webhookStatus: 'unknown',
      products: [],
      customers: [],
      subscriptions: [],
      errors: []
    };

    try {
      // Test API key
      const balance = await stripe.balance.retrieve();
      diagnostics.apiKeyStatus = 'valid';
      diagnostics.balance = balance;
    } catch (error) {
      diagnostics.apiKeyStatus = 'invalid';
      diagnostics.errors.push({ step: 'api_key_test', error: error.message });
    }

    try {
      // Get products
      const products = await stripe.products.list({ limit: 10 });
      diagnostics.products = products.data.map(p => ({
        id: p.id,
        name: p.name,
        active: p.active
      }));
    } catch (error) {
      diagnostics.errors.push({ step: 'products_list', error: error.message });
    }

    try {
      // Get customers
      const customers = await stripe.customers.list({ limit: 10 });
      diagnostics.customers = customers.data.map(c => ({
        id: c.id,
        email: c.email,
        created: c.created
      }));
    } catch (error) {
      diagnostics.errors.push({ step: 'customers_list', error: error.message });
    }

    try {
      // Get subscriptions
      const subscriptions = await stripe.subscriptions.list({ limit: 10 });
      diagnostics.subscriptions = subscriptions.data.map(s => ({
        id: s.id,
        status: s.status,
        customer: s.customer
      }));
    } catch (error) {
      diagnostics.errors.push({ step: 'subscriptions_list', error: error.message });
    }

    return Response.json({
      success: true,
      diagnostics
    });

  } catch (error) {
    console.error('Stripe Diagnostic Error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});