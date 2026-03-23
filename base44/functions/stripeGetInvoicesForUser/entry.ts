import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();

    if (!adminUser || adminUser.app_role !== 'Admin Level 3') {
      return Response.json({ error: 'Unauthorized - Super Admin only' }, { status: 401 });
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Get target user
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    if (!targetUser.stripe_customer_id) {
      return Response.json({ invoices: [] });
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: targetUser.stripe_customer_id,
      limit: 100
    });

    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      created: invoice.created,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      number: invoice.number,
      period_start: invoice.period_start,
      period_end: invoice.period_end
    }));

    return Response.json({ invoices: formattedInvoices });

  } catch (error) {
    console.error('Error fetching invoices for user:', error);
    return Response.json({ 
      error: error.message || 'Failed to fetch invoices',
      details: error.stack
    }, { status: 500 });
  }
});