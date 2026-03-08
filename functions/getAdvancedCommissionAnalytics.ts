import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Advanced Commission Analytics
 * Provides detailed analytics for partners and admins
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      partnerId, 
      dateFrom, 
      dateTo,
      compareDateFrom,
      compareDateTo,
      groupBy = 'month', // 'month', 'quarter', 'year', 'client'
      metrics = ['earned', 'paid', 'pending']
    } = await req.json();

    // Determine if user is partner or admin
    const isAdmin = ['Platform Admin', 'Super Administrator'].includes(user.app_role);
    const isPartner = user.partner_id;

    // Set partnerId based on user role
    let targetPartnerId = partnerId;
    if (isPartner && !isAdmin) {
      targetPartnerId = user.partner_id; // Partners can only see their own data
    }

    // Get all commissions for the target partner(s)
    let query = {};
    if (targetPartnerId) {
      query.partner_id = targetPartnerId;
    }

    const allCommissions = await base44.asServiceRole.entities.PartnerCommission.filter(query);

    // Filter by date range
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;
    const compareFromDate = compareDateFrom ? new Date(compareDateFrom) : null;
    const compareToDate = compareDateTo ? new Date(compareDateTo) : null;

    const currentPeriod = allCommissions.filter(c => {
      const date = new Date(c.invoice_date || c.created_date);
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    });

    const comparisonPeriod = compareFromDate && compareToDate ? allCommissions.filter(c => {
      const date = new Date(c.invoice_date || c.created_date);
      return date >= compareFromDate && date <= compareToDate;
    }) : [];

    // Helper function to group data
    const groupData = (commissions, groupByField) => {
      const grouped = {};

      commissions.forEach(c => {
        const date = new Date(c.invoice_date || c.created_date);
        let key;

        if (groupByField === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else if (groupByField === 'quarter') {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
        } else if (groupByField === 'year') {
          key = `${date.getFullYear()}`;
        } else if (groupByField === 'client') {
          key = c.client_id || 'unknown';
        } else if (groupByField === 'partner') {
          key = c.partner_id || 'unknown';
        }

        if (!grouped[key]) {
          grouped[key] = {
            key,
            label: groupByField === 'client' ? c.client_name : 
                   groupByField === 'partner' ? c.partner_name : key,
            earned: 0,
            paid: 0,
            pending: 0,
            approved: 0,
            count: 0,
            client_name: c.client_name,
            partner_name: c.partner_name
          };
        }

        grouped[key].count++;
        grouped[key].earned += (c.commission_amount || 0);

        if (c.status === 'paid') {
          grouped[key].paid += (c.commission_amount || 0);
        } else if (c.status === 'pending') {
          grouped[key].pending += (c.commission_amount || 0);
        } else if (c.status === 'approved') {
          grouped[key].approved += (c.commission_amount || 0);
        }
      });

      return Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));
    };

    // Calculate metrics
    const calculateMetrics = (commissions) => {
      return {
        total_earned: commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0),
        total_paid: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
        total_pending: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
        total_approved: commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.commission_amount || 0), 0),
        count: commissions.length,
        avg_commission: commissions.length > 0 ? commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0) / commissions.length : 0
      };
    };

    const currentMetrics = calculateMetrics(currentPeriod);
    const comparisonMetrics = calculateMetrics(comparisonPeriod);

    // Calculate growth percentages
    const growth = {
      earned: comparisonMetrics.total_earned > 0 
        ? ((currentMetrics.total_earned - comparisonMetrics.total_earned) / comparisonMetrics.total_earned) * 100 
        : 0,
      paid: comparisonMetrics.total_paid > 0 
        ? ((currentMetrics.total_paid - comparisonMetrics.total_paid) / comparisonMetrics.total_paid) * 100 
        : 0,
      count: comparisonMetrics.count > 0 
        ? ((currentMetrics.count - comparisonMetrics.count) / comparisonMetrics.count) * 100 
        : 0
    };

    // Group data by specified field
    const grouped = groupData(currentPeriod, groupBy);
    const comparisonGrouped = groupData(comparisonPeriod, groupBy);

    // Get top performers
    const topClients = groupData(currentPeriod, 'client')
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 10);

    const topPartners = isAdmin ? groupData(currentPeriod, 'partner')
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 10) : [];

    // Calculate conversion rate (paid / earned)
    const conversionRate = currentMetrics.total_earned > 0 
      ? (currentMetrics.total_paid / currentMetrics.total_earned) * 100 
      : 0;

    // Calculate average time to payment
    const paidCommissions = currentPeriod.filter(c => c.status === 'paid' && c.payment_date && c.created_date);
    const avgDaysToPayment = paidCommissions.length > 0
      ? paidCommissions.reduce((sum, c) => {
          const created = new Date(c.created_date);
          const paid = new Date(c.payment_date);
          return sum + Math.floor((paid - created) / (1000 * 60 * 60 * 24));
        }, 0) / paidCommissions.length
      : 0;

    return Response.json({
      success: true,
      analytics: {
        current_period: {
          metrics: currentMetrics,
          grouped: grouped
        },
        comparison_period: {
          metrics: comparisonMetrics,
          grouped: comparisonGrouped
        },
        growth,
        insights: {
          conversion_rate: conversionRate,
          avg_days_to_payment: avgDaysToPayment,
          top_clients: topClients,
          top_partners: topPartners
        }
      },
      meta: {
        date_from: dateFrom,
        date_to: dateTo,
        compare_date_from: compareDateFrom,
        compare_date_to: compareDateTo,
        group_by: groupBy,
        partner_id: targetPartnerId
      }
    });

  } catch (error) {
    console.error('Error getting advanced analytics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});