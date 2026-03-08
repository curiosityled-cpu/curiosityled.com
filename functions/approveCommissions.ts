import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['Platform Admin', 'Super Administrator'].includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commissionIds } = await req.json();

    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return Response.json({ error: 'No commission IDs provided' }, { status: 400 });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const commissionId of commissionIds) {
      try {
        const commissions = await base44.asServiceRole.entities.PartnerCommission.filter({
          id: commissionId
        });

        if (commissions.length === 0) {
          results.failed.push({ id: commissionId, error: 'Commission not found' });
          continue;
        }

        const commission = commissions[0];

        if (commission.status !== 'pending') {
          results.failed.push({ id: commissionId, error: `Already ${commission.status}` });
          continue;
        }

        await base44.asServiceRole.entities.PartnerCommission.update(commissionId, {
          status: 'approved',
          approved_by: user.email,
          approved_date: new Date().toISOString()
        });

        results.successful.push(commissionId);

      } catch (error) {
        results.failed.push({ id: commissionId, error: error.message });
      }
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error approving commissions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});