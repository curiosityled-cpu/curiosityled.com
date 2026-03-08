import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['Platform Admin', 'Super Administrator'].includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { partnerId, commissionIds, paymentMethod = 'manual' } = await req.json();

    if (!partnerId || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return Response.json({ error: 'Partner ID and commission IDs required' }, { status: 400 });
    }

    // Get partner details
    const partners = await base44.asServiceRole.entities.Partner.filter({ id: partnerId });
    if (partners.length === 0) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const partner = partners[0];

    // Get commissions
    const commissions = await base44.asServiceRole.entities.PartnerCommission.filter({
      partner_id: partnerId
    });

    const commissionsToProcess = commissions.filter(c => commissionIds.includes(c.id));

    if (commissionsToProcess.length === 0) {
      return Response.json({ error: 'No valid commissions found' }, { status: 400 });
    }

    // Calculate total payout
    const totalPayout = commissionsToProcess.reduce((sum, c) => sum + c.commission_amount, 0);

    // Check minimum threshold
    if (totalPayout < (partner.minimum_payout_threshold || 0)) {
      return Response.json({ 
        error: `Payout amount ($${(totalPayout / 100).toFixed(2)}) is below minimum threshold ($${((partner.minimum_payout_threshold || 0) / 100).toFixed(2)})` 
      }, { status: 400 });
    }

    const results = {
      successful: [],
      failed: [],
      totalPaid: 0
    };

    // Process each commission
    for (const commission of commissionsToProcess) {
      try {
        if (commission.status !== 'approved') {
          results.failed.push({ id: commission.id, error: 'Not approved' });
          continue;
        }

        // Update commission status
        await base44.asServiceRole.entities.PartnerCommission.update(commission.id, {
          status: 'paid',
          payment_date: new Date().toISOString(),
          notes: `${commission.notes || ''}\nPaid via ${paymentMethod} on ${new Date().toISOString()}`
        });

        results.successful.push(commission.id);
        results.totalPaid += commission.commission_amount;

      } catch (error) {
        results.failed.push({ id: commission.id, error: error.message });
      }
    }

    // Update partner totals
    if (results.successful.length > 0) {
      await base44.asServiceRole.entities.Partner.update(partnerId, {
        total_commissions_paid: (partner.total_commissions_paid || 0) + results.totalPaid,
        total_commissions_pending: Math.max(0, (partner.total_commissions_pending || 0) - results.totalPaid),
        last_payout_date: new Date().toISOString()
      });

      // Send payment confirmation email
      await base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
        to: partner.contact_email,
        subject: `Commission Payment Processed: $${(results.totalPaid / 100).toFixed(2)}`,
        body: `
          <h2>Commission Payment Processed</h2>
          <p>We've processed a commission payment for your partner account:</p>
          <ul>
            <li><strong>Amount Paid:</strong> $${(results.totalPaid / 100).toFixed(2)}</li>
            <li><strong>Number of Commissions:</strong> ${results.successful.length}</li>
            <li><strong>Payment Method:</strong> ${paymentMethod}</li>
            <li><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>Thank you for your continued partnership!</p>
        `,
        from_name: 'Curiosity Led - Partner Program'
      });
    }

    return Response.json({
      success: true,
      results,
      totalPaid: results.totalPaid,
      message: `Successfully processed ${results.successful.length} commissions totaling $${(results.totalPaid / 100).toFixed(2)}`
    });

  } catch (error) {
    console.error('Error processing payouts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});