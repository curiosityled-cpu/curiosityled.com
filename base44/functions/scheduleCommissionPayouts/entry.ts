import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Automated Commission Payout Scheduler
 * Run this function on a schedule (e.g., monthly via cron job)
 * to automatically process commission payouts based on partner settings
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This should be called by a scheduled task, not requiring user auth
    // For manual testing, allow platform admins
    try {
      const user = await base44.auth.me();
      if (user && !['Platform Admin', 'Super Administrator'].includes(user.app_role)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch {
      // No user session - this is a scheduled task, continue
    }

    const { dryRun = false } = await req.json().catch(() => ({ dryRun: false }));

    // Get all active partners with their payout settings
    const partners = await base44.asServiceRole.entities.Partner.filter({
      status: 'active'
    });

    const results = {
      processed: [],
      skipped: [],
      errors: []
    };

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    for (const partner of partners) {
      try {
        // Check if partner has auto-payout enabled
        if (!partner.auto_payout_enabled) {
          results.skipped.push({
            partner_id: partner.id,
            partner_name: partner.name,
            reason: 'Auto-payout not enabled'
          });
          continue;
        }

        // Check payout schedule
        const schedule = partner.payout_schedule || 'monthly';
        let shouldProcess = false;

        if (schedule === 'monthly') {
          // Process on the 1st of each month
          shouldProcess = today.getDate() === 1;
        } else if (schedule === 'quarterly') {
          // Process on the 1st of Jan, Apr, Jul, Oct
          shouldProcess = today.getDate() === 1 && currentMonth % 3 === 0;
        }

        if (!shouldProcess && !dryRun) {
          results.skipped.push({
            partner_id: partner.id,
            partner_name: partner.name,
            reason: 'Not scheduled for today'
          });
          continue;
        }

        // Get approved commissions for this partner
        const approvedCommissions = await base44.asServiceRole.entities.PartnerCommission.filter({
          partner_id: partner.id,
          status: 'approved'
        });

        if (approvedCommissions.length === 0) {
          results.skipped.push({
            partner_id: partner.id,
            partner_name: partner.name,
            reason: 'No approved commissions'
          });
          continue;
        }

        // Calculate total payout
        const totalPayout = approvedCommissions.reduce((sum, c) => sum + c.commission_amount, 0);

        // Check minimum threshold
        const threshold = partner.minimum_payout_threshold || 0;
        if (totalPayout < threshold) {
          results.skipped.push({
            partner_id: partner.id,
            partner_name: partner.name,
            reason: `Below threshold ($${(totalPayout / 100).toFixed(2)} < $${(threshold / 100).toFixed(2)})`
          });
          continue;
        }

        // If dry run, just report what would happen
        if (dryRun) {
          results.processed.push({
            partner_id: partner.id,
            partner_name: partner.name,
            amount: totalPayout,
            commissions_count: approvedCommissions.length,
            dry_run: true
          });
          continue;
        }

        // Process the payout
        const payoutResponse = await base44.asServiceRole.functions.invoke('processCommissionPayouts', {
          partnerId: partner.id,
          commissionIds: approvedCommissions.map(c => c.id),
          paymentMethod: partner.stripe_connected_account_id ? 'stripe_connect' : 'manual'
        });

        if (payoutResponse.success) {
          results.processed.push({
            partner_id: partner.id,
            partner_name: partner.name,
            amount: totalPayout,
            commissions_count: approvedCommissions.length,
            payment_method: partner.stripe_connected_account_id ? 'stripe_connect' : 'manual'
          });
        } else {
          results.errors.push({
            partner_id: partner.id,
            partner_name: partner.name,
            error: payoutResponse.error || 'Unknown error'
          });
        }

      } catch (error) {
        results.errors.push({
          partner_id: partner.id,
          partner_name: partner.name,
          error: error.message
        });
      }
    }

    // Send summary email to platform admin
    if (results.processed.length > 0 || results.errors.length > 0) {
      const totalProcessed = results.processed.reduce((sum, p) => sum + p.amount, 0);
      
      await base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
        to: 'admin@curiosityledplatform.com', // Replace with actual admin email
        subject: `Commission Payout Summary - ${format(today, 'MMM d, yyyy')}`,
        body: `
          <h2>Automated Commission Payout Summary</h2>
          <h3>Processed Payouts: ${results.processed.length}</h3>
          <ul>
            ${results.processed.map(p => `
              <li>
                <strong>${p.partner_name}</strong>: 
                $${(p.amount / 100).toFixed(2)} 
                (${p.commissions_count} commissions)
                ${p.dry_run ? ' - DRY RUN' : ''}
              </li>
            `).join('')}
          </ul>
          <p><strong>Total Paid:</strong> $${(totalProcessed / 100).toFixed(2)}</p>

          ${results.skipped.length > 0 ? `
            <h3>Skipped: ${results.skipped.length}</h3>
            <ul>
              ${results.skipped.map(s => `
                <li>${s.partner_name}: ${s.reason}</li>
              `).join('')}
            </ul>
          ` : ''}

          ${results.errors.length > 0 ? `
            <h3>Errors: ${results.errors.length}</h3>
            <ul>
              ${results.errors.map(e => `
                <li><strong>${e.partner_name}</strong>: ${e.error}</li>
              `).join('')}
            </ul>
          ` : ''}
        `,
        from_name: 'Curiosity Led - Automated Payouts'
      });
    }

    return Response.json({
      success: true,
      summary: {
        processed: results.processed.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
        total_amount: results.processed.reduce((sum, p) => sum + p.amount, 0)
      },
      details: results,
      dry_run: dryRun
    });

  } catch (error) {
    console.error('Error in scheduled payouts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function format(date, formatStr) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}