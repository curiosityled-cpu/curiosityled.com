import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.stripe_customer_id) {
      return Response.json({ error: 'No Stripe customer found' }, { status: 400 });
    }

    // Security: Derive redirect base from server-side config (APP_URL env var).
    const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '') || 'https://curiosity-led.base44.app';

    // Create Stripe Customer Portal session for managing subscription
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${appUrl}/Billing`,
    });

    return Response.json({ url: session.url });

  } catch (error) {
    console.error('Error creating portal session:', error);
    return Response.json({ 
      error: error.message || 'Failed to create portal session' 
    }, { status: 500 });
  }
});