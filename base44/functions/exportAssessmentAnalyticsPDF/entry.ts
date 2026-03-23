import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['Platform Admin', 'Super Administrator', 'Admin Level 2'].includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assessments, metrics } = await req.json();

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Assessment Analytics Report', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);

    let y = 45;
    doc.setFontSize(14);
    doc.text('Summary Metrics', 20, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.text(`Total Assessments: ${metrics.totalAssessments}`, 20, y);
    y += 7;
    doc.text(`Completion Rate: ${metrics.completionRate}%`, 20, y);
    y += 7;
    doc.text(`Average Overall Score: ${metrics.avgOverallScore}%`, 20, y);
    y += 7;
    doc.text(`Average SI Score: ${metrics.avgSIScore}%`, 20, y);
    y += 15;

    doc.setFontSize(14);
    doc.text('Assessment Details', 20, y);
    y += 10;

    doc.setFontSize(8);
    assessments.slice(0, 50).forEach(a => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${a.email} - Overall: ${a.overall_pct || 0}% - SI: ${a.si_pct || 0}%`, 20, y);
      y += 5;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=assessment-analytics.pdf'
      }
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});