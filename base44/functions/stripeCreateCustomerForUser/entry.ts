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

    const { user_id } = await req.json();

    // If user_id is provided, must be Platform Admin
    if (user_id && user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin required' }, { status: 401 });
    }

    let targetUser = user;
    
    // Platform Admin can create customer for any user
    if (user_id && user.app_role === 'Platform Admin') {
      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      targetUser = users[0];
    }

    // Check if customer already exists
    if (targetUser.stripe_customer_id) {
      return Response.json({ 
        stripe_customer_id: targetUser.stripe_customer_id,
        message: 'Customer already exists'
      });
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: targetUser.email,
      name: targetUser.full_name || targetUser.email,
      metadata: {
        user_id: targetUser.id,
        app_role: targetUser.app_role
      }
    });

    // Update user with Stripe customer ID
    if (user_id && user.app_role === 'Platform Admin') {
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        stripe_customer_id: customer.id
      });
    } else {
      await base44.auth.updateMe({
        stripe_customer_id: customer.id
      });
    }

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