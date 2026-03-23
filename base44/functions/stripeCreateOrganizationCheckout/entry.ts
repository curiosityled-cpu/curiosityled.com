
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

    const { organization_id, price_id, mode } = await req.json();

    if (!organization_id || !price_id) {
      return Response.json({ 
        error: 'organization_id and price_id are required' 
      }, { status: 400 });
    }

    // Get organization
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    if (orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = orgs[0];

    // Ensure Stripe customer exists
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: org.billing_email || org.contact_email,
        phone: org.contact_phone,
        metadata: {
          organization_id: org.id,
          organization_slug: org.slug
        }
      });
      customerId = customer.id;
      
      await base44.asServiceRole.entities.Organization.update(org.id, {
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
      success_url: `${origin}/BusinessManager?success=true&session_id={CHECKOUT_SESSION_ID}&org_id=${org.id}`,
      cancel_url: `${origin}/BusinessManager?canceled=true&org_id=${org.id}`,
      metadata: {
        organization_id: org.id,
        organization_slug: org.slug,
        organization_name: org.name
      }
    });

    return Response.json({ 
      url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Error creating organization checkout:', error);
    return Response.json({ 
      error: error.message || 'Failed to create checkout session',
      details: error.stack
    }, { status: 500 });
  }
});
