import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 401 });
    }

    const { client_id, price_id, mode } = await req.json();

    if (!client_id || !price_id) {
      return Response.json({ 
        error: 'client_id and price_id are required' 
      }, { status: 400 });
    }

    // Get client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
    if (clients.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = clients[0];

    // Ensure Stripe customer exists
    let customerId = client.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: client.name,
        email: client.billing_email || client.contact_email,
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

    // Get price details
    const price = await stripe.prices.retrieve(price_id);
    const sessionMode = mode || (price.type === 'recurring' ? 'subscription' : 'payment');

    // Get origin for redirect URLs
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
      success_url: `${origin}/BusinessManager?success=true&session_id={CHECKOUT_SESSION_ID}&client_id=${client.id}`,
      cancel_url: `${origin}/BusinessManager?canceled=true&client_id=${client.id}`,
      metadata: {
        client_id: client.id,
        client_slug: client.slug,
        client_name: client.name
      }
    });

    return Response.json({ 
      url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Error creating client checkout:', error);
    return Response.json({ 
      error: error.message || 'Failed to create checkout session',
      details: error.stack
    }, { status: 500 });
  }
});