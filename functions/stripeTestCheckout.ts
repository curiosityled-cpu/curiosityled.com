import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  const results = {
    timestamp: new Date().toISOString(),
    steps: []
  };

  try {
    // Step 1: Check authentication
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Not authenticated', results }, { status: 401 });
    }
    
    results.steps.push({
      step: 1,
      name: 'Authentication',
      status: 'PASS',
      message: `Authenticated as ${user.email}`
    });

    // Step 2: Parse request body
    let body;
    try {
      body = await req.json();
      results.steps.push({
        step: 2,
        name: 'Parse Request',
        status: 'PASS',
        message: 'Request body parsed',
        data: body
      });
    } catch (error) {
      results.steps.push({
        step: 2,
        name: 'Parse Request',
        status: 'FAIL',
        message: error.message
      });
      return Response.json({ error: 'Failed to parse request', results }, { status: 400 });
    }

    const { price_id, mode, user_id } = body;

    if (!price_id) {
      results.steps.push({
        step: 3,
        name: 'Validate Price ID',
        status: 'FAIL',
        message: 'price_id is required'
      });
      return Response.json({ error: 'price_id required', results }, { status: 400 });
    }

    results.steps.push({
      step: 3,
      name: 'Validate Price ID',
      status: 'PASS',
      message: `Price ID: ${price_id}`
    });

    // Step 4: Determine target user
    let targetUser = user;
    if (user_id && user.app_role === 'Admin Level 3') {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
        if (users.length === 0) {
          results.steps.push({
            step: 4,
            name: 'Get Target User',
            status: 'FAIL',
            message: 'Target user not found'
          });
          return Response.json({ error: 'User not found', results }, { status: 404 });
        }
        targetUser = users[0];
        results.steps.push({
          step: 4,
          name: 'Get Target User',
          status: 'PASS',
          message: `Target user: ${targetUser.email}`
        });
      } catch (error) {
        results.steps.push({
          step: 4,
          name: 'Get Target User',
          status: 'FAIL',
          message: error.message
        });
        return Response.json({ error: 'Failed to get user', results }, { status: 500 });
      }
    } else {
      results.steps.push({
        step: 4,
        name: 'Get Target User',
        status: 'PASS',
        message: 'Using current user'
      });
    }

    // Step 5: Check/Create Stripe Customer
    let customerId = targetUser.stripe_customer_id;
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: targetUser.email,
          name: targetUser.full_name || targetUser.email,
          metadata: {
            user_id: targetUser.id,
            app_role: targetUser.app_role
          }
        });
        customerId = customer.id;
        
        results.steps.push({
          step: 5,
          name: 'Create Stripe Customer',
          status: 'PASS',
          message: `Created customer: ${customerId}`
        });

        // Update user
        if (user.app_role === 'Admin Level 3' && user_id) {
          await base44.asServiceRole.entities.User.update(targetUser.id, {
            stripe_customer_id: customerId
          });
        } else {
          await base44.auth.updateMe({ stripe_customer_id: customerId });
        }
      } catch (error) {
        results.steps.push({
          step: 5,
          name: 'Create Stripe Customer',
          status: 'FAIL',
          message: error.message
        });
        return Response.json({ error: 'Failed to create customer', results }, { status: 500 });
      }
    } else {
      results.steps.push({
        step: 5,
        name: 'Check Stripe Customer',
        status: 'PASS',
        message: `Existing customer: ${customerId}`
      });
    }

    // Step 6: Retrieve Price Info
    let price;
    try {
      price = await stripe.prices.retrieve(price_id);
      results.steps.push({
        step: 6,
        name: 'Retrieve Price',
        status: 'PASS',
        message: `Price type: ${price.type}`,
        data: {
          id: price.id,
          type: price.type,
          amount: price.unit_amount,
          currency: price.currency
        }
      });
    } catch (error) {
      results.steps.push({
        step: 6,
        name: 'Retrieve Price',
        status: 'FAIL',
        message: error.message
      });
      return Response.json({ error: 'Invalid price_id', results }, { status: 400 });
    }

    // Step 7: Create Checkout Session
    const sessionMode = mode || (price.type === 'recurring' ? 'subscription' : 'payment');
    const origin = req.headers.get('origin') || 'https://curiosityled.base44.io';

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{
          price: price_id,
          quantity: 1,
        }],
        mode: sessionMode,
        success_url: `${origin}/Billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/Billing?canceled=true`,
        metadata: {
          user_id: targetUser.id,
          user_email: targetUser.email
        }
      });

      results.steps.push({
        step: 7,
        name: 'Create Checkout Session',
        status: 'PASS',
        message: 'Checkout session created',
        data: {
          session_id: session.id,
          url: session.url
        }
      });

      return Response.json({ 
        success: true,
        url: session.url,
        session_id: session.id,
        diagnostics: results
      });

    } catch (error) {
      results.steps.push({
        step: 7,
        name: 'Create Checkout Session',
        status: 'FAIL',
        message: error.message,
        details: error.stack
      });
      return Response.json({ error: 'Failed to create session', results }, { status: 500 });
    }

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      diagnostics: results
    }, { status: 500 });
  }
});