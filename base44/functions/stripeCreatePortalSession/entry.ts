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

    // Create Stripe Customer Portal session for managing subscription
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${req.headers.get('origin') || 'https://curiosityled.base44.io'}/Billing`,
    });

    return Response.json({ url: session.url });

  } catch (error) {
    console.error('Error creating portal session:', error);
    return Response.json({ 
      error: error.message || 'Failed to create portal session' 
    }, { status: 500 });
  }
});