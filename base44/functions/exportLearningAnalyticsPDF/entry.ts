import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { buildReportContext, drawReportHeader, drawReportFooter, drawSectionHeading } from '../../shared/reportContext.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['Platform Admin', 'Super Administrator'].includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { analytics, filters } = await req.json();

    const doc = new jsPDF();

    const context = buildReportContext({
      title: 'Learning Analytics Report',
      reportType: 'Learning analytics',
      view: 'Learning',
      subject: 'Resources, assignments and completions in scope for this client',
      timeframe: filters?.timeRange ? `Last ${filters.timeRange}` : '',
      preparedBy: user.full_name || user.email,
      note: 'Assignment and completion figures rest on the resources and assignments active in the timeframe above.',
    });

    let y = drawReportHeader(doc, context, { margin: 20 });
    y = drawSectionHeading(doc, 'Summary metrics', y, { margin: 20 });
    
    doc.setFontSize(10);
    doc.text(`Total Resources: ${analytics.totalResources}`, 20, y);
    y += 7;
    doc.text(`Active Resources: ${analytics.activeResources}`, 20, y);
    y += 7;
    doc.text(`Total Assignments: ${analytics.totalAssignments}`, 20, y);
    y += 7;
    doc.text(`Completion Rate: ${analytics.completionRate}%`, 20, y);
    y += 7;
    doc.text(`Avg Time to Complete: ${analytics.avgTimeToComplete} days`, 20, y);
    y += 15;

    doc.setFontSize(14);
    doc.text('Top Resources', 20, y);
    y += 10;

    doc.setFontSize(8);
    analytics.topResources.slice(0, 20).forEach(r => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${r.title} - ${r.assignmentCount} assignments - ${r.completionRate}% completion`, 20, y);
      y += 5;
    });

    drawReportFooter(doc, context, { margin: 20 });
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=learning-analytics.pdf'
      }
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});