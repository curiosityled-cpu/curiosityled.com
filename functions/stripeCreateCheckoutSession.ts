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

    const { price_id, mode, user_id, client_id } = await req.json();

    if (!price_id) {
      return Response.json({ error: 'price_id is required' }, { status: 400 });
    }

    // Determine if this is for a client or a user
    let customerId;
    let targetEmail;
    let targetName;
    let metadata = {};

    if (client_id) {
      // Client-level subscription (for Super Admin, Platform Admin, Partner Business Admin)
      const isAuthorized = user.app_role === 'Platform Admin' || 
                          user.app_role === 'Super Administrator' || 
                          user.app_role === 'Partner Business Administrator';

      if (!isAuthorized) {
        return Response.json({ error: 'Unauthorized - Admin access required for client subscriptions' }, { status: 401 });
      }

      const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
      if (clients.length === 0) {
        return Response.json({ error: 'Client not found' }, { status: 404 });
      }

      const client = clients[0];
      customerId = client.stripe_customer_id;
      targetEmail = client.billing_email || client.contact_email;
      targetName = client.name;
      metadata = {
        client_id: client.id,
        client_name: client.name
      };

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: client.name,
          email: targetEmail,
          phone: client.contact_phone,
          metadata: {
            client_id: client.id,
            client_slug: client.slug
          }
        });
        customerId = customer.id;
        await base44.asServiceRole.entities.Client.update(client.id, {
          stripe_customer_id: customerId
        });
      }
    } else if (user_id) {
      // User-level subscription (for Platform Admin managing individual users)
      if (user.app_role !== 'Platform Admin') {
        return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 401 });
      }

      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const targetUser = users[0];
      customerId = targetUser.stripe_customer_id;
      targetEmail = targetUser.email;
      targetName = targetUser.full_name;
      metadata = {
        user_id: targetUser.id,
        user_email: targetUser.email
      };

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: targetUser.email,
          name: targetUser.full_name || targetUser.email,
          metadata: {
            user_id: targetUser.id
          }
        });
        customerId = customer.id;
        await base44.asServiceRole.entities.User.update(targetUser.id, {
          stripe_customer_id: customerId
        });
      }
    } else {
      // Current user subscription
      customerId = user.stripe_customer_id;
      targetEmail = user.email;
      targetName = user.full_name;
      metadata = {
        user_id: user.id,
        user_email: user.email
      };

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.full_name || user.email,
          metadata: {
            user_id: user.id
          }
        });
        customerId = customer.id;
        await base44.auth.updateMe({ stripe_customer_id: customerId });
      }
    }

    // Determine mode based on price type if not provided
    const price = await stripe.prices.retrieve(price_id);
    const sessionMode = mode || (price.type === 'recurring' ? 'subscription' : 'payment');

    // Get the origin for redirect URLs
    const origin = req.headers.get('origin') || 'https://curiosityled.base44.io';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: sessionMode,
      success_url: `${origin}/Billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Billing?canceled=true`,
      metadata: metadata
    });

    return Response.json({ 
      url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return Response.json({ 
      error: error.message || 'Failed to create checkout session',
      details: error.stack
    }, { status: 500 });
  }
});