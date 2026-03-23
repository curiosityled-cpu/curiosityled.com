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
      return Response.json({ error: 'No active subscription to cancel' }, { status: 400 });
    }

    // Cancel subscription at period end (so user retains access until then)
    const subscription = await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    // Update user record
    await base44.auth.updateMe({
      subscription_status: 'canceled'
    });

    return Response.json({ 
      message: 'Subscription will be canceled at the end of the billing period',
      subscription: {
        id: subscription.id,
        cancel_at: subscription.current_period_end,
        access_until: new Date(subscription.current_period_end * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    return Response.json({ 
      error: error.message || 'Failed to cancel subscription' 
    }, { status: 500 });
  }
});