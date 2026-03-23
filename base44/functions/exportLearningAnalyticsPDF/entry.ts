import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['Platform Admin', 'Super Administrator'].includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { analytics, filters } = await req.json();

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Learning Analytics Report', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Time Range: ${filters.timeRange}`, 20, 35);

    let y = 50;
    doc.setFontSize(14);
    doc.text('Summary Metrics', 20, y);
    y += 10;
    
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