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

    // Check if customer already exists
    if (user.stripe_customer_id) {
      return Response.json({ 
        stripe_customer_id: user.stripe_customer_id,
        message: 'Customer already exists'
      });
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.full_name || user.email,
      metadata: {
        user_id: user.id,
        app_role: user.app_role
      }
    });

    // Update user with Stripe customer ID
    await base44.auth.updateMe({
      stripe_customer_id: customer.id
    });

    return Response.json({
      stripe_customer_id: customer.id,
      message: 'Customer created successfully'
    });

  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return Response.json({ 
      error: error.message || 'Failed to create customer' 
    }, { status: 500 });
  }
});