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
    doc.text('Goals Analytics Report', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Time Range: ${filters.timeRange}`, 20, 35);

    let y = 50;
    doc.setFontSize(14);
    doc.text('Summary Metrics', 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.text(`Total Goals: ${analytics.metrics.totalGoals}`, 20, y);
    y += 7;
    doc.text(`Completed Goals: ${analytics.metrics.completedGoals}`, 20, y);
    y += 7;
    doc.text(`Completion Rate: ${analytics.metrics.completionRate}%`, 20, y);
    y += 7;
    doc.text(`Overdue Goals: ${analytics.metrics.overdueGoals}`, 20, y);
    y += 7;
    doc.text(`At Risk Goals: ${analytics.metrics.atRiskGoals}`, 20, y);
    y += 15;

    doc.setFontSize(14);
    doc.text('Top Achievers', 20, y);
    y += 10;

    doc.setFontSize(8);
    analytics.topAchievers.slice(0, 20).forEach(a => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${a.full_name} - ${a.completed}/${a.total} (${a.completionRate}%)`, 20, y);
      y += 5;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=goals-analytics.pdf'
      }
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});