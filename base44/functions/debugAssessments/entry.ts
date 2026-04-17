import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Try reading a specific record by ID
    const specificId = '69e18eb72067a9f3b9ab4180';
    const byFilter = await base44.asServiceRole.entities.Assessment.filter({ id: specificId });
    console.log('By id filter:', byFilter.length);

    // Try reading insights by ID
    const insightId = '69e18d3522f35ecbe20148cc';
    const insightFilter = await base44.asServiceRole.entities.AssessmentInsights.filter({ id: insightId });
    console.log('Insight by id:', insightFilter.length, insightFilter[0]?.user_email, insightFilter[0]?.status);

    // Try reading insight by user_email directly
    const byEmail = await base44.asServiceRole.entities.AssessmentInsights.filter({ user_email: 'eosoria@curiosityled.com' });
    console.log('Insight by email:', byEmail.length);

    return Response.json({
      assessment_by_id: byFilter,
      insight_by_id: insightFilter,
      insight_by_email: byEmail,
    });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});