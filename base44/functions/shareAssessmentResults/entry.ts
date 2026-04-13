import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { insight_id, recipient_emails, sender_name } = await req.json();
  if (!insight_id || !recipient_emails?.length) {
    return Response.json({ error: 'insight_id and recipient_emails are required' }, { status: 400 });
  }

  const insights = await base44.entities.AssessmentInsights.filter({ assessment_id: insight_id });
  const insight = insights[0] || await base44.asServiceRole.entities.AssessmentInsights.get('AssessmentInsights', insight_id);

  if (!insight) return Response.json({ error: 'Insight not found' }, { status: 404 });

  const strengths = (insight.top_strengths || []).map(s => `<li style="margin-bottom:6px;">${s}</li>`).join('');
  const growthAreas = (insight.development_areas || []).map(d => `<li style="margin-bottom:6px;">${d}</li>`).join('');
  const topRec = insight.recommendations?.[0] || '';

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
      <div style="background: #0202ff; padding: 32px 40px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Leadership Assessment Results</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">${sender_name || user.full_name} has shared their results with you</p>
      </div>
      <div style="background: white; padding: 32px 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        ${insight.archetype ? `
        <div style="background: #f0f0ff; border-left: 4px solid #0202ff; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #0202ff; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Leadership Archetype</p>
          <p style="margin: 0; font-size: 22px; font-weight: 700; color: #1a1a2e;">${insight.archetype}</p>
        </div>` : ''}
        ${insight.summary ? `<p style="color: #4b5563; line-height: 1.7; margin-bottom: 24px;">${insight.summary}</p>` : ''}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          ${strengths ? `
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
            <p style="margin: 0 0 10px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Core Strengths</p>
            <ul style="margin: 0; padding-left: 16px; color: #374151; font-size: 14px;">${strengths}</ul>
          </div>` : ''}
          ${growthAreas ? `
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
            <p style="margin: 0 0 10px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Growth Areas</p>
            <ul style="margin: 0; padding-left: 16px; color: #374151; font-size: 14px;">${growthAreas}</ul>
          </div>` : ''}
        </div>
        ${topRec ? `
        <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 16px 20px; border-radius: 8px;">
          <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em;">⚡ Focus This Week</p>
          <p style="margin: 0; color: #1a1a2e; font-size: 14px; line-height: 1.6;">${topRec}</p>
        </div>` : ''}
        <p style="margin-top: 32px; font-size: 12px; color: #9ca3af; text-align: center;">Powered by Curiosity Led Leadership Platform</p>
      </div>
    </div>
  `;

  const results = [];
  for (const email of recipient_emails) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email.trim(),
      subject: `${sender_name || user.full_name}'s Leadership Assessment Results`,
      body: html,
    });
    results.push(email.trim());
  }

  return Response.json({ success: true, sent_to: results });
});