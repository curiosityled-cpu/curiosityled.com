import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scope, filters, metrics } = await req.json();

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(2, 2, 255);
    doc.text('Journey Analytics Report', 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 35);
    doc.text(`User: ${user.full_name || user.email}`, 20, 42);
    doc.text(`Scope: ${scope || 'Personal'}`, 20, 49);

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 55, 190, 55);

    let y = 65;

    // Key Metrics Section
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Key Metrics', 20, y);
    y += 12;
    
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    
    const metricsData = [
      { label: 'Total Journeys', value: metrics?.totalJourneys || 0 },
      { label: 'Total Enrollments', value: metrics?.totalEnrollments || 0 },
      { label: 'Active Learners', value: metrics?.activeLearners || 0 },
      { label: 'Completion Rate', value: `${metrics?.completionRate || 0}%` }
    ];

    metricsData.forEach(metric => {
      doc.text(`${metric.label}:`, 25, y);
      doc.setFont(undefined, 'bold');
      doc.text(String(metric.value), 80, y);
      doc.setFont(undefined, 'normal');
      y += 8;
    });

    y += 10;

    // Filters Applied Section
    if (filters) {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Filters Applied', 20, y);
      y += 12;
      
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Time Range: ${filters.timeframe || 'Last 6 Months'}`, 25, y);
      y += 7;
      if (filters.division && filters.division !== 'all') {
        doc.text(`Division: ${filters.division}`, 25, y);
        y += 7;
      }
      if (filters.level && filters.level !== 'all') {
        doc.text(`Level: ${filters.level}`, 25, y);
        y += 7;
      }
      if (filters.journeyType && filters.journeyType !== 'all') {
        doc.text(`Journey Type: ${filters.journeyType}`, 25, y);
        y += 7;
      }
    }

    y += 10;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Curiosity Led - Leadership Development Platform', 20, 285);
    doc.text(`Page 1`, 180, 285);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=journey-analytics.pdf'
      }
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});