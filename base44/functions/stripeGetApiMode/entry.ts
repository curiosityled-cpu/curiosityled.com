import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if secret key exists
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');

    if (!secretKey) {
      return Response.json({ 
        error: 'STRIPE_SECRET_KEY not set in environment variables',
        mode: 'unknown'
      }, { status: 500 });
    }

    // Determine mode from key prefix
    const mode = secretKey.startsWith('sk_live_') ? 'live' : 
                 secretKey.startsWith('sk_test_') ? 'test' : 'unknown';

    const secretKeyPrefix = secretKey.substring(0, 10) + '...';
    const publishableKeyPrefix = publishableKey ? publishableKey.substring(0, 10) + '...' : 'not set';

    return Response.json({
      mode,
      secret_key_prefix: secretKeyPrefix,
      publishable_key_prefix: publishableKeyPrefix,
      note: mode === 'live' 
        ? '⚠️ LIVE MODE - Real payments will be processed!' 
        : 'Test Mode - Safe to test payments'
    });

  } catch (error) {
    console.error('Error checking Stripe API mode:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      mode: 'error'
    }, { status: 500 });
  }
});