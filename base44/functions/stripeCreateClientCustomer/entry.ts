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

    // Allow Platform Admin, Super Administrator, or Partner Business Administrator
    const isAuthorized = user.app_role === 'Platform Admin' || 
                        user.app_role === 'Super Administrator' || 
                        user.app_role === 'Partner Business Administrator';

    if (!isAuthorized) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { client_id } = await req.json();

    if (!client_id) {
      return Response.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Get client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
    if (clients.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = clients[0];

    // Check if customer already exists
    if (client.stripe_customer_id) {
      return Response.json({ 
        stripe_customer_id: client.stripe_customer_id,
        message: 'Customer already exists'
      });
    }

    // Create Stripe customer for client
    const customer = await stripe.customers.create({
      name: client.name,
      email: client.billing_email || client.contact_email,
      phone: client.contact_phone,
      metadata: {
        client_id: client.id,
        client_slug: client.slug,
        company_size: client.company_size,
        industry: client.industry
      },
      address: client.address ? {
        line1: client.address.line1,
        line2: client.address.line2,
        city: client.address.city,
        state: client.address.state,
        postal_code: client.address.postal_code,
        country: client.address.country
      } : undefined
    });

    // Update client with Stripe customer ID
    await base44.asServiceRole.entities.Client.update(client.id, {
      stripe_customer_id: customer.id
    });

    return Response.json({
      stripe_customer_id: customer.id,
      message: 'Client customer created successfully'
    });

  } catch (error) {
    console.error('Error creating client customer:', error);
    return Response.json({ 
      error: error.message || 'Failed to create customer',
      details: error.stack
    }, { status: 500 });
  }
});