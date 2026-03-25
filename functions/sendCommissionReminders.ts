import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Send Commission Reminder Notifications
 * Reminds platform admins about pending commission approvals
 * Reminds partners about upcoming payouts
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { type = 'approval_reminder' } = await req.json().catch(() => ({ type: 'approval_reminder' }));

    if (type === 'approval_reminder') {
      // Remind admins about pending approvals
      const pendingCommissions = await base44.asServiceRole.entities.PartnerCommission.filter({
        status: 'pending'
      });

      if (pendingCommissions.length === 0) {
        return Response.json({ 
          success: true, 
          message: 'No pending commissions' 
        });
      }

      // Group by partner
      const byPartner = {};
      pendingCommissions.forEach(c => {
        if (!byPartner[c.partner_name]) {
          byPartner[c.partner_name] = { count: 0, total: 0 };
        }
        byPartner[c.partner_name].count++;
        byPartner[c.partner_name].total += c.commission_amount;
      });

      const totalAmount = pendingCommissions.reduce((sum, c) => sum + c.commission_amount, 0);

      await base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
        to: 'admin@curiosityledplatform.com', // Replace with actual admin email
        subject: `⏰ ${pendingCommissions.length} Commission Approvals Pending`,
        body: `
          <h2>Commission Approval Reminder</h2>
          <p>You have <strong>${pendingCommissions.length} commission(s)</strong> awaiting approval:</p>
          
          <h3>Total Pending: $${(totalAmount / 100).toFixed(2)}</h3>
          
          <h4>By Partner:</h4>
          <ul>
            ${Object.entries(byPartner).map(([name, data]) => `
              <li>
                <strong>${name}</strong>: 
                ${data.count} commission(s) · 
                $${(data.total / 100).toFixed(2)}
              </li>
            `).join('')}
          </ul>
          
          <p>
            <a href="https://yourapp.com/business-manager?tab=commissions" 
               style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
              Review Commissions
            </a>
          </p>
        `,
        from_name: 'Curiosity Led - Commission Reminders'
      });

      return Response.json({
        success: true,
        message: `Sent approval reminder for ${pendingCommissions.length} commissions`
      });

    } else if (type === 'payout_notification') {
      // Notify partners about upcoming scheduled payouts
      const partners = await base44.asServiceRole.entities.Partner.filter({
        status: 'active',
        auto_payout_enabled: true
      });

      const notifications = [];

      for (const partner of partners) {
        const approvedCommissions = await base44.asServiceRole.entities.PartnerCommission.filter({
          partner_id: partner.id,
          status: 'approved'
        });

        if (approvedCommissions.length === 0) continue;

        const totalPayout = approvedCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
        const threshold = partner.minimum_payout_threshold || 0;

        if (totalPayout < threshold) continue;

        // Send notification
        await base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
          to: partner.contact_email,
          subject: `Upcoming Commission Payout: $${(totalPayout / 100).toFixed(2)}`,
          body: `
            <h2>Upcoming Commission Payout</h2>
            <p>Hi ${partner.contact_name || 'there'},</p>
            
            <p>Your next commission payout is scheduled based on your <strong>${partner.payout_schedule}</strong> schedule:</p>
            
            <div style="background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <h3 style="margin: 0 0 8px 0; color: #065f46;">Payout Summary</h3>
              <p style="margin: 4px 0;"><strong>Amount:</strong> $${(totalPayout / 100).toFixed(2)}</p>
              <p style="margin: 4px 0;"><strong>Commissions:</strong> ${approvedCommissions.length}</p>
              <p style="margin: 4px 0;"><strong>Schedule:</strong> ${partner.payout_schedule}</p>
            </div>
            
            <p>The payout will be processed automatically on your next scheduled date.</p>
            
            <p>
              <a href="https://yourapp.com/partner-portal?tab=commissions" 
                 style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
                View Commission Details
              </a>
            </p>
            
            <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
              Thank you for your continued partnership!
            </p>
          `,
          from_name: 'Curiosity Led - Partner Program'
        });

        notifications.push({
          partner_name: partner.name,
          amount: totalPayout,
          commissions_count: approvedCommissions.length
        });
      }

      return Response.json({
        success: true,
        message: `Sent payout notifications to ${notifications.length} partners`,
        notifications
      });
    }

    return Response.json({ error: 'Invalid reminder type' }, { status: 400 });

  } catch (error) {
    console.error('Error sending reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});