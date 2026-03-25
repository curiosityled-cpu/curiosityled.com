
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

    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Get organization
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    if (orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = orgs[0];

    // Check if customer already exists
    if (org.stripe_customer_id) {
      return Response.json({ 
        stripe_customer_id: org.stripe_customer_id,
        message: 'Customer already exists'
      });
    }

    // Create Stripe customer for organization
    const customer = await stripe.customers.create({
      name: org.name,
      email: org.billing_email || org.contact_email,
      phone: org.contact_phone,
      metadata: {
        organization_id: org.id,
        organization_slug: org.slug,
        company_size: org.company_size,
        industry: org.industry
      },
      address: org.address ? {
        line1: org.address.line1,
        line2: org.address.line2,
        city: org.address.city,
        state: org.address.state,
        postal_code: org.address.postal_code,
        country: org.address.country
      } : undefined
    });

    // Update organization with Stripe customer ID
    await base44.asServiceRole.entities.Organization.update(org.id, {
      stripe_customer_id: customer.id
    });

    return Response.json({
      stripe_customer_id: customer.id,
      message: 'Organization customer created successfully'
    });

  } catch (error) {
    console.error('Error creating organization customer:', error);
    return Response.json({ 
      error: error.message || 'Failed to create customer',
      details: error.stack
    }, { status: 500 });
  }
});
