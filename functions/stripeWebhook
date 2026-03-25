import Stripe from 'npm:stripe@14.11.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'No signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const base44 = createClientFromRequest(req);

    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(base44, event.data.object);
        break;

      case 'invoice.payment_failed':
        console.log('Invoice payment failed:', event.data.object.id);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(base44, event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(base44, event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(base44, event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function handleInvoicePaymentSucceeded(base44, invoice) {
  console.log('Invoice payment succeeded:', invoice.id);

  try {
    const clients = await base44.asServiceRole.entities.Client.filter({
      stripe_customer_id: invoice.customer
    });

    if (clients.length === 0) {
      console.log('No client found for customer:', invoice.customer);
      return;
    }

    const client = clients[0];

    if (!client.partner_id) {
      console.log('Client has no partner, skipping commission');
      return;
    }

    const partners = await base44.asServiceRole.entities.Partner.filter({
      id: client.partner_id
    });

    if (partners.length === 0) {
      console.log('Partner not found:', client.partner_id);
      return;
    }

    const partner = partners[0];
    const baseAmount = invoice.amount_paid;
    const commissionRate = partner.commission_rate || 0;
    const commissionAmount = Math.round((baseAmount * commissionRate) / 100);

    const periodStart = invoice.period_start 
      ? new Date(invoice.period_start * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    const periodEnd = invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    await base44.asServiceRole.entities.PartnerCommission.create({
      partner_id: partner.id,
      client_id: client.id,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: invoice.subscription || null,
      commission_amount: commissionAmount,
      commission_rate: commissionRate,
      base_amount: baseAmount,
      status: 'pending',
      period_start: periodStart,
      period_end: periodEnd,
      invoice_date: new Date(invoice.created * 1000).toISOString(),
      client_name: client.name,
      partner_name: partner.name
    });

    await base44.asServiceRole.entities.Partner.update(partner.id, {
      total_revenue_generated: (partner.total_revenue_generated || 0) + baseAmount,
      total_commissions_earned: (partner.total_commissions_earned || 0) + commissionAmount,
      total_commissions_pending: (partner.total_commissions_pending || 0) + commissionAmount
    });

    await base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
      to: partner.contact_email,
      subject: `New Commission Earned: $${(commissionAmount / 100).toFixed(2)}`,
      body: `
        <h2>New Commission Earned!</h2>
        <p>A commission has been generated for your partner account:</p>
        <ul>
          <li><strong>Client:</strong> ${client.name}</li>
          <li><strong>Amount:</strong> $${(commissionAmount / 100).toFixed(2)}</li>
          <li><strong>Rate:</strong> ${commissionRate}%</li>
          <li><strong>Invoice:</strong> ${invoice.id}</li>
          <li><strong>Status:</strong> Pending Approval</li>
        </ul>
        <p>This commission will be included in your next scheduled payout.</p>
      `,
      from_name: 'Curiosity Led - Partner Program'
    });

    console.log(`Commission created: $${(commissionAmount / 100).toFixed(2)} for ${partner.name}`);

  } catch (error) {
    console.error('Error processing commission:', error);
  }
}

async function handleSubscriptionUpdated(base44, subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const clients = await base44.asServiceRole.entities.Client.filter({
    stripe_subscription_id: subscription.id
  });

  if (clients.length > 0) {
    await base44.asServiceRole.entities.Client.update(clients[0].id, {
      status: subscription.status === 'active' ? 'active' : 'suspended'
    });
  }
}

async function handleSubscriptionDeleted(base44, subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const clients = await base44.asServiceRole.entities.Client.filter({
    stripe_subscription_id: subscription.id
  });

  if (clients.length > 0) {
    await base44.asServiceRole.entities.Client.update(clients[0].id, {
      status: 'cancelled'
    });
  }
}

async function handleChargeRefunded(base44, charge) {
  console.log('Charge refunded:', charge.id);

  try {
    const commissions = await base44.asServiceRole.entities.PartnerCommission.filter({
      stripe_invoice_id: charge.invoice
    });

    if (commissions.length === 0) {
      console.log('No commission found for refunded charge');
      return;
    }

    const commission = commissions[0];
    const refundAmount = charge.amount_refunded;
    const originalAmount = commission.base_amount;

    if (refundAmount === originalAmount) {
      await base44.asServiceRole.entities.PartnerCommission.update(commission.id, {
        status: 'cancelled',
        notes: `Full refund processed on ${new Date().toISOString()}`
      });

      const partners = await base44.asServiceRole.entities.Partner.filter({
        id: commission.partner_id
      });

      if (partners.length > 0) {
        const partner = partners[0];
        await base44.asServiceRole.entities.Partner.update(partner.id, {
          total_revenue_generated: Math.max(0, (partner.total_revenue_generated || 0) - originalAmount),
          total_commissions_earned: Math.max(0, (partner.total_commissions_earned || 0) - commission.commission_amount),
          total_commissions_pending: Math.max(0, (partner.total_commissions_pending || 0) - commission.commission_amount)
        });
      }
    } else {
      const refundCommissionAmount = Math.round((refundAmount * commission.commission_rate) / 100);
      
      await base44.asServiceRole.entities.PartnerCommission.create({
        partner_id: commission.partner_id,
        client_id: commission.client_id,
        stripe_invoice_id: charge.invoice,
        commission_amount: -refundCommissionAmount,
        commission_rate: commission.commission_rate,
        base_amount: -refundAmount,
        status: 'approved',
        notes: `Partial refund adjustment for ${charge.id}`,
        client_name: commission.client_name,
        partner_name: commission.partner_name
      });
    }

  } catch (error) {
    console.error('Error processing refund:', error);
  }
}