import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Generate Commission Report
 * Creates customized reports with various formats and filters
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      reportType, // 'partner_performance', 'liability_analysis', 'payout_trends', 'client_analysis'
      partnerId,
      dateFrom,
      dateTo,
      format = 'json', // 'json' or 'csv'
      includeDetails = false
    } = await req.json();

    const isAdmin = ['Platform Admin', 'Super Administrator'].includes(user.app_role);
    
    if (!isAdmin && reportType !== 'partner_performance') {
      return Response.json({ error: 'Admin access required for this report' }, { status: 403 });
    }

    // Get commissions based on filters
    let query = {};
    if (partnerId) {
      query.partner_id = partnerId;
    } else if (user.partner_id && !isAdmin) {
      query.partner_id = user.partner_id;
    }

    const allCommissions = await base44.asServiceRole.entities.PartnerCommission.filter(query);

    // Filter by date
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    const filteredCommissions = allCommissions.filter(c => {
      const date = new Date(c.invoice_date || c.created_date);
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    });

    let reportData = {};

    // Generate report based on type
    if (reportType === 'partner_performance') {
      reportData = generatePartnerPerformanceReport(filteredCommissions, includeDetails);
    } else if (reportType === 'liability_analysis') {
      reportData = generateLiabilityAnalysisReport(filteredCommissions, includeDetails);
    } else if (reportType === 'payout_trends') {
      reportData = generatePayoutTrendsReport(filteredCommissions, includeDetails);
    } else if (reportType === 'client_analysis') {
      reportData = generateClientAnalysisReport(filteredCommissions, includeDetails);
    } else {
      return Response.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Format output
    if (format === 'csv') {
      const csv = convertToCSV(reportData, reportType);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return Response.json({
      success: true,
      report: reportData,
      meta: {
        report_type: reportType,
        date_from: dateFrom,
        date_to: dateTo,
        generated_at: new Date().toISOString(),
        total_commissions: filteredCommissions.length
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generatePartnerPerformanceReport(commissions, includeDetails) {
  const byPartner = {};

  commissions.forEach(c => {
    if (!byPartner[c.partner_id]) {
      byPartner[c.partner_id] = {
        partner_id: c.partner_id,
        partner_name: c.partner_name,
        total_earned: 0,
        total_paid: 0,
        total_pending: 0,
        total_approved: 0,
        commission_count: 0,
        client_count: new Set(),
        avg_commission: 0,
        commissions: []
      };
    }

    byPartner[c.partner_id].total_earned += (c.commission_amount || 0);
    byPartner[c.partner_id].commission_count++;
    byPartner[c.partner_id].client_count.add(c.client_id);

    if (c.status === 'paid') {
      byPartner[c.partner_id].total_paid += (c.commission_amount || 0);
    } else if (c.status === 'pending') {
      byPartner[c.partner_id].total_pending += (c.commission_amount || 0);
    } else if (c.status === 'approved') {
      byPartner[c.partner_id].total_approved += (c.commission_amount || 0);
    }

    if (includeDetails) {
      byPartner[c.partner_id].commissions.push({
        date: c.invoice_date || c.created_date,
        client: c.client_name,
        amount: c.commission_amount,
        status: c.status
      });
    }
  });

  // Convert Set to count and calculate averages
  Object.values(byPartner).forEach(p => {
    p.client_count = p.client_count.size;
    p.avg_commission = p.commission_count > 0 ? p.total_earned / p.commission_count : 0;
    p.conversion_rate = p.total_earned > 0 ? (p.total_paid / p.total_earned) * 100 : 0;
  });

  return {
    partners: Object.values(byPartner).sort((a, b) => b.total_earned - a.total_earned),
    summary: {
      total_partners: Object.keys(byPartner).length,
      total_earned: Object.values(byPartner).reduce((sum, p) => sum + p.total_earned, 0),
      total_paid: Object.values(byPartner).reduce((sum, p) => sum + p.total_paid, 0),
      total_pending: Object.values(byPartner).reduce((sum, p) => sum + p.total_pending, 0)
    }
  };
}

function generateLiabilityAnalysisReport(commissions, includeDetails) {
  const byMonth = {};

  commissions.forEach(c => {
    const date = new Date(c.invoice_date || c.created_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!byMonth[monthKey]) {
      byMonth[monthKey] = {
        month: monthKey,
        opening_liability: 0,
        new_commissions: 0,
        payments_made: 0,
        closing_liability: 0,
        pending_count: 0,
        approved_count: 0
      };
    }

    byMonth[monthKey].new_commissions += (c.commission_amount || 0);

    if (c.status === 'paid' && c.payment_date) {
      const paymentDate = new Date(c.payment_date);
      const paymentMonthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!byMonth[paymentMonthKey]) {
        byMonth[paymentMonthKey] = {
          month: paymentMonthKey,
          opening_liability: 0,
          new_commissions: 0,
          payments_made: 0,
          closing_liability: 0,
          pending_count: 0,
          approved_count: 0
        };
      }
      
      byMonth[paymentMonthKey].payments_made += (c.commission_amount || 0);
    }

    if (c.status === 'pending') byMonth[monthKey].pending_count++;
    if (c.status === 'approved') byMonth[monthKey].approved_count++;
  });

  // Calculate running liability
  const sorted = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  let runningLiability = 0;

  sorted.forEach(month => {
    month.opening_liability = runningLiability;
    runningLiability += month.new_commissions - month.payments_made;
    month.closing_liability = runningLiability;
  });

  return {
    monthly_liability: sorted,
    current_liability: runningLiability,
    summary: {
      total_new: sorted.reduce((sum, m) => sum + m.new_commissions, 0),
      total_paid: sorted.reduce((sum, m) => sum + m.payments_made, 0),
      net_change: sorted.reduce((sum, m) => sum + (m.new_commissions - m.payments_made), 0)
    }
  };
}

function generatePayoutTrendsReport(commissions, includeDetails) {
  const paidCommissions = commissions.filter(c => c.status === 'paid' && c.payment_date);

  const byMonth = {};
  const byPartner = {};

  paidCommissions.forEach(c => {
    const date = new Date(c.payment_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // By month
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = {
        month: monthKey,
        total_paid: 0,
        payout_count: 0,
        partner_count: new Set(),
        avg_payout: 0
      };
    }

    byMonth[monthKey].total_paid += (c.commission_amount || 0);
    byMonth[monthKey].payout_count++;
    byMonth[monthKey].partner_count.add(c.partner_id);

    // By partner
    if (!byPartner[c.partner_id]) {
      byPartner[c.partner_id] = {
        partner_name: c.partner_name,
        total_paid: 0,
        payout_count: 0,
        last_payout_date: null
      };
    }

    byPartner[c.partner_id].total_paid += (c.commission_amount || 0);
    byPartner[c.partner_id].payout_count++;
    
    if (!byPartner[c.partner_id].last_payout_date || 
        new Date(c.payment_date) > new Date(byPartner[c.partner_id].last_payout_date)) {
      byPartner[c.partner_id].last_payout_date = c.payment_date;
    }
  });

  // Convert Set to count and calculate averages
  Object.values(byMonth).forEach(m => {
    m.partner_count = m.partner_count.size;
    m.avg_payout = m.payout_count > 0 ? m.total_paid / m.payout_count : 0;
  });

  return {
    monthly_payouts: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
    partner_payouts: Object.values(byPartner).sort((a, b) => b.total_paid - a.total_paid),
    summary: {
      total_paid: paidCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0),
      total_payouts: paidCommissions.length,
      unique_partners: new Set(paidCommissions.map(c => c.partner_id)).size
    }
  };
}

function generateClientAnalysisReport(commissions, includeDetails) {
  const byClient = {};

  commissions.forEach(c => {
    if (!byClient[c.client_id]) {
      byClient[c.client_id] = {
        client_id: c.client_id,
        client_name: c.client_name,
        partner_name: c.partner_name,
        total_commissions: 0,
        commission_count: 0,
        avg_commission: 0,
        commissions: []
      };
    }

    byClient[c.client_id].total_commissions += (c.commission_amount || 0);
    byClient[c.client_id].commission_count++;

    if (includeDetails) {
      byClient[c.client_id].commissions.push({
        date: c.invoice_date || c.created_date,
        amount: c.commission_amount,
        status: c.status
      });
    }
  });

  // Calculate averages
  Object.values(byClient).forEach(client => {
    client.avg_commission = client.commission_count > 0 
      ? client.total_commissions / client.commission_count 
      : 0;
  });

  return {
    clients: Object.values(byClient).sort((a, b) => b.total_commissions - a.total_commissions),
    summary: {
      total_clients: Object.keys(byClient).length,
      total_commissions: Object.values(byClient).reduce((sum, c) => sum + c.total_commissions, 0),
      avg_per_client: Object.keys(byClient).length > 0 
        ? Object.values(byClient).reduce((sum, c) => sum + c.total_commissions, 0) / Object.keys(byClient).length 
        : 0
    }
  };
}

function convertToCSV(reportData, reportType) {
  let rows = [];

  if (reportType === 'partner_performance') {
    rows.push(['Partner Name', 'Total Earned', 'Total Paid', 'Pending', 'Approved', 'Commission Count', 'Client Count', 'Avg Commission', 'Conversion Rate']);
    reportData.partners.forEach(p => {
      rows.push([
        p.partner_name,
        (p.total_earned / 100).toFixed(2),
        (p.total_paid / 100).toFixed(2),
        (p.total_pending / 100).toFixed(2),
        (p.total_approved / 100).toFixed(2),
        p.commission_count,
        p.client_count,
        (p.avg_commission / 100).toFixed(2),
        p.conversion_rate.toFixed(2) + '%'
      ]);
    });
  } else if (reportType === 'liability_analysis') {
    rows.push(['Month', 'Opening Liability', 'New Commissions', 'Payments Made', 'Closing Liability', 'Pending Count', 'Approved Count']);
    reportData.monthly_liability.forEach(m => {
      rows.push([
        m.month,
        (m.opening_liability / 100).toFixed(2),
        (m.new_commissions / 100).toFixed(2),
        (m.payments_made / 100).toFixed(2),
        (m.closing_liability / 100).toFixed(2),
        m.pending_count,
        m.approved_count
      ]);
    });
  } else if (reportType === 'payout_trends') {
    rows.push(['Month', 'Total Paid', 'Payout Count', 'Partner Count', 'Avg Payout']);
    reportData.monthly_payouts.forEach(m => {
      rows.push([
        m.month,
        (m.total_paid / 100).toFixed(2),
        m.payout_count,
        m.partner_count,
        (m.avg_payout / 100).toFixed(2)
      ]);
    });
  } else if (reportType === 'client_analysis') {
    rows.push(['Client Name', 'Partner', 'Total Commissions', 'Commission Count', 'Avg Commission']);
    reportData.clients.forEach(c => {
      rows.push([
        c.client_name,
        c.partner_name,
        (c.total_commissions / 100).toFixed(2),
        c.commission_count,
        (c.avg_commission / 100).toFixed(2)
      ]);
    });
  }

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}