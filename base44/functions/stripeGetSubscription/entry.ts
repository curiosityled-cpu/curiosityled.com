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

    if (!user.stripe_subscription_id) {
      return Response.json({ 
        subscription: null,
        message: 'No active subscription'
      });
    }

    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id, {
      expand: ['default_payment_method', 'items.data.price.product']
    });

    return Response.json({ 
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at,
        plan: subscription.items.data[0]?.price,
        product: subscription.items.data[0]?.price?.product,
        payment_method: subscription.default_payment_method
      }
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return Response.json({ 
      error: error.message || 'Failed to fetch subscription',
      details: error.stack
    }, { status: 500 });
  }
});